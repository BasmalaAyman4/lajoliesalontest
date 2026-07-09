// ─── ScheduleQuickAddModal ─────────────────────────────────────────────────────
//
//  Fast-add flow for schedules: pick an EXISTING service, then configure
//  branches/timing (Step 1) and advanced scheduling + per-branch chairs +
//  breaks (Step 2). Mirrors ServiceFormModal's step2/step3 UX, but targets
//  an already-created service instead of a brand-new one.
//
//  On submit, loops through the targeted branches and creates one schedule
//  per branch via createSalonSchedule — same "each branch gets its own
//  chair" pattern as ServiceFormModal.

import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Modal, Input, Button, MultiSelect, TimePicker, Toggle } from '@/components/shared'
import type { DropdownOption } from '@/types'
import {
    useCreateSalonScheduleMutation,
    useGetSalonServiceDropdownQuery,
    useGetMaxChairCountForServiceQuery
} from '../services/salonScheduleApi'
import { useGetSalonBranchesQuery } from '@/features/salonBranch/services/salonBranchApi'
import { HiCalendar, HiPlus, HiTrash, HiChevronLeft, HiChevronRight, HiLightningBolt } from 'react-icons/hi'
import { cn } from '@/lib/cn'

// ── Yes/No Toggle wrapper ───────────────────────────────────────────────────────
//  Same visual pattern as ServiceFormModal's YesNoToggle.
//  NOTE: consider extracting this into `@/components/shared` so both modals
//  import one copy instead of duplicating it — flagging as a follow-up.

function YesNoToggle({
    checked,
    onChange,
    lang,
}: {
    checked: boolean
    onChange: (val: boolean) => void
    lang: string
}) {
    const isAr = lang === 'ar'
    return (
        <div className="flex items-center gap-2" dir={isAr ? 'rtl' : 'ltr'}>
            <span className={cn('text-xs font-semibold transition-colors', !checked ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]')}>
                {isAr ? 'لا' : 'No'}
            </span>
            <Toggle checked={checked} onChange={onChange} lang={lang} />
            <span className={cn('text-xs font-semibold transition-colors', checked ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]')}>
                {isAr ? 'نعم' : 'Yes'}
            </span>
        </div>
    )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')

const formatTime = (t: { hour: number; minute: number }): string =>
    `${pad(t.hour)}:${pad(t.minute)}:00`

const toISODate = (d: Date): string =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const getThirtyDaysFromToday = (): string => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return toISODate(d)
}

// ── Schema ────────────────────────────────────────────────────────────────────

const timeSchema = z.object({
    hour: z.number().min(0).max(23),
    minute: z.number().min(0).max(59),
})

const branchChairSchema = z.object({
    chairId: z.coerce.number(),
    howManyInPeriod: z.coerce.number().min(1).default(1),
})

const baseSchema = z.object({
    salonServiceId: z.coerce.number().min(1, 'Service is required'),

    // Step 1: branches & timing
    allBranches: z.boolean().default(true),
    selectedBranchIds: z.array(z.number()).default([]),
    allMonth: z.boolean().default(true),
    fromDate: z.string().optional().default(''),
    toDate: z.string().optional().default(''),
    availableAllDay: z.boolean().default(true),
    timeFrom: timeSchema.default({ hour: 9, minute: 0 }),
    timeTo: timeSchema.default({ hour: 21, minute: 0 }),

    // Step 2: advanced
    serviceDuration: z.coerce.number().min(1, 'Service duration is required').default(30),
    canCancelBefore: z.coerce.number().min(0).default(24),
    branchChairs: z.record(z.string(), branchChairSchema).default({}),
    requiredSalonApproved: z.boolean().default(false),
    requiredDesposit: z.boolean().default(false),
    depositMinimumValue: z.coerce.number().min(0).default(0),
    depositDuration: z.coerce.number().min(0).default(0),
    freeScheduleTimes: z.array(
        z.object({
            timeFrom: timeSchema,
            toTime: timeSchema,
        })
    ).default([]),
})

const getSchema = (allBranchIds: number[]) =>
    baseSchema.superRefine((data, ctx) => {
        if (!data.allBranches && data.selectedBranchIds.length === 0) {
            ctx.addIssue({
                code: 'custom',
                path: ['selectedBranchIds'],
                message: 'At least one branch must be selected',
            })
        }

        if (!data.allMonth) {
            if (!data.fromDate) {
                ctx.addIssue({ code: 'custom', path: ['fromDate'], message: 'Start date is required' })
            }
            if (!data.toDate) {
                ctx.addIssue({ code: 'custom', path: ['toDate'], message: 'End date is required' })
            }
            if (data.fromDate && data.toDate && data.toDate < data.fromDate) {
                ctx.addIssue({ code: 'custom', path: ['toDate'], message: 'End date must be after start date' })
            }
        }

        if (data.requiredDesposit) {
            if (data.depositMinimumValue === undefined || data.depositMinimumValue < 0) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['depositMinimumValue'],
                    message: 'Minimum deposit is required',
                })
            }
        }

        // Every targeted branch must have its own chair assigned
        const targetIds = data.allBranches ? allBranchIds : data.selectedBranchIds
        targetIds.forEach((branchId) => {
            const sel = data.branchChairs[String(branchId)]
            if (!sel || !sel.chairId) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['branchChairs', String(branchId), 'chairId'],
                    message: 'A chair is required for this branch',
                })
            }
        })
    })

