// ─── SpecialistFormModal ──────────────────────────────────────────────────────
//
//  Handles both Create and Edit in one modal.
//  Pass `specialist` to enter edit mode; omit it for create mode.

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Modal, Input, Select, Button, Textarea } from '@/components/shared'
import type { DropdownOption } from '@/types'
import type { SalonSpecialist, JobOption } from '../types'
import {
  useCreateSalonSpecialistMutation,
  useUpdateSalonSpecialistMutation,
} from '../services/salonSpecialistApi'

// ── Schema ────────────────────────────────────────────────────────────────────
const schema = z.object({
  jobId: z.coerce.number().min(1, 'Job is required'),
  nameAr: z.string().min(1, 'Arabic name is required'),
  nameEn: z.string().min(1, 'English name is required'),
  brief: z.string().min(1, 'Brief is required'),
})

type FormValues = z.infer<typeof schema>

// ── Props ─────────────────────────────────────────────────────────────────────
interface SpecialistFormModalProps {
  open: boolean
  onClose: () => void
  /** Pass to enter edit mode */
  specialist?: SalonSpecialist
  jobs: JobOption[]
  /** Called after successful create, with the new specialist id */
  onCreated?: (id: number) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SpecialistFormModal({
  open,
  onClose,
  specialist,
  jobs,
  onCreated,
}: SpecialistFormModalProps) {
  const { t } = useTranslation()
  const isEdit = Boolean(specialist)

  const [createSpecialist, { isLoading: isCreating }] = useCreateSalonSpecialistMutation()
  const [updateSpecialist, { isLoading: isUpdating }] = useUpdateSalonSpecialistMutation()
  const isLoading = isCreating || isUpdating

  const jobOptions: DropdownOption[] = jobs.map((j) => ({
    value: j.id,
    label: j.name,
  }))

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { jobId: 0, nameAr: '', nameEn: '', brief: '' },
  })

  // Populate form when editing
  useEffect(() => {
    if (open) {
      reset(
        specialist
          ? { jobId: specialist.jobId, nameAr: specialist.nameAr, nameEn: specialist.nameEn, brief: specialist.brief }
          : { jobId: 0, nameAr: '', nameEn: '', brief: '' },
      )
    }
  }, [open, specialist, reset])

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && specialist) {
        await updateSpecialist({ id: specialist.id, ...values }).unwrap()
        toast.success(t('common.success'))
        onClose()
      } else {
        const newId = await createSpecialist(values).unwrap()
        toast.success(t('common.success'))
        onClose()
        onCreated?.(newId)
      }
    } catch {
      toast.error(t('common.error'))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('specialist.editSpecialist', 'Edit Specialist') : t('specialist.addSpecialist', 'Add Specialist')}
      size="md"
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
      <div className="flex flex-col gap-4">
        {/* Job */}
        <Select
          {...register('jobId')}
          label={t('specialist.job', 'Job Title')}
          options={jobOptions}
          placeholder={t('specialist.selectJob', 'Select a job')}
          error={errors.jobId?.message}
          required
        />

        {/* Names */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            {...register('nameEn')}
            label={t('specialist.nameEn', 'Name (EN)')}
            placeholder="e.g. Sarah Ahmed"
            error={errors.nameEn?.message}
            required
          />
          <Input
            {...register('nameAr')}
            label={t('specialist.nameAr', 'Name (AR)')}
            placeholder="مثال: سارة أحمد"
            error={errors.nameAr?.message}
            dir="rtl"
            required
          />
        </div>

        {/* Brief */}
        <Textarea
          {...register('brief')}
          label={t('specialist.brief', 'Brief')}
          placeholder={t('specialist.briefPlaceholder', 'Short description about the specialist…')}
          error={errors.brief?.message}
          rows={3}
          required
        />
      </div>
    </Modal>
  )
}