import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";

import AppHeader from "../components/AppHeader";
import FilterBar from "../components/FilterBar";
import HourlyTable from "../components/HourlyTable";
import TimelineChart from "../components/TimelineChart";
import {
  useAssetTree,
  useShifts,
  useTimelineData,
} from "../hooks/useDashboardData";
import type { EntityScope } from "../types/api";
import type { DashboardFilters } from "../types/filters";
import { assetLevelIds, flattenAssets } from "../utils/assets";
import { DEFAULT_ASSET_LEVEL_ID, DEFAULT_DATE } from "../utils/constants";
import { buildHourColumns } from "../utils/segments";
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
            : assets.filter(
                (asset) => asset.assetLevelId === patch.assetLevelId,
              );
        if (!allowed.some((asset) => asset.id === next.assetId)) {
          next.assetId = allowed[0]?.id ?? null;
        }
      }
      return next;
    });
  }

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
    () =>
      selectedShift ? buildShiftWindow(filters.date, selectedShift) : null,
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

  const hourColumns = useMemo(
    () =>
      shiftWindow
        ? buildHourColumns(shiftWindow, intervals.data, cycleTime.data)
        : [],
    [shiftWindow, intervals.data, cycleTime.data],
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

          {shiftWindow ? (
            <>
              <TimelineChart
                key={shiftWindow.range.from_ts}
                window={shiftWindow}
                columns={hourColumns}
                intervals={intervals.data}
                showIndividualProduces={filters.showIndividualProduces}
              />
              <HourlyTable columns={hourColumns} />
            </>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
