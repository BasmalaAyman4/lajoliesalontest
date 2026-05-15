// ─── Salon Data Page ──────────────────────────────────────────────────────────
//
//  Split layout:
//    Left  – full edit form  (images → info → map → about → description → toggles)
//    Right – sticky <MobileSalonPreview /> that updates live as the user types

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  HiOfficeBuilding,
  HiPhone,
  HiUser,
  HiDocument,
  HiSave,
  HiPhotograph,
  HiLocationMarker,
} from 'react-icons/hi'
import { Input, Button, MapPicker, RichEditor, StatusBadge } from '@/components/shared'
import type { MapValue } from '@/components/shared'
import UploadImage, { UploadedFile } from '@/components/shared/UploadImage'
import MobileSalonPreview from '../components/MobileSalonPreview'
import {
  useGetSalonDataQuery,
  useUpdateSalonDataMutation,
  useUpdateSalonLogoMutation,
  useUpdateSalonBannerMutation,
} from '../services/salonApi'
import { useTranslation } from 'react-i18next'

// ── Validation schema ─────────────────────────────────────────────────────────
const nullableText = z
  .string()
  .optional()
  .nullable()
  .transform((v) => v ?? '')

const schema = z.object({
  nameAr:            z.string().min(1, 'Arabic name is required'),
  nameEn:            z.string().min(1, 'English name is required'),
  telephone:         z.string().min(1, 'Telephone is required'),
  mainOfficeAddress: z.string().min(1, 'Address is required'),
  aboutSalonAr:      nullableText,
  aboutSalonEn:      nullableText,
  discriptionAr:     nullableText,
  discriptionEn:     nullableText,
  hijabSection:      z.boolean(),
  childrenNotAllowed: z.boolean(),
  menWorker:         z.boolean(),
  _map: z
    .object({ address: z.string(), latitude: z.string(), longitude: z.string() })
    .optional(),
})

type FormValues = z.infer<typeof schema>

// ── Helpers ───────────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <label className="flex items-center justify-between gap-4 p-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-card)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
          checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </label>
  )
}

