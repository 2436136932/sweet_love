import { describe, it, expect } from 'vitest'
import {
  todayDate,
  addDays,
  calculateLongestStreak,
  calculateCheckInPoints,
  canTransfer,
  resolveCouponStatus
} from '../src/server/services/couplePointsService'

describe('couplePointsService date utilities', () => {
  it('todayDate returns date at midnight', () => {
    const d = todayDate()
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
    expect(d.getMilliseconds()).toBe(0)
  })

  it('addDays adds the correct number of days', () => {
    const base = new Date(2025, 6, 15)
    const next = addDays(base, 1)
    expect(next.getDate()).toBe(16)

    const prev = addDays(base, -1)
    expect(prev.getDate()).toBe(14)

    const crossMonth = addDays(new Date(2025, 6, 31), 1)
    expect(crossMonth.getMonth()).toBe(7)
    expect(crossMonth.getDate()).toBe(1)
  })
})

describe('calculateLongestStreak', () => {
  it('returns 0 for empty dates', () => {
    expect(calculateLongestStreak([])).toBe(0)
  })

  it('returns 1 for a single date', () => {
    expect(calculateLongestStreak([new Date(2025, 6, 15)])).toBe(1)
  })

  it('calculates continuous streak', () => {
    const dates = [
      new Date(2025, 6, 15),
      new Date(2025, 6, 16),
      new Date(2025, 6, 17),
      new Date(2025, 6, 18)
    ]
    expect(calculateLongestStreak(dates)).toBe(4)
  })

  it('handles out-of-order dates', () => {
    const dates = [
      new Date(2025, 6, 18),
      new Date(2025, 6, 15),
      new Date(2025, 6, 17),
      new Date(2025, 6, 16)
    ]
    expect(calculateLongestStreak(dates)).toBe(4)
  })

  it('picks the longest streak across gaps', () => {
    const dates = [
      new Date(2025, 6, 10),
      new Date(2025, 6, 11),
      new Date(2025, 6, 15),
      new Date(2025, 6, 16),
      new Date(2025, 6, 17)
    ]
    expect(calculateLongestStreak(dates)).toBe(3)
  })

  it('does not count same day twice', () => {
    const dates = [new Date(2025, 6, 15), new Date(2025, 6, 15)]
    expect(calculateLongestStreak(dates)).toBe(1)
  })
})

describe('calculateCheckInPoints', () => {
  it('calculates points by streak and base score', () => {
    expect(calculateCheckInPoints(1, 10)).toBe(10)
    expect(calculateCheckInPoints(3, 10)).toBe(30)
    expect(calculateCheckInPoints(5, 20)).toBe(100)
  })

  it('falls back to minimum values for invalid inputs', () => {
    expect(calculateCheckInPoints(0, 10)).toBe(10)
    expect(calculateCheckInPoints(2, 0)).toBe(2)
    expect(calculateCheckInPoints(-1, -5)).toBe(1)
  })
})

describe('canTransfer', () => {
  it('allows transfer when balance is sufficient', () => {
    expect(canTransfer(100, 30)).toEqual({ ok: true })
    expect(canTransfer(30, 30)).toEqual({ ok: true })
  })

  it('rejects transfer when balance is insufficient', () => {
    expect(canTransfer(20, 30)).toEqual({ ok: false, reason: '积分不足' })
    expect(canTransfer(0, 1)).toEqual({ ok: false, reason: '积分不足' })
  })

  it('rejects invalid transfer amount', () => {
    expect(canTransfer(100, 0)).toEqual({
      ok: false,
      reason: '转账积分必须为正整数'
    })
    expect(canTransfer(100, -10)).toEqual({
      ok: false,
      reason: '转账积分必须为正整数'
    })
    expect(canTransfer(100, 10.5)).toEqual({
      ok: false,
      reason: '转账积分必须为正整数'
    })
  })
})

describe('resolveCouponStatus', () => {
  const now = new Date(2025, 6, 15, 12, 0, 0)

  it('keeps unused status when not expired', () => {
    expect(
      resolveCouponStatus('unused', now, new Date(2025, 6, 20), null)
    ).toBe('unused')
  })

  it('marks unused coupon as expired when past expiry', () => {
    expect(
      resolveCouponStatus('unused', now, new Date(2025, 6, 10), null)
    ).toBe('expired')
  })

  it('keeps used status regardless of expiry', () => {
    expect(
      resolveCouponStatus('used', now, new Date(2025, 6, 10), new Date())
    ).toBe('used')
  })

  it('treats usedAt presence as used', () => {
    expect(
      resolveCouponStatus('unused', now, new Date(2025, 6, 20), new Date())
    ).toBe('used')
  })

  it('keeps expired status', () => {
    expect(resolveCouponStatus('expired', now, null, null)).toBe('expired')
  })

  it('treats no expiry as never expired', () => {
    expect(resolveCouponStatus('unused', now, null, null)).toBe('unused')
  })
})
