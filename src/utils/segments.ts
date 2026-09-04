import {
  DOWNTIME_TYPE_UNKNOWN,
  RUNTIME_TYPE_PLANNED,
  SEGMENT_KINDS,
} from "./constants";
import type { SegmentKind } from "./constants";
import { istLabelFromMillis } from "./time";
import type { ShiftWindow } from "./time";
import type { CycleTimeBucket, MachineIntervalsResponse } from "../types/api";

const HOUR_MS = 60 * 60 * 1000;

export interface Segment {
  start: number;
  end: number;
  kind: SegmentKind;
  name: string | null;
}

export type MinutesByKind = Record<SegmentKind, number>;

export interface HourColumn {
  start: number;
  end: number;
  label: string;
  isFuture: boolean;
  total: number;
  pass: number;
  fail: number;
  minutes: MinutesByKind;
  idealCycleTime: number | null;
  actualCycleTime: number | null;
}

export function buildColumnEdges(window: ShiftWindow): number[] {
  const from = window.from.valueOf();
  const to = window.to.valueOf();
  const edges = [from];

  for (
    let mark = Math.ceil(from / HOUR_MS) * HOUR_MS;
    mark < to;
    mark += HOUR_MS
  ) {
    if (mark > from) edges.push(mark);
  }

  edges.push(to);
  return edges;
}

export function collectSegments(data: MachineIntervalsResponse): Segment[] {
  const runtimes: Segment[] = data.runtimes.map((runtime) => ({
    start: Date.parse(runtime.start_at),
    end: Date.parse(runtime.end_at),
    kind:
      runtime.type === RUNTIME_TYPE_PLANNED
        ? "runtime"
        : "unplanned-production",
    name: runtime.runtime_name,
  }));

  const downtimes: Segment[] = data.downtimes.map((downtime) => ({
    start: Date.parse(downtime.start_at),
    end: Date.parse(downtime.end_at),
    kind:
      downtime.type === DOWNTIME_TYPE_UNKNOWN
        ? "unknown-downtime"
        : "planned-downtime",
    name: downtime.downtime_name,
  }));

  const stoppages: Segment[] = data.stoppages.map((stoppage) => ({
    start: Date.parse(stoppage.start_at),
    end: Date.parse(stoppage.end_at),
    kind: "stoppage",
    name: stoppage.stoppage_name ?? null,
  }));

  return [...runtimes, ...downtimes, ...stoppages];
}

function emptyMinutes(): MinutesByKind {
  return Object.fromEntries(
    SEGMENT_KINDS.map((kind) => [kind, 0]),
  ) as MinutesByKind;
}

function columnIndexFor(timestamp: number, edges: number[]): number {
  if (timestamp < edges[0]) return 0;
  for (let i = 0; i < edges.length - 1; i += 1) {
    if (timestamp >= edges[i] && timestamp < edges[i + 1]) return i;
  }
  return -1;
}

export function buildHourColumns(
  window: ShiftWindow,
  intervals: MachineIntervalsResponse | undefined,
  cycleTime: CycleTimeBucket[] | undefined,
  now: number = Date.now(),
): HourColumn[] {
  const edges = buildColumnEdges(window);
  const segments = intervals ? collectSegments(intervals) : [];

  const columns: HourColumn[] = [];
  for (let i = 0; i < edges.length - 1; i += 1) {
    const start = edges[i];
    const end = edges[i + 1];
    const minutes = emptyMinutes();

    for (const segment of segments) {
      const overlap =
        Math.min(segment.end, end) - Math.max(segment.start, start);
      if (overlap > 0) minutes[segment.kind] += overlap / 60_000;
    }

    columns.push({
      start,
      end,
      label: `${istLabelFromMillis(start)} - ${istLabelFromMillis(end)}`,
      isFuture: start > now,
      total: 0,
      pass: 0,
      fail: 0,
      minutes,
      idealCycleTime: null,
      actualCycleTime: null,
    });
  }

  for (const bucket of intervals?.produce_counts ?? []) {
    const index = columnIndexFor(Date.parse(bucket.bucket_start), edges);
    if (index < 0) continue;
    columns[index].pass += bucket.ok_count;
    columns[index].fail += bucket.ng_count;
    columns[index].total += bucket.ok_count + bucket.ng_count;
  }

  for (const bucket of cycleTime ?? []) {
    const index = columnIndexFor(Date.parse(bucket.bucket_start), edges);
    if (index < 0) continue;
    columns[index].idealCycleTime = bucket.ideal_cycle_time_seconds;
    columns[index].actualCycleTime = bucket.actual_cycle_time_seconds;
  }

  return columns;
}
