// ─── BranchChairFormModal ─────────────────────────────────────────────────────
//
//  Create: pick branch + chair type + quantity + active.
//  Edit: branch/chair type are locked (PUT API doesn't accept changes to them).

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Input, Button, Select, Modal, Toggle } from '@/components/shared'
import type { BranchChair } from '../types'
import {
  useGetBranchDropdownQuery,
  useGetChairTypeDropdownQuery,
  useCreateBranchChairMutation,
  useUpdateBranchChairMutation,
} from '../services/branchChairApi'
import { getApiError } from '@/services/apiHelpers'

const MAX_INT32 = 2147483647

// Shared helper: an empty/undefined/NaN/0 select value becomes `undefined`
// so Zod reports "required" instead of choking on NaN.
const idField = (message: string) =>
  z.preprocess(
    (val) => (val === '' || val === undefined || Number.isNaN(val) || val === 0 ? undefined : val),
    z.number({ required_error: message, invalid_type_error: message }).min(1, message),
  )

const schema = z.object({
  salonBranchId: idField('Branch is required'),
  chairTypeId: idField('Chair type is required'),
  quantity: z.preprocess(
    (val) => (val === '' || val === undefined || Number.isNaN(val) ? undefined : val),
    z
      .number({ required_error: 'Quantity is required', invalid_type_error: 'Quantity is required' })
      .int('Quantity must be a whole number')
      .min(1, 'Quantity must be at least 1')
      .max(MAX_INT32, 'Quantity is too large'),
  ),
  isActive: z.boolean(),
})

// Input = what the form fields hold while typing/selecting (can be undefined)
// Output = what onSubmit receives (guaranteed valid numbers)
type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

interface BranchChairFormModalProps {
  open: boolean
  onClose: () => void
  branchChair?: BranchChair
}

const DEFAULT_VALUES: FormInput = {
  salonBranchId: undefined,
  chairTypeId: undefined,
  quantity: undefined,
  isActive: true,
}

export default function BranchChairFormModal({
  open,
  onClose,
  branchChair,
}: BranchChairFormModalProps) {
  const { t } = useTranslation()
  const isEdit = Boolean(branchChair)

  const { data: branchOptions = [], isLoading: isBranchesLoading } =
    useGetBranchDropdownQuery()
  const { data: chairTypeOptions = [], isLoading: isChairTypesLoading } =
    useGetChairTypeDropdownQuery()

  const [createBranchChair, { isLoading: isCreating }] = useCreateBranchChairMutation()
  const [updateBranchChair, { isLoading: isUpdating }] = useUpdateBranchChairMutation()
  const isLoading = isCreating || isUpdating

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) {
      reset(
        branchChair
          ? {
              salonBranchId: branchChair.salonBranchId,
              chairTypeId: branchChair.chairTypeId,
              quantity: branchChair.quantity,
              isActive: branchChair.isActive,
            }
          : DEFAULT_VALUES,
      )
    }
  }, [open, branchChair, reset])

  const onSubmit = async (values: FormOutput) => {
    try {
      if (isEdit && branchChair) {
        // Branch/chair type intentionally omitted — API doesn't accept them on PUT
        await updateBranchChair({
          id: branchChair.id,
          quantity: values.quantity,
          isActive: values.isActive,
        }).unwrap()
      } else {
        await createBranchChair({
          salonBranchId: values.salonBranchId,
          chairTypeId: values.chairTypeId,
          quantity: values.quantity,
          isActive: values.isActive,
        }).unwrap()
      }
      toast.success(t('common.success'))
      onClose()
    } catch (error) {
      toast.error(getApiError(error, t('common.error')))
    }
  }

  const branchName = branchOptions.find((b) => b.id === branchChair?.salonBranchId)?.name
  const chairTypeName = chairTypeOptions.find(
    (c) => c.id === branchChair?.chairTypeId,
  )?.name

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? t('branchChair.editChair', 'Edit Chair')
          : t('branchChair.addChair', 'Add Chair')
      }
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
        {/* ── Branch ─────────────────────────────────────────────────────── */}
        {isEdit ? (
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              {t('branchChair.branch', 'Branch')}
            </p>
            <p className="text-sm text-[var(--text-muted)]">{branchName ?? '—'}</p>
          </div>
        ) : (
        <Controller
  control={control}
  name="salonBranchId"
  render={({ field }) => (
    <Select
      label={t('branchChair.branch', 'Branch')}
      value={field.value ?? ''}
      onChange={(e) => {
        const raw = e.target.value
        field.onChange(raw === '' ? undefined : Number(raw))
      }}
      options={branchOptions.map((b) => ({ value: b.id, label: b.name }))}
      placeholder={t('branchChair.selectBranch', 'Select a branch')}
      loading={isBranchesLoading}
      error={errors.salonBranchId?.message}
      required
    />
  )}
/>
        )}

        {/* ── Chair Type ─────────────────────────────────────────────────── */}
        {isEdit ? (
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              {t('branchChair.chairType', 'Chair Type')}
            </p>
            <p className="text-sm text-[var(--text-muted)]">{chairTypeName ?? '—'}</p>
          </div>
        ) : (
        <Controller
  control={control}
  name="chairTypeId"
  render={({ field }) => (
    <Select
      label={t('branchChair.chairType', 'Chair Type')}
      value={field.value ?? ''}
      onChange={(e) => {
        const raw = e.target.value
        field.onChange(raw === '' ? undefined : Number(raw))
      }}
      options={chairTypeOptions.map((c) => ({ value: c.id, label: c.name }))}
      placeholder={t('branchChair.selectChairType', 'Select a chair type')}
      loading={isChairTypesLoading}
      error={errors.chairTypeId?.message}
      required
    />
  )}
/>
        )}

        {/* ── Quantity ───────────────────────────────────────────────────── */}
        <Controller
          control={control}
          name="quantity"
          render={({ field }) => (
            <Input
              type="number"
              min={1}
              max={MAX_INT32}
              value={field.value ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                field.onChange(raw === '' ? undefined : Number(raw))
              }}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              label={t('branchChair.quantity', 'Quantity')}
              error={errors.quantity?.message}
              required
            />
          )}
        />

        {/* ── Active ─────────────────────────────────────────────────────── */}
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <Toggle
              checked={field.value}
              onChange={field.onChange}
              label={t('branchChair.isActive', 'Active')}
            />
          )}
        />
      </div>
    </Modal>
  )
}