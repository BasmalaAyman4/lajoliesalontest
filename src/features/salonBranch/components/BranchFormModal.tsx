// ─── BranchFormModal ──────────────────────────────────────────────────────────
//
//  Handles both Create and Edit in one modal.
//  Pass `branchId` to enter edit mode; omit it for create mode.
//  In edit mode, fetches the full branch (with chairs) by id — the list
//  endpoint that feeds the table does NOT include chairs.

import { useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { HiPlus, HiTrash } from 'react-icons/hi'
import {
  Input,
  Button,
  MapPicker,
  Modal,
  TimePicker,
  Select,
  Toggle,
} from '@/components/shared'
import {
  useGetChairTypeDropdownQuery,
  useGetSalonBranchByIdQuery,
  useCreateSalonBranchMutation,
  useUpdateSalonBranchMutation,
} from '../services/salonBranchApi'

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')

/** { hour, minute } → "HH:mm:ss" */
const formatTime = (time: { hour: number; minute: number }): string =>
  `${pad(time.hour)}:${pad(time.minute)}:00`

/** "HH:mm:ss" → { hour, minute } — for populating the form when editing */
const parseTime = (str: string): { hour: number; minute: number } => {
  const [h, m] = str.split(':').map(Number)
  return { hour: h ?? 0, minute: m ?? 0 }
}

// ── Schema ────────────────────────────────────────────────────────────────────
const timeSchema = z.object({
  hour: z.number().min(0).max(23),
  minute: z.number().min(0).max(59),
})

const chairSchema = z.object({
  chairTypeId: z.number().min(1, 'Chair type is required'),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(999, 'Quantity seems too high'),
  isActive: z.boolean(),
})

const schema = z.object({
  nameAr: z.string().min(1, 'Arabic name is required'),
  nameEn: z.string().min(1, 'English name is required'),
  managerName: z.string().min(1, 'Manager name is required'),
  telephone: z.string().min(1, 'Telephone is required'),
  mobile: z.string().min(1, 'Mobile is required'),
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    latitude: z.string().min(1, 'Location is required'),
    longitude: z.string().min(1, 'Location is required'),
  }),
  openTime: timeSchema,
  closeTime: timeSchema,
  chairs: z
    .array(chairSchema)
    .min(1, 'Add at least one chair type')
    .refine(
      (chairs) => new Set(chairs.map((c) => c.chairTypeId)).size === chairs.length,
      { message: 'Each chair type can only be added once' },
    ),
})

type FormValues = z.infer<typeof schema>

// ── Props ─────────────────────────────────────────────────────────────────────
interface BranchFormModalProps {
  open: boolean
  onClose: () => void
  /** Pass the branch id to edit; omit for create mode */
  branchId?: number
}

