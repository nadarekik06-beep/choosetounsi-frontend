// node --test scripts/test-delivery-estimate.mjs      (npm run test:delivery)
// The single delivery-estimate function: Africa/Tunis calendar dates, business days, holidays, cutoff.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  estimateDelivery,
  secondsToBetterEstimate,
  formatDeliveryDate,
  normalizeSettings,
  DEFAULT_DELIVERY_TIME_SETTINGS,
} from '../lib/deliveryEstimate.ts'

// Defaults of the prompt, with Thu 17 Dec 2026 as the only holiday
const S = { ...DEFAULT_DELIVERY_TIME_SETTINGS, holidays: ['2026-12-17'] }

/** Tunis wall-clock "YYYY-MM-DD HH:MM" → instant (Tunis is UTC+1 all year, no DST). */
const at = (tunis) => new Date(`${tunis.replace(' ', 'T')}:00+01:00`)
const range = (e) => `${e.deliveryMin} – ${e.deliveryMax}`
const day = (iso) => new Intl.DateTimeFormat('en', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`))
const pretty = (e) => `${day(e.deliveryMin)} – ${day(e.deliveryMax)}`

const TABLE = [
  ['Thu 19 Nov 2026 18:57', '2026-11-19 18:57', 0, 'Mon, Nov 23 – Tue, Nov 24'],
  ['Fri 20 Nov 2026', '2026-11-20 12:00', 0, 'Tue, Nov 24 – Wed, Nov 25'],
  ['Sat 21 Nov 2026', '2026-11-21 12:00', 0, 'Tue, Nov 24 – Wed, Nov 25'],
  ['Sun 22 Nov 2026', '2026-11-22 12:00', 0, 'Tue, Nov 24 – Wed, Nov 25'],
  ['Mon 23 Nov 2026', '2026-11-23 12:00', 0, 'Wed, Nov 25 – Thu, Nov 26'],
  ['Thu 19 Nov 2026, N=3', '2026-11-19 12:00', 3, 'Thu, Nov 26 – Fri, Nov 27'],
  ['Sat 21 Nov 2026, N=2', '2026-11-21 12:00', 2, 'Thu, Nov 26 – Fri, Nov 27'],
  ['Fri 27 Nov 2026, N=5', '2026-11-27 12:00', 5, 'Tue, Dec 8 – Wed, Dec 9'],
  ['Tue 15 Dec 2026 (skips holiday Thu 17)', '2026-12-15 12:00', 0, 'Fri, Dec 18 – Mon, Dec 21'],
  ['Wed 16 Dec 2026', '2026-12-16 12:00', 0, 'Mon, Dec 21 – Tue, Dec 22'],
]

for (const [label, tunis, n, expected] of TABLE) {
  test(`${label} → ${expected}`, () => {
    assert.equal(pretty(estimateDelivery(at(tunis), n, S)), expected)
  })
}

test('Sat 21 Nov: pickup is Monday (ready = order day)', () => {
  const e = estimateDelivery(at('2026-11-21 12:00'), 0, S)
  assert.equal(e.ready, '2026-11-21')
})

test('browser in another timezone gives the same result (Thu 19 Nov 23:30 Tunis, America/New_York)', () => {
  const previous = process.env.TZ
  const baseline = range(estimateDelivery(at('2026-11-19 18:57'), 0, S))
  try {
    process.env.TZ = 'America/New_York'
    const e = estimateDelivery(at('2026-11-19 23:30'), 0, S) // = 17:30 in New York, still Thursday there
    assert.equal(range(e), baseline)
    assert.equal(pretty(e), 'Mon, Nov 23 – Tue, Nov 24')
    process.env.TZ = 'Pacific/Auckland'
    assert.equal(range(estimateDelivery(at('2026-11-19 23:30'), 0, S)), baseline) // already Friday in Auckland
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
})

test('after the cutoff the order counts for the next day (Thu 23:59:59 on time, Fri 00:00 next day)', () => {
  const onTime = estimateDelivery(new Date(at('2026-11-19 23:59').getTime() + 59_000), 0, S)
  assert.equal(onTime.orderDay, '2026-11-19')
  const late = estimateDelivery(at('2026-11-20 00:00'), 0, S)
  assert.equal(late.orderDay, '2026-11-20')
  const early = { ...S, order_cutoff_time: '16:00' }
  assert.equal(estimateDelivery(at('2026-11-19 16:00'), 0, early).orderDay, '2026-11-19')
  assert.equal(estimateDelivery(at('2026-11-19 16:01'), 0, early).orderDay, '2026-11-20')
})

test('business days range for "Sous X–Y jours ouvrables"', () => {
  const regular = estimateDelivery(at('2026-11-19 12:00'), 0, S)
  assert.deepEqual([regular.businessDaysMin, regular.businessDaysMax], [2, 3])
  const made = estimateDelivery(at('2026-11-19 12:00'), 3, S)
  assert.deepEqual([made.businessDaysMin, made.businessDaysMax], [5, 6])
})

test('countdown only when ordering before the cutoff gives an earlier date', () => {
  const early = { ...S, order_cutoff_time: '16:00' }
  // Thursday 14:00: ordering now → Mon 23 / Tue 24, after 16:00 → Tue 24 / Wed 25
  assert.equal(secondsToBetterEstimate(at('2026-11-19 14:00'), 0, early), 2 * 3600 + 60)
  // Friday: tomorrow (Saturday) gives the same dates; Saturday / Sunday: not a business day, no countdown
  assert.equal(secondsToBetterEstimate(at('2026-11-20 14:00'), 0, early), null)
  assert.equal(secondsToBetterEstimate(at('2026-11-21 10:00'), 0, early), null)
  assert.equal(secondsToBetterEstimate(at('2026-11-22 10:00'), 0, early), null)
  // Monday morning: ordering today beats ordering tomorrow
  assert.notEqual(secondsToBetterEstimate(at('2026-11-23 10:00'), 0, early), null)
  // After the cutoff: nothing to catch
  assert.equal(secondsToBetterEstimate(at('2026-11-19 16:30'), 0, early), null)
  // Tue 15 Dec: ordering today beats ordering Wednesday (Thu 17 is a holiday)
  assert.notEqual(secondsToBetterEstimate(at('2026-12-15 10:00'), 0, early), null)
  // Wed 16 Dec: Wednesday and Thursday orders both end up Mon 21 / Tue 22: nothing to catch
  assert.equal(secondsToBetterEstimate(at('2026-12-16 10:00'), 0, early), null)
  // The holiday itself (Thu 17 Dec) shows nothing
  assert.equal(secondsToBetterEstimate(at('2026-12-17 10:00'), 0, early), null)
  // Made to order shifts both estimates equally: still a difference on a Thursday
  assert.notEqual(secondsToBetterEstimate(at('2026-11-19 10:00'), 3, early), null)
})

test('formatting uses the Tunis calendar date in fr / en / ar', () => {
  assert.match(formatDeliveryDate('2026-11-23', 'fr'), /lun\.?\s+23\s+nov/i)
  assert.match(formatDeliveryDate('2026-11-23', 'en'), /Mon,?\s+(Nov\s+23|23\s+Nov)/)
  assert.match(formatDeliveryDate('2026-11-23', 'ar'), /23|٢٣/)
})

test('settings from the API are sanitised, bad input falls back to the defaults', () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_DELIVERY_TIME_SETTINGS)
  assert.deepEqual(normalizeSettings('oops'), DEFAULT_DELIVERY_TIME_SETTINGS)
  const s = normalizeSettings({ pickup_delay_min_business_days: 3, pickup_delay_max_business_days: 1, working_days: [], holidays: ['2026-12-17', 'x'], order_cutoff_time: '99:99' })
  assert.equal(s.pickup_delay_min_business_days, 3)
  assert.equal(s.pickup_delay_max_business_days, 3) // max never below min
  assert.deepEqual(s.working_days, [1, 2, 3, 4, 5])
  assert.deepEqual(s.holidays, ['2026-12-17'])
  assert.equal(s.order_cutoff_time, '23:59')
})

test('a settings set with no working day cannot loop forever', () => {
  const e = estimateDelivery(at('2026-11-19 12:00'), 2, { ...S, working_days: [] })
  assert.equal(e.deliveryMin, '2026-11-19')
})
