// ─── ServiceFormModal ─────────────────────────────────────────────────────────
//
//  Handles both Create and Edit in one modal.
//  In Add mode, it is a gorgeous 3-step wizard:
//    Step 1: Service details
//    Step 2: Branches & timing selection
//    Step 3: Advanced scheduling & breaks
//
//  After successfully creating the service, it loops through the selected branches
//  and calls the schedule API for each to create the schedule automatically.
//
//  In Edit mode, it remains a single-step modal to change service properties.

import { useEffect, useState, useMemo } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Modal, Input, Select, Button, Textarea, Toggle, MultiSelect, TimePicker } from '@/components/shared'
import type { DropdownOption } from '@/types'
import type { SalonService } from '../types'
import {
  useCreateSalonServiceMutation,
  useUpdateSalonServiceMutation,
  useGetServiceCategoryDropdownQuery,
  useGetServiceTypeByCategoryDropdownQuery,
} from '../services/salonServiceApi'
import { useGetSalonBranchesQuery } from '@/features/salonBranch/services/salonBranchApi'
import { useCreateSalonScheduleMutation } from '@/features/salonSchedule/services/salonScheduleApi'
import { HiCalendar, HiPlus, HiTrash, HiChevronLeft, HiChevronRight } from 'react-icons/hi'
import { cn } from '@/lib/cn'

// ── Helpers ───────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')

/** { hour, minute } → "HH:mm:ss" */
const formatTime = (t: { hour: number; minute: number }): string =>
  `${pad(t.hour)}:${pad(t.minute)}:00`

/** JS Date → "YYYY-MM-DD" */
const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Date + 30 days → "YYYY-MM-DD" */
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

const schema = z
  .object({
    // Step 1 fields
    serviceCategoriesId: z.coerce.number().min(1, 'Category is required'),
    serviceTypeId: z.coerce.number().min(1, 'Service type is required'),
    nameAr: z.string().min(1, 'Arabic name is required'),
    nameEn: z.string().min(1, 'English name is required'),
    descriptionAr: z.string().min(1, 'Arabic description is required'),
    descriptionEn: z.string().min(1, 'English description is required'),
    durationMinutes: z.coerce.number().min(1, 'Duration is required'),
    isPriceRange: z.boolean(),
    price: z.coerce.number().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    priceNoteAr: z.string().optional().default(''),
    priceNoteEn: z.string().optional().default(''),
    isHomeService: z.boolean(),
    isInSalonService: z.boolean(),
    isFeatured: z.boolean(),
    isActive: z.boolean(),

    // Step 2 fields (schedules)
    allBranches: z.boolean().default(true),
    selectedBranchIds: z.array(z.number()).default([]),
    allMonth: z.boolean().default(true),
    fromDate: z.string().optional().default(''),
    toDate: z.string().optional().default(''),
    availableAllDay: z.boolean().default(true),
    timeFrom: timeSchema.default({ hour: 9, minute: 0 }),
    timeTo: timeSchema.default({ hour: 21, minute: 0 }),

    // Step 3 fields (schedules)
    serviceDuration: z.coerce.number().min(1, 'Service duration is required').default(30),
    canCancelBefore: z.coerce.number().min(0).default(24),
    allChairs: z.boolean().default(true),
    howManyInPeriod: z.coerce.number().min(0).default(999),
    requiredSalonApproved: z.boolean().default(false),
    requiredDesposit: z.boolean().default(false),
    depositMinimumValue: z.coerce.number().min(0).default(0),
    depositDuration: z.coerce.number().min(0).default(0),
    freeScheduleTimes: z.array(
      z.object({
        id: z.number().optional(),
        timeFrom: timeSchema,
        toTime: timeSchema,
      })
    ).default([]),
  })
  .superRefine((data, ctx) => {
    // Step 1 Pricing
    if (!data.isPriceRange) {
      if (data.price === undefined || data.price < 0) {
        ctx.addIssue({ code: 'custom', path: ['price'], message: 'Price is required' })
      }
    } else {
      if (data.minPrice === undefined || data.minPrice < 0) {
        ctx.addIssue({ code: 'custom', path: ['minPrice'], message: 'Min price is required' })
      }
      if (data.maxPrice === undefined || data.maxPrice < 0) {
        ctx.addIssue({ code: 'custom', path: ['maxPrice'], message: 'Max price is required' })
      }
      if (
        data.minPrice !== undefined &&
        data.maxPrice !== undefined &&
        data.maxPrice < data.minPrice
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['maxPrice'],
          message: 'Max price must be ≥ min price',
        })
      }
    }

    // Step 2 & 3 validations
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
    if (!data.allChairs && (data.howManyInPeriod === undefined || data.howManyInPeriod < 1)) {
      ctx.addIssue({
        code: 'custom',
        path: ['howManyInPeriod'],
        message: 'Number of chairs must be at least 1',
      })
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
  })

