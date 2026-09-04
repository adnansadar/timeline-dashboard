import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import AppHeader from "../components/AppHeader";
import FilterBar from "../components/FilterBar";
import { useAssetTree, useShifts, useTimelineData } from "../hooks/useDashboardData";
import type { EntityScope } from "../types/api";
import type { DashboardFilters } from "../types/filters";
import { assetLevelIds, flattenAssets } from "../utils/assets";
import { DEFAULT_ASSET_LEVEL_ID, DEFAULT_DATE } from "../utils/constants";
import { buildShiftOptions, buildShiftWindow } from "../utils/time";

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({
    assetLevelId: null,
    assetId: null,
    date: DEFAULT_DATE,
    shiftOptionId: null,
    showIndividualProduces: false,
  });

  const assetTree = useAssetTree();
  const shifts = useShifts();

  const assets = useMemo(
    () => flattenAssets(assetTree.data ?? []),
    [assetTree.data],
  );
  const levelIds = useMemo(() => assetLevelIds(assets), [assets]);
  const shiftOptions = useMemo(
    () => buildShiftOptions(shifts.data ?? []),
    [shifts.data],
  );

  const visibleAssets = useMemo(
    () =>
      filters.assetLevelId === null
        ? assets
        : assets.filter((asset) => asset.assetLevelId === filters.assetLevelId),
    [assets, filters.assetLevelId],
  );

  function handleChange(patch: Partial<DashboardFilters>) {
    setFilters((current) => {
      const next = { ...current, ...patch };
      if (patch.assetLevelId !== undefined) {
        const allowed =
          patch.assetLevelId === null
            ? assets
            : assets.filter((asset) => asset.assetLevelId === patch.assetLevelId);
        if (!allowed.some((asset) => asset.id === next.assetId)) {
          next.assetId = allowed[0]?.id ?? null;
        }
      }
      return next;
    });
  }

  // Nothing is selected until the lists load, so fall back rather than storing a default.
  const selectedAsset =
    assets.find((asset) => asset.id === filters.assetId) ??
    assets.find((asset) => asset.assetLevelId === DEFAULT_ASSET_LEVEL_ID) ??
    assets[0] ??
    null;
  const selectedShift =
    shiftOptions.find((shift) => shift.id === filters.shiftOptionId) ??
    shiftOptions[0] ??
    null;

  const resolvedFilters: DashboardFilters = {
    ...filters,
    assetId: selectedAsset?.id ?? null,
    shiftOptionId: selectedShift?.id ?? null,
  };

  const shiftWindow = useMemo(
    () => (selectedShift ? buildShiftWindow(filters.date, selectedShift) : null),
    [filters.date, selectedShift],
  );

  const scope = useMemo<EntityScope | null>(
    () =>
      selectedAsset
        ? {
            type: "asset",
            asset: {
              asset_id: selectedAsset.id,
              asset_level_id: selectedAsset.assetLevelId,
            },
          }
        : null,
    [selectedAsset],
  );

  const { intervals, cycleTime, refetch } = useTimelineData(
    scope,
    shiftWindow,
    filters.showIndividualProduces,
  );

  const isFetching = intervals.isFetching || cycleTime.isFetching;
  const error = intervals.error ?? cycleTime.error;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <AppHeader />
      {isFetching ? <LinearProgress /> : null}

      <Container maxWidth={false} sx={{ py: 3 }}>
        <Stack spacing={2}>
          <FilterBar
            assets={visibleAssets}
            levelIds={levelIds}
            shiftOptions={shiftOptions}
            filters={resolvedFilters}
            onChange={handleChange}
            onRefresh={refetch}
            isFetching={isFetching}
          />

          {error ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={refetch}>
                  Retry
                </Button>
              }
            >
              {error.message}
            </Alert>
          ) : null}

          <DataSummary
            window={shiftWindow}
            intervals={intervals.data}
            cycleTime={cycleTime.data}
          />
        </Stack>
      </Container>
    </Box>
  );
}

/** Temporary: replaced by the hourly table and chart in the next phases. */
function DataSummary({
  window,
  intervals,
  cycleTime,
}: {
  window: ReturnType<typeof buildShiftWindow> | null;
  intervals: ReturnType<typeof useTimelineData>["intervals"]["data"];
  cycleTime: ReturnType<typeof useTimelineData>["cycleTime"]["data"];
}) {
  if (!window) return null;

  const produceRows =
    intervals?.produces?.reduce(
      (total, bucket) => total + bucket.produces.length,
      0,
    ) ?? 0;

  const rows = [
    ["Window (IST)", `${window.from.format("DD MMM HH:mm")} – ${window.to.format("DD MMM HH:mm")}`],
    ["Window (UTC)", `${window.range.from_ts} – ${window.range.to_ts}`],
    ["Runtimes", intervals?.runtimes.length ?? 0],
    ["Downtimes", intervals?.downtimes.length ?? 0],
    ["Stoppages", intervals?.stoppages.length ?? 0],
    ["Produce count buckets", intervals?.produce_counts.length ?? 0],
    ["Individual produces", produceRows],
    ["Cycle time buckets", cycleTime?.length ?? 0],
  ] as const;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Data check
      </Typography>
      <Stack spacing={0.5}>
        {rows.map(([label, value]) => (
          <Stack key={label} direction="row" spacing={2}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 190 }}>
              {label}
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
              {value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}
