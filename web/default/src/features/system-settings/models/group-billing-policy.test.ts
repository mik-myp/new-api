import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  isGroupBillingPolicy,
  parseGroupBillingPolicyRows,
  serializeGroupBillingPolicyRows,
} from './group-billing-policy'

describe('group billing policy helpers', () => {
  test('parses group sources into editable rows', () => {
    const rows = parseGroupBillingPolicyRows(
      '{"gpt-lite":{"sources":["wallet"]},"gpt-subscribe":{"sources":["subscription","wallet"]}}'
    )

    assert.deepEqual(rows, [
      {
        id: 'gpt-lite',
        group: 'gpt-lite',
        wallet: true,
        subscription: false,
      },
      {
        id: 'gpt-subscribe',
        group: 'gpt-subscribe',
        wallet: true,
        subscription: true,
      },
    ])
  })

  test('serializes rows with canonical source order', () => {
    const value = serializeGroupBillingPolicyRows([
      {
        id: 'row-1',
        group: 'gpt-subscribe',
        wallet: true,
        subscription: true,
      },
      {
        id: 'row-2',
        group: 'gpt-lite',
        wallet: true,
        subscription: false,
      },
    ])

    assert.equal(
      value,
      '{"gpt-subscribe":{"sources":["wallet","subscription"]},"gpt-lite":{"sources":["wallet"]}}'
    )
  })

  test('validates supported source names and non-empty source lists', () => {
    assert.equal(
      isGroupBillingPolicy({
        'gpt-lite': { sources: ['wallet'] },
        'gpt-subscribe': { sources: ['wallet', 'subscription'] },
      }),
      true
    )
    assert.equal(
      isGroupBillingPolicy({ bad: { sources: ['credits'] } }),
      false
    )
    assert.equal(isGroupBillingPolicy({ empty: { sources: [] } }), false)
  })
})
