export interface MesEnvelope<T> {
  trace_id: string;
  status_code: number;
  message: string;
  data: T;
}

/* ---------- auth ---------- */

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  name: string;
  email: string;
  roles: string[];
  status: string;
  customer_id?: string;
  customer_name?: string;
  designation_name?: string | null;
  department_name?: string | null;
}

/* ---------- core ---------- */

export interface AssetNode {
  id: string;
  name: string;
  codename: string | null;
  assetlevel_id: number;
  hierarchy: unknown | null;
  children: AssetNode[];
}

/** `shift_timings` is a list of shift START times "HH:MM" in IST, not [start, end]. */
export interface Shift {
  id: string;
  code: string;
  name: string;
  shift_timings: string[];
  is_active: boolean;
}

/* ---------- analytics requests ---------- */

export interface EntityScope {
  type: "asset";
  asset: { asset_id: string; asset_level_id: number };
}

/** Both ends are UTC ISO strings. */
export interface TimeRange {
  from_ts: string;
  to_ts: string;
}

export interface MachineIntervalsRequest {
  entity_scope: EntityScope;
  time_range: TimeRange;
  produce_counts: boolean;
  exact_produces: boolean;
  group_produce_counts_by_part_model: boolean;
}

export interface CycleTimeRequest {
  entity_scope: EntityScope;
  metrics: string[];
  time_range: TimeRange;
  distribution: "hourly";
}

/* ---------- analytics responses ---------- */

export interface RuntimeInterval {
  start_at: string;
  end_at: string;
  /** "planned" | "unknown unplanned production" */
  type: string;
  runtime_name: string | null;
}

export interface DowntimeInterval {
  start_at: string;
  end_at: string;
  downtime_name: string | null;
  /** "unknown" for backend-filled gaps; named breaks carry other values. */
  type: string;
}

/** Shape unconfirmed — `stoppages` is empty in every sample payload. */
export interface StoppageInterval {
  start_at: string;
  end_at: string;
  type?: string | null;
  stoppage_name?: string | null;
}

export interface ProduceCountBucket {
  bucket_start: string;
  part_model_id: string;
  ok_count: number;
  ng_count: number;
}

export type ProduceResult = "PASS" | "FAIL";

export interface ProduceRow {
  produce_id: string;
  /** NOT sorted within a bucket — sort before use. */
  first_seen_ts: string;
  result: ProduceResult;
  produce_type: string;
  part_model_id: string;
}

export interface ProduceBucket {
  bucket_start: string;
  part_model_id: string;
  produces: ProduceRow[];
}

export interface MachineIntervalsResponse {
  machine_ids: number[];
  runtimes: RuntimeInterval[];
  downtimes: DowntimeInterval[];
  stoppages: StoppageInterval[];
  produce_counts: ProduceCountBucket[];
  /** Present only when the request set `exact_produces: true` (10k-20k rows). */
  produces?: ProduceBucket[];
}

/** One hourly bucket from POST /analytics-query. Unrequested metrics come back null. */
export interface CycleTimeBucket {
  entity_id: string;
  bucket_start: string;
  ideal_cycle_time_seconds: number | null;
  actual_cycle_time_seconds: number | null;
}
