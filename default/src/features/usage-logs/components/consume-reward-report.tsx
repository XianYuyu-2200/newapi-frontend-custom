import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getCurrencyLabel } from '@/lib/currency'
import { formatQuota, parseQuotaFromDollars } from '@/lib/format'

type DailyReport = {
  user_id: number
  username: string
  consume_date: string
  consume_quota: number
  refund_quota: number
  net_quota: number
  qualified: boolean
}

type RewardRecord = {
  id: number
  user_id: number
  reward_date: string
  reward_quota: number
  source: string
  status: string
  reason?: string
}

type PageResponse<T> = {
  success: boolean
  message?: string
  data: T[]
  total: number
}

type MutationResponse = {
  success: boolean
  message?: string
}

type ReportFilter = {
  userId: string
  startDate: string
  endDate: string
}

const PAGE_SIZE = 20

function toQueryString(filter: ReportFilter, page: number): string {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(PAGE_SIZE),
  })
  if (filter.userId.trim()) params.set('user_id', filter.userId.trim())
  if (filter.startDate) params.set('start_date', filter.startDate)
  if (filter.endDate) params.set('end_date', filter.endDate)
  return params.toString()
}

function Pagination(props: {
  page: number
  total: number
  onPageChange: (page: number) => void
}) {
  const { t } = useTranslation()
  const pageCount = Math.max(1, Math.ceil(props.total / PAGE_SIZE))
  const first = props.total === 0 ? 0 : (props.page - 1) * PAGE_SIZE + 1
  const last = Math.min(props.page * PAGE_SIZE, props.total)

  return (
    <div className='mt-3 flex items-center justify-between gap-3 text-sm'>
      <span className='text-muted-foreground'>
        {t('Showing {{first}}-{{last}} of {{total}}', {
          first,
          last,
          total: props.total,
        })}
      </span>
      <div className='flex gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={props.page <= 1}
          onClick={() => props.onPageChange(props.page - 1)}
        >
          {t('Previous')}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={props.page >= pageCount}
          onClick={() => props.onPageChange(props.page + 1)}
        >
          {t('Next')}
        </Button>
      </div>
    </div>
  )
}

