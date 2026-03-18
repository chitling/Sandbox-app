/**
 * Safely parse a date string as local time and format it for display.
 *
 * Date-only strings like "2026-03-20" are parsed by `new Date()` as UTC
 * midnight, which shifts to the previous day in western-hemisphere timezones.
 * This helper appends "T00:00:00" to date-only strings so they are parsed
 * as local midnight instead.
 *
 * Timestamps with a time component (ISO 8601, Supabase TIMESTAMPTZ, etc.)
 * are left untouched since their timezone is already explicit.
 */
export function formatDate(value) {
  if (!value) return "";
  const str = String(value);
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(str);
  const d = new Date(isDateOnly ? str + "T00:00:00" : str);
  return d.toLocaleDateString();
}
