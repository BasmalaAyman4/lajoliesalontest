// ─── ReelFormModal ────────────────────────────────────────────────────────────
//
//  reelsPurposeId = 2  (Salon Marketing)   → salonServiceId sent as null
//  reelsPurposeId = 4  (Service Marketing) → salonServiceId required, fetched lazily

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Modal, Input, Button, Textarea } from '@/components/shared'
import {
  useCreateSalonReelMutation,
  useGetReelsPurposeDropdownQuery,
  useGetServiceDropdownForReelQuery,
} from '../services/salonReelApi'

// ── Constants ─────────────────────────────────────────────────────────────────
const PURPOSE_SERVICE_MARKETING = 4   // only this id requires a service

// ── Schema ────────────────────────────────────────────────────────────────────
const schema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    reelsPurposeId: z.number({ required_error: 'Purpose is required' }).min(1, 'Purpose is required'),
    salonServiceId: z.number().nullable(),
  })
  .refine(
    (d) => d.reelsPurposeId !== PURPOSE_SERVICE_MARKETING || (d.salonServiceId !== null && d.salonServiceId > 0),
    { message: 'Service is required for Service Marketing', path: ['salonServiceId'] },
  )

type FormValues = z.infer<typeof schema>

const DEFAULT_VALUES: FormValues = {
  title: '',
  description: '',
  reelsPurposeId: 0,
  salonServiceId: null,
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ReelFormModalProps {
  open: boolean
  onClose: () => void
  onCreated: (id: number, title: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReelFormModal({ open, onClose, onCreated }: ReelFormModalProps) {
  const { t } = useTranslation()
  const [createReel, { isLoading }] = useCreateSalonReelMutation()

  // ── Dropdowns ───────────────────────────────────────────────────────────────
  const { data: purposes = [] } = useGetReelsPurposeDropdownQuery()

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

  const selectedPurposeId = watch('reelsPurposeId')
  const isServiceMarketing = selectedPurposeId === PURPOSE_SERVICE_MARKETING

  // Fetch services only when Service Marketing is chosen
  const { data: services = [], isFetching: isFetchingServices } =
    useGetServiceDropdownForReelQuery(undefined, {
      skip: !isServiceMarketing,
      refetchOnMountOrArgChange: true,
    })

  // Reset form on open
  useEffect(() => {
    if (open) reset(DEFAULT_VALUES)
  }, [open, reset])

  // Clear service selection when purpose switches away from Service Marketing
  useEffect(() => {
    if (!isServiceMarketing) setValue('salonServiceId', null)
  }, [isServiceMarketing, setValue])

  // ── Submit ───────────────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        title: values.title,
        description: values.description,
        reelsPurposeId: values.reelsPurposeId,
        salonServiceId: isServiceMarketing ? values.salonServiceId : null,
      }
      const newId = await createReel(payload).unwrap()
      toast.success(t('common.success'))
      onClose()
      onCreated(newId, values.title)
    } catch {
      toast.error(t('common.error'))
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('reel.addReel', 'Add Reel')}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isLoading}>
            {t('common.add', 'Add')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">

        {/* Title */}
        <Input
          {...register('title')}
          label={t('reel.title', 'Title')}
          placeholder={t('reel.titlePlaceholder', 'e.g. Summer Hair Trends')}
          error={errors.title?.message}
          required
        />

        {/* Description */}
        <Textarea
          {...register('description')}
          label={t('reel.description', 'Description')}
          placeholder={t('reel.descriptionPlaceholder', 'Short description about this reel…')}
          error={errors.description?.message}
          rows={3}
          required
        />

        {/* Reel Purpose */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            {t('reel.purpose', 'Purpose')} <span className="text-[var(--danger)]">*</span>
          </label>
          <Controller
            control={control}
            name="reelsPurposeId"
            render={({ field }) => (
              <select
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className="h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]
                  text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2
                  focus:ring-[var(--accent)] focus:border-transparent transition-all"
              >
                <option value={0}>{t('common.selectOption', 'Select...')}</option>
                {purposes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          />
          {errors.reelsPurposeId && (
            <p className="text-xs text-[var(--danger)]">{errors.reelsPurposeId.message}</p>
          )}
        </div>

        {/* Service — only when Service Marketing is selected */}
        {isServiceMarketing && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">
              {t('reel.service', 'Service')} <span className="text-[var(--danger)]">*</span>
            </label>
            <Controller
              control={control}
              name="salonServiceId"
              render={({ field }) => (
                <select
                  value={field.value ?? 0}
                  onChange={(e) => field.onChange(Number(e.target.value) || null)}
                  disabled={isFetchingServices}
                  className="h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]
                    text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2
                    focus:ring-[var(--accent)] focus:border-transparent transition-all
                    disabled:opacity-50"
                >
                  <option value={0}>
                    {isFetchingServices
                      ? t('common.loading', 'Loading…')
                      : t('common.selectOption', 'Select...')}
                  </option>
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
        )}

      </div>
    </Modal>
  )
}