function Section({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
      <Icon size={17} className="text-[var(--accent)]" />
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SalonDataPage() {
  const { data, isLoading, isError } = useGetSalonDataQuery()
  const [updateSalon,  { isLoading: isSaving }]          = useUpdateSalonDataMutation()
  const [updateLogo,   { isLoading: isUploadingLogo }]   = useUpdateSalonLogoMutation()
  const [updateBanner, { isLoading: isUploadingBanner }] = useUpdateSalonBannerMutation()
  const { t } = useTranslation()

  // Local file state for logo & banner pickers
  const [logoFiles,   setLogoFiles]   = useState<UploadedFile[]>([])
  const [bannerFiles, setBannerFiles] = useState<UploadedFile[]>([])

  // URLs from API — shown as current images until the user picks a replacement
  const [existingLogoUrl,   setExistingLogoUrl]   = useState<string | null>(null)
  const [existingBannerUrl, setExistingBannerUrl] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nameAr: '', nameEn: '', telephone: '', mainOfficeAddress: '',
      aboutSalonAr: '', aboutSalonEn: '', discriptionAr: '', discriptionEn: '',
      hijabSection: false, childrenNotAllowed: false, menWorker: false,
    },
  })

  useEffect(() => {
    if (data) {
      reset({
        nameAr:             data.nameAr,
        nameEn:             data.nameEn,
        telephone:          data.telephone,
        mainOfficeAddress:  data.mainOfficeAddress,
        aboutSalonAr:       data.aboutSalonAr  ?? '',
        aboutSalonEn:       data.aboutSalonEn  ?? '',
        discriptionAr:      data.discriptionAr ?? '',
        discriptionEn:      data.discriptionEn ?? '',
        hijabSection:       data.hijabSection,
        childrenNotAllowed: data.childrenNotAllowed,
        menWorker:          data.menWorker,
        _map: { address: data.mainOfficeAddress, latitude: '', longitude: '' },
      })
      // Seed existing images from the API response
      setExistingLogoUrl(data.logoUrl ?? null)
      setExistingBannerUrl(data.bannerUrl ?? null)
    }
  }, [data, reset])

  const handleMapChange = (v: MapValue) => {
    setValue('mainOfficeAddress', v.address, { shouldDirty: true })
    setValue('_map', v, { shouldDirty: false })
  }

  // ── Submit handlers ────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    try {
      await updateSalon({
        nameAr:             values.nameAr,
        nameEn:             values.nameEn,
        telephone:          values.telephone,
        mainOfficeAddress:  values.mainOfficeAddress,
        aboutSalonAr:       values.aboutSalonAr  ?? '',
        aboutSalonEn:       values.aboutSalonEn  ?? '',
        discriptionAr:      values.discriptionAr ?? '',
        discriptionEn:      values.discriptionEn ?? '',
        hijabSection:       values.hijabSection,
        childrenNotAllowed: values.childrenNotAllowed,
        menWorker:          values.menWorker,
      }).unwrap()
      toast.success(t('common.success'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleUploadLogo = async () => {
    if (!logoFiles[0]) return
    try {
      await updateLogo({ logo: logoFiles[0].file }).unwrap()
      setExistingLogoUrl(null)   // new image is now live; clear the old preview
      toast.success(t('salon.logoUpdated', 'Logo updated successfully'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleUploadBanner = async () => {
    if (!bannerFiles[0]) return
    try {
      await updateBanner({ banner: bannerFiles[0].file }).unwrap()
      setExistingBannerUrl(null)  // new image is now live; clear the old preview
      toast.success(t('salon.bannerUpdated', 'Banner updated successfully'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  // ── Live preview values ────────────────────────────────────────────────────
  const [watchedNameEn, watchedNameAr, watchedAddress,
         watchedHijab, watchedChildren, watchedMen] = watch([
    'nameEn', 'nameAr', 'mainOfficeAddress',
    'hijabSection', 'childrenNotAllowed', 'menWorker',
  ])

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
          <span className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[var(--danger)]">Failed to load salon data.</p>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-8 items-start animate-fade-in">

      {/* ═════════════════════════  LEFT – edit form  ══════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col gap-8">

        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              {t('salon.title')}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {t('salon.description')}
            </p>
          </div>
          <Button
            onClick={handleSubmit(onSubmit)}
            loading={isSaving}
            disabled={!isDirty}
            leftIcon={<HiSave size={15} />}
          >
            {t('common.save')}
          </Button>
        </div>

        {/* ── Images: Logo + Banner ───────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <Section icon={HiPhotograph} title={t('salon.images', 'Salon Images')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* ── Logo ── */}
            <div className="flex flex-col gap-3">
              {/* Current logo from API */}
              {existingLogoUrl && logoFiles.length === 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {t('salon.currentLogo', 'Current Logo')}
                  </span>
                  <div className="relative w-24 h-24 rounded-[var(--radius-lg)] overflow-hidden border-2 border-[var(--border)] shadow-sm group">
                    <img
                      src={existingLogoUrl}
                      alt="current logo"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] text-white font-medium">Replace below</span>
                    </div>
                    <div className="absolute top-2 end-2">
                            <StatusBadge
                              approved={data.isLogoApproved}
                              approvedLabel={t('salonData.approved', 'Approved')}
                              pendingLabel={t('salonData.pending', 'Pending')}
                            />
                          </div>
                  </div>
                </div>
              )}
              <UploadImage
            
                value={logoFiles}
                onChange={setLogoFiles}
                multiple={false}
                maxSize={5 * 1024 * 1024}
              />
              <Button
                size="sm"
                onClick={handleUploadLogo}
                loading={isUploadingLogo}
                disabled={logoFiles.length === 0}
                leftIcon={<HiSave size={13} />}
              >
                {t('salon.uploadLogo', 'Upload Logo')}
              </Button>
            </div>

            {/* ── Banner ── */}
            <div className="flex flex-col gap-3">
              {/* Current banner from API */}
              {existingBannerUrl && bannerFiles.length === 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {t('salon.currentBanner', 'Current Banner')}
                  </span>
                  <div className="relative w-full h-24 rounded-[var(--radius-lg)] overflow-hidden border-2 border-[var(--border)] shadow-sm group">
                    <img
                      src={existingBannerUrl}
                      alt="current banner"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] text-white font-medium">Replace below</span>
                    </div>
                    <div className="absolute top-2 end-2">
                            <StatusBadge
                              approved={data.isBannerApproved}
                              approvedLabel={t('salonData.approved', 'Approved')}
                              pendingLabel={t('salonData.pending', 'Pending')}
                            />
                          </div>
                  </div>
                </div>
              )}
              <UploadImage
      
                value={bannerFiles}
                onChange={setBannerFiles}
                multiple={false}
                maxSize={10 * 1024 * 1024}
              />
              <Button
                size="sm"
                onClick={handleUploadBanner}
                loading={isUploadingBanner}
                disabled={bannerFiles.length === 0}
                leftIcon={<HiSave size={13} />}
              >
                {t('salon.uploadBanner', 'Upload Banner')}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Basic info + Location ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Info */}
          <div className="flex flex-col gap-4">
            <Section icon={HiOfficeBuilding} title={t('salon.salonInformation')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                {...register('nameAr')}
                label={t('salon.nameAr')}
                placeholder={t('salon.nameAr')}
                error={errors.nameAr?.message}
                dir="rtl"
                required
              />
              <Input
                {...register('nameEn')}
                label={t('salon.nameEn')}
                placeholder={t('salon.nameEn')}
                error={errors.nameEn?.message}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('salon.ownerName')}
                value={data?.ownerName ?? ''}
                disabled
                leftIcon={<HiUser size={14} />}
                hint={t('salon.contactSupportToChangeOwnerName')}
              />
              <Input
                {...register('telephone')}
                label={t('salon.telephone')}
                placeholder="01xxxxxxxxx"
                error={errors.telephone?.message}
                leftIcon={<HiPhone size={14} />}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('salon.taxCardNo')}
                value={data?.taxCardNo ?? ''}
                disabled
                leftIcon={<HiDocument size={14} />}
                hint={t('salon.contactSupportToUpdateTaxInfo')}
              />
              <Input
                label={t('salon.commertialRecordNo')}
                value={data?.commertialRecordNo ?? ''}
                disabled
                leftIcon={<HiDocument size={14} />}
                hint={t('salon.contactSupportToUpdateCommercialRecord')}
              />
            </div>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-4">
            <Section icon={HiLocationMarker} title={t('salon.location')} />
            <Controller
              control={control}
              name="_map"
              render={({ field }) => (
                <MapPicker
                  label={t('salon.mainOfficeAddress')}
                  value={
                    field.value ?? {
                      address: watch('mainOfficeAddress'),
                      latitude: '',
                      longitude: '',
                    }
                  }
                  onChange={handleMapChange}
                  error={errors.mainOfficeAddress?.message}
                  height={320}
                  required
                />
              )}
            />
          </div>
        </div>

        {/* ── About ──────────────────────────────────────────────────────── */}
        <Section icon={HiOfficeBuilding} title={t('salon.aboutSalon')} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Controller
            control={control}
            name="aboutSalonEn"
            render={({ field }) => (
              <RichEditor
                label={t('salon.aboutSalonEn')}
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.aboutSalonEn?.message}
                placeholder={t('salon.aboutSalonEnPlaceholder')}
                direction="ltr"
              />
            )}
          />
          <Controller
            control={control}
            name="aboutSalonAr"
            render={({ field }) => (
              <RichEditor
                label={t('salon.aboutSalonAr')}
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.aboutSalonAr?.message}
                placeholder={t('salon.aboutSalonArPlaceholder')}
                direction="rtl"
              />
            )}
          />
        </div>

        {/* ── Description ────────────────────────────────────────────────── */}
        <Section icon={HiDocument} title={t('salon.description')} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Controller
            control={control}
            name="discriptionEn"
            render={({ field }) => (
              <RichEditor
                label={t('salon.discriptionEn')}
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.discriptionEn?.message}
                placeholder={t('salon.discriptionEnPlaceholder')}
                direction="ltr"
              />
            )}
          />
          <Controller
            control={control}
            name="discriptionAr"
            render={({ field }) => (
              <RichEditor
                label={t('salon.discriptionAr')}
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.discriptionAr?.message}
                placeholder={t('salon.discriptionArPlaceholder')}
                direction="rtl"
              />
            )}
          />
        </div>

        {/* ── Settings toggles ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <Section icon={HiOfficeBuilding} title={t('salon.salonSettings')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Controller
              control={control}
              name="hijabSection"
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label={t('salon.hijabSection')}
                  description={t('salon.hijabSectionDescription')}
                />
              )}
            />
            <Controller
              control={control}
              name="childrenNotAllowed"
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label={t('salon.childrenNotAllowed')}
                  description={t('salon.childrenNotAllowedDescription')}
                />
              )}
            />
            <Controller
              control={control}
              name="menWorker"
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label={t('salon.menWorkers')}
                  description={t('salon.menWorkersDescription')}
                />
              )}
            />
          </div>
        </div>

        {/* Bottom save */}
        <div className="flex justify-end pb-8">
          <Button
            onClick={handleSubmit(onSubmit)}
            loading={isSaving}
            disabled={!isDirty}
            leftIcon={<HiSave size={15} />}
            size="lg"
          >
            {t('common.save')}
          </Button>
        </div>
      </div>

      {/* ═══════════════════════  RIGHT – mobile preview  ══════════════════ */}
      <div className="hidden xl:block w-[340px] shrink-0 pt-12">
        <MobileSalonPreview
          nameEn={watchedNameEn}
          nameAr={watchedNameAr}
          address={watchedAddress}
          logoSrc={logoFiles[0]?.preview ?? existingLogoUrl ?? undefined}
          bannerSrc={bannerFiles[0]?.preview ?? existingBannerUrl ?? undefined}
          hijabSection={watchedHijab}
          childrenNotAllowed={watchedChildren}
          menWorker={watchedMen}
        />
      </div>

    </div>
  )
}