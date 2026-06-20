import { useEffect } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { HiPlus, HiTrash, HiCalendar } from 'react-icons/hi'
import { Input, Button, Modal, TimePicker, Toggle } from '@/components/shared'
import type { SalonSchedule } from '../types'
import {
  useCreateSalonScheduleMutation,
  useUpdateSalonScheduleMutation,
  useGetSalonServiceDropdownQuery,
  useGetBranchDropdownQuery,
} from '../services/salonScheduleApi'

// ── Time helpers ───────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')

/** { hour, minute } → "HH:mm:ss" */
const formatTime = (t: { hour: number; minute: number }): string =>
  `${pad(t.hour)}:${pad(t.minute)}:00`

/** "HH:mm:ss" | "HH:mm" → { hour, minute } */
const parseTime = (str: string): { hour: number; minute: number } => {
  const [h, m] = str.split(':').map(Number)
  return { hour: h ?? 0, minute: m ?? 0 }
}

// ── Date helpers ───────────────────────────────────────────────────────────────

/** JS Date → "YYYY-MM-DD" */
const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** { year, month, day } → "YYYY-MM-DD" */
const ymdToISO = (year: number, month: number, day: number): string =>
  `${year}-${pad(month)}-${pad(day)}`

/** "YYYY-MM-DD" → { year, month, day } */
const isoToYMD = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return { year: y ?? 0, month: m ?? 0, day: d ?? 0 }
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const timeSchema = z.object({
  hour: z.number().min(0).max(23),
  minute: z.number().min(0).max(59),
})

const schema = z
  .object({
    salonServiceId:       z.number().min(0),
    branchId:             z.number({ error: 'Branch is required' }).min(1, 'Branch is required'),
    month:                z.number().min(1).max(12),
    day:                  z.number().min(1).max(31),
    year:                 z.number().min(2020).max(2100),
    // ── New fields ──────────────────────────────────────────────────────────
    applyAllThisMonth:    z.boolean(),
    fromDate:             z.string(),   // "YYYY-MM-DD", only used when !applyAllThisMonth
    toDate:               z.string(),   // "YYYY-MM-DD", only used when !applyAllThisMonth
    // ────────────────────────────────────────────────────────────────────────
    timeFrom:             timeSchema,
    timeTo:               timeSchema,
    requiredDesposit:     z.boolean(),
    depositMinimumValue:  z.number().min(0),
    depositDuration:      z.number().min(0),
    serviceDuration:      z.number().min(1, 'Service duration is required'),
    howManyInDay:         z.number().min(0).nullable(),
    howManyInPeriod:      z.number().min(0),
    canCancelBefore:      z.number().min(0),
    requiredSalonApproved: z.boolean(),
    freeScheduleTimes:    z.array(
      z.object({
        id:       z.number().optional(),
        timeFrom: timeSchema,
        toTime:   timeSchema,
      })
    ),
  })
  .superRefine((val, ctx) => {
    if (!val.applyAllThisMonth) {
      if (!val.fromDate) {
        ctx.addIssue({ code: 'custom', path: ['fromDate'], message: 'Start date is required' })
      }
      if (!val.toDate) {
        ctx.addIssue({ code: 'custom', path: ['toDate'], message: 'End date is required' })
      }
      if (val.fromDate && val.toDate && val.toDate < val.fromDate) {
        ctx.addIssue({ code: 'custom', path: ['toDate'], message: 'End date must be after start date' })
      }
    }
    if (val.salonServiceId === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['salonServiceId'],
        message: 'Select a service',
      })
    }
  })

type FormValues = z.infer<typeof schema>

// ── Props ──────────────────────────────────────────────────────────────────────

interface ScheduleFormModalProps {
  open: boolean
  onClose: () => void
  schedule?: SalonSchedule
  defaultDate?: { year: number; month: number; day: number }
}

// ── Defaults ───────────────────────────────────────────────────────────────────

const now = new Date()

const DEFAULT_VALUES: FormValues = {
  salonServiceId:       0,
  branchId:             0,
  month:                now.getMonth() + 1,
  day:                  now.getDate(),
  year:                 now.getFullYear(),
  applyAllThisMonth:    false,
  fromDate:             toISODate(now),
  toDate:               toISODate(now),
  timeFrom:             { hour: 9, minute: 0 },
  timeTo:               { hour: 21, minute: 0 },
  requiredDesposit:     false,
  depositMinimumValue:  0,
  depositDuration:      0,
  serviceDuration:      60,
  howManyInDay:         null,
  howManyInPeriod:      1,
  canCancelBefore:      24,
  requiredSalonApproved: false,
  freeScheduleTimes:    [],
}