export function ConsumeRewardReport(props: { allowManualActions?: boolean }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const currencyLabel = getCurrencyLabel()
  const [draftFilter, setDraftFilter] = useState<ReportFilter>({
    userId: '',
    startDate: '',
    endDate: '',
  })
  const [filter, setFilter] = useState<ReportFilter>(draftFilter)
  const [dailyPage, setDailyPage] = useState(1)
  const [recordPage, setRecordPage] = useState(1)
  const [grantOpen, setGrantOpen] = useState(false)
  const [revokeRecord, setRevokeRecord] = useState<RewardRecord | null>(null)
  const [grantUserId, setGrantUserId] = useState('')
  const [grantAmount, setGrantAmount] = useState('')
  const [grantReason, setGrantReason] = useState('')
  const [revokeReason, setRevokeReason] = useState('')

  const dailyReport = useQuery({
    queryKey: ['consume-reward-daily-report', filter, dailyPage],
    queryFn: async () =>
      (
        await api.get<PageResponse<DailyReport>>(
          `/api/consume-reward/daily?${toQueryString(filter, dailyPage)}`
        )
      ).data,
  })
  const rewardRecords = useQuery({
    queryKey: ['consume-reward-records', filter.userId, recordPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(recordPage),
        page_size: String(PAGE_SIZE),
      })
      if (filter.userId.trim()) params.set('user_id', filter.userId.trim())
      return (
        await api.get<PageResponse<RewardRecord>>(
          `/api/consume-reward/records?${params.toString()}`
        )
      ).data
    },
  })

  const invalidateReports = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['consume-reward-daily-report'],
      }),
      queryClient.invalidateQueries({ queryKey: ['consume-reward-records'] }),
    ])
  }

  const grantMutation = useMutation({
    mutationFn: async () => {
      const quota = parseQuotaFromDollars(Number(grantAmount))
      if (!Number.isInteger(Number(grantUserId)) || Number(grantUserId) <= 0) {
        throw new Error(t('Enter a valid user ID'))
      }
      if (quota <= 0) throw new Error(t('Enter a valid reward amount'))
      if (!grantReason.trim()) throw new Error(t('A reason is required'))
      const response = await api.post<MutationResponse>(
        '/api/consume-reward/grant',
        {
          user_id: Number(grantUserId),
          quota,
          reason: grantReason.trim(),
        }
      )
      if (!response.data.success) {
        throw new Error(response.data.message || t('Failed to grant reward'))
      }
    },
    onSuccess: async () => {
      toast.success(t('Reward granted'))
      setGrantOpen(false)
      setGrantUserId('')
      setGrantAmount('')
      setGrantReason('')
      await invalidateReports()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const revokeMutation = useMutation({
    mutationFn: async () => {
      if (!revokeRecord) return
      if (!revokeReason.trim()) throw new Error(t('A reason is required'))
      const response = await api.post<MutationResponse>(
        `/api/consume-reward/records/${revokeRecord.id}/revoke`,
        { reason: revokeReason.trim() }
      )
      if (!response.data.success) {
        throw new Error(response.data.message || t('Failed to revoke reward'))
      }
    },
    onSuccess: async () => {
      toast.success(t('Reward revoked'))
      setRevokeRecord(null)
      setRevokeReason('')
      await invalidateReports()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const applyFilter = () => {
    if (
      draftFilter.userId.trim() &&
      (!Number.isInteger(Number(draftFilter.userId)) ||
        Number(draftFilter.userId) <= 0)
    ) {
      toast.error(t('Enter a valid user ID'))
      return
    }
    setFilter({ ...draftFilter, userId: draftFilter.userId.trim() })
    setDailyPage(1)
    setRecordPage(1)
  }

  const clearFilter = () => {
    const emptyFilter = { userId: '', startDate: '', endDate: '' }
    setDraftFilter(emptyFilter)
    setFilter(emptyFilter)
    setDailyPage(1)
    setRecordPage(1)
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-end gap-3'>
        <div className='space-y-1'>
          <Label htmlFor='consume-reward-user-id'>{t('User ID')}</Label>
          <Input
            id='consume-reward-user-id'
            type='number'
            min={1}
            value={draftFilter.userId}
            onChange={(event) =>
              setDraftFilter((current) => ({
                ...current,
                userId: event.target.value,
              }))
            }
          />
        </div>
        <div className='space-y-1'>
          <Label htmlFor='consume-reward-start-date'>{t('Start date')}</Label>
          <Input
            id='consume-reward-start-date'
            type='date'
            value={draftFilter.startDate}
            onChange={(event) =>
              setDraftFilter((current) => ({
                ...current,
                startDate: event.target.value,
              }))
            }
          />
        </div>
        <div className='space-y-1'>
          <Label htmlFor='consume-reward-end-date'>{t('End date')}</Label>
          <Input
            id='consume-reward-end-date'
            type='date'
            value={draftFilter.endDate}
            onChange={(event) =>
              setDraftFilter((current) => ({
                ...current,
                endDate: event.target.value,
              }))
            }
          />
        </div>
        <Button type='button' onClick={applyFilter}>
          {t('Filter')}
        </Button>
        <Button type='button' variant='outline' onClick={clearFilter}>
          {t('Clear')}
        </Button>
        {props.allowManualActions && (
          <Button
            type='button'
            variant='outline'
            className='sm:ml-auto'
            onClick={() => setGrantOpen(true)}
          >
            {t('Grant reward manually')}
          </Button>
        )}
      </div>

      <section className='overflow-x-auto rounded-lg border'>
        <div className='border-b px-4 py-3'>
          <h3 className='font-medium'>{t('Daily consumption')}</h3>
        </div>
        <table className='w-full min-w-[700px] text-sm'>
          <thead className='bg-muted/40 text-left'>
            <tr>
              <th className='px-4 py-2'>{t('Date')}</th>
              <th className='px-4 py-2'>{t('User')}</th>
              <th className='px-4 py-2'>{t('Consumed')}</th>
              <th className='px-4 py-2'>{t('Refunded')}</th>
              <th className='px-4 py-2'>{t('Net quota')}</th>
              <th className='px-4 py-2'>{t('Qualified')}</th>
            </tr>
          </thead>
          <tbody>
            {dailyReport.data?.data.map((item) => (
              <tr
                key={`${item.user_id}-${item.consume_date}`}
                className='border-t'
              >
                <td className='px-4 py-2'>{item.consume_date}</td>
                <td className='px-4 py-2'>
                  {item.username || `#${item.user_id}`}
                </td>
                <td className='px-4 py-2'>{formatQuota(item.consume_quota)}</td>
                <td className='px-4 py-2'>{formatQuota(item.refund_quota)}</td>
                <td className='px-4 py-2'>{formatQuota(item.net_quota)}</td>
                <td className='px-4 py-2'>
                  {item.qualified ? t('Yes') : t('No')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {dailyReport.isLoading ? (
          <p className='text-muted-foreground px-4 py-3 text-sm'>
            {t('Loading...')}
          </p>
        ) : (
          <Pagination
            page={dailyPage}
            total={dailyReport.data?.total ?? 0}
            onPageChange={setDailyPage}
          />
        )}
      </section>

      <section className='overflow-x-auto rounded-lg border'>
        <div className='border-b px-4 py-3'>
          <h3 className='font-medium'>{t('Reward ledger')}</h3>
        </div>
        <table className='w-full min-w-[650px] text-sm'>
          <thead className='bg-muted/40 text-left'>
            <tr>
              <th className='px-4 py-2'>{t('Date')}</th>
              <th className='px-4 py-2'>{t('User ID')}</th>
              <th className='px-4 py-2'>{t('Reward quota')}</th>
              <th className='px-4 py-2'>{t('Source')}</th>
              <th className='px-4 py-2'>{t('Status')}</th>
              {props.allowManualActions && <th className='px-4 py-2' />}
            </tr>
          </thead>
          <tbody>
            {rewardRecords.data?.data.map((item) => (
              <tr key={item.id} className='border-t'>
                <td className='px-4 py-2'>{item.reward_date}</td>
                <td className='px-4 py-2'>{item.user_id}</td>
                <td className='px-4 py-2'>{formatQuota(item.reward_quota)}</td>
                <td className='px-4 py-2'>{t(item.source)}</td>
                <td className='px-4 py-2'>{t(item.status)}</td>
                {props.allowManualActions && (
                  <td className='px-4 py-2 text-right'>
                    {item.status === 'granted' && (
                      <Button
                        type='button'
                        variant='destructive'
                        size='sm'
                        onClick={() => setRevokeRecord(item)}
                      >
                        {t('Revoke')}
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {rewardRecords.isLoading ? (
          <p className='text-muted-foreground px-4 py-3 text-sm'>
            {t('Loading...')}
          </p>
        ) : (
          <Pagination
            page={recordPage}
            total={rewardRecords.data?.total ?? 0}
            onPageChange={setRecordPage}
          />
        )}
      </section>

      <Dialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        title={t('Grant reward manually')}
        description={t(
          'This adds quota immediately and creates an audit record.'
        )}
        footer={
          <>
            <Button variant='outline' onClick={() => setGrantOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button
              onClick={() => grantMutation.mutate()}
              disabled={grantMutation.isPending}
            >
              {grantMutation.isPending ? t('Processing...') : t('Grant reward')}
            </Button>
          </>
        }
      >
        <div className='space-y-4'>
          <div className='space-y-1'>
            <Label htmlFor='grant-reward-user-id'>{t('User ID')}</Label>
            <Input
              id='grant-reward-user-id'
              type='number'
              min={1}
              value={grantUserId}
              onChange={(event) => setGrantUserId(event.target.value)}
            />
          </div>
          <div className='space-y-1'>
            <Label htmlFor='grant-reward-amount'>
              {t('Amount')} ({currencyLabel})
            </Label>
            <Input
              id='grant-reward-amount'
              type='number'
              min={0}
              step='any'
              value={grantAmount}
              onChange={(event) => setGrantAmount(event.target.value)}
            />
          </div>
          <div className='space-y-1'>
            <Label htmlFor='grant-reward-reason'>{t('Reason')}</Label>
            <Textarea
              id='grant-reward-reason'
              value={grantReason}
              onChange={(event) => setGrantReason(event.target.value)}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(revokeRecord)}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeRecord(null)
            setRevokeReason('')
          }
        }}
        title={t('Revoke reward')}
        description={t(
          'This deducts the reward from the user balance. It cannot be undone automatically.'
        )}
        footer={
          <>
            <Button variant='outline' onClick={() => setRevokeRecord(null)}>
              {t('Cancel')}
            </Button>
            <Button
              variant='destructive'
              onClick={() => revokeMutation.mutate()}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? t('Processing...') : t('Revoke')}
            </Button>
          </>
        }
      >
        <div className='space-y-4'>
          <p className='text-sm'>
            {revokeRecord
              ? t('Reward amount: {{amount}}', {
                  amount: formatQuota(revokeRecord.reward_quota),
                })
              : null}
          </p>
          <div className='space-y-1'>
            <Label htmlFor='revoke-reward-reason'>{t('Reason')}</Label>
            <Textarea
              id='revoke-reward-reason'
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
