/* ---------- timezone ---------- */

export const IST_TZ = "Asia/Kolkata";
/** IST is a fixed +05:30 with no DST. */
export const IST_OFFSET_MINUTES = 330;

/** The backend only has data for 22-25 June 2026. */
export const DATA_RANGE_START = "2026-06-22";
export const DATA_RANGE_END = "2026-06-25";

/* ---------- timeline segments ---------- */

export const SEGMENT_KINDS = [
  "runtime",
  "unplanned-production",
  "planned-downtime",
  "unknown-downtime",
  "stoppage",
] as const;

export type SegmentKind = (typeof SEGMENT_KINDS)[number];

/** Matched to the target screenshots. Chart bands and legend both read this. */
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

/** Raw `runtimes[].type` values from the API. */
export const RUNTIME_TYPE_PLANNED = "planned";
export const RUNTIME_TYPE_UNPLANNED_PRODUCTION = "unknown unplanned production";
/** Raw `downtimes[].type` value the backend uses to fill gaps. */
export const DOWNTIME_TYPE_UNKNOWN = "unknown";

/* ---------- produce markers ---------- */

export const PRODUCE_COLORS = {
  PASS: "#2E4FD8",
  FAIL: "#D32F2F",
} as const;

/* ---------- chart ---------- */

/** Minimum zoom span, in ms. */
export const MIN_ZOOM_SPAN_MS = 60_000;
