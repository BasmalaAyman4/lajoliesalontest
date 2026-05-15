// ─── Salon Images Page ────────────────────────────────────────────────────────
//
//  Displays all salon images in a masonry-style gallery.
//  Allows uploading new images (drag & drop) and deleting existing ones.

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { HiUpload, HiX, HiPhotograph } from 'react-icons/hi'
import { cn } from '@/lib/cn'
import { Button } from '@/components/shared'
import StatusBadge from '@/components/shared/StatusBadge'
import {
  useGetSalonImagesQuery,
  useUploadSalonImagesMutation,
  useDeleteSalonImageMutation,
} from '../services/salonImagesApi'

// ── Max file size (5 MB) ──────────────────────────────────────────────────────
const MAX_SIZE = 5 * 1024 * 1024

// ── Pending preview (before upload) ──────────────────────────────────────────
interface PendingFile {
  file: File
  preview: string
}

// ── Image Card ────────────────────────────────────────────────────────────────
function ImageCard({
  id,
  imageUrl,
  isApproved,
}: {
  id: number
  imageUrl: string
  isApproved: boolean
}) {
  const { t } = useTranslation()
  const [deleteImage, { isLoading }] = useDeleteSalonImageMutation()

  const handleDelete = async () => {
    try {
      await deleteImage(id).unwrap()
      toast.success(t('salonImages.deleteSuccess', 'Image deleted'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  return (
    <div className="relative group rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] aspect-square">
      {/* Image */}
      <img
        src={imageUrl}
        alt=""
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isLoading}
          className={cn(
            'w-10 h-10 rounded-full bg-[var(--danger)] flex items-center justify-center',
            'transition-transform duration-150 hover:scale-110',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isLoading ? (
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
          ) : (
            <HiX size={16} className="text-white" />
          )}
        </button>
      </div>

      {/* Approval badge */}
      <div className="absolute top-2 start-2">
        <StatusBadge
          approved={isApproved}
          approvedLabel={t('salonImages.approved', 'Approved')}
          pendingLabel={t('salonImages.pending', 'Pending')}
        />
      </div>
    </div>
  )
}

// ── Pending Card (preview before upload) ─────────────────────────────────────
function PendingCard({
  preview,
  onRemove,
}: {
  preview: string
  onRemove: () => void
}) {
  return (
    <div className="relative group rounded-[var(--radius-lg)] overflow-hidden border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)] aspect-square">
      <img src={preview} alt="" className="w-full h-full object-cover opacity-70" />
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-8 rounded-full bg-[var(--danger)] flex items-center justify-center hover:scale-110 transition-transform"
        >
          <HiX size={14} className="text-white" />
        </button>
      </div>
      {/* "New" badge */}
      <div className="absolute top-2 start-2 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)] text-white">
        New
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SalonImagesPage() {
  const { t } = useTranslation()
  const { data: images = [], isLoading, isError } = useGetSalonImagesQuery()
  const [uploadImages, { isLoading: isUploading }] = useUploadSalonImagesMutation()

  const [pending, setPending] = useState<PendingFile[]>([])
  const [dropError, setDropError] = useState('')

  // ── Dropzone ────────────────────────────────────────────────────────────────
  const onDrop = useCallback(
    (accepted: File[], rejected: { errors: { message: string }[] }[]) => {
      setDropError('')
      if (rejected.length > 0) {
        setDropError(rejected[0].errors[0].message)
        return
      }
      const newPending: PendingFile[] = accepted.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }))
      setPending((prev) => [...prev, ...newPending])
    },
    [],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
    maxSize: MAX_SIZE,
  })

  const removePending = (index: number) => {
    setPending((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  // ── Upload handler ──────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (pending.length === 0) return
    try {
      await uploadImages(pending.map((p) => p.file)).unwrap()
      // Cleanup previews
      pending.forEach((p) => URL.revokeObjectURL(p.preview))
      setPending([])
      toast.success(t('salonImages.uploadSuccess', 'Images uploaded successfully'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  // ── Loading / error states ──────────────────────────────────────────────────
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
        <p className="text-sm text-[var(--danger)]">Failed to load images.</p>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {t('salonImages.title', 'Salon Images')}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {t('salonImages.description', 'Manage your salon gallery images')}
          </p>
        </div>

        {pending.length > 0 && (
          <Button
            onClick={handleUpload}
            loading={isUploading}
            leftIcon={<HiUpload size={15} />}
          >
            {t('salonImages.uploadCount', `Upload ${pending.length} image(s)`, { count: pending.length })}
          </Button>
        )}
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 p-8 cursor-pointer',
          'rounded-[var(--radius-lg)] border-2 border-dashed transition-all duration-150 text-center',
          isDragActive
            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
            : 'border-[var(--border)] hover:border-[var(--border-focus)] hover:bg-[var(--bg-hover)]',
          dropError && 'border-[var(--danger)]',
        )}
      >
        <input {...getInputProps()} />
        <HiUpload size={28} className="text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-secondary)]">
          {isDragActive
            ? t('salonImages.dropHere', 'Drop images here…')
            : t('salonImages.dragOrClick', 'Drag & drop images or click to select')}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {t('salonImages.multipleAllowed', 'Multiple images allowed')} · Max {Math.round(MAX_SIZE / 1024 / 1024)}MB each
        </p>
        {dropError && (
          <p className="text-xs text-[var(--danger)] mt-1">{dropError}</p>
        )}
      </div>

      {/* Gallery */}
      {images.length === 0 && pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--text-muted)]">
          <HiPhotograph size={40} className="opacity-30" />
          <p className="text-sm">{t('salonImages.noImages', 'No images yet. Upload your first one!')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Pending previews first */}
          {pending.map((p, i) => (
            <PendingCard key={p.preview} preview={p.preview} onRemove={() => removePending(i)} />
          ))}
          {/* Existing images */}
          {images.map((img) => (
            <ImageCard key={img.id} {...img} />
          ))}
        </div>
      )}

    </div>
  )
}