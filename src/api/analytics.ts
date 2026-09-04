import { api } from "./client";
import type {
  CycleTimeBucket,
  EntityScope,
  MachineIntervalsResponse,
  TimeRange,
} from "../types/api";

export function fetchMachineIntervals(
  entityScope: EntityScope,
  timeRange: TimeRange,
  exactProduces: boolean,
): Promise<MachineIntervalsResponse> {
  return api.post<MachineIntervalsResponse>(
    "/analytics-query/machine-intervals",
    {
      entity_scope: entityScope,
      time_range: timeRange,
      produce_counts: true,
      exact_produces: exactProduces,
      group_produce_counts_by_part_model: true,
    },
  );
}

export function fetchCycleTime(
  entityScope: EntityScope,
  timeRange: TimeRange,
): Promise<CycleTimeBucket[]> {
  return api.post<CycleTimeBucket[]>("/analytics-query", {
    entity_scope: entityScope,
    metrics: ["ideal_cycle_time_seconds", "actual_cycle_time_seconds"],
    time_range: timeRange,
    distribution: "hourly",
  });
}