// ── Default values ────────────────────────────────────────────────────────────
const DEFAULT_VALUES: FormValues = {
  nameAr: '',
  nameEn: '',
  managerName: '',
  telephone: '',
  mobile: '',
  location: { address: '', latitude: '', longitude: '' },
  openTime: { hour: 9, minute: 0 },
  closeTime: { hour: 21, minute: 0 },
  chairs: [{ chairTypeId: 0, quantity: 1, isActive: true }],
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BranchFormModal({
  open,
  onClose,
  branchId,
}: BranchFormModalProps) {
  const { t , i18n} = useTranslation()
  const isEdit = branchId != null

  const [createBranch, { isLoading: isCreating }] = useCreateSalonBranchMutation()
  const [updateBranch, { isLoading: isUpdating }] = useUpdateSalonBranchMutation()
  const isSaving = isCreating || isUpdating

  // Fetch full branch (with chairs) only when editing and the modal is open
  const { data: branchDetail, isFetching: isLoadingBranch } = useGetSalonBranchByIdQuery(
    branchId as number,
    { skip: !open || !isEdit },
  )

  // Only fetch the dropdown while the modal is actually open
  const { data: chairTypes = [], isLoading: isLoadingChairTypes } =
    useGetChairTypeDropdownQuery(undefined, { skip: !open })

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  const {
    fields: chairFields,
    append: appendChair,
    remove: removeChair,
  } = useFieldArray({ control, name: 'chairs' })

  const watchedChairs = watch('chairs')

  // Reset form: create mode → defaults immediately; edit mode → wait for branchDetail
  useEffect(() => {
    if (!open) return

    if (!isEdit) {
      reset(DEFAULT_VALUES)
      return
    }

    if (branchDetail) {
      reset({
        nameAr: branchDetail.nameAr,
        nameEn: branchDetail.nameEn,
        managerName: branchDetail.managerName,
        telephone: branchDetail.telephone,
        mobile: branchDetail.mobile,
        location: {
          address: branchDetail.address,
          latitude: branchDetail.lat,
          longitude: branchDetail.long,
        },
        openTime: parseTime(branchDetail.openTime),
        closeTime: parseTime(branchDetail.closeTime),
        chairs:
          branchDetail.chairs.length > 0
            ? branchDetail.chairs.map((c) => ({
                chairTypeId: c.chairTypeId,
                quantity: c.quantity,
                isActive: c.isActive,
              }))
            : DEFAULT_VALUES.chairs,
      })
    }
  }, [open, isEdit, branchDetail, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      nameAr: values.nameAr,
      nameEn: values.nameEn,
      managerName: values.managerName,
      telephone: values.telephone,
      mobile: values.mobile,
      address: values.location.address,
      lat: values.location.latitude,
      long: values.location.longitude,
      openTime: formatTime(values.openTime),
      closeTime: formatTime(values.closeTime),
      chairs: values.chairs,
    }

    try {
      if (isEdit && branchId != null) {
        await updateBranch({ id: branchId, ...payload }).unwrap()
      } else {
        await createBranch(payload).unwrap()
      }
      toast.success(t('common.success'))
      onClose()
    } catch {
      toast.error(t('common.error'))
    }
  }

  const chairTypeOptions = chairTypes.map((c) => ({
    value: c.id,
    label: c.name,
  }))

  /** Options for a given row = all types minus the ones already picked in other rows */
  const optionsForRow = (rowIndex: number) => {
    const selectedElsewhere = new Set(
      watchedChairs
        ?.filter((_, i) => i !== rowIndex)
        .map((c) => c.chairTypeId)
        .filter(Boolean),
    )
    return chairTypeOptions.filter(
      (opt) =>
        !selectedElsewhere.has(opt.value) ||
        opt.value === watchedChairs?.[rowIndex]?.chairTypeId,
    )
  }

  // Edit mode, still loading the branch detail → show a lightweight skeleton
  // instead of a form that's about to be blown away by reset()
  const isLoadingInitialData = isEdit && isLoadingBranch && !branchDetail

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? t('branch.editBranch', 'Edit Branch')
          : t('branch.addBranch', 'Add Branch')
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            loading={isSaving}
            disabled={isLoadingInitialData}
          >
            {isEdit ? t('common.save') : t('common.add', 'Add')}
          </Button>
        </>
      }
    >
      {isLoadingInitialData ? (
        <div className="flex flex-col gap-4">
        
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* ── Names ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              {...register('nameEn')}
              label={t('branch.nameEn', 'Name (EN)')}
              placeholder="e.g. Downtown Branch"
              error={errors.nameEn?.message}
              required
            />
            <Input
              {...register('nameAr')}
              label={t('branch.nameAr', 'Name (AR)')}
              placeholder="مثال: فرع وسط المدينة"
              error={errors.nameAr?.message}
              dir="rtl"
              required
            />
          </div>

          {/* ── Manager ────────────────────────────────────────────────────── */}
          <Input
            {...register('managerName')}
            label={t('branch.managerName', 'Manager Name')}
            placeholder="e.g. Ahmed Hassan"
            error={errors.managerName?.message}
            required
          />

          {/* ── Contact ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              {...register('telephone')}
              label={t('branch.telephone', 'Telephone')}
              placeholder="+20 2 XXXX XXXX"
              error={errors.telephone?.message}
              required
            />
            <Input
              {...register('mobile')}
              label={t('branch.mobile', 'Mobile')}
              placeholder="+20 1X XXXX XXXX"
              error={errors.mobile?.message}
              required
            />
          </div>

          {/* ── Working hours ───────────────────────────────────────────────── */}
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
              {t('branch.workingHours', 'Working Hours')}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="openTime"
                render={({ field }) => (
                  <TimePicker
                    value={field.value}
                    onChange={field.onChange}
                    label={t('branch.openTime', 'Open Time')}
                    error={errors.openTime?.message}
                    required
                  />
                )}
              />
              <Controller
                control={control}
                name="closeTime"
                render={({ field }) => (
                  <TimePicker
                    value={field.value}
                    onChange={field.onChange}
                    label={t('branch.closeTime', 'Close Time')}
                    error={errors.closeTime?.message}
                    required
                  />
                )}
              />
            </div>
          </div>

          {/* ── Chairs ─────────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                {t('branch.chairs', 'Chairs')}
              </p>
              <button
                type="button"
                onClick={() =>
                  appendChair({ chairTypeId: 0, quantity: 1, isActive: true })
                }
                disabled={chairFields.length >= chairTypeOptions.length}
                className="flex items-center gap-1 text-xs font-medium text-[var(--accent)]
                  hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                <HiPlus size={13} />
                {t('branch.addChair', 'Add Chair')}
              </button>
            </div>

            {errors.chairs?.root?.message && (
              <p className="text-xs text-[var(--danger)] mb-2">
                {errors.chairs.root.message}
              </p>
            )}
            {errors.chairs?.message && (
              <p className="text-xs text-[var(--danger)] mb-2">
                {errors.chairs.message}
              </p>
            )}

            <div className="flex flex-col gap-3">
              {chairFields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[1fr_100px_auto_auto] items-start gap-3 p-3
                    rounded-lg border border-[var(--border)]"
                >
                <Controller
  control={control}
  name={`chairs.${index}.chairTypeId`}
  render={({ field }) => (
    <Select
      name={field.name}
      ref={field.ref}
      value={field.value ? String(field.value) : ''}
      onChange={(e) => field.onChange(Number(e.target.value))}
      onBlur={field.onBlur}
      options={optionsForRow(index).map((opt) => ({
        ...opt,
        value: String(opt.value),
      }))}
      placeholder={t('branch.selectChairType', 'Select chair type')}
      error={errors.chairs?.[index]?.chairTypeId?.message}
    />
  )}
/>

                  <Input
                    type="number"
                    min={1}
                    {...register(`chairs.${index}.quantity`, { valueAsNumber: true })}
                    placeholder={t('branch.quantity', 'Qty')}
                    error={errors.chairs?.[index]?.quantity?.message}
                  />

                 <Controller
  control={control}
  name={`chairs.${index}.isActive`}
  render={({ field }) => (
    <Toggle
      checked={field.value}
      onChange={field.onChange}
      label={t('branch.active', 'Active')}
      labelPosition="left"
      size="sm"
      lang={i18n.language}
    />
  )}
/>

                  <button
                    type="button"
                    title={t('common.delete')}
                    onClick={() => removeChair(index)}
                    disabled={chairFields.length === 1}
                    className="w-8 h-8 mt-1 rounded-lg flex items-center justify-center
                      text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50
                      disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <HiTrash size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Location (map) ─────────────────────────────────────────────── */}
          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <MapPicker
                value={field.value}
                onChange={field.onChange}
                label={t('branch.location', 'Location')}
                error={
                  errors.location?.address?.message ||
                  errors.location?.latitude?.message
                }
                required
                height={280}
              />
            )}
          />
        </div>
      )}
    </Modal>
  )
}