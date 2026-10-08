import { fromZonedTime } from 'date-fns-tz';

/** UTC instant corresponding to midnight on a calendar date in the account timezone. */
export function startOfTradingDate(dateKey: string, timezone: string): Date {
  return fromZonedTime(`${dateKey}T00:00:00`, timezone);
}
