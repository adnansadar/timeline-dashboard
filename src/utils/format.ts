export function formatMinutes(value: number): string {
  return `${value.toFixed(1)} mins`;
}

export function formatCycleSeconds(value: number | null): string {
  if (value === null) return "";
  if (value >= 600) return `${(value / 60).toFixed(1)} mins`;
  return `${Number.isInteger(value) ? value : value.toFixed(1)} secs`;
}
