import {
  MATCH_EQ,
  MATCH_GTE,
  MATCH_LT,
  MATCH_RANGE,
  SOURCE_TIME,
  splitBillingExprAndRequestRules,
  tryParseRequestRuleExpr,
  type RequestCondition,
  type RequestRuleGroup,
} from './billing-expr'

type ZonedTimeParts = {
  hour: number
  minute: number
  weekday: number
  month: number
  day: number
}

export type RequestRuleMultiplierResult = {
  multiplier: number
  matchedCount: number
  totalCount: number
  allTimeBased: boolean
}

export type RequestRuleGroupMatch = {
  matched: boolean
  allTimeBased: boolean
}

export type RequestRuleGroupMatchResult = {
  groups: RequestRuleGroupMatch[]
  allTimeBased: boolean
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

function getZonedTimeParts(timestampSeconds: number, timezone: string) {
  const date = new Date(timestampSeconds * 1000)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC',
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date)
  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  )

  return {
    hour: Number(byType.hour || 0),
    minute: Number(byType.minute || 0),
    weekday: WEEKDAY_INDEX[byType.weekday || ''] ?? 0,
    month: Number(byType.month || 0),
    day: Number(byType.day || 0),
  } satisfies ZonedTimeParts
}

function getTimeValue(
  cond: Extract<RequestCondition, { source: 'time' }>,
  timestampSeconds: number
) {
  const parts = getZonedTimeParts(timestampSeconds, cond.timezone)
  return parts[cond.timeFunc]
}

function matchesTimeCondition(
  cond: RequestCondition,
  timestampSeconds: number
) {
  if (cond.source !== SOURCE_TIME) return null

  const value = getTimeValue(cond, timestampSeconds)
  if (cond.mode === MATCH_RANGE) {
    const start = Number(cond.rangeStart)
    const end = Number(cond.rangeEnd)
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false
    return start <= end
      ? value >= start && value < end
      : value >= start || value < end
  }

  const expected = Number(cond.value)
  if (!Number.isFinite(expected)) return false
  if (cond.mode === MATCH_EQ) return value === expected
  if (cond.mode === MATCH_GTE) return value >= expected
  if (cond.mode === MATCH_LT) return value < expected
  return false
}

function matchesRuleGroup(group: RequestRuleGroup, timestampSeconds: number) {
  let allTimeBased = true
  for (const cond of group.conditions || []) {
    const matched = matchesTimeCondition(cond, timestampSeconds)
    if (matched == null) {
      allTimeBased = false
      continue
    }
    if (!matched) return { matched: false, allTimeBased }
  }
  return { matched: allTimeBased, allTimeBased }
}

function parseRequestRuleGroups(expr: string) {
  const split = splitBillingExprAndRequestRules(expr)
  const parsedFromFullExpr = tryParseRequestRuleExpr(
    split.requestRuleExpr || ''
  )
  return parsedFromFullExpr && parsedFromFullExpr.length > 0
    ? parsedFromFullExpr
    : tryParseRequestRuleExpr(expr)
}

export function getRequestRuleGroupMatchesAt(
  expr: string,
  timestampSeconds: number
): RequestRuleGroupMatchResult | null {
  const groups = parseRequestRuleGroups(expr)
  if (!groups || groups.length === 0 || !Number.isFinite(timestampSeconds)) {
    return null
  }

  let allTimeBased = true
  const groupMatches = groups.map((group) => {
    const result = matchesRuleGroup(group, timestampSeconds)
    allTimeBased = allTimeBased && result.allTimeBased
    return result
  })

  return {
    groups: groupMatches,
    allTimeBased,
  }
}

export function getRequestRuleMultiplierAt(
  expr: string,
  timestampSeconds: number
): RequestRuleMultiplierResult | null {
  const groups = parseRequestRuleGroups(expr)
  if (!groups || groups.length === 0 || !Number.isFinite(timestampSeconds)) {
    return null
  }

  let multiplier = 1
  let matchedCount = 0
  let allTimeBased = true

  for (const group of groups) {
    const result = matchesRuleGroup(group, timestampSeconds)
    allTimeBased = allTimeBased && result.allTimeBased
    if (!result.matched) continue

    const groupMultiplier = Number(group.multiplier)
    if (!Number.isFinite(groupMultiplier)) continue
    multiplier = Number((multiplier * groupMultiplier).toPrecision(12))
    matchedCount += 1
  }

  return {
    multiplier,
    matchedCount,
    totalCount: groups.length,
    allTimeBased,
  }
}
