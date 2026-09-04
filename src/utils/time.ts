import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import { IST_TZ } from "./constants";
import type { Shift, TimeRange } from "../types/api";

export interface ShiftOption {
  id: string;
  name: string;
  start: string;
  end: string;
  label: string;
}

export function buildShiftOptions(shifts: Shift[]): ShiftOption[] {
  return shifts.flatMap((shift) =>
    shift.shift_timings.map((start, index) => {
      const end = shift.shift_timings[(index + 1) % shift.shift_timings.length];
      return {
        id: `${shift.id}:${index}`,
        name: shift.name,
        start,
        end,
        label: `${shift.name} (${start} – ${end})`,
      };
    }),
  );
}

export interface ShiftWindow {
  from: Dayjs;
  to: Dayjs;
  range: TimeRange;
}

export function buildShiftWindow(
  date: string,
  shift: ShiftOption,
): ShiftWindow {
  const from = dayjs.tz(`${date} ${shift.start}`, IST_TZ);
  let to = dayjs.tz(`${date} ${shift.end}`, IST_TZ);
  if (!to.isAfter(from)) to = to.add(1, "day");

  return {
    from,
    to,
    range: {
      from_ts: from.toISOString(),
      to_ts: to.toISOString(),
    },
  };
}

export function toIst(utcTimestamp: string): Dayjs {
  return dayjs.utc(utcTimestamp).tz(IST_TZ);
}

export function formatIstTime(utcTimestamp: string): string {
  return toIst(utcTimestamp).format("HH:mm");
}

export function istLabelFromMillis(ms: number): string {
  return dayjs(ms).tz(IST_TZ).format("HH:mm");
}
