// ─── ServiceFormModal ─────────────────────────────────────────────────────────
//
//  Handles both Create and Edit in one modal.
//
//  Cascading dropdowns:
//    1. Select a Category   → fires getServiceTypeByCategoryDropdown
//    2. Service Type list   → populated from category response, reset when category changes
//
//  Price logic:
//    isPriceRange = false → show `price` field only
//    isPriceRange = true  → show minPrice / maxPrice / priceNoteAr / priceNoteEn

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Modal, Input, Select, Button, Textarea,Toggle } from '@/components/shared'
import type { DropdownOption } from '@/types'
import type { SalonService, CategoryOption } from '../types'
import {
  useCreateSalonServiceMutation,
  useUpdateSalonServiceMutation,
  useGetServiceCategoryDropdownQuery,
  useGetServiceTypeByCategoryDropdownQuery,
} from '../services/salonServiceApi'

// ── Schema ────────────────────────────────────────────────────────────────────
const CODE_KEY_REGEX = /^[A-Z_]+$/

const schema = z
  .object({
    serviceCategoriesId: z.coerce.number().min(1, 'Category is required'),
    serviceTypeId: z.coerce.number().min(1, 'Service type is required'),
    /* codeKey: z
      .string()
      .min(1, 'Code key is required')
      .regex(CODE_KEY_REGEX, 'Only uppercase letters (A-Z) and underscores (_) are allowed'), */
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
/*     sortOrder: z.coerce.number().min(0, 'Sort order must be 0 or greater'),
 */  })
  .superRefine((data, ctx) => {
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
  })

type FormValues = z.infer<typeof schema>

const DEFAULT_VALUES: FormValues = {
  serviceCategoriesId: 0,
  serviceTypeId: 0,
/*   codeKey: '',
 */  nameAr: '',
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
/*   sortOrder: 0,
 */}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ServiceFormModalProps {
  open: boolean
  onClose: () => void
  /** Pass to enter edit mode */
  service?: SalonService
  /** Called after successful create with the new service id and name */
  onCreated?: (id: number, name: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ServiceFormModal({
  open,
  onClose,
  service,
  onCreated,
}: ServiceFormModalProps) {
  const { t } = useTranslation()
  const isEdit = Boolean(service)

  const [createService, { isLoading: isCreating }] = useCreateSalonServiceMutation()
  const [updateService, { isLoading: isUpdating }] = useUpdateSalonServiceMutation()
  const isLoading = isCreating || isUpdating

  // ── Form ────────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  const selectedCategoryId = watch('serviceCategoriesId')
  const isPriceRange = watch('isPriceRange')

  // ── Dropdown queries ────────────────────────────────────────────────────────
  const { data: categories = [] } = useGetServiceCategoryDropdownQuery()

  const { data: serviceTypes = [], isFetching: isLoadingTypes } =
    useGetServiceTypeByCategoryDropdownQuery(Number(selectedCategoryId), {
      // Don't fire until a real category is chosen
      skip: !selectedCategoryId || Number(selectedCategoryId) === 0,
    })

  const categoryOptions: DropdownOption[] = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }))

  const serviceTypeOptions: DropdownOption[] = serviceTypes.map((s) => ({
    value: s.id,
    label: s.name,
  }))

  // ── Reset serviceTypeId when category changes (create mode only) ────────────
  useEffect(() => {
    if (!isEdit) {
      setValue('serviceTypeId', 0)
    }
  }, [selectedCategoryId, isEdit, setValue])

  // ── Populate form on open ───────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      reset(
        service
          ? {
              serviceCategoriesId: service.serviceCategoriesId,
              serviceTypeId: service.serviceTypeId,
              /* codeKey: service.codeKey, */
              nameAr: service.nameAr,
              nameEn: service.nameEn,
              descriptionAr: service.descriptionAr,
              descriptionEn: service.descriptionEn,
              durationMinutes: service.durationMinutes,
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
              /* sortOrder: service.sortOrder, */
            }
          : DEFAULT_VALUES,
      )
    }
  }, [open, service, reset])

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      ...(values.isPriceRange
        ? { price: undefined }
        : { minPrice: undefined, maxPrice: undefined, priceNoteAr: undefined, priceNoteEn: undefined }),
    }

    try {
      if (isEdit && service) {
        await updateService({ id: service.id, ...payload }).unwrap()
        toast.success(t('common.success'))
        onClose()
      } else {
        const newId = await createService(payload).unwrap()
        toast.success(t('common.success'))
        onClose()
        onCreated?.(newId, values.nameEn)
      }
    } catch {
      toast.error(t('common.error'))
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? t('service.editService', 'Edit Service')
          : t('service.addService', 'Add Service')
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

        {/* ── Category & Service Type (cascading) ──────────────────────────── */}
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

        {/* ── Code Key ────────────────────────────────────────────────────── 
        <Input
          {...register('codeKey', {
            onChange: (e) => {
              e.target.value = e.target.value.toUpperCase().replace(/[^A-Z_]/g, '')
            },
          })}
          label={t('service.codeKey', 'Code Key')}
          placeholder="e.g. HAIR_COLOR"
          hint={t('service.codeKeyHint', 'Uppercase letters and underscores only (e.g. HAIR_COLOR)')}
          error={errors.codeKey?.message}
          required
        />
*/}
        {/* ── Names ───────────────────────────────────────────────────────── */}
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

        {/* ── Descriptions ────────────────────────────────────────────────── */}
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
        
        {/* ── Duration ────────────────────────────────────────────────────── */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            {...register('durationMinutes')}
            label={t('service.durationservice', 'Avarage Duration (minutes)')}
            type="number"
            min={1}
            placeholder="e.g. 30"
            error={errors.durationMinutes?.message}
            required
          />
        </div>
        
        {/* ── Pricing ─────────────────────────────────────────────────────── */}
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
             {/* داخل الـ isPriceRange block، بدّلي الـ price notes inputs */}
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

        {/* ── Toggles ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              { name: 'isActive' as const, label: t('service.isActive', 'Active') },
              { name: 'isFeatured' as const, label: t('service.isFeatured', 'Featured') },
              { name: 'isHomeService' as const, label: t('service.isHomeService', 'Home Service') },
              { name: 'isInSalonService' as const, label: t('service.isInSalonService', 'In-Salon') },
            ]
          ).map(({ name, label }) => (
            <Controller
              key={name}
              name={name}
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                  <span className="text-xs text-[var(--text-muted)]">{label}</span>
                  <Toggle checked={field.value} onChange={field.onChange} />
                </div>
              )}
            />
          ))}
        </div>

        {/* ── Sort Order ──────────────────────────────────────────────────── 
        <Input
          {...register('sortOrder')}
          type="number"
          min={0}
          label={t('service.sortOrder', 'Sort Order')}
          placeholder="0"
          error={errors.sortOrder?.message}
        />
        */}
      </div>
    </Modal>
  )
}