type FormValues = z.infer<typeof baseSchema>

const getInitialDefaultValues = (): FormValues => {
    const now = new Date()
    return {
        salonServiceId: 0,

        allBranches: true,
        selectedBranchIds: [],
        allMonth: true,
        fromDate: toISODate(now),
        toDate: getThirtyDaysFromToday(),
        availableAllDay: true,
        timeFrom: { hour: 9, minute: 0 },
        timeTo: { hour: 21, minute: 0 },

        serviceDuration: 30,
        canCancelBefore: 24,
        branchChairs: {},
        requiredSalonApproved: false,
        requiredDesposit: false,
        depositMinimumValue: 0,
        depositDuration: 0,
        freeScheduleTimes: [],
    }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ScheduleQuickAddModalProps {
    open: boolean
    onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ScheduleQuickAddModal({ open, onClose }: ScheduleQuickAddModalProps) {
    const { t, i18n } = useTranslation()
    const isAr = i18n.language === 'ar'
    const lang = i18n.language

    const [step, setStep] = useState<1 | 2>(1)
    const [hasBreaks, setHasBreaks] = useState(false)

    const [createSchedule, { isLoading: isCreating }] = useCreateSalonScheduleMutation()

    // Services (for the dropdown) & branches (for timing/chairs) — only fetch while open
    const { data: services = [] } = useGetSalonServiceDropdownQuery(undefined, { skip: !open })
    const { data: branches = [] } = useGetSalonBranchesQuery(undefined, { skip: !open })

    const branchOptions: DropdownOption[] = useMemo(
        () => branches.map((b) => ({ value: b.id, label: lang === 'ar' ? b.nameAr : b.nameEn })),
        [branches, lang]
    )

    const branchIdList = useMemo(() => branches.map((b) => b.id), [branches])
    const validationSchema = useMemo(() => getSchema(branchIdList), [branchIdList])

    const {
        register,
        handleSubmit,
        reset,
        watch,
        control,
        setValue,
        trigger,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(validationSchema) as any,
        defaultValues: getInitialDefaultValues(),
    })

    const { fields, append, remove } = useFieldArray({ control, name: 'freeScheduleTimes' })

    const allBranches = watch('allBranches')
    const selectedBranchIds = watch('selectedBranchIds')
    const allMonth = watch('allMonth')
    const availableAllDay = watch('availableAllDay')
    const requiredDesposit = watch('requiredDesposit')
    const branchChairs = watch('branchChairs')
const selectedServiceTypeId = watch('salonServiceId')

    // Branches that will actually receive a schedule = need a chair each
    const chairBranchOptions = useMemo(() => {
        if (!allBranches && selectedBranchIds?.length > 0) {
            return branches.filter((b) => selectedBranchIds.includes(b.id))
        }
        return branches
    }, [allBranches, selectedBranchIds, branches])

    const [chairBranchId, setChairBranchId] = useState<number | undefined>(undefined)

    useEffect(() => {
        if (chairBranchOptions.length === 0) {
            setChairBranchId(undefined)
            return
        }
        setChairBranchId((prev) =>
            prev && chairBranchOptions.some((b) => b.id === prev) ? prev : chairBranchOptions[0].id
        )
    }, [chairBranchOptions])

  // Chairs list for whichever branch is currently being viewed
const { data: maxChairData, isFetching: isLoadingChairs } = useGetMaxChairCountForServiceQuery(
  { branchId: chairBranchId!, serviceTypeId: Number(selectedServiceTypeId) },
  { skip: !chairBranchId || !selectedServiceTypeId || Number(selectedServiceTypeId) === 0 || !open }
)
// جوه useEffect لما maxChairData يترجع، حدّث الفورم تلقائيًا
useEffect(() => {
  if (chairBranchId && maxChairData) {
    setValue(`branchChairs.${chairBranchId}.chairId` as any, maxChairData.chairTypeId)
    setValue(
      `branchChairs.${chairBranchId}.howManyInPeriod` as any,
      maxChairData.maxChairCount
    )
  }
}, [chairBranchId, maxChairData, setValue])

    // Reset on open
    useEffect(() => {
        if (open) {
            setStep(1)
            setHasBreaks(false)
            setChairBranchId(undefined)
            reset(getInitialDefaultValues())
        }
    }, [open, reset])

    const nextStep1 = async () => {
        const isValid = await trigger([
            'salonServiceId',
            'allBranches',
            'selectedBranchIds',
            'allMonth',
            'fromDate',
            'toDate',
            'availableAllDay',
            'timeFrom',
            'timeTo',
        ])
        if (isValid) setStep(2)
    }

    const onSubmit = async (values: FormValues) => {
        try {
            const targetBranchIds = values.allBranches ? branches.map((b) => b.id) : values.selectedBranchIds

            const fromDateStr = values.allMonth ? toISODate(new Date()) : values.fromDate
            const toDateStr = values.allMonth ? getThirtyDaysFromToday() : values.toDate
            const [y, m, d] = (fromDateStr || '').split('-').map(Number)

            const schedulePromises = targetBranchIds.map((branchId) => {
                const branch = branches.find((b) => b.id === branchId)
                const chairSelection = values.branchChairs[String(branchId)]

                let resolvedTimeFrom = '09:00:00'
                let resolvedTimeTo = '21:00:00'

                if (values.availableAllDay) {
                    if (branch?.openTime) resolvedTimeFrom = branch.openTime
                    if (branch?.closeTime) resolvedTimeTo = branch.closeTime
                } else {
                    resolvedTimeFrom = formatTime(values.timeFrom)
                    resolvedTimeTo = formatTime(values.timeTo)
                }

                const schedulePayload = {
                    salonServiceId: values.salonServiceId,
                    branchId,
                    applyAllThisMonth: false,
                    fromDate: fromDateStr,
                    toDate: toDateStr,
                    month: m || new Date().getMonth() + 1,
                    day: d || new Date().getDate(),
                    year: y || new Date().getFullYear(),
                    timeFrom: resolvedTimeFrom,
                    timeTo: resolvedTimeTo,
                    requiredDesposit: values.requiredDesposit,
                    depositMinimumValue: values.requiredDesposit ? values.depositMinimumValue : 0,
                    depositDuration: values.requiredDesposit ? values.depositDuration : 0,
                    serviceDuration: values.serviceDuration,
                    howManyInDay: null,
                    chairId: chairSelection?.chairId,
                    howManyInPeriod: chairSelection?.howManyInPeriod ?? 1,
                    canCancelBefore: values.canCancelBefore,
                    requiredSalonApproved: values.requiredSalonApproved,
                    freeScheduleTimes: hasBreaks
                        ? values.freeScheduleTimes.map((slot) => ({
                            timeFrom: formatTime(slot.timeFrom),
                            toTime: formatTime(slot.toTime),
                        }))
                        : [],
                }

                return createSchedule(schedulePayload as any).unwrap()
            })

            if (targetBranchIds.length > 0) {
                await Promise.all(schedulePromises)
            }

            toast.success(t('common.success'))
            onClose()
        } catch (err) {
            console.error(err)
            toast.error(t('common.error'))
        }
    }

    const currentChairSelection = chairBranchId ? branchChairs[String(chairBranchId)] : undefined
    const chairFieldError = chairBranchId && (errors.branchChairs as any)?.[String(chairBranchId)]?.chairId?.message

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={
                step === 1
                    ? isAr ? 'إضافة سريعة — الخدمة والفروع' : 'Quick Add — Service & Branches'
                    : isAr ? 'إعدادات الحجز المتقدمة' : 'Advanced Scheduling'
            }
            size="lg"
            footer={
                step === 1 ? (
                    <>
                        <Button variant="secondary" onClick={onClose} disabled={isCreating}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={nextStep1} rightIcon={isAr ? <HiChevronLeft size={15} /> : <HiChevronRight size={15} />}>
                            {isAr ? 'التالي' : 'Next'}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="secondary" onClick={() => setStep(1)} leftIcon={isAr ? <HiChevronRight size={15} /> : <HiChevronLeft size={15} />}>
                            {isAr ? 'السابق' : 'Back'}
                        </Button>
                        <Button onClick={handleSubmit(onSubmit)} loading={isCreating}>
                            {isAr ? 'إضافة الجدول' : 'Add Schedule'}
                        </Button>
                    </>
                )
            }
        >
            <div className="flex flex-col gap-5">
                {/* Step indicator */}
                <div className="flex items-center gap-3 mb-1 border-b border-[var(--border)] pb-4 px-1">
                    {[1, 2].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div
                                className={cn(
                                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300',
                                    step === s
                                        ? 'bg-[var(--accent)] text-white ring-4 ring-[var(--accent-soft)] shadow-sm'
                                        : step > s
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-[var(--bg-hover)] text-[var(--text-muted)] border border-[var(--border)]'
                                )}
                            >
                                {step > s ? '✓' : s}
                            </div>
                            <span className={cn('text-xs font-medium', step === s ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-secondary)]')}>
                                {s === 1 ? (isAr ? 'الخدمة والفروع' : 'Service & Branches') : (isAr ? 'إعدادات متقدمة' : 'Advanced')}
                            </span>
                            {s === 1 && <div className={cn('h-[2px] w-10 mx-1 rounded-full transition-colors duration-500', step > 1 ? 'bg-emerald-500' : 'bg-[var(--border)]')} />}
                        </div>
                    ))}
                </div>

                {/* STEP 1 */}
                {step === 1 && (
                    <div className="flex flex-col gap-5 animate-fade-in">
                        {/* Service select */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">
                                {isAr ? 'الخدمة' : 'Service'} <span className="text-[var(--danger)]">*</span>
                            </label>
                            <Controller
                                control={control}
                                name="salonServiceId"
                                render={({ field }) => (
                                    <select
                                        value={field.value}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        className="h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all w-full"
                                    >
                                        <option value={0}>{isAr ? 'اختر خدمة...' : 'Select a service...'}</option>
                                        {services.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                )}
                            />
                            {errors.salonServiceId && (
                                <p className="text-xs text-[var(--danger)]">{errors.salonServiceId.message}</p>
                            )}
                        </div>

                        {/* Branch selection */}
                        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 flex flex-col gap-4 bg-[var(--surface-raised)]/20">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                                        {isAr ? 'هل تقدم الخدمة في جميع الفروع ؟' : 'Available in All Branches?'}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        {allBranches
                                            ? (isAr ? 'سيتم إضافة الجدول لجميع فروع الصالون' : 'Schedule will be created for all branches')
                                            : (isAr ? 'اختر فروعاً محددة' : 'Select specific branch locations')}
                                    </span>
                                </div>
                                <Controller
                                    name="allBranches"
                                    control={control}
                                    render={({ field }) => <YesNoToggle checked={field.value} onChange={field.onChange} lang={lang} />}
                                />
                            </div>

                            {!allBranches && (
                                <div className="mt-1 animate-fade-in">
                                    <Controller
                                        name="selectedBranchIds"
                                        control={control}
                                        render={({ field }) => (
                                            <MultiSelect
                                                options={branchOptions}
                                                value={field.value}
                                                onChange={field.onChange}
                                                label={isAr ? 'الفروع المختارة' : 'Selected Branches'}
                                                placeholder={isAr ? 'اختر الفروع...' : 'Select branches...'}
                                                error={errors.selectedBranchIds?.message}
                                                required
                                            />
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Date range */}
                        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 flex flex-col gap-4 bg-[var(--surface-raised)]/20">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                                        {isAr ? 'متاح تقديم الخدمة طول الشهر (30 يوم من اليوم)؟' : 'Available All Month (30 days)?'}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        {allMonth
                                            ? (isAr ? 'تفعيل الجدول تلقائياً لمدة 30 يوماً من اليوم' : 'Automatically active for the next 30 days')
                                            : (isAr ? 'اختر فترة زمنية محددة يدوياً' : 'Define a custom date range')}
                                    </span>
                                </div>
                                <Controller
                                    name="allMonth"
                                    control={control}
                                    render={({ field }) => <YesNoToggle checked={field.value} onChange={field.onChange} lang={lang} />}
                                />
                            </div>

                            {allMonth ? (
                                <div className="flex gap-3 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-300 animate-fade-in">
                                    <HiCalendar size={20} className="shrink-0 mt-0.5 text-blue-500 dark:text-blue-400" />
                                    <span className="text-xs font-semibold leading-snug">
                                        {isAr
                                            ? 'ملاحظة: سيتم إضافة المواعيد تلقائياً للـ 30 يوماً القادمة بدءاً من اليوم.'
                                            : 'Note: schedules will be created for the next 30 days starting today.'}
                                    </span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-[var(--text-secondary)]">
                                            {isAr ? 'من تاريخ' : 'From Date'} <span className="text-[var(--danger)]">*</span>
                                        </label>
                                        <input type="date" {...register('fromDate')} className="h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)] w-full" />
                                        {errors.fromDate && <p className="text-xs text-[var(--danger)]">{errors.fromDate.message}</p>}
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-[var(--text-secondary)]">
                                            {isAr ? 'إلى تاريخ' : 'To Date'} <span className="text-[var(--danger)]">*</span>
                                        </label>
                                        <input type="date" {...register('toDate')} className="h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)] w-full" />
                                        {errors.toDate && <p className="text-xs text-[var(--danger)]">{errors.toDate.message}</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Working hours */}
                        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 flex flex-col gap-4 bg-[var(--surface-raised)]/20">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                                        {isAr ? 'متاح طوال اليوم (ساعات عمل الفرع)؟' : 'Available All Day (Branch hours)?'}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        {availableAllDay
                                            ? (isAr ? 'استخدام أوقات الفتح والإغلاق الرسمية للفروع' : 'Use each branch\u2019s business hours automatically')
                                            : (isAr ? 'تحديد فترة ساعات عمل مخصصة' : 'Specify custom scheduling hours')}
                                    </span>
                                </div>
                                <Controller
                                    name="availableAllDay"
                                    control={control}
                                    render={({ field }) => <YesNoToggle checked={field.value} onChange={field.onChange} lang={lang} />}
                                />
                            </div>

                            {!availableAllDay && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1 animate-fade-in">
                                    <Controller
                                        control={control}
                                        name="timeFrom"
                                        render={({ field }) => (
                                            <TimePicker value={field.value} onChange={field.onChange} label={isAr ? 'من الساعة' : 'From Time'} error={errors.timeFrom?.message} required />
                                        )}
                                    />
                                    <Controller
                                        control={control}
                                        name="timeTo"
                                        render={({ field }) => (
                                            <TimePicker value={field.value} onChange={field.onChange} label={isAr ? 'إلى الساعة' : 'To Time'} error={errors.timeTo?.message} required />
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                    <div className="flex flex-col gap-5 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input {...register('serviceDuration')} type="number" label={isAr ? 'الوقت المستغرق للخدمة (دقائق)' : 'Service Duration (minutes)'} error={errors.serviceDuration?.message} required />
                            <Input {...register('canCancelBefore')} type="number" label={isAr ? 'إمكانية إلغاء الحجز قبلها بـ (ساعة)' : 'Can Cancel Before (hours)'} error={errors.canCancelBefore?.message} required />
                        </div>

                        {/* Chairs per branch */}
                        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 flex flex-col gap-4 bg-[var(--surface-raised)]/20">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-semibold text-[var(--text-primary)]">
                                    {isAr ? 'كراسي الفروع' : 'Branch Chairs'}
                                </span>
                                <span className="text-xs text-[var(--text-muted)]">
                                    {isAr ? 'كل فرع لازم يكون له كرسي مخصص.' : 'Every branch needs its own assigned chair.'}
                                </span>
                            </div>

                            {chairBranchOptions.length > 1 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {chairBranchOptions.map((b) => {
                                        const assigned = Boolean(branchChairs[String(b.id)]?.chairId)
                                        return (
                                            <button
                                                type="button"
                                                key={b.id}
                                                onClick={() => setChairBranchId(b.id)}
                                                className={cn(
                                                    'px-2 py-1 rounded-full text-[11px] font-medium border transition-colors',
                                                    chairBranchId === b.id
                                                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                                                        : assigned
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                                                            : 'bg-[var(--bg-hover)] text-[var(--text-muted)] border-[var(--border)]'
                                                )}
                                            >
                                                {assigned ? '✓ ' : ''}
                                                {lang === 'ar' ? b.nameAr : b.nameEn}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {chairBranchOptions.length > 1 && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)]">
                                        {isAr ? 'عرض كراسي الفرع' : 'Viewing chairs for branch'}
                                    </label>
                                    <select
                                        value={chairBranchId ?? ''}
                                        onChange={(e) => setChairBranchId(Number(e.target.value))}
                                        className="h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all w-full"
                                    >
                                        {chairBranchOptions.map((b) => (
                                            <option key={b.id} value={b.id}>{lang === 'ar' ? b.nameAr : b.nameEn}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                               {currentChairSelection?.chairId ? (
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {isAr ? 'العدد المتاح في هذه الفترة' : 'Available quantity for this slot'}:{' '}
                                        <span className="font-medium text-[var(--text-primary)]">{currentChairSelection.howManyInPeriod}</span>
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        {/* Approval / Deposit */}
                        <div className="flex flex-col gap-4 py-1">
                            <Controller
                                control={control}
                                name="requiredSalonApproved"
                                render={({ field }) => (
                                    <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                                        <span className="text-sm font-medium text-[var(--text-primary)]">
                                            {isAr ? 'يتطلب موافقة الصالون' : 'Requires Salon Approval'}
                                        </span>
                                        <YesNoToggle checked={field.value} onChange={field.onChange} lang={lang} />
                                    </div>
                                )}
                            />

                            <div className="flex flex-col gap-4 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-[var(--text-primary)]">
                                        {isAr ? 'يتطلب دفعة مقدمة (عربون)؟' : 'Requires Deposit?'}
                                    </span>
                                    <Controller
                                        control={control}
                                        name="requiredDesposit"
                                        render={({ field }) => <YesNoToggle checked={field.value} onChange={field.onChange} lang={lang} />}
                                    />
                                </div>

                                {requiredDesposit && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg bg-[var(--accent-soft)]/20 border border-[var(--accent)]/10 animate-fade-in">
                                        <Input {...register('depositMinimumValue')} type="number" label={isAr ? 'قيمة العربون (%)' : 'Minimum Deposit (%)'} error={errors.depositMinimumValue?.message} required />
                                        <Input {...register('depositDuration')} type="number" label={isAr ? 'مهلة دفع العربون (دقائق)' : 'Deposit Window (minutes)'} error={errors.depositDuration?.message} required />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Breaks */}
                        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 flex flex-col gap-4 bg-[var(--surface-raised)]/20">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-[var(--text-primary)]">
                                    {isAr ? 'هل هناك فترات راحة لا تقدم فيها الخدمة؟' : 'Are there break times where the service is not provided?'}
                                </span>
                                <YesNoToggle
                                    checked={hasBreaks}
                                    onChange={(val) => {
                                        setHasBreaks(val)
                                        if (!val) setValue('freeScheduleTimes', [])
                                    }}
                                    lang={lang}
                                />
                            </div>

                            {hasBreaks && (
                                <div className="flex flex-col gap-3 mt-2 border-t border-[var(--border)] pt-3 animate-fade-in">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                                            {isAr ? 'فترات الراحة' : 'Break Times'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => append({ timeFrom: { hour: 12, minute: 0 }, toTime: { hour: 13, minute: 0 } })}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                                        >
                                            <HiPlus size={14} />
                                            {isAr ? 'إضافة بريك' : 'Add Break'}
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        {fields.length === 0 && (
                                            <p className="text-xs text-[var(--text-muted)] text-center py-5 border border-dashed border-[var(--border)] rounded-lg">
                                                {isAr ? 'لا توجد فترات راحة مضافة حالياً' : 'No break slots added yet'}
                                            </p>
                                        )}
                                        {fields.map((field, idx) => (
                                            <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] animate-fade-in">
                                                <Controller
                                                    control={control}
                                                    name={`freeScheduleTimes.${idx}.timeFrom`}
                                                    render={({ field: f }) => <TimePicker value={f.value} onChange={f.onChange} label={isAr ? 'من' : 'From'} />}
                                                />
                                                <Controller
                                                    control={control}
                                                    name={`freeScheduleTimes.${idx}.toTime`}
                                                    render={({ field: f }) => <TimePicker value={f.value} onChange={f.onChange} label={isAr ? 'إلى' : 'To'} />}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => remove(idx)}
                                                    className="h-10 w-9 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors mb-0.5"
                                                >
                                                    <HiTrash size={15} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}