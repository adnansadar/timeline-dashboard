import type { HourColumn } from "./segments";
import type { ShiftWindow } from "./time";
import type {
  MachineIntervalsResponse,
  ProduceResult,
  ProduceType,
} from "../types/api";

export interface Marker {
  time: number;
  y: number;
  result: ProduceResult;
  produceType: ProduceType;
}

export function buildProduceMarkers(
  data: MachineIntervalsResponse | undefined,
): Marker[] {
  const rows = (data?.produces ?? [])
    .flatMap((bucket) => bucket.produces)
    .map((row) => ({
      time: Date.parse(row.first_seen_ts),
      result: row.result,
      produceType: row.produce_type,
    }))
    .sort((a, b) => a.time - b.time);

  let cumulative = 0;
  return rows.map((row) => {
    if (row.produceType === "FIRST") cumulative += 1;
    return { ...row, y: cumulative };
  });
}

export function buildHourlyMarkers(
  window: ShiftWindow,
  columns: HourColumn[],
): Marker[] {
  const markers: Marker[] = [
    {
      time: window.from.valueOf(),
      y: 0,
      result: "PASS",
      produceType: "FIRST",
    },
  ];

  let cumulative = 0;
  for (const column of columns) {
    if (column.isFuture) break;
    cumulative += column.total;
    markers.push({
      time: column.end,
      y: cumulative,
      result: "PASS",
      produceType: "FIRST",
    });
  }

  return markers;
}

const TICK_STEPS_MINUTES = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720];

export function timeTicks(start: number, end: number, target = 8): number[] {
  const spanMinutes = (end - start) / 60_000;
  const step =
    TICK_STEPS_MINUTES.find((minutes) => spanMinutes / minutes <= target) ??
    1440;
  const stepMs = step * 60_000;

  const ticks: number[] = [];
  const first = Math.ceil(start / stepMs) * stepMs;
  for (let tick = first; tick <= end; tick += stepMs) ticks.push(tick);
  return ticks;
}

export function valueTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 5, 10].map((n) => n * magnitude).find((s) => s >= rough) ??
    magnitude * 10;

  const ticks: number[] = [];
  for (let value = 0; value <= max; value += step) ticks.push(value);
  return ticks;
}

/** First index with time >= value, on an array already sorted by time. */
export function lowerBound(markers: Marker[], value: number): number {
  let low = 0;
  let high = markers.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (markers[mid].time < value) low = mid + 1;
    else high = mid;
  }
  return low;
}
