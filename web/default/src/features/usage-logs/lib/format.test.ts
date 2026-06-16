import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { getLocalizedLogContent, renderAuditContent } from './format'

const t = (key: string, opts?: Record<string, unknown>) =>
  key.replace(/\{\{(\w+)}}/g, (_, name: string) => String(opts?.[name] ?? ''))

describe('usage log audit content formatting', () => {
  test('renders quota multiply and divide audit actions from structured params', () => {
    assert.equal(
      renderAuditContent(
        {
          op: {
            action: 'user.quota_multiply',
            params: { from: '$10.00', to: '$20.00', factor: '2' },
          },
        },
        t
      ),
      'Multiplied user quota from $10.00 to $20.00 by 2'
    )

    assert.equal(
      renderAuditContent(
        {
          op: {
            action: 'user.quota_divide',
            params: { from: '$20.00', to: '$10.00', factor: '2' },
          },
        },
        t
      ),
      'Divided user quota from $20.00 to $10.00 by 2'
    )
  })

  test('uses localized audit text for the details dialog content of manage logs', () => {
    assert.equal(
      getLocalizedLogContent(
        3,
        'Multiplied user quota from $10.00 to $20.00 by 2',
        {
          op: {
            action: 'user.quota_multiply',
            params: { from: '$10.00', to: '$20.00', factor: '2' },
          },
        },
        (key, opts) => `[zh] ${t(key, opts)}`
      ),
      '[zh] Multiplied user quota from $10.00 to $20.00 by 2'
    )
  })
})
