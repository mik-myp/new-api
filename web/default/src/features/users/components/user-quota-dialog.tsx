/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getCurrencyDisplay, getCurrencyLabel } from '@/lib/currency'
import { formatQuota, parseQuotaFromDollars } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/dialog'
import { adjustUserQuota, batchAdjustUserQuota } from '../api'
import type { QuotaAdjustMode } from '../types'

interface UserQuotaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: number
  currentQuota?: number
  userIds?: number[]
  onSuccess: () => void
}

const QUOTA_MODES: QuotaAdjustMode[] = [
  'add',
  'subtract',
  'override',
  'multiply',
  'divide',
]

export function UserQuotaDialog(props: UserQuotaDialogProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<QuotaAdjustMode>('add')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const { meta: currencyMeta } = getCurrencyDisplay()
  const currencyLabel = getCurrencyLabel()
  const tokensOnly = currencyMeta.kind === 'tokens'
  const selectedUserIds = props.userIds ?? []
  const isBatch = selectedUserIds.length > 0
  const isFactorMode = mode === 'multiply' || mode === 'divide'

  const amountValue = parseFloat(amount) || 0
  const quotaValue = parseQuotaFromDollars(Math.abs(amountValue))
  const factorValue = amountValue

  const getModeLabel = (value: QuotaAdjustMode) => {
    switch (value) {
      case 'add':
        return t('Add')
      case 'subtract':
        return t('Subtract')
      case 'override':
        return t('Override')
      case 'multiply':
        return t('Multiply')
      case 'divide':
        return t('Divide')
    }
  }

  const getPreviewText = () => {
    if (isBatch) {
      return t('Selected users will be updated in bulk', {
        count: selectedUserIds.length,
      })
    }

    const current = props.currentQuota ?? 0
    switch (mode) {
      case 'add':
        return `${t('Current quota')}: ${formatQuota(current)}  +${formatQuota(quotaValue)} = ${formatQuota(current + quotaValue)}`
      case 'subtract':
        return `${t('Current quota')}: ${formatQuota(current)}  -${formatQuota(quotaValue)} = ${formatQuota(current - quotaValue)}`
      case 'override': {
        const overrideQuota = parseQuotaFromDollars(amountValue)
        return `${t('Current quota')}: ${formatQuota(current)} -> ${formatQuota(overrideQuota)}`
      }
      case 'multiply':
        return `${t('Current quota')}: ${formatQuota(current)} x ${factorValue || 0} = ${formatQuota(Math.round(current * factorValue))}`
      case 'divide': {
        const result =
          factorValue > 0 ? formatQuota(Math.round(current / factorValue)) : '-'
        return `${t('Current quota')}: ${formatQuota(current)} / ${factorValue || 0} = ${result}`
      }
    }
  }

  const resetForm = () => {
    setAmount('')
    setMode('add')
  }

  const getPayloadValue = () => {
    if (isFactorMode) {
      return { factor: factorValue }
    }
    const value =
      mode === 'override' ? parseQuotaFromDollars(amountValue) : quotaValue
    return { value: mode === 'override' ? value : Math.abs(value) }
  }

  const validateInput = () => {
    if (isFactorMode) {
      return factorValue > 0
    }
    if (mode === 'override') {
      return amount !== ''
    }
    return Boolean(amount) && quotaValue > 0
  }

  const handleConfirm = async () => {
    if (!validateInput()) return

    setLoading(true)
    try {
      const payloadValue = getPayloadValue()
      if (isBatch) {
        const result = await batchAdjustUserQuota({
          ids: selectedUserIds,
          mode,
          ...payloadValue,
        })
        if (result.success) {
          if (result.data?.skipped_count) {
            toast.success(
              t('Quota adjusted successfully, skipped {{count}} users', {
                count: result.data.skipped_count,
              })
            )
          } else {
            toast.success(t('Quota adjusted successfully'))
          }
          resetForm()
          props.onOpenChange(false)
          props.onSuccess()
        } else {
          toast.error(result.message || t('Failed to adjust quota'))
        }
        return
      }

      const result = await adjustUserQuota({
        id: props.userId ?? 0,
        action: 'add_quota',
        mode,
        ...payloadValue,
      })
      if (result.success) {
        toast.success(t('Quota adjusted successfully'))
        resetForm()
        props.onOpenChange(false)
        props.onSuccess()
      } else {
        toast.error(result.message || t('Failed to adjust quota'))
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('Failed to adjust quota'))
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    resetForm()
    props.onOpenChange(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    props.onOpenChange(open)
  }

  const placeholder = isFactorMode
    ? t('Enter factor')
    : tokensOnly
      ? t('Enter amount in tokens')
      : t('Enter amount in {{currency}}', { currency: currencyLabel })

  return (
    <Dialog
      open={props.open}
      onOpenChange={handleOpenChange}
      title={t('Adjust Quota')}
      description={t('Select an operation mode and enter the amount')}
      contentHeight='auto'
      bodyClassName='space-y-4'
      footer={
        <>
          <Button variant='outline' onClick={handleCancel}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? t('Processing...') : t('Confirm')}
          </Button>
        </>
      }
    >
      <div className='space-y-4'>
        <div className='text-muted-foreground text-sm'>{getPreviewText()}</div>

        <div className='space-y-2'>
          <Label>{t('Mode')}</Label>
          <div className='flex flex-wrap gap-1'>
            {QUOTA_MODES.map((quotaMode) => (
              <Button
                key={quotaMode}
                type='button'
                variant='outline'
                size='sm'
                className={cn(
                  mode === quotaMode &&
                    'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                )}
                onClick={() => {
                  setMode(quotaMode)
                  setAmount(
                    quotaMode === 'multiply' || quotaMode === 'divide'
                      ? '2'
                      : ''
                  )
                }}
              >
                {getModeLabel(quotaMode)}
              </Button>
            ))}
          </div>
        </div>

        <div className='space-y-2'>
          <Label>
            {isFactorMode ? t('Factor') : `${t('Amount')} (${currencyLabel})`}
          </Label>
          <Input
            type='number'
            step={isFactorMode ? 0.1 : tokensOnly ? 1 : 0.000001}
            min={mode === 'override' && !isFactorMode ? undefined : 0}
            placeholder={placeholder}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm()
            }}
          />
        </div>
      </div>
    </Dialog>
  )
}
