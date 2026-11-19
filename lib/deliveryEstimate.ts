// Delivery estimate: ONE pure function behind every delivery date shown to customers and sellers
// (product page, quick-view, the estimate box, the "Sous X–Y jours" line, the seller form preview).
//
// Rules (all dates are Africa/Tunis calendar dates, "YYYY-MM-DD", never raw timestamps):
//   businessDay(d)     = a working weekday (default Mon–Fri) that is not a holiday
//   addBusinessDays    = step one calendar day at a time, counting only business days
//   orderDay           = today in Tunis, or tomorrow once the Tunis time is past the cutoff
//   ready              = N > 0 ? addBusinessDays(orderDay, N) : orderDay          (N = preparation days)
//   pickup min / max   = addBusinessDays(ready, pickup_delay_min / max)
//   delivery min / max = addBusinessDays(pickup min / max, transit)
//
// Mirrors App\Support\BusinessDays on the backend (seller reminders). Keep both in sync.
// No imports: node --test loads this file directly (scripts/test-delivery-estimate.mjs).

export interface DeliveryTimeSettings {
  pickup_delay_min_business_days: number
  pickup_delay_max_business_days: number
  transit_business_days: number
  /** ISO weekdays: 1 = Monday … 7 = Sunday */
  working_days: number[]
  /** Non-working dates, "YYYY-MM-DD" */
  holidays: string[]
  /** "HH:MM" Africa/Tunis; orders after it count as next-day orders */
  order_cutoff_time: string
}

/** Fixed-date Tunisian public holidays (month-day). Islamic holidays move every year: the admin adds them. */
export const FIXED_HOLIDAYS = ['01-01', '03-20', '04-09', '05-01', '07-25', '08-13', '10-15', '12-17']

/** The fixed holidays of a few surrounding years, as "YYYY-MM-DD". */
export function fixedHolidays(fromYear: number, toYear: number): string[] {
  const out: string[] = []
  for (let y = fromYear; y <= toYear; y++) for (const md of FIXED_HOLIDAYS) out.push(`${y}-${md}`)
  return out
}

const THIS_YEAR = new Date().getFullYear()

/** Used when the settings call fails (the defaults of the admin settings page). */
export const DEFAULT_DELIVERY_TIME_SETTINGS: DeliveryTimeSettings = {
  pickup_delay_min_business_days: 1,
  pickup_delay_max_business_days: 2,
  transit_business_days: 1,
  working_days: [1, 2, 3, 4, 5],
  holidays: fixedHolidays(THIS_YEAR - 1, THIS_YEAR + 2),
  order_cutoff_time: '23:59',
}

export const TUNIS_TIME_ZONE = 'Africa/Tunis'

export interface DeliveryEstimate {
  /** Day the order counts for (today, or tomorrow after the cutoff) */
  orderDay: string
  /** Day the product is ready for pickup (= orderDay when not made to order) */
  ready: string
  deliveryMin: string
  deliveryMax: string
  /** "Sous X–Y jours ouvrables" */
  businessDaysMin: number
  businessDaysMax: number
}

// ── Calendar-date helpers (UTC arithmetic on Y-M-D, no timezone involved) ─────────────────

function parseYmd(ymd: string): [number, number, number] {
  const [y, m, d] = ymd.split('-').map(Number)
  return [y, m, d]
}

function toYmd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function dayMs(ymd: string): number {
  const [y, m, d] = parseYmd(ymd)
  return Date.UTC(y, m - 1, d)
}

export function addCalendarDays(ymd: string, days: number): string {
  return toYmd(dayMs(ymd) + days * 86_400_000)
}

/** ISO weekday of a calendar date: 1 = Monday … 7 = Sunday */
export function isoWeekday(ymd: string): number {
  const w = new Date(dayMs(ymd)).getUTCDay()
  return w === 0 ? 7 : w
}

export function isBusinessDay(ymd: string, s: DeliveryTimeSettings): boolean {
  return s.working_days.includes(isoWeekday(ymd)) && !s.holidays.includes(ymd)
}

export function addBusinessDays(ymd: string, k: number, s: DeliveryTimeSettings): string {
  if (!s.working_days.length) return ymd // misconfigured: never loop forever
  let d = ymd
  let left = k
  while (left > 0) {
    d = addCalendarDays(d, 1)
    if (isBusinessDay(d, s)) left--
  }
  return d
}

// ── Tunis clock ───────────────────────────────────────────────────────────────────────────

const clockFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TUNIS_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** Current Tunis calendar date and time of day (seconds since midnight), whatever the machine's timezone. */
export function tunisClock(now: Date): { date: string; secondsOfDay: number } {
  const p: Record<string, string> = {}
  for (const part of clockFormatter.formatToParts(now)) p[part.type] = part.value
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    secondsOfDay: Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second),
  }
}

