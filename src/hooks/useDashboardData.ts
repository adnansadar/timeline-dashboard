import { useQuery } from "@tanstack/react-query";

import { fetchCycleTime, fetchMachineIntervals } from "../api/analytics";
import {
  ASSET_TREE_KEY,
  SHIFTS_KEY,
  fetchAssetTree,
  fetchShifts,
} from "../api/core";
import type { EntityScope } from "../types/api";
import type { ShiftWindow } from "../utils/time";

const FIVE_MINUTES = 5 * 60 * 1000;

export function useAssetTree() {
  return useQuery({
    queryKey: ASSET_TREE_KEY,
    queryFn: fetchAssetTree,
    staleTime: FIVE_MINUTES,
  });
}

export function useShifts() {
  return useQuery({
    queryKey: SHIFTS_KEY,
    queryFn: fetchShifts,
    staleTime: FIVE_MINUTES,
  });
}

export function useTimelineData(
  scope: EntityScope | null,
  window: ShiftWindow | null,
  showIndividualProduces: boolean,
) {
  const enabled = Boolean(scope && window);
  const assetId = scope?.asset.asset_id;
  const levelId = scope?.asset.asset_level_id;
  const from = window?.range.from_ts;
  const to = window?.range.to_ts;

  const intervals = useQuery({
    queryKey: [
      "machine-intervals",
      assetId,
      levelId,
      from,
      to,
      showIndividualProduces,
    ],
    queryFn: () =>
      fetchMachineIntervals(scope!, window!.range, showIndividualProduces),
    enabled,
  });

  const cycleTime = useQuery({
    queryKey: ["cycle-time", assetId, levelId, from, to],
    queryFn: () => fetchCycleTime(scope!, window!.range),
    enabled,
  });

  function refetch() {
    void intervals.refetch();
    void cycleTime.refetch();
  }

  return { intervals, cycleTime, refetch };
}
