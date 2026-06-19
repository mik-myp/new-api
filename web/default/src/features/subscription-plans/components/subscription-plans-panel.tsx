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
import { useState, useEffect, useMemo, useCallback } from 'react'
import { ArrowRight, Check, Crown, RefreshCw, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TitledCard } from '@/components/ui/titled-card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  StatusBadge,
  dotColorMap,
  textColorMap,
} from '@/components/status-badge'
import {
  getPublicPlans,
  getSelfSubscriptionFull,
  updateBillingPreference,
} from '@/features/subscriptions/api'
import { SubscriptionPurchaseDialog } from '@/features/subscriptions/components/dialogs/subscription-purchase-dialog'
import { formatDuration, formatResetPeriod } from '@/features/subscriptions/lib'
import type {
  PlanRecord,
  SubscriptionPlan,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'
import type { PaymentMethod, TopupInfo } from '@/features/wallet/types'

interface SubscriptionPlansPanelProps {
  topupInfo: TopupInfo | null
  onAvailabilityChange?: (available: boolean) => void
  userQuota?: number
  onPurchaseSuccess?: () => void | Promise<void>
}

type PurchasePeriod = 'day' | 'week' | 'month'
type PurchasePeriodFilter = 'all' | PurchasePeriod

const purchaseCardClassName =
  'border-primary/15 bg-gradient-to-br from-primary/5 via-background to-muted/35 dark:from-primary/10 dark:via-background dark:to-muted/20'

const purchaseBadgeClassName =
  'border border-primary/20 bg-primary/10 text-primary'

function getEpayMethods(payMethods: PaymentMethod[] = []): PaymentMethod[] {
  return payMethods.filter(
    (m) => m?.type && m.type !== 'stripe' && m.type !== 'creem'
  )
}

function getBillingPreferenceLabel(
  preference: string,
  t: (key: string) => string
): string {
  switch (preference) {
    case 'subscription_first':
      return t('Subscription First')
    case 'wallet_first':
      return t('Wallet First')
    case 'subscription_only':
      return t('Subscription Only')
    case 'wallet_only':
      return t('Wallet Only')
    default:
      return preference
  }
}

function formatPlanPrice(amount: number, currency: string): string {
  const normalizedCurrency = currency || 'USD'
  if (normalizedCurrency.toUpperCase() === 'USD') {
    const formattedAmount = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
    }).format(amount)
    return `$${formattedAmount}`
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${normalizedCurrency} ${amount.toFixed(2)}`
  }
}

function getPlanPeriodFilter(
  plan?: Partial<SubscriptionPlan>
): PurchasePeriod | null {
  const unit = plan?.duration_unit
  const value = Number(plan?.duration_value || 0)

  if (unit === 'month' && value === 1) return 'month'
  if (unit === 'day' && value === 7) return 'week'
  if (unit === 'day' && value === 1) return 'day'
  if (unit === 'hour' && value === 24) return 'day'

  if (unit === 'custom') {
    const seconds = Number(plan?.custom_seconds || 0)
    if (seconds === 86400) return 'day'
    if (seconds === 7 * 86400) return 'week'
  }

  return null
}

function getPurchasePeriodLabel(
  period: PurchasePeriod,
  t: (key: string) => string
) {
  if (period === 'day') return t('Day Plans')
  if (period === 'week') return t('Week Plans')
  return t('Month Plans')
}

function getPlanDurationSeconds(plan?: Partial<SubscriptionPlan>): number {
  const value = Number(plan?.duration_value || 0)

  switch (plan?.duration_unit) {
    case 'year':
      return value * 365 * 86400
    case 'month':
      return value * 30 * 86400
    case 'day':
      return value * 86400
    case 'hour':
      return value * 3600
    case 'custom':
      return Number(plan?.custom_seconds || 0)
    default:
      return 0
  }
}

function getQuotaResetMultiplier(plan?: Partial<SubscriptionPlan>): number {
  const unit = plan?.duration_unit
  const value = Number(plan?.duration_value || 0)
  const period = plan?.quota_reset_period || 'never'

  if (period === 'daily') {
    if (unit === 'year') return Math.max(1, value * 365)
    if (unit === 'month') return Math.max(1, value * 30)
    if (unit === 'day') return Math.max(1, value)
    if (unit === 'hour') return Math.max(1, Math.ceil(value / 24))
    if (unit === 'custom') {
      return Math.max(1, Math.ceil(Number(plan?.custom_seconds || 0) / 86400))
    }
    return 1
  }

  if (period === 'weekly') {
    if (unit === 'year') return Math.max(1, Math.ceil((value * 365) / 7))
    if (unit === 'month') return Math.max(1, Math.ceil((value * 30) / 7))
    if (unit === 'day') return Math.max(1, Math.ceil(value / 7))
    if (unit === 'hour') return Math.max(1, Math.ceil(value / (24 * 7)))
    if (unit === 'custom') {
      return Math.max(
        1,
        Math.ceil(Number(plan?.custom_seconds || 0) / (7 * 86400))
      )
    }
    return 1
  }

  if (period === 'monthly') {
    if (unit === 'year') return Math.max(1, value * 12)
    if (unit === 'month') return Math.max(1, value)
    if (unit === 'day') return Math.max(1, Math.ceil(value / 30))
    if (unit === 'hour') return Math.max(1, Math.ceil(value / (24 * 30)))
    if (unit === 'custom') {
      return Math.max(
        1,
        Math.ceil(Number(plan?.custom_seconds || 0) / (30 * 86400))
      )
    }
    return 1
  }

  if (period === 'custom') {
    const durationSeconds = getPlanDurationSeconds(plan)
    const customSeconds = Number(plan?.quota_reset_custom_seconds || 0)
    if (durationSeconds > 0 && customSeconds > 0) {
      return Math.max(1, Math.ceil(durationSeconds / customSeconds))
    }
  }

  return 1
}

export function SubscriptionPlansPanel({
  topupInfo,
  onAvailabilityChange,
  userQuota,
  onPurchaseSuccess,
}: SubscriptionPlansPanelProps) {
  const { t } = useTranslation()

  const [plans, setPlans] = useState<PlanRecord[]>([])
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    UserSubscriptionRecord[]
  >([])
  const [allSubscriptions, setAllSubscriptions] = useState<
    UserSubscriptionRecord[]
  >([])
  const [billingPreference, setBillingPreference] =
    useState('subscription_first')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanRecord | null>(null)
  const [activeTab, setActiveTab] = useState('my')
  const [purchasePeriodFilter, setPurchasePeriodFilter] =
    useState<PurchasePeriodFilter>('all')

  const enableStripe = !!topupInfo?.enable_stripe_topup
  const enableCreem = !!topupInfo?.enable_creem_topup
  const enableWaffoPancake = !!topupInfo?.enable_waffo_pancake_topup
  const enableOnlineTopUp = !!topupInfo?.enable_online_topup
  const epayMethods = useMemo(
    () => getEpayMethods(topupInfo?.pay_methods),
    [topupInfo?.pay_methods]
  )

  const fetchPlans = useCallback(async () => {
    try {
      const res = await getPublicPlans()
      if (res.success) {
        setPlans(res.data || [])
      }
    } catch {
      setPlans([])
    }
  }, [])

  const fetchSelfSubscription = useCallback(async () => {
    try {
      const res = await getSelfSubscriptionFull()
      if (res.success && res.data) {
        setBillingPreference(
          res.data.billing_preference || 'subscription_first'
        )
        setActiveSubscriptions(res.data.subscriptions || [])
        setAllSubscriptions(res.data.all_subscriptions || [])
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchPlans(), fetchSelfSubscription()])
      setLoading(false)
    }
    init()
  }, [fetchPlans, fetchSelfSubscription])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchSelfSubscription()
    } finally {
      setRefreshing(false)
    }
  }

  const handlePreferenceChange = async (pref: string) => {
    const previous = billingPreference
    setBillingPreference(pref)
    try {
      const res = await updateBillingPreference(pref)
      if (res.success) {
        toast.success(t('Updated successfully'))
        const normalized = res.data?.billing_preference || pref
        setBillingPreference(normalized)
      } else {
        toast.error(res.message || t('Update failed'))
        setBillingPreference(previous)
      }
    } catch {
      toast.error(t('Request failed'))
      setBillingPreference(previous)
    }
  }

  const hasActive = activeSubscriptions.length > 0
  const hasAny = allSubscriptions.length > 0
  const isAvailable = loading || plans.length > 0 || hasAny
  const disablePref = !hasActive
  const isSubPref =
    billingPreference === 'subscription_first' ||
    billingPreference === 'subscription_only'
  const displayPref =
    disablePref && isSubPref ? 'wallet_first' : billingPreference

  const planPurchaseCountMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const sub of allSubscriptions) {
      const planId = sub?.subscription?.plan_id
      if (!planId) continue
      map.set(planId, (map.get(planId) || 0) + 1)
    }
    return map
  }, [allSubscriptions])

  const planPeriodCounts = useMemo(() => {
    const counts: Record<PurchasePeriodFilter, number> = {
      all: plans.length,
      day: 0,
      week: 0,
      month: 0,
    }
    for (const record of plans) {
      const period = getPlanPeriodFilter(record?.plan)
      if (period) counts[period] += 1
    }
    return counts
  }, [plans])

  const purchasePeriodOptions = useMemo(() => {
    const options: Array<{ value: PurchasePeriodFilter; label: string }> = [
      { value: 'all', label: t('All') },
    ]
    const periodOptions: Array<{ value: PurchasePeriod; label: string }> = [
      { value: 'day', label: t('Day Plans') },
      { value: 'week', label: t('Week Plans') },
      { value: 'month', label: t('Month Plans') },
    ]

    for (const option of periodOptions) {
      if (planPeriodCounts[option.value] > 0) {
        options.push(option)
      }
    }

    return options
  }, [planPeriodCounts, t])

  const filteredPlans = useMemo(() => {
    if (purchasePeriodFilter === 'all') return plans
    return plans.filter(
      (record) => getPlanPeriodFilter(record?.plan) === purchasePeriodFilter
    )
  }, [plans, purchasePeriodFilter])

  useEffect(() => {
    const hasCurrentOption = purchasePeriodOptions.some(
      (option) => option.value === purchasePeriodFilter
    )
    if (hasCurrentOption) {
      return
    }
    setPurchasePeriodFilter(purchasePeriodOptions[0]?.value || 'all')
  }, [purchasePeriodFilter, purchasePeriodOptions])

  useEffect(() => {
    onAvailabilityChange?.(isAvailable)
  }, [isAvailable, onAvailabilityChange])

  const planTitleMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of plans) {
      if (p?.plan?.id) {
        map.set(p.plan.id, p.plan.title || '')
      }
    }
    return map
  }, [plans])

  const getRemainingDays = (sub: UserSubscriptionRecord) => {
    const endTime = sub?.subscription?.end_time || 0
    if (!endTime) return 0
    const now = Date.now() / 1000
    return Math.max(0, Math.ceil((endTime - now) / 86400))
  }

  const getUsagePercent = (sub: UserSubscriptionRecord) => {
    const total = Number(sub?.subscription?.amount_total || 0)
    const used = Number(sub?.subscription?.amount_used || 0)
    if (total <= 0) return 0
    return Math.round((used / total) * 100)
  }

  if (loading) {
    return (
      <Card className='gap-0 overflow-hidden py-0'>
        <CardHeader className='border-b p-3 !pb-3 sm:p-5 sm:!pb-5'>
          <Skeleton className='h-6 w-32' />
        </CardHeader>
        <CardContent className='space-y-4 p-3 sm:p-5'>
          <Skeleton className='h-20 w-full' />
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className='h-48 w-full' />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <TitledCard
        title={t('Subscription')}
        description={t('Subscribe to a plan for model access')}
        icon={<Crown className='h-4 w-4' />}
        contentClassName='space-y-4 sm:space-y-5'
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className='gap-4'>
          <TabsList className='max-w-full flex-wrap justify-start gap-1 rounded-xl p-1 group-data-horizontal/tabs:h-auto sm:group-data-horizontal/tabs:h-10'>
            <TabsTrigger value='my' className='px-3'>
              {t('My Subscriptions')}
            </TabsTrigger>
            <TabsTrigger value='purchase' className='px-3'>
              {t('Purchase Subscription')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value='my' className='space-y-4'>
            <div className='bg-background/60 rounded-xl border p-3 sm:p-4'>
              <div className='grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center'>
                <div className='flex min-w-0 flex-wrap items-center gap-2'>
                  <div className='border-input bg-background flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium'>
                    <span
                      className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        hasActive ? dotColorMap.success : dotColorMap.neutral
                      )}
                      aria-hidden='true'
                    />
                    {hasActive ? (
                      <span className={cn(textColorMap.success)}>
                        {activeSubscriptions.length} {t('active')}
                      </span>
                    ) : (
                      <span className='text-muted-foreground'>
                        {t('No Active')}
                      </span>
                    )}
                  </div>
                  <div className='border-input bg-background flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium'>
                    <span className='text-muted-foreground'>
                      {t('My Subscriptions')}
                    </span>
                    <span>{allSubscriptions.length}</span>
                    {allSubscriptions.length > activeSubscriptions.length && (
                      <span className='text-muted-foreground'>
                        / {allSubscriptions.length - activeSubscriptions.length}{' '}
                        {t('expired')}
                      </span>
                    )}
                  </div>
                </div>
                <div className='flex w-full items-center gap-2 lg:w-auto'>
                  <Select
                    items={[
                      {
                        value: 'subscription_first',
                        label: (
                          <>
                            {getBillingPreferenceLabel('subscription_first', t)}
                            {disablePref ? ` (${t('No Active')})` : ''}
                          </>
                        ),
                      },
                      {
                        value: 'wallet_first',
                        label: getBillingPreferenceLabel('wallet_first', t),
                      },
                      {
                        value: 'subscription_only',
                        label: (
                          <>
                            {getBillingPreferenceLabel('subscription_only', t)}
                            {disablePref ? ` (${t('No Active')})` : ''}
                          </>
                        ),
                      },
                      {
                        value: 'wallet_only',
                        label: getBillingPreferenceLabel('wallet_only', t),
                      },
                    ]}
                    value={displayPref}
                    onValueChange={(v) =>
                      v !== null && handlePreferenceChange(v)
                    }
                  >
                    <SelectTrigger className='h-8 flex-1 text-xs lg:w-[150px] lg:flex-none'>
                      <SelectValue>
                        {getBillingPreferenceLabel(displayPref, t)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        <SelectItem
                          value='subscription_first'
                          disabled={disablePref}
                        >
                          {getBillingPreferenceLabel('subscription_first', t)}
                          {disablePref ? ` (${t('No Active')})` : ''}
                        </SelectItem>
                        <SelectItem value='wallet_first'>
                          {getBillingPreferenceLabel('wallet_first', t)}
                        </SelectItem>
                        <SelectItem
                          value='subscription_only'
                          disabled={disablePref}
                        >
                          {getBillingPreferenceLabel('subscription_only', t)}
                          {disablePref ? ` (${t('No Active')})` : ''}
                        </SelectItem>
                        <SelectItem value='wallet_only'>
                          {getBillingPreferenceLabel('wallet_only', t)}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8'
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>
              </div>

              {disablePref && isSubPref && (
                <p className='text-muted-foreground mt-2 text-xs'>
                  {t(
                    'Preference saved as {{pref}}, but no active subscription. Wallet will be used automatically.',
                    {
                      pref:
                        billingPreference === 'subscription_only'
                          ? t('Subscription Only')
                          : t('Subscription First'),
                    }
                  )}
                </p>
              )}

              {hasAny && (
                <>
                  <Separator className='my-4' />
                  <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
                    {allSubscriptions.map((sub) => {
                      const subscription = sub.subscription
                      const totalAmount = Number(
                        subscription?.amount_total || 0
                      )
                      const usedAmount = Number(subscription?.amount_used || 0)
                      const remainAmount =
                        totalAmount > 0
                          ? Math.max(0, totalAmount - usedAmount)
                          : 0
                      const planTitle =
                        planTitleMap.get(subscription?.plan_id) || ''
                      const remainDays = getRemainingDays(sub)
                      const usagePercent = getUsagePercent(sub)
                      const now = Date.now() / 1000
                      const isExpired = (subscription?.end_time || 0) < now
                      const isCancelled = subscription?.status === 'cancelled'
                      const isActive =
                        subscription?.status === 'active' && !isExpired
                      const usageTone =
                        usagePercent >= 90
                          ? '[&_[data-slot=progress-indicator]]:bg-destructive'
                          : usagePercent >= 70
                            ? '[&_[data-slot=progress-indicator]]:bg-amber-500'
                            : '[&_[data-slot=progress-indicator]]:bg-emerald-500'

                      const statusBadge = isActive ? (
                        <StatusBadge
                          label={t('Active')}
                          variant='success'
                          copyable={false}
                          className='shrink-0'
                        />
                      ) : isCancelled ? (
                        <StatusBadge
                          label={t('Cancelled')}
                          variant='neutral'
                          copyable={false}
                          className='shrink-0'
                        />
                      ) : (
                        <StatusBadge
                          label={t('Expired')}
                          variant='neutral'
                          copyable={false}
                          className='shrink-0'
                        />
                      )

                      return (
                        <Card
                          key={subscription?.id}
                          className={cn(
                            'flex h-full transition-shadow hover:shadow-md',
                            isActive && 'border-primary/50 shadow-sm'
                          )}
                        >
                          <CardContent className='flex h-full flex-col p-3.5 sm:p-4'>
                            <div className='flex min-h-12 items-start justify-between gap-3'>
                              <div className='min-w-0'>
                                <h4 className='truncate font-semibold'>
                                  {planTitle || t('Subscription')}
                                </h4>
                                <p className='text-muted-foreground truncate text-xs'>
                                  {t('Subscription')} #{subscription?.id}
                                </p>
                              </div>
                              {statusBadge}
                            </div>

                            <div className='flex min-h-14 flex-col justify-center py-2'>
                              {isActive ? (
                                <span className='text-primary text-2xl font-bold'>
                                  {t('{{count}} days remaining', {
                                    count: remainDays,
                                  })}
                                </span>
                              ) : (
                                <span className='text-muted-foreground text-2xl font-bold'>
                                  {isCancelled ? t('Cancelled') : t('Expired')}
                                </span>
                              )}
                              <span className='text-muted-foreground mt-1 text-xs'>
                                {isActive
                                  ? t('Until')
                                  : isCancelled
                                    ? t('Cancelled at')
                                    : t('Expired at')}{' '}
                                {new Date(
                                  (subscription?.end_time || 0) * 1000
                                ).toLocaleString()}
                              </span>
                            </div>

                            <div className='flex-1 space-y-2 pb-3 text-xs'>
                              {isActive &&
                                (subscription?.next_reset_time ?? 0) > 0 && (
                                  <div className='text-muted-foreground flex items-center justify-between gap-3'>
                                    <span>{t('Next reset')}</span>
                                    <span className='text-foreground min-w-0 truncate text-right font-medium'>
                                      {new Date(
                                        subscription!.next_reset_time! * 1000
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                )}

                              <div className='bg-muted/35 rounded-lg border p-3'>
                                <div className='flex items-start justify-between gap-3'>
                                  <div>
                                    <div className='font-medium'>
                                      {t('Total Quota')}
                                    </div>
                                    <div className='text-muted-foreground mt-0.5'>
                                      {totalAmount > 0 ? (
                                        <Tooltip>
                                          <TooltipTrigger
                                            render={
                                              <span className='cursor-help' />
                                            }
                                          >
                                            {formatQuota(totalAmount)}
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {t('Raw Quota')}: {totalAmount}
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : (
                                        t('Unlimited')
                                      )}
                                    </div>
                                  </div>
                                  {totalAmount > 0 && (
                                    <span className='bg-background text-foreground rounded-md border px-2 py-1 text-xs font-semibold tabular-nums'>
                                      {usagePercent}%
                                    </span>
                                  )}
                                </div>

                                {totalAmount > 0 ? (
                                  <>
                                    <Progress
                                      value={usagePercent}
                                      className={cn(
                                        '[&_[data-slot=progress-track]]:bg-background mt-3 [&_[data-slot=progress-track]]:h-2',
                                        usageTone,
                                        !isActive &&
                                          '[&_[data-slot=progress-indicator]]:bg-muted-foreground/50'
                                      )}
                                    />
                                    <div className='mt-3 grid grid-cols-2 gap-2'>
                                      <div className='bg-background/80 rounded-md border px-2.5 py-2'>
                                        <div className='text-muted-foreground'>
                                          {t('Used')}
                                        </div>
                                        <div className='text-foreground mt-1 truncate font-semibold'>
                                          <Tooltip>
                                            <TooltipTrigger
                                              render={
                                                <span className='cursor-help' />
                                              }
                                            >
                                              {formatQuota(usedAmount)}
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              {t('Raw Quota')}: {usedAmount}
                                            </TooltipContent>
                                          </Tooltip>
                                        </div>
                                      </div>
                                      <div className='bg-background/80 rounded-md border px-2.5 py-2'>
                                        <div className='text-muted-foreground'>
                                          {t('Remaining')}
                                        </div>
                                        <div className='text-foreground mt-1 truncate font-semibold'>
                                          <Tooltip>
                                            <TooltipTrigger
                                              render={
                                                <span className='cursor-help' />
                                              }
                                            >
                                              {formatQuota(remainAmount)}
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              {t('Raw Quota')}: {remainAmount}
                                            </TooltipContent>
                                          </Tooltip>
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div className='text-muted-foreground bg-background/60 mt-3 rounded-md border border-dashed px-2.5 py-2'>
                                    {t('Unlimited')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </>
              )}

              {!hasAny && (
                <Empty className='mt-3 min-h-40 border'>
                  <EmptyHeader>
                    <EmptyMedia variant='icon'>
                      <Crown className='h-4 w-4' />
                    </EmptyMedia>
                    <EmptyTitle>{t('No subscription records')}</EmptyTitle>
                    <EmptyDescription>
                      {t('Subscribe to a plan for model access')}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setActiveTab('purchase')}
                    >
                      {t('Purchase Subscription')}
                      <ArrowRight className='h-3.5 w-3.5' />
                    </Button>
                  </EmptyContent>
                </Empty>
              )}
            </div>
          </TabsContent>
          <TabsContent value='purchase' className='space-y-4'>
            {plans.length > 0 ? (
              <>
                <div className='flex flex-wrap items-center gap-2'>
                  {purchasePeriodOptions.map((option) => {
                    const active = purchasePeriodFilter === option.value
                    return (
                      <button
                        key={option.value}
                        type='button'
                        aria-pressed={active}
                        onClick={() => setPurchasePeriodFilter(option.value)}
                        className={cn(
                          'border-input bg-background hover:bg-accent hover:text-accent-foreground flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors',
                          active &&
                            'border-primary/40 bg-primary/10 text-primary shadow-sm'
                        )}
                      >
                        <span>{option.label}</span>
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-0.5 text-[11px] leading-none',
                            active
                              ? 'bg-primary/15 text-primary'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {planPeriodCounts[option.value]}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {filteredPlans.length > 0 ? (
                  <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
                    {filteredPlans.map((p) => {
                      const plan = p?.plan
                      if (!plan) return null
                      const totalAmount = Number(plan.total_amount || 0)
                      const price = formatPlanPrice(
                        Number(plan.price_amount || 0),
                        plan.currency || 'USD'
                      )
                      const isPopular =
                        plans.findIndex(
                          (record) => record?.plan?.id === plan.id
                        ) === 0 && plans.length > 1
                      const limit = Number(plan.max_purchase_per_user || 0)
                      const count = planPurchaseCountMap.get(plan.id) || 0
                      const reached = limit > 0 && count >= limit

                      const resetLabel = formatResetPeriod(plan, t)
                      const hasReset = resetLabel !== t('No Reset')
                      const resetMultiplier = hasReset
                        ? getQuotaResetMultiplier(plan)
                        : 1
                      const totalQuotaDisplay = hasReset
                        ? totalAmount * resetMultiplier
                        : totalAmount

                      const benefits = [
                        `${t('Validity Period')}: ${formatDuration(plan, t)}`,
                        totalQuotaDisplay > 0
                          ? `${t('Total Quota')}: ${formatQuota(totalQuotaDisplay)}`
                          : `${t('Total Quota')}: ${t('Unlimited')}`,
                        hasReset
                          ? `${resetLabel} ${t('Quota')}: ${formatQuota(totalAmount)}`
                          : null,
                        limit > 0 ? `${t('Purchase Limit')}: ${limit}` : null,
                        plan.upgrade_group
                          ? `${t('Upgrade Group')}: ${plan.upgrade_group}`
                          : null,
                      ].filter(Boolean) as string[]
                      const planPeriod = getPlanPeriodFilter(plan)
                      const periodBadgeLabel = planPeriod
                        ? getPurchasePeriodLabel(planPeriod, t)
                        : t('Subscription Plans')

                      return (
                        <Card
                          key={plan.id}
                          className={cn(
                            'flex h-full transition-shadow hover:shadow-md',
                            purchaseCardClassName,
                            isPopular && 'border-primary/70 shadow-sm'
                          )}
                        >
                          <CardContent className='flex h-full flex-col p-3.5 sm:p-4'>
                            <div className='flex min-h-12 items-start justify-between gap-3'>
                              <div className='min-w-0'>
                                <h4 className='truncate font-semibold'>
                                  {plan.title || t('Subscription Plans')}
                                </h4>
                                {plan.subtitle && (
                                  <p className='text-muted-foreground truncate text-xs'>
                                    {plan.subtitle}
                                  </p>
                                )}
                              </div>
                              <div className='flex shrink-0 flex-col items-end gap-1'>
                                <StatusBadge
                                  label={periodBadgeLabel}
                                  variant='neutral'
                                  copyable={false}
                                  showDot={false}
                                  className={cn(
                                    'shrink-0',
                                    purchaseBadgeClassName
                                  )}
                                />
                                {isPopular && (
                                  <StatusBadge
                                    variant='info'
                                    copyable={false}
                                    className='shrink-0'
                                  >
                                    <Sparkles className='h-3 w-3' />
                                    {t('Recommended')}
                                  </StatusBadge>
                                )}
                              </div>
                            </div>

                            <div className='flex min-h-14 items-center py-2'>
                              <span className='text-primary text-2xl font-bold'>
                                {price}
                              </span>
                            </div>

                            <div className='flex-1 space-y-1.5 pb-3'>
                              {benefits.map((label) => (
                                <div
                                  key={label}
                                  className='text-muted-foreground flex items-center gap-2 text-xs'
                                >
                                  <Check className='text-primary h-3 w-3 shrink-0' />
                                  <span>{label}</span>
                                </div>
                              ))}
                            </div>

                            <Separator className='mb-3' />

                            {reached ? (
                              <Tooltip>
                                <TooltipTrigger
                                  render={<div className='mt-auto' />}
                                >
                                  <Button
                                    variant='outline'
                                    className='w-full'
                                    disabled
                                  >
                                    {t('Limit Reached')}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t('Purchase limit reached')} ({count}/{limit}
                                  )
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button
                                className='bg-primary text-primary-foreground hover:bg-primary/90 mt-auto w-full shadow-sm'
                                onClick={() => {
                                  setSelectedPlan(p)
                                  setPurchaseOpen(true)
                                }}
                              >
                                {t('Subscribe Now')}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <p className='text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm'>
                    {t('No plans available')}
                  </p>
                )}
              </>
            ) : (
              <p className='text-muted-foreground py-4 text-center text-sm'>
                {t('No plans available')}
              </p>
            )}
          </TabsContent>
        </Tabs>
      </TitledCard>

      <SubscriptionPurchaseDialog
        open={purchaseOpen}
        onOpenChange={(open) => {
          setPurchaseOpen(open)
          if (!open) {
            fetchSelfSubscription()
          }
        }}
        plan={selectedPlan}
        enableStripe={enableStripe}
        enableCreem={enableCreem}
        enableWaffoPancake={enableWaffoPancake}
        enableOnlineTopUp={enableOnlineTopUp}
        epayMethods={epayMethods}
        userQuota={userQuota}
        onPurchaseSuccess={onPurchaseSuccess}
        purchaseLimit={
          selectedPlan?.plan?.max_purchase_per_user
            ? Number(selectedPlan.plan.max_purchase_per_user)
            : undefined
        }
        purchaseCount={
          selectedPlan?.plan?.id
            ? planPurchaseCountMap.get(selectedPlan.plan.id)
            : undefined
        }
      />
    </>
  )
}
