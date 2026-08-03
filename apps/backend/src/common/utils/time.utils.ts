/**
 * Safely parses a timestamp (Unix seconds integer, Unix milliseconds integer,
 * ISO date string, or Date object) into Unix milliseconds.
 * Returns null if input is null/undefined or an invalid date.
 */
export function getTimestampMs(
  val: number | string | Date | null | undefined,
): number | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) {
    const t = val.getTime();
    return isNaN(t) ? null : t;
  }
  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return null;
    return val < 10000000000 ? val * 1000 : val;
  }
  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      return num < 10000000000 ? num * 1000 : num;
    }
    const d = new Date(val).getTime();
    return isNaN(d) ? null : d;
  }
  return null;
}