type FormValues = z.infer<typeof schema>

const getInitialDefaultValues = () => {
  const now = new Date()
  return {
    serviceCategoriesId: 0,
    serviceTypeId: 0,
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    durationMinutes: 30,
    isPriceRange: false,
    price: 0,
    minPrice: 0,
    maxPrice: 0,
    priceNoteAr: '',
    priceNoteEn: '',
    isHomeService: false,
    isInSalonService: true,
    isFeatured: false,
    isActive: true,

    // Step 2
    allBranches: true,
    selectedBranchIds: [],
    allMonth: true,
    fromDate: toISODate(now),
    toDate: getThirtyDaysFromToday(),
    availableAllDay: true,
    timeFrom: { hour: 9, minute: 0 },
    timeTo: { hour: 21, minute: 0 },

    // Step 3
    serviceDuration: 30,
    canCancelBefore: 24,
    allChairs: true,
    howManyInPeriod: 999,
    requiredSalonApproved: false,
    requiredDesposit: false,
    depositMinimumValue: 0,
    depositDuration: 0,
    freeScheduleTimes: [],
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ServiceFormModalProps {
  open: boolean
  onClose: () => void
  service?: SalonService
  onCreated?: (id: number, name: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ServiceFormModal({
  open,
  onClose,
  service,
  onCreated,
}: ServiceFormModalProps) {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const lang = i18n.language
  const isEdit = Boolean(service)

  const [step, setStep] = useState(1)

  const [createService, { isLoading: isCreating }] = useCreateSalonServiceMutation()
  const [updateService, { isLoading: isUpdating }] = useUpdateSalonServiceMutation()
  const [createSchedule, { isLoading: isScheduling }] = useCreateSalonScheduleMutation()
  const isLoading = isCreating || isUpdating || isScheduling

  // Fetch branches for step 2 dropdown/multi-select
  const { data: branches = [] } = useGetSalonBranchesQuery(undefined, { skip: isEdit || !open })

  const branchOptions: DropdownOption[] = useMemo(() => {
    return branches.map((b) => ({
      value: b.id,
      label: lang === 'ar' ? b.nameAr : b.nameEn,
    }))
  }, [branches, lang])

  // ── Form ────────────────────────────────────────────────────────────────────
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
    resolver: zodResolver(schema) as any,
    defaultValues: getInitialDefaultValues(),
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'freeScheduleTimes' })

  const selectedCategoryId = watch('serviceCategoriesId')
  const isPriceRange = watch('isPriceRange')
  const allBranches = watch('allBranches')
  const allMonth = watch('allMonth')
  const availableAllDay = watch('availableAllDay')
  const allChairs = watch('allChairs')
  const requiredDesposit = watch('requiredDesposit')

  // ── Dropdown queries ────────────────────────────────────────────────────────
  const { data: categories = [] } = useGetServiceCategoryDropdownQuery(undefined, { skip: !open })

  const { data: serviceTypes = [], isFetching: isLoadingTypes } =
    useGetServiceTypeByCategoryDropdownQuery(Number(selectedCategoryId), {
      skip: !selectedCategoryId || Number(selectedCategoryId) === 0 || !open,
    })

  const categoryOptions: DropdownOption[] = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }))

  const serviceTypeOptions: DropdownOption[] = serviceTypes.map((s) => ({
    value: s.id,
    label: s.name,
  }))

  // Reset serviceTypeId when category changes (create mode only)
  useEffect(() => {
    if (!isEdit) {
      setValue('serviceTypeId', 0)
    }
  }, [selectedCategoryId, isEdit, setValue])

  // Populate form on open
  useEffect(() => {
    if (open) {
      setStep(1)
      reset(
        service
          ? {
              ...getInitialDefaultValues(),
              serviceCategoriesId: service.serviceCategoriesId,
              serviceTypeId: service.serviceTypeId,
              nameAr: service.nameAr,
              nameEn: service.nameEn,
              descriptionAr: service.descriptionAr,
              descriptionEn: service.descriptionEn,
              durationMinutes: service.durationMinutes ?? 30,
              isPriceRange: service.isPriceRange,
              price: service.price ?? 0,
              minPrice: service.minPrice ?? 0,
              maxPrice: service.maxPrice ?? 0,
              priceNoteAr: service.priceNoteAr ?? '',
              priceNoteEn: service.priceNoteEn ?? '',
              isHomeService: service.isHomeService,
              isInSalonService: service.isInSalonService,
              isFeatured: service.isFeatured,
              isActive: service.isActive,
            }
          : getInitialDefaultValues()
      )
    }
  }, [open, service, reset])

  // Step transitions validation
  const nextStep1 = async () => {
    const isValid = await trigger([
      'serviceCategoriesId',
      'serviceTypeId',
      'nameAr',
      'nameEn',
      'descriptionAr',
      'descriptionEn',
      'durationMinutes',
      'isPriceRange',
      'price',
      'minPrice',
      'maxPrice',
      'priceNoteAr',
      'priceNoteEn',
    ])
    if (isValid) {
      setStep(2)
    }
  }

  const nextStep2 = async () => {
    const isValid = await trigger([
      'allBranches',
      'selectedBranchIds',
      'allMonth',
      'fromDate',
      'toDate',
      'availableAllDay',
      'timeFrom',
      'timeTo',
    ])
    if (isValid) {
      // Pre-populate service duration in step 3 from step 1 duration Minutes
      const duration = watch('durationMinutes')
      setValue('serviceDuration', duration)
      setStep(3)
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    const servicePayload = {
      serviceCategoriesId: values.serviceCategoriesId,
      serviceTypeId: values.serviceTypeId,
      nameAr: values.nameAr,
      nameEn: values.nameEn,
      descriptionAr: values.descriptionAr,
      descriptionEn: values.descriptionEn,
      durationMinutes: values.durationMinutes,
      isPriceRange: values.isPriceRange,
      price: values.isPriceRange ? undefined : values.price,
      minPrice: values.isPriceRange ? values.minPrice : undefined,
      maxPrice: values.isPriceRange ? values.maxPrice : undefined,
      priceNoteAr: values.isPriceRange ? values.priceNoteAr : undefined,
      priceNoteEn: values.isPriceRange ? values.priceNoteEn : undefined,
      isHomeService: values.isHomeService,
      isInSalonService: values.isInSalonService,
      isFeatured: values.isFeatured,
      isActive: values.isActive,
    }

    try {
      if (isEdit && service) {
        await updateService({ id: service.id, ...servicePayload }).unwrap()
        toast.success(t('common.success'))
        onClose()
      } else {
        // 1. Create the new service
        const newServiceId = await createService(servicePayload as any).unwrap()

        // 2. Determine targeted branches
        let targetBranchIds: number[] = []
        if (values.allBranches) {
          targetBranchIds = branches.map((b) => b.id)
        } else {
          targetBranchIds = values.selectedBranchIds
        }

        // 3. Resolve dates
        const fromDateStr = values.allMonth ? toISODate(new Date()) : values.fromDate
        const toDateStr = values.allMonth ? getThirtyDaysFromToday() : values.toDate

        const [y, m, d] = (fromDateStr || '').split('-').map(Number)

        // 4. Create schedule requests for each targeted branch
        const schedulePromises = targetBranchIds.map((branchId) => {
          const branch = branches.find((b) => b.id === branchId)

          let resolvedTimeFrom = '09:00:00'
          let resolvedTimeTo = '21:00:00'

          if (values.availableAllDay) {
            if (branch && branch.openTime) resolvedTimeFrom = branch.openTime
            if (branch && branch.closeTime) resolvedTimeTo = branch.closeTime
          } else {
            resolvedTimeFrom = formatTime(values.timeFrom)
            resolvedTimeTo = formatTime(values.timeTo)
          }

          const schedulePayload = {
            salonServiceId: newServiceId,
            branchId,
            applyAllThisMonth: false,
            fromDate: fromDateStr,
            toDate: toDateStr,
            month: m || (new Date().getMonth() + 1),
            day: d || new Date().getDate(),
            year: y || new Date().getFullYear(),
            timeFrom: resolvedTimeFrom,
            timeTo: resolvedTimeTo,
            requiredDesposit: values.requiredDesposit,
            depositMinimumValue: values.requiredDesposit ? values.depositMinimumValue : 0,
            depositDuration: values.requiredDesposit ? values.depositDuration : 0,
            serviceDuration: values.serviceDuration,
            howManyInDay: null,
            howManyInPeriod: values.allChairs ? 999 : values.howManyInPeriod,
            canCancelBefore: values.canCancelBefore,
            requiredSalonApproved: values.requiredSalonApproved,
            freeScheduleTimes: values.freeScheduleTimes.map((slot) => ({
              timeFrom: formatTime(slot.timeFrom),
              toTime: formatTime(slot.toTime),
            })),
          }

          return createSchedule(schedulePayload as any).unwrap()
        })

        if (targetBranchIds.length > 0) {
          await Promise.all(schedulePromises)
        }

        toast.success(t('common.success'))
        onClose()
        onCreated?.(newServiceId, values.nameEn)
      }
    } catch (err) {
      console.error(err)
      toast.error(t('common.error'))
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const steps = [
    { number: 1, label: isAr ? 'تفاصيل الخدمة' : 'Service Details' },
    { number: 2, label: isAr ? 'الفروع والمواعيد' : 'Branches & Timing' },
    { number: 3, label: isAr ? 'إعدادات متقدمة' : 'Advanced Settings' },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? t('service.editService', 'Edit Service')
          : step === 1
            ? (isAr ? 'إضافة خدمة جديدة' : 'Add New Service')
            : step === 2
              ? (isAr ? 'تحديد الفروع والمواعيد' : 'Branches & Timing')
              : (isAr ? 'إعدادات الحجز المتقدمة' : 'Advanced Scheduling')
      }
      size="lg"
      footer={
        <>
          {isEdit ? (
            <>
              <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSubmit(onSubmit)} loading={isLoading}>
                {t('common.save')}
              </Button>
            </>
          ) : (
            <>
              {step === 1 && (
                <>
                  <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={nextStep1} rightIcon={isAr ? <HiChevronLeft size={15} /> : <HiChevronRight size={15} />}>
                    {isAr ? 'التالي' : 'Next'}
                  </Button>
                </>
              )}
              {step === 2 && (
                <>
                  <Button variant="secondary" onClick={() => setStep(1)} leftIcon={isAr ? <HiChevronRight size={15} /> : <HiChevronLeft size={15} />}>
                    {isAr ? 'السابق' : 'Back'}
                  </Button>
                  <Button onClick={nextStep2} rightIcon={isAr ? <HiChevronLeft size={15} /> : <HiChevronRight size={15} />}>
                    {isAr ? 'التالي' : 'Next'}
                  </Button>
                </>
              )}
              {step === 3 && (
                <>
                  <Button variant="secondary" onClick={() => setStep(2)} leftIcon={isAr ? <HiChevronRight size={15} /> : <HiChevronLeft size={15} />}>
                    {isAr ? 'السابق' : 'Back'}
                  </Button>
                  <Button onClick={handleSubmit(onSubmit)} loading={isLoading}>
                    {isAr ? 'إضافة الخدمة والجدول' : 'Add Service & Schedule'}
                  </Button>
                </>
              )}
            </>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Step Indicator */}
        {!isEdit && (
          <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-4 px-1">
            {steps.map((s, idx) => (
              <div key={s.number} className="flex items-center flex-1 last:flex-initial">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300',
                      step === s.number
                        ? 'bg-[var(--accent)] text-white ring-4 ring-[var(--accent-soft)] shadow-sm'
                        : step > s.number
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[var(--bg-hover)] text-[var(--text-muted)] border border-[var(--border)]'
                    )}
                  >
                    {step > s.number ? '✓' : s.number}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      step === s.number ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-secondary)]'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-[2px] flex-1 mx-3 rounded-full transition-colors duration-500',
                      step > s.number ? 'bg-emerald-500' : 'bg-[var(--border)]'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* STEP 1: Basic Service Information */}
        {(isEdit || step === 1) && (
          <div className="flex flex-col gap-5 animate-fade-in">
            {/* Category & Service Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                {...register('serviceCategoriesId')}
                label={t('service.category', 'Category')}
                options={categoryOptions}
                placeholder={t('service.selectCategory', 'Select a category')}
                error={errors.serviceCategoriesId?.message}
                required
              />
              <Select
                {...register('serviceTypeId')}
                label={t('service.serviceType', 'Service Type')}
                options={serviceTypeOptions}
                placeholder={
                  !selectedCategoryId || Number(selectedCategoryId) === 0
                    ? t('service.selectCategoryFirst', 'Select a category first')
                    : isLoadingTypes
                      ? t('common.loading', 'Loading…')
                      : t('service.selectServiceType', 'Select a type')
                }
                error={errors.serviceTypeId?.message}
                disabled={!selectedCategoryId || Number(selectedCategoryId) === 0 || isLoadingTypes}
                required
              />
            </div>

            {/* Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                {...register('nameEn')}
                label={t('service.nameEn', 'Name (EN)')}
                placeholder="e.g. Hair Coloring"
                error={errors.nameEn?.message}
                required
              />
              <Input
                {...register('nameAr')}
                label={t('service.nameAr', 'Name (AR)')}
                placeholder="مثال: صبغ الشعر"
                error={errors.nameAr?.message}
                dir="rtl"
                required
              />
            </div>

            {/* Descriptions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea
                {...register('descriptionEn')}
                label={t('service.descriptionEn', 'Description (EN)')}
                placeholder="Describe the service in English…"
                error={errors.descriptionEn?.message}
                rows={3}
                required
              />
              <Textarea
                {...register('descriptionAr')}
                label={t('service.descriptionAr', 'Description (AR)')}
                placeholder="اوصف الخدمة بالعربية…"
                error={errors.descriptionAr?.message}
                rows={3}
                dir="rtl"
                required
              />
            </div>

            {/* Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                {...register('durationMinutes')}
                label={t('service.durationservice', 'Average Duration (minutes)')}
                type="number"
                min={1}
                placeholder="e.g. 30"
                error={errors.durationMinutes?.message}
                required
              />
            </div>

            {/* Pricing */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {t('service.pricing', 'Pricing')}
                </span>
                <Controller
                  name="isPriceRange"
                  control={control}
                  render={({ field }) => (
                    <Toggle
                      checked={field.value}
                      onChange={field.onChange}
                      label={t('service.isPriceRange', 'Price Range')}
                    />
                  )}
                />
              </div>

              {!isPriceRange ? (
                <Input
                  {...register('price')}
                  type="number"
                  min={0}
                  label={t('service.price', 'Price')}
                  placeholder="0.00"
                  error={errors.price?.message}
                  required
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      {...register('minPrice')}
                      type="number"
                      min={0}
                      label={t('service.minPrice', 'Min Price')}
                      placeholder="0.00"
                      error={errors.minPrice?.message}
                      required
                    />
                    <Input
                      {...register('maxPrice')}
                      type="number"
                      min={0}
                      label={t('service.maxPrice', 'Max Price')}
                      placeholder="0.00"
                      error={errors.maxPrice?.message}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Textarea
                      {...register('priceNoteEn')}
                      label={t('service.priceNoteEn', 'Price Note (EN)')}
                      placeholder="e.g. Starting from, depending on hair length"
                      error={errors.priceNoteEn?.message}
                      rows={2}
                    />
                    <Textarea
                      {...register('priceNoteAr')}
                      label={t('service.priceNoteAr', 'Price Note (AR)')}
                      placeholder="مثال: يبدأ من، حسب طول الشعر"
                      error={errors.priceNoteAr?.message}
                      rows={2}
                      dir="rtl"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'isActive' as const, label: t('service.isActive', 'Active') },
                { name: 'isFeatured' as const, label: t('service.isFeatured', 'Featured') },
                { name: 'isHomeService' as const, label: t('service.isHomeService', 'Home Service') },
                { name: 'isInSalonService' as const, label: t('service.isInSalonService', 'In-Salon') },
              ].map(({ name, label }) => (
                <Controller
                  key={name}
                  name={name}
                  control={control}
                  render={({ field }) => (
                    <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] p-3 bg-[var(--surface)]">
                      <span className="text-xs text-[var(--text-muted)]">{label}</span>
                      <Toggle checked={field.value} onChange={field.onChange} />
                    </div>
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Branches & Schedule Dates/Times */}
        {!isEdit && step === 2 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            {/* Branch Selection */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 flex flex-col gap-4 bg-[var(--surface-raised)]/20">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {isAr ? 'متاح في كل الفروع؟' : 'Available in All Branches?'}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {allBranches
                      ? (isAr ? 'سيتم تقديم الخدمة في جميع فروع الصالون المتاحة' : 'Service will be available in all branch locations')
                      : (isAr ? 'اختر فروعاً محددة لتقديم الخدمة بها' : 'Select specific branch locations')}
                  </span>
                </div>
                <Controller
                  name="allBranches"
                  control={control}
                  render={({ field }) => (
                    <Toggle checked={field.value} onChange={field.onChange} />
                  )}
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

            {/* Date scheduling */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 flex flex-col gap-4 bg-[var(--surface-raised)]/20">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {isAr ? 'متاح طول الشهر (30 يوم من اليوم)؟' : 'Available All Month (30 days)?'}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {allMonth
                      ? (isAr ? 'تفعيل الجدول تلقائياً لمدة 30 يوماً من اليوم' : 'Automatically active for the next 30 days starting today')
                      : (isAr ? 'اختر فترة زمنية محددة يدوياً' : 'Define a custom date range')}
                  </span>
                </div>
                <Controller
                  name="allMonth"
                  control={control}
                  render={({ field }) => (
                    <Toggle checked={field.value} onChange={field.onChange} />
                  )}
                />
              </div>

              {allMonth ? (
                <div className="flex gap-3 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-300 animate-fade-in">
                  <HiCalendar size={20} className="shrink-0 mt-0.5 text-blue-500 dark:text-blue-400" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold leading-snug">
                      {isAr
                        ? 'ملاحظة: سيتم إضافة المواعيد تلقائياً للـ 30 يوماً القادمة بدءاً من اليوم (مثال: إذا كان اليوم 12، سيتم إضافة 30 يوماً من بعد اليوم 12).'
                        : 'Note: schedules will be automatically created for the next 30 days starting from today.'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">
                      {isAr ? 'من تاريخ' : 'From Date'} <span className="text-[var(--danger)]">*</span>
                    </label>
                    <input
                      type="date"
                      {...register('fromDate')}
                      className="h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)] w-full"
                    />
                    {errors.fromDate && <p className="text-xs text-[var(--danger)]">{errors.fromDate.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">
                      {isAr ? 'إلى تاريخ' : 'To Date'} <span className="text-[var(--danger)]">*</span>
                    </label>
                    <input
                      type="date"
                      {...register('toDate')}
                      className="h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)] w-full"
                    />
                    {errors.toDate && <p className="text-xs text-[var(--danger)]">{errors.toDate.message}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Time / Working Hours */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 flex flex-col gap-4 bg-[var(--surface-raised)]/20">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {isAr ? 'متاح طوال اليوم (ساعات العمل الرسمية للفروع)؟' : 'Available All Day (Branch opening hours)?'}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {availableAllDay
                      ? (isAr ? 'أخذ أوقات الفتح والإغلاق الرسمية للفروع المختارة تلقائياً' : 'Use branch-specific business hours automatically')
                      : (isAr ? 'تحديد فترة ساعات عمل مخصصة لهذه الخدمة' : 'Specify custom scheduling hours')}
                  </span>
                </div>
                <Controller
                  name="availableAllDay"
                  control={control}
                  render={({ field }) => (
                    <Toggle checked={field.value} onChange={field.onChange} />
                  )}
                />
              </div>

              {!availableAllDay && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1 animate-fade-in">
                  <Controller
                    control={control}
                    name="timeFrom"
                    render={({ field }) => (
                      <TimePicker
                        value={field.value}
                        onChange={field.onChange}
                        label={isAr ? 'من الساعة' : 'From Time'}
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
                        label={isAr ? 'إلى الساعة' : 'To Time'}
                        error={errors.timeTo?.message}
                        required
                      />
                    )}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Advanced Schedule Details & Break times */}
        {!isEdit && step === 3 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            {/* Core Schedule durations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                {...register('serviceDuration')}
                type="number"
                label={isAr ? 'الوقت المستغرق للخدمة (دقائق)' : 'Service Duration (minutes)'}
                error={errors.serviceDuration?.message}
                required
              />
              <Input
                {...register('canCancelBefore')}
                type="number"
                label={isAr ? 'إمكانية إلغاء الحجز قبلها بـ (ساعة)' : 'Can Cancel Before (hours)'}
                error={errors.canCancelBefore?.message}
                required
              />
            </div>

            {/* Chairs availability */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 flex flex-col gap-4 bg-[var(--surface-raised)]/20">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {isAr ? 'متاح لكل الكراسي / المقاعد؟' : 'Available for all Chairs / Seats?'}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {allChairs
                      ? (isAr ? 'الخدمة متاحة على جميع كراسي الصالون بالتوازي' : 'All chairs/seats can be booked simultaneously')
                      : (isAr ? 'تحديد حد أقصى لعدد الكراسي المتاحة في نفس الوقت' : 'Limit maximum concurrent chairs')}
                  </span>
                </div>
                <Controller
                  name="allChairs"
                  control={control}
                  render={({ field }) => (
                    <Toggle checked={field.value} onChange={field.onChange} />
                  )}
                />
              </div>

              {!allChairs && (
                <div className="animate-fade-in">
                  <Input
                    {...register('howManyInPeriod')}
                    type="number"
                    min={1}
                    label={isAr ? 'عدد الكراسي المتاحة' : 'Number of Chairs'}
                    error={errors.howManyInPeriod?.message}
                    required
                  />
                </div>
              )}
            </div>

            {/* Toggles (Approval and Deposit) */}
            <div className="flex flex-col gap-4 py-1">
              <Controller
                control={control}
                name="requiredSalonApproved"
                render={({ field }) => (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {isAr ? 'يتطلب موافقة الصالون' : 'Requires Salon Approval'}
                      </span>
                    </div>
                    <Toggle checked={field.value} onChange={field.onChange} />
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
                    render={({ field }) => (
                      <Toggle checked={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>

                {requiredDesposit && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg bg-[var(--accent-soft)]/20 border border-[var(--accent)]/10 animate-fade-in">
                    <Input
                      {...register('depositMinimumValue')}
                      type="number"
                      label={isAr ? 'قيمة العربون (%)' : 'Minimum Deposit (%)'}
                      error={errors.depositMinimumValue?.message}
                      required
                    />
                    <Input
                      {...register('depositDuration')}
                      type="number"
                      label={isAr ? 'مهلة دفع العربون (دقائق)' : 'Deposit Window (minutes)'}
                      error={errors.depositDuration?.message}
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Free Schedule Times (Breaks) */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 flex flex-col gap-3 bg-[var(--surface-raised)]/10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {isAr ? 'فترات الراحة / البريك (أوقات غير متاحة للحجز)' : 'Break Times (Blocked-out slots)'}
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
                      render={({ field: f }) => (
                        <TimePicker
                          value={f.value}
                          onChange={f.onChange}
                          label={isAr ? 'من' : 'From'}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name={`freeScheduleTimes.${idx}.toTime`}
                      render={({ field: f }) => (
                        <TimePicker
                          value={f.value}
                          onChange={f.onChange}
                          label={isAr ? 'إلى' : 'To'}
                        />
                      )}
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
          </div>
        )}
      </div>
    </Modal>
  )
}