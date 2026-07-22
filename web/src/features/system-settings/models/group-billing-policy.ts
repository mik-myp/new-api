export type GroupBillingSource = 'wallet' | 'subscription'

export type GroupBillingPolicyRule = {
  sources: GroupBillingSource[]
}

export type GroupBillingPolicy = Record<string, GroupBillingPolicyRule>

export type GroupBillingPolicyRow = {
  id: string
  group: string
  wallet: boolean
  subscription: boolean
}

const GROUP_BILLING_SOURCES: GroupBillingSource[] = ['wallet', 'subscription']

export function isGroupBillingPolicy(
  value: unknown
): value is GroupBillingPolicy {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  return Object.values(value).every((rule) => {
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
      return false
    }

    const sources = (rule as { sources?: unknown }).sources
    return (
      Array.isArray(sources) &&
      sources.length > 0 &&
      sources.every((source) =>
        GROUP_BILLING_SOURCES.includes(source as GroupBillingSource)
      )
    )
  })
}

export function parseGroupBillingPolicyRows(
  value: string
): GroupBillingPolicyRow[] {
  const raw = value.trim()
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!isGroupBillingPolicy(parsed)) return []

    return Object.entries(parsed).map(([group, rule]) => ({
      id: group,
      group,
      wallet: rule.sources.includes('wallet'),
      subscription: rule.sources.includes('subscription'),
    }))
  } catch {
    return []
  }
}

export function serializeGroupBillingPolicyRows(
  rows: GroupBillingPolicyRow[]
): string {
  const policy: GroupBillingPolicy = {}

  for (const row of rows) {
    const group = row.group.trim()
    if (!group) continue

    const sources = GROUP_BILLING_SOURCES.filter((source) => {
      if (source === 'wallet') return row.wallet
      return row.subscription
    })

    policy[group] = { sources }
  }

  return JSON.stringify(policy)
}
