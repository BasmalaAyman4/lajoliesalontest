// ─── ServiceDiscountFormModal ─────────────────────────────────────────────────
//
//  Create / Edit a service discount.
//  Details are a dynamic list of rows: each row picks a service + discount %.
//  Dates are validated so dateFrom ≤ toDate.

import { useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { HiPlus, HiTrash } from 'react-icons/hi'
import { Modal, Input, Select, Button } from '@/components/shared'
import type { DropdownOption } from '@/types'
import type { ServiceDiscount } from '../types'
import {
  useCreateServiceDiscountMutation,
  useUpdateServiceDiscountMutation,
  useGetSalonServiceDropdownQuery,
} from '../services/serviceDiscountApi'

// ── Schema ────────────────────────────────────────────────────────────────────
const detailSchema = z.object({
  serviceId: z.coerce.number().min(1, 'Service is required'),
  discountValue: z.coerce
    .number()
    .min(0.01, 'Must be > 0')
    .max(100, 'Cannot exceed 100%'),
})

const schema = z
  .object({
    dateFrom: z.string().min(1, 'Start date is required'),
    toDate: z.string().min(1, 'End date is required'),
    details: z.array(detailSchema).min(1, 'At least one service is required'),
  })
  .refine((d) => d.dateFrom <= d.toDate, {
    message: 'End date must be on or after start date',
    path: ['toDate'],
  })

type FormValues = z.infer<typeof schema>

const today = new Date().toISOString().slice(0, 10)

const DEFAULT_VALUES: FormValues = {
  dateFrom: today,
  toDate: today,
  details: [{ serviceId: 0, discountValue: 0 }],
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ServiceDiscountFormModalProps {
  open: boolean
  onClose: () => void
  discount?: ServiceDiscount
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ServiceDiscountFormModal({
  open,
  onClose,
  discount,
}: ServiceDiscountFormModalProps) {
  const { t } = useTranslation()
  const isEdit = Boolean(discount)

  const [createDiscount, { isLoading: isCreating }] = useCreateServiceDiscountMutation()
  const [updateDiscount, { isLoading: isUpdating }] = useUpdateServiceDiscountMutation()
  const isLoading = isCreating || isUpdating

  const { data: services = [] } = useGetSalonServiceDropdownQuery()

  const serviceOptions: DropdownOption[] = services.map((s) => ({
    value: s.id,
    label: s.name,
  }))

  // ── Form ────────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'details' })

  // ── Populate on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      reset(
        discount
          ? {
              dateFrom: discount.dateFrom.slice(0, 10),
              toDate: discount.toDate.slice(0, 10),
              details: discount.details.map((d) => ({
                serviceId: d.salonServiceId,
                discountValue: d.discountValue,
              })),
            }
          : DEFAULT_VALUES,
      )
    }
  }, [open, discount, reset])

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && discount) {
        await updateDiscount({
          id: discount.id,
          dateFrom: values.dateFrom,
          toDate: values.toDate,
          details: values.details.map((d) => ({
            salonServiceId: d.serviceId,
            discountValue: d.discountValue,
          })),
        }).unwrap()
      } else {
        await createDiscount({
          dateFrom: values.dateFrom,
          toDate: values.toDate,
          details: values.details.map((d) => ({
            serviceId: d.serviceId,
            discountValue: d.discountValue,
          })),
        }).unwrap()
      }
      toast.success(t('common.success'))
      onClose()
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
          ? t('discount.editDiscount', 'Edit Discount')
          : t('discount.addDiscount', 'Add Discount')
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

        {/* ── Date range ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            {...register('dateFrom')}
            type="date"
            label={t('discount.dateFrom', 'Start Date')}
            error={errors.dateFrom?.message}
            required
          />
          <Input
            {...register('toDate')}
            type="date"
            label={t('discount.toDate', 'End Date')}
            error={errors.toDate?.message}
            required
          />
        </div>

        {/* ── Details rows ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {t('discount.services', 'Services & Discounts')}
            </span>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<HiPlus size={14} />}
              onClick={() => append({ serviceId: 0, discountValue: 0 })}
            >
              {t('discount.addRow', 'Add Row')}
            </Button>
          </div>

          {/* Error for empty array */}
          {errors.details?.root?.message && (
            <p className="text-xs text-[var(--danger)]">{errors.details.root.message}</p>
          )}

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_140px_36px] gap-2 px-1">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {t('discount.service', 'Service')}
            </span>
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {t('discount.discountValue', 'Discount (%)')}
            </span>
            <span />
          </div>

          <div className="flex flex-col gap-2">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_140px_36px] gap-2 items-start">
                {/* Service select */}
                <Controller
                  control={control}
                  name={`details.${index}.serviceId`}
                  render={({ field: f }) => (
                    <Select
                      value={f.value}
                      onChange={f.onChange}
                      options={serviceOptions}
                      placeholder={t('discount.selectService', 'Select service')}
                      error={errors.details?.[index]?.serviceId?.message}
                    />
                  )}
                />

                {/* Discount value */}
                <Input
                  {...register(`details.${index}.discountValue`)}
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  placeholder="e.g. 20"
                  error={errors.details?.[index]?.discountValue?.message}
                />

                {/* Remove row */}
                <button
                  type="button"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                  className="w-9 h-9 mt-0.5 rounded-lg flex items-center justify-center
                    text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50
                    transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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