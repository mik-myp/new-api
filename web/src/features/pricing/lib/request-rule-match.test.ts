import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  getRequestRuleGroupMatchesAt,
  getRequestRuleMultiplierAt,
} from './request-rule-match'

describe('request rule multiplier evaluation', () => {
  test('matches the Shanghai overnight rule for a usage log timestamp', () => {
    const result = getRequestRuleMultiplierAt(
      '(hour("Asia/Shanghai") >= 18 || hour("Asia/Shanghai") < 8 ? 0.8 : 1)',
      Date.UTC(2026, 5, 15, 23, 59, 59) / 1000
    )

    assert.equal(result?.multiplier, 0.8)
    assert.equal(result?.matchedCount, 1)
  })

  test('does not match the Shanghai overnight rule outside the window', () => {
    const result = getRequestRuleMultiplierAt(
      '(hour("Asia/Shanghai") >= 18 || hour("Asia/Shanghai") < 8 ? 0.8 : 1)',
      Date.UTC(2026, 5, 16, 1, 15, 0) / 1000
    )

    assert.equal(result?.multiplier, 1)
    assert.equal(result?.matchedCount, 0)
  })

  test('multiplies all matched time rule groups', () => {
    const result = getRequestRuleMultiplierAt(
      '(weekday("Asia/Shanghai") == 0 ? 0.8 : 1) * (hour("Asia/Shanghai") >= 18 || hour("Asia/Shanghai") < 8 ? 0.8 : 1)',
      Date.UTC(2026, 5, 14, 12, 30, 0) / 1000
    )

    assert.equal(result?.multiplier, 0.64)
    assert.equal(result?.matchedCount, 2)
  })

  test('reports only the overnight group as matched on a weekday morning', () => {
    const result = getRequestRuleGroupMatchesAt(
      '(weekday("Asia/Shanghai") == 0 ? 0.8 : 1) * (weekday("Asia/Shanghai") == 6 ? 0.8 : 1) * (hour("Asia/Shanghai") >= 18 || hour("Asia/Shanghai") < 8 ? 0.8 : 1)',
      Date.UTC(2026, 5, 15, 23, 59, 59) / 1000
    )

    assert.deepEqual(
      result?.groups.map((group) => group.matched),
      [false, false, true]
    )
  })

  test('reports both Sunday and overnight groups as matched on Sunday night', () => {
    const result = getRequestRuleGroupMatchesAt(
      '(weekday("Asia/Shanghai") == 0 ? 0.8 : 1) * (weekday("Asia/Shanghai") == 6 ? 0.8 : 1) * (hour("Asia/Shanghai") >= 18 || hour("Asia/Shanghai") < 8 ? 0.8 : 1)',
      Date.UTC(2026, 5, 14, 12, 30, 0) / 1000
    )

    assert.deepEqual(
      result?.groups.map((group) => group.matched),
      [true, false, true]
    )
  })
})