/** First second that counts as "after the cutoff": the cutoff minute is included (23:59 → 23:59:59 is on time). */
function cutoffEndSeconds(cutoff: string): number {
  const [h, m] = cutoff.split(':').map(Number)
  return ((h || 0) * 60 + (m || 0) + 1) * 60
}

// ── The estimate ──────────────────────────────────────────────────────────────────────────

function estimateFromOrderDay(orderDay: string, preparationDays: number, s: DeliveryTimeSettings): DeliveryEstimate {
  const n = preparationDays > 0 ? Math.floor(preparationDays) : 0
  const ready = n > 0 ? addBusinessDays(orderDay, n, s) : orderDay
  const pickupMin = addBusinessDays(ready, s.pickup_delay_min_business_days, s)
  const pickupMax = addBusinessDays(ready, s.pickup_delay_max_business_days, s)
  return {
    orderDay,
    ready,
    deliveryMin: addBusinessDays(pickupMin, s.transit_business_days, s),
    deliveryMax: addBusinessDays(pickupMax, s.transit_business_days, s),
    businessDaysMin: n + s.pickup_delay_min_business_days + s.transit_business_days,
    businessDaysMax: n + s.pickup_delay_max_business_days + s.transit_business_days,
  }
}

/**
 * @param now             the current instant (any timezone: only the Tunis wall clock is used)
 * @param preparationDays business days to make the product (made to order), null / 0 otherwise
 */
export function estimateDelivery(
  now: Date,
  preparationDays: number | null | undefined,
  settings: DeliveryTimeSettings = DEFAULT_DELIVERY_TIME_SETTINGS,
): DeliveryEstimate {
  const clock = tunisClock(now)
  const afterCutoff = clock.secondsOfDay >= cutoffEndSeconds(settings.order_cutoff_time)
  const orderDay = afterCutoff ? addCalendarDays(clock.date, 1) : clock.date
  return estimateFromOrderDay(orderDay, preparationDays || 0, settings)
}

/**
 * Seconds left to order before the cutoff, ONLY when ordering before it really gives an earlier
 * delivery than ordering after it, and today is a business day (so it disappears on Friday evening,
 * Saturday, Sunday and holidays).
 * Returns null otherwise.
 */
export function secondsToBetterEstimate(
  now: Date,
  preparationDays: number | null | undefined,
  settings: DeliveryTimeSettings = DEFAULT_DELIVERY_TIME_SETTINGS,
): number | null {
  const clock = tunisClock(now)
  const end = cutoffEndSeconds(settings.order_cutoff_time)
  if (clock.secondsOfDay >= end) return null // already past the cutoff: nothing earlier to catch
  // Weekend / holiday: no order is processed today, so no cutoff to race (the date can still shift at midnight)
  if (!isBusinessDay(clock.date, settings)) return null
  const n = preparationDays || 0
  const today = estimateFromOrderDay(clock.date, n, settings)
  const later = estimateFromOrderDay(addCalendarDays(clock.date, 1), n, settings)
  if (today.deliveryMin === later.deliveryMin && today.deliveryMax === later.deliveryMax) return null
  return end - clock.secondsOfDay
}

// ── Formatting ────────────────────────────────────────────────────────────────────────────

const LOCALE_TAGS: Record<string, string> = { fr: 'fr-TN', en: 'en', ar: 'ar-TN' }

/** "lun. 23 nov." / "Mon, Nov 23" / Arabic equivalent, from a Tunis calendar date. */
export function formatDeliveryDate(ymd: string, locale: string): string {
  const [y, m, d] = parseYmd(ymd)
  const noon = new Date(Date.UTC(y, m - 1, d, 12))
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale] ?? locale, {
    timeZone: TUNIS_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(noon)
}

/** Keeps only well-formed settings from the API; anything else falls back to the defaults. */
export function normalizeSettings(raw: unknown): DeliveryTimeSettings {
  const d = DEFAULT_DELIVERY_TIME_SETTINGS
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Record<string, unknown>
  const int = (v: unknown, fallback: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 60 ? (v as number) : fallback)
  const days = Array.isArray(r.working_days) ? r.working_days.filter((x): x is number => Number.isInteger(x) && x >= 1 && x <= 7) : []
  const holidays = Array.isArray(r.holidays) ? r.holidays.filter((x): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) : d.holidays
  const cutoff = typeof r.order_cutoff_time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.order_cutoff_time) ? r.order_cutoff_time : d.order_cutoff_time
  const min = int(r.pickup_delay_min_business_days, d.pickup_delay_min_business_days)
  return {
    pickup_delay_min_business_days: min,
    pickup_delay_max_business_days: Math.max(min, int(r.pickup_delay_max_business_days, d.pickup_delay_max_business_days)),
    transit_business_days: int(r.transit_business_days, d.transit_business_days),
    working_days: days.length ? days : d.working_days,
    holidays,
    order_cutoff_time: cutoff,
  }
}