// ── Reusable select classname ──────────────────────────────────────────────────

const selectCls = `
  h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]
  text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2
  focus:ring-[var(--accent)] focus:border-transparent transition-all w-full
`.trim()

// ── Component ──────────────────────────────────────────────────────────────────

export default function ScheduleFormModal({
  open,
  onClose,
  schedule,
  defaultDate,
}: ScheduleFormModalProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const isEdit = Boolean(schedule)

  const [createSchedule, { isLoading: isCreating }] = useCreateSalonScheduleMutation()
  const [updateSchedule, { isLoading: isUpdating }]  = useUpdateSalonScheduleMutation()
  const isLoading = isCreating || isUpdating

  const { data: services  = [] } = useGetSalonServiceDropdownQuery(undefined,  { refetchOnMountOrArgChange: true })
  const { data: branches  = [] } = useGetBranchDropdownQuery(undefined,        { refetchOnMountOrArgChange: true })

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'freeScheduleTimes' })

  // ── Watched values ─────────────────────────────────────────────────────────

  const applyAllThisMonth = watch('applyAllThisMonth')
  const requiredDesposit  = watch('requiredDesposit')
  const howManyInDay      = watch('howManyInDay')
  const enableMaxPerDay   = howManyInDay !== null && howManyInDay > 0

  // ── Populate on open ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return

    if (schedule) {
      const { year: sy, month: sm, day: sd } = schedule
      reset({
        salonServiceId:       schedule.salonServiceId,
        branchId:             schedule.branchId,
        month:                sm,
        day:                  sd,
        year:                 sy ?? now.getFullYear(),
        applyAllThisMonth:    schedule.applyAllThisMonth ?? false,
        fromDate:             schedule.fromDate ?? ymdToISO(sy ?? now.getFullYear(), sm, sd),
        toDate:               schedule.toDate   ?? ymdToISO(sy ?? now.getFullYear(), sm, sd),
        timeFrom: typeof schedule.timeFrom === 'string'
          ? parseTime(schedule.timeFrom) : schedule.timeFrom,
        timeTo: typeof schedule.timeTo === 'string'
          ? parseTime(schedule.timeTo) : schedule.timeTo,
        requiredDesposit:     schedule.requiredDesposit,
        depositMinimumValue:  schedule.depositMinimumValue,
        depositDuration:      schedule.depositDuration,
        serviceDuration:      schedule.serviceDuration,
        howManyInDay:         schedule.howManyInDay ?? null,
        howManyInPeriod:      schedule.howManyInPeriod,
        canCancelBefore:      schedule.canCancelBefore,
        requiredSalonApproved: schedule.requiredSalonApproved,
        freeScheduleTimes: schedule.freeScheduleTimes.map((slot) => ({
          id:       (slot as any).id,
          timeFrom: typeof slot.timeFrom === 'string' ? parseTime(slot.timeFrom as any) : slot.timeFrom,
          toTime:   typeof slot.toTime   === 'string' ? parseTime(slot.toTime   as any) : slot.toTime,
        })),
      })
    } else {
      const base = defaultDate ?? { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
      const iso  = ymdToISO(base.year, base.month, base.day)
      reset({ ...DEFAULT_VALUES, ...base, fromDate: iso, toDate: iso })
    }
  }, [open, schedule, defaultDate, reset])

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = async (values: FormValues) => {
    try {
      // Build common payload – omit fromDate/toDate when applyAllThisMonth is true
      const basePayload = {
        salonServiceId:       values.salonServiceId,
        branchId:             values.branchId,
        month:                values.month,
        day:                  values.day,
        year:                 values.year,
        applyAllThisMonth:    values.applyAllThisMonth,
        ...(!values.applyAllThisMonth && {
          fromDate: values.fromDate,
          toDate:   values.toDate,
        }),
        timeFrom:             formatTime(values.timeFrom),
        timeTo:               formatTime(values.timeTo),
        requiredDesposit:     values.requiredDesposit,
        depositMinimumValue:  values.depositMinimumValue,
        depositDuration:      values.depositDuration,
        serviceDuration:      values.serviceDuration,
        howManyInDay:         enableMaxPerDay ? values.howManyInDay : null,
        howManyInPeriod:      values.howManyInPeriod,
        canCancelBefore:      values.canCancelBefore,
        requiredSalonApproved: values.requiredSalonApproved,
        freeScheduleTimes:    values.freeScheduleTimes.map((slot) => ({
          ...(slot.id ? { id: slot.id } : {}),
          timeFrom: formatTime(slot.timeFrom),
          toTime:   formatTime(slot.toTime),
        })),
      }
console.log(basePayload)
      if (isEdit && schedule) {
        await updateSchedule({ id: schedule.id, ...basePayload }).unwrap()
      } else {
        const result = await createSchedule(basePayload as any).unwrap()
        console.log(result)
      }

      toast.success(t('common.success'))
      onClose()
    } catch {
      toast.error(t('common.error'))
    }
  }

  const addFreeTime = () =>
    append({ id: 0, timeFrom: { hour: 12, minute: 0 }, toTime: { hour: 13, minute: 0 } })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? t('schedule.editSchedule', 'Edit Schedule')
          : t('schedule.addSchedule', 'Add Schedule')
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isLoading}>
            {isEdit ? t('common.save') : t('common.add', 'Add')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">

        {/* ── Service & Package ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Service */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">
              {t('schedule.service', 'Service')}
            </label>
            <Controller
              control={control}
              name="salonServiceId"
              render={({ field }) => (
                <select
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(Number(e.target.value))
                  }}
                  className={selectCls}
                >
                  <option value={0}>{t('common.selectOption', 'Select...')}</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            />
          </div>
 {/* ── Branch ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            {t('schedule.branch', 'Branch')} <span className="text-[var(--danger)]">*</span>
          </label>
          <Controller
            control={control}
            name="branchId"
            render={({ field }) => (
              <select
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className={selectCls}
              >
                <option value={0}>{t('common.selectOption', 'Select...')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          />
          {errors.branchId && (
            <p className="text-xs text-[var(--danger)]">{errors.branchId.message}</p>
          )}
        </div>
        </div>

        {/* Service / Package validation error */}
        {errors.salonServiceId && (
          <p className="text-xs text-[var(--danger)] -mt-3">
            {errors.salonServiceId.message}
          </p>
        )}

       

        {/* ── Apply All This Month toggle ────────────────────────────────── */}
        <div className="flex items-center justify-between p-3 rounded-xl
          bg-[var(--surface-raised)] border border-[var(--border)]">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {t('schedule.applyAllThisMonth', 'Apply to all days this month')}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {applyAllThisMonth
                ? t('schedule.applyAllThisMonthOn', 'Schedule applies to every day in the selected month')
                : t('schedule.applyAllThisMonthOff', 'Choose a specific date range below')}
            </span>
          </div>
          <Controller
            control={control}
            name="applyAllThisMonth"
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onChange={field.onChange}
                lang={lang}
              />
            )}
          />
        </div>

        {/* ── Date section ───────────────────────────────────────────────── */}
        {applyAllThisMonth ? (
          /* Month + Year only */
          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register('month', { valueAsNumber: true })}
              type="number"
              label={t('schedule.month', 'Month')}
              placeholder="1–12"
              min={1}
              max={12}
              error={errors.month?.message}
              required
            />
            <Input
              {...register('year', { valueAsNumber: true })}
              type="number"
              label={t('schedule.year', 'Year')}
              placeholder="2026"
              min={2020}
              max={2100}
              error={errors.year?.message}
              required
            />
          </div>
        ) : (
          /* From date – To date range */
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
              <HiCalendar size={15} />
              {t('schedule.dateRange', 'Date Range')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* From Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  {t('schedule.fromDate', 'From Date')} <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="date"
                  {...register('fromDate')}
                  className={selectCls}
                />
                {errors.fromDate && (
                  <p className="text-xs text-[var(--danger)]">{errors.fromDate.message}</p>
                )}
              </div>

              {/* To Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  {t('schedule.toDate', 'To Date')} <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="date"
                  {...register('toDate')}
                  className={selectCls}
                />
                {errors.toDate && (
                  <p className="text-xs text-[var(--danger)]">{errors.toDate.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Time range ────────────────────────────────────────────────── */}
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            {t('schedule.timeRange', 'Schedule Time Range')}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={control}
              name="timeFrom"
              render={({ field }) => (
                <TimePicker
                  value={field.value}
                  onChange={field.onChange}
                  label={t('schedule.timeFrom', 'From')}
                  error={errors.timeFrom?.message}
                  required
                />
              )}
            />
            <Controller
              control={control}
              name="timeTo"
              render={({ field }) => (
                <TimePicker
                  value={field.value}
                  onChange={field.onChange}
                  label={t('schedule.timeTo', 'To')}
                  error={errors.timeTo?.message}
                  required
                />
              )}
            />
          </div>
        </div>

        {/* ── Capacities ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            {...register('serviceDuration', { valueAsNumber: true })}
            type="number"
            label={t('schedule.serviceDuration', 'Service Duration (min)')}
            placeholder="60"
            min={1}
            error={errors.serviceDuration?.message}
            required
          />
          <Input
            {...register('canCancelBefore', { valueAsNumber: true })}
            type="number"
            label={t('schedule.canCancelBefore', 'Cancel Before (hrs)')}
            placeholder="24"
            min={0}
            error={errors.canCancelBefore?.message}
          />
        </div>

        {/* ── Max / Period ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <Input
            {...register('howManyInPeriod', { valueAsNumber: true })}
            type="number"
            label={t('schedule.howManyInPeriod', 'Max / Period (seats)')}
            placeholder="0"
            min={0}
            error={errors.howManyInPeriod?.message}
          />
          <p className="text-xs text-[var(--text-muted)]">
            {t('schedule.howManyInPeriodHint', 'Number of seats available at the same time')}
          </p>
        </div>

        {/* ── Flags ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-6 py-1">
          <Controller
            control={control}
            name="requiredSalonApproved"
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onChange={field.onChange}
                label={t('schedule.requiredSalonApproved', 'Requires Salon Approval')}
                lang={lang}
              />
            )}
          />
          <Controller
            control={control}
            name="requiredDesposit"
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onChange={field.onChange}
                label={t('schedule.requiredDesposit', 'Requires Deposit')}
                lang={lang}
              />
            )}
          />
          <Toggle
            checked={enableMaxPerDay}
            onChange={(val) => setValue('howManyInDay', val ? 1 : null)}
            label={t('schedule.limitMaxPerDay', 'Limit Max / Day')}
            lang={lang}
          />
        </div>

        {/* ── Deposit details (conditional) ─────────────────────────────── */}
        {requiredDesposit && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl
            bg-[var(--accent-soft)] border border-[var(--accent)]/20">
            <Input
              {...register('depositMinimumValue', { valueAsNumber: true })}
              type="number"
              label={t('schedule.depositMinimumValue', 'Minimum Deposit (%)')}
              placeholder="0"
              min={0}
              error={errors.depositMinimumValue?.message}
              required
            />
            <Input
              {...register('depositDuration', { valueAsNumber: true })}
              type="number"
              label={t('schedule.depositDuration', 'Deposit Duration (min)')}
              placeholder="0"
              min={0}
              error={errors.depositDuration?.message}
              required
            />
          </div>
        )}

        {/* ── Max / Day input (conditional) ─────────────────────────────── */}
        {enableMaxPerDay && (
          <div className="flex flex-col gap-1 p-4 rounded-xl
            bg-[var(--surface-raised)] border border-[var(--border)]">
            <Input
              {...register('howManyInDay', { valueAsNumber: true })}
              type="number"
              label={t('schedule.howManyInDayValue', 'Max bookings per day')}
              placeholder="1"
              min={1}
              error={errors.howManyInDay?.message}
            />
            <p className="text-xs text-[var(--text-muted)]">
              {t('schedule.howManyInDayHint', 'Total bookings allowed for this service per day')}
            </p>
          </div>
        )}

        {/* ── Free Schedule Times ───────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {t('schedule.freeScheduleTimes', 'Free Schedule Times')}
              <span className="ml-2 text-xs text-[var(--text-muted)] font-normal">
                ({t('schedule.freeTimesHint', 'optional blocked-out slots')})
              </span>
            </p>
            <button
              type="button"
              onClick={addFreeTime}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent)]
                hover:text-[var(--accent-dark)] transition-colors"
            >
              <HiPlus size={14} />
              {t('schedule.addFreeTime', 'Add Slot')}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {fields.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-3
                border border-dashed border-[var(--border)] rounded-lg">
                {t('schedule.noFreeSlots', 'No free slots added yet')}
              </p>
            )}
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end
                  p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]"
              >
                <Controller
                  control={control}
                  name={`freeScheduleTimes.${index}.timeFrom`}
                  render={({ field: f }) => (
                    <TimePicker
                      value={f.value}
                      onChange={f.onChange}
                      label={t('schedule.from', 'From')}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`freeScheduleTimes.${index}.toTime`}
                  render={({ field: f }) => (
                    <TimePicker
                      value={f.value}
                      onChange={f.onChange}
                      label={t('schedule.to', 'To')}
                    />
                  )}
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="h-10 w-9 flex items-center justify-center rounded-lg
                    text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50
                    transition-colors mb-0.5"
                  title={t('common.remove', 'Remove')}
                >
                  <HiTrash size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Modal>
  )
}
