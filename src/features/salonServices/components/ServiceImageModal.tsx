// ─── ServiceImageModal ────────────────────────────────────────────────────────
//
//  Single-image uploader for a salon service.
//  Auto-opens after creating a new service, or via the camera icon in the table.

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { HiUpload, HiX, HiPhotograph } from 'react-icons/hi'
import { cn } from '@/lib/cn'
import { Modal, Button } from '@/components/shared'
import { useUploadServiceImageMutation } from '../services/salonServiceApi'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

interface ServiceImageModalProps {
  open: boolean
  onClose: () => void
  serviceId: number
  serviceName: string
}

export default function ServiceImageModal({
  open,
  onClose,
  serviceId,
  serviceName,
}: ServiceImageModalProps) {
  const { t } = useTranslation()
  const [uploadImage, { isLoading }] = useUploadServiceImageMutation()
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null)
  const [dropError, setDropError] = useState('')

  const onDrop = useCallback(
    (accepted: File[], rejected: { errors: { message: string }[] }[]) => {
      setDropError('')
      if (rejected.length > 0) {
        setDropError(rejected[0].errors[0].message)
        return
      }
      if (accepted[0]) {
        if (preview) URL.revokeObjectURL(preview.url)
        setPreview({ file: accepted[0], url: URL.createObjectURL(accepted[0]) })
      }
    },
    [preview],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:  { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'] },
    multiple: false,
    maxSize: MAX_SIZE,
  })

  const handleClose = () => {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
    setDropError('')
    onClose()
  }

  const handleUpload = async () => {
    if (!preview) return
    try {
      await uploadImage({ serviceId, file: preview.file }).unwrap()
      toast.success(t('service.imageUploadSuccess', 'Image uploaded successfully'))
      handleClose()
    } catch {
      toast.error(t('common.error'))
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('service.uploadImage', 'Upload Image')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleUpload}
            loading={isLoading}
            disabled={!preview}
            leftIcon={<HiUpload size={14} />}
          >
            {t('common.upload', 'Upload')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--text-muted)]">
          {t('service.uploadImageFor', 'Uploading image for')}{' '}
          <span className="font-medium text-[var(--text-primary)]">{serviceName}</span>
        </p>

        {preview ? (
          /* ── Preview ──────────────────────────────────────────────────────── */
          <div className="relative w-full aspect-square rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border)]">
            <img src={preview.url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(preview.url)
                setPreview(null)
              }}
              className="absolute top-2 end-2 w-7 h-7 rounded-full bg-[var(--danger)]
                flex items-center justify-center hover:scale-110 transition-transform"
            >
              <HiX size={13} className="text-white" />
            </button>
          </div>
        ) : (
          /* ── Dropzone ─────────────────────────────────────────────────────── */
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
            <HiPhotograph size={28} className="text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              {isDragActive
                ? t('salonImages.dropHere', 'Drop here…')
                : t('salonImages.dragOrClick', 'Drag & drop or click to select')}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {t('service.singleImage', 'Single image')} · Max {Math.round(MAX_SIZE / 1024 / 1024)}
              MB
            </p>
            {dropError && <p className="text-xs text-[var(--danger)] mt-1">{dropError}</p>}
          </div>
        )}
      </div>
    </Modal>
  )
}