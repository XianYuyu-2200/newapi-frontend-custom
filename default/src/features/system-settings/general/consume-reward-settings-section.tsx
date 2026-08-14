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
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ConsumeRewardReport } from '@/features/usage-logs/components/consume-reward-report'
import { quotaUnitsToDollars, parseQuotaFromDollars } from '@/lib/format'

import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

const schema = z.object({
  enabled: z.boolean(),
  dailyQuota: z.coerce.number().nonnegative(),
  rewardQuota: z.coerce.number().nonnegative(),
  consecutiveDays: z.coerce.number().int().min(1),
})

type FormValues = z.infer<typeof schema>

type ConsumeRewardSettings = {
  enabled: boolean
  dailyQuota: number
  rewardQuota: number
  consecutiveDays: number
}

export function ConsumeRewardSettingsSection(props: {
  defaultValues: ConsumeRewardSettings
}) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      enabled: props.defaultValues.enabled,
      dailyQuota: quotaUnitsToDollars(props.defaultValues.dailyQuota),
      rewardQuota: quotaUnitsToDollars(props.defaultValues.rewardQuota),
      consecutiveDays: props.defaultValues.consecutiveDays,
    },
  })
  const enabled = form.watch('enabled')

  async function onSubmit(values: FormValues) {
    const dailyQuota = parseQuotaFromDollars(values.dailyQuota)
    const rewardQuota = parseQuotaFromDollars(values.rewardQuota)
    if (values.enabled && (dailyQuota <= 0 || rewardQuota <= 0)) {
      toast.error(t('Enter a valid amount'))
      return
    }
    const updates = [
      [
        'consume_reward_setting.enabled',
        String(values.enabled),
        String(props.defaultValues.enabled),
      ],
      [
        'consume_reward_setting.daily_quota',
        String(dailyQuota),
        String(props.defaultValues.dailyQuota),
      ],
      [
        'consume_reward_setting.reward_quota',
        String(rewardQuota),
        String(props.defaultValues.rewardQuota),
      ],
      [
        'consume_reward_setting.consecutive_days',
        String(values.consecutiveDays),
        String(props.defaultValues.consecutiveDays),
      ],
    ] as const
    const changed = updates.filter(([, value, previous]) => value !== previous)
    if (changed.length === 0) {
      toast.info(t('No changes to save'))
      return
    }
    for (const [key, value] of changed) {
      await updateOption.mutateAsync({ key, value })
    }
    form.reset(values)
  }

  return (
    <SettingsSection title={t('Consecutive consumption rewards')}>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)} autoComplete='off'>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending}
            isSaveDisabled={!form.formState.isDirty}
            saveLabel='Save consumption reward settings'
          />
          <FormField
            control={form.control}
            name='enabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>
                    {t('Enable consecutive consumption rewards')}
                  </FormLabel>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={updateOption.isPending}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />
          {enabled && (
            <div className='grid gap-6 sm:grid-cols-3'>
              <FormField
                control={form.control}
                name='dailyQuota'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Daily consumption threshold')}</FormLabel>
                    <FormControl>
                      <Input type='number' min={1} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='rewardQuota'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Reward quota')}</FormLabel>
                    <FormControl>
                      <Input type='number' min={1} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='consecutiveDays'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Consecutive days')}</FormLabel>
                    <FormControl>
                      <Input type='number' min={1} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}
        </SettingsForm>
      </Form>
      <div className='mt-8'>
        <ConsumeRewardReport allowManualActions />
      </div>
    </SettingsSection>
  )
}
