// ─── BranchFormModal ──────────────────────────────────────────────────────────
//
//  Handles both Create and Edit in one modal.
//  Pass `branch` to enter edit mode; omit it for create mode.

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Input, Button, MapPicker, Modal, TimePicker } from '@/components/shared'
import type { SalonBranch } from '../types'
import {
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
})

type FormValues = z.infer<typeof schema>

// ── Props ─────────────────────────────────────────────────────────────────────
interface BranchFormModalProps {
  open: boolean
  onClose: () => void
  branch?: SalonBranch
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
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BranchFormModal({
  open,
  onClose,
  branch,
}: BranchFormModalProps) {
  const { t } = useTranslation()
  const isEdit = Boolean(branch)

  const [createBranch, { isLoading: isCreating }] = useCreateSalonBranchMutation()
  const [updateBranch, { isLoading: isUpdating }] = useUpdateSalonBranchMutation()
  const isLoading = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  // Populate form when editing
  useEffect(() => {
    if (open) {
      reset(
        branch
          ? {
              nameAr: branch.nameAr,
              nameEn: branch.nameEn,
              managerName: branch.managerName,
              telephone: branch.telephone,
              mobile: branch.mobile,
              location: {
                address: branch.address,
                latitude: branch.lat,
                longitude: branch.long,
              },
              // API may return "HH:mm:ss" strings — parse back to { hour, minute }
              openTime:
                typeof branch.openTime === 'string'
                  ? parseTime(branch.openTime)
                  : branch.openTime,
              closeTime:
                typeof branch.closeTime === 'string'
                  ? parseTime(branch.closeTime)
                  : branch.closeTime,
            }
          : DEFAULT_VALUES,
      )
    }
  }, [open, branch, reset])

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
      // Convert { hour, minute } → "HH:mm:ss"
      openTime: formatTime(values.openTime),
      closeTime: formatTime(values.closeTime),
    }

    try {
      if (isEdit && branch) {
        await updateBranch({ id: branch.id, ...payload }).unwrap()
      } else {
        await createBranch(payload).unwrap()
      }
      toast.success(t('common.success'))
      onClose()
    } catch {
      toast.error(t('common.error'))
    }
  }

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
    </Modal>
  )
}