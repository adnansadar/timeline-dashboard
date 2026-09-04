export const IST_TZ = "Asia/Kolkata";

export const IST_OFFSET_MINUTES = 330;

export const DATA_RANGE_START = "2026-06-22";
export const DATA_RANGE_END = "2026-06-25";
export const DEFAULT_DATE = "2026-06-23";

export const DEFAULT_ASSET_LEVEL_ID = 20;

export const SEGMENT_KINDS = [
  "runtime",
  "unplanned-production",
  "planned-downtime",
  "unknown-downtime",
  "stoppage",
] as const;

export type SegmentKind = (typeof SEGMENT_KINDS)[number];

export const SEGMENT_COLORS: Record<SegmentKind, string> = {
  runtime: "#1AA098",
  "unplanned-production": "#A9C520",
  "planned-downtime": "#4E9A1E",
  "unknown-downtime": "#F47B60",
  stoppage: "#5B4BD1",
};

export const SEGMENT_LABELS: Record<SegmentKind, string> = {
  runtime: "Runtime",
  "unplanned-production": "Unplanned Production",
  "planned-downtime": "Planned Downtime",
  "unknown-downtime": "Unknown Downtime",
  stoppage: "Minor Stoppage",
};

export const RUNTIME_TYPE_PLANNED = "planned";
export const RUNTIME_TYPE_UNPLANNED_PRODUCTION = "unknown unplanned production";

export const DOWNTIME_TYPE_UNKNOWN = "unknown";

export const PRODUCE_COLORS = {
  PASS: "#2E4FD8",
  FAIL: "#D32F2F",
} as const;

export const MIN_ZOOM_SPAN_MS = 60_000;
