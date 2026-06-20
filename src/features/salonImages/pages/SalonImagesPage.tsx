// ─── Salon Images Page ────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { HiUpload, HiX, HiPhotograph, HiSave } from 'react-icons/hi'
import { MdSort, MdDragIndicator } from 'react-icons/md'
import { cn } from '@/lib/cn'
import { Button } from '@/components/shared'
import Input from '@/components/shared/Input'
import Modal from '@/components/shared/Modal'
import StatusBadge from '@/components/shared/StatusBadge'
import {
  useGetSalonImagesQuery,
  useUploadSalonImagesMutation,
  useDeleteSalonImageMutation,
  useSortSalonImagesMutation,
} from '../services/salonImagesApi'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const MAX_SIZE = 5 * 1024 * 1024

interface PendingFile {
  file: File
  preview: string
  dndId: string
}

// ── Image Card ────────────────────────────────────────────────────────────────
function ImageCard({
  id,
  imageUrl,
  isApproved,
  sortOrder,
}: {
  id: number
  imageUrl: string
  isApproved: boolean
  sortOrder: number
}) {
  const { t } = useTranslation()
  const [deleteImage, { isLoading: isDeleting }] = useDeleteSalonImageMutation()
  const [sortImages, { isLoading: isSorting }] = useSortSalonImagesMutation()
  const [sortModalOpen, setSortModalOpen] = useState(false)
  const [sortValue, setSortValue] = useState(String(sortOrder))

  const handleDelete = async () => {
    try {
      await deleteImage(id).unwrap()
      toast.success(t('salonImages.deleteSuccess', 'Image deleted'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleSaveSort = async () => {
    try {
      await sortImages([{ imageId: id, sortOrder: sortValue === '' ? 0 : Number(sortValue) }]).unwrap()
      toast.success(t('salonImages.sortSuccess', 'Sort order saved'))
      setSortModalOpen(false)
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleCloseModal = () => {
    setSortModalOpen(false)
    setSortValue(String(sortOrder))
  }

  return (
    <>
      <div className="relative group rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] aspect-square">
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
          {/* Sort button */}
          <button
            type="button"
            onClick={() => setSortModalOpen(true)}
            className={cn(
              'w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center',
              'transition-transform duration-150 hover:scale-110',
            )}
          >
            <MdSort size={18} className="text-white" />
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              'w-10 h-10 rounded-full bg-[var(--danger)] flex items-center justify-center',
              'transition-transform duration-150 hover:scale-110',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isDeleting ? (
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

      {/* Sort modal */}
      <Modal
        open={sortModalOpen}
        onClose={handleCloseModal}
        title={t('salonImages.sortModalTitle', 'Set Sort Order')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseModal}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleSaveSort}
              loading={isSorting}
              leftIcon={<HiSave size={15} />}
            >
              {t('common.save', 'Save')}
            </Button>
          </>
        }
      >
        <Input
          type="number"
          min={0}
          label={t('salonImages.sortOrder', 'Sort Order')}
          placeholder="0"
          value={sortValue}
          onChange={(e) => setSortValue(e.target.value)}
          hint={t('salonImages.sortHint', 'Lower numbers appear first')}
          autoFocus
        />
      </Modal>
    </>
  )
}

// ── Sortable Pending Card ─────────────────────────────────────────────────────
function SortablePendingCard({ id, preview, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      // ✅ Move these here so the whole card is draggable
      {...attributes}
      {...listeners}
      className={cn(
        'relative group rounded-[var(--radius-lg)] overflow-hidden',
        'border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)] aspect-square',
        'cursor-grab active:cursor-grabbing',   // ✅ add cursor
        isDragging && 'opacity-50 z-50',
      )}
    >
      <img src={preview} alt="" className="w-full h-full object-cover opacity-70" />

      {/* Drag handle icon — visual only now, no listeners needed */}
      <div className={cn(
        'absolute top-2 end-2 w-6 h-6 rounded flex items-center justify-center',
        'bg-black/40 text-white',
        'opacity-0 group-hover:opacity-100 transition-opacity',
      )}>
        <MdDragIndicator size={14} />
      </div>

      {/* Remove button — stop propagation so drag doesn't trigger on click */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()   // ✅ prevent dnd from intercepting the click
            onRemove()
          }}
          // ✅ Stop dnd listeners from swallowing the click
          onPointerDown={(e) => e.stopPropagation()}
          className="w-8 h-8 rounded-full bg-[var(--danger)] flex items-center justify-center hover:scale-110 transition-transform"
        >
          <HiX size={14} className="text-white" />
        </button>
      </div>

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
        dndId: crypto.randomUUID(),
      }))
      setPending((prev) => [...prev, ...newPending])
    },
    [],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'] },
    multiple: true,
    maxSize: MAX_SIZE,
  })

  const removePending = (dndId: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.dndId === dndId)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((p) => p.dndId !== dndId)
    })
  }

  // ── DnD ─────────────────────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setPending((prev) => {
        const oldIndex = prev.findIndex((p) => p.dndId === active.id)
        const newIndex = prev.findIndex((p) => p.dndId === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  // ── Upload ───────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (pending.length === 0) return
    try {
      await uploadImages(pending.map((p) => p.file)).unwrap()
      pending.forEach((p) => URL.revokeObjectURL(p.preview))
      setPending([])
      toast.success(t('salonImages.uploadSuccess', 'Images uploaded successfully'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  // ── Loading / error ──────────────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────────────
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
        {dropError && <p className="text-xs text-[var(--danger)] mt-1">{dropError}</p>}
      </div>

      {/* Gallery */}
      {images.length === 0 && pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--text-muted)]">
          <HiPhotograph size={40} className="opacity-30" />
          <p className="text-sm">{t('salonImages.noImages', 'No images yet. Upload your first one!')}</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <SortableContext
              items={pending.map((p) => p.dndId)}
              strategy={rectSortingStrategy}
            >
              {pending.map((p) => (
                <SortablePendingCard
                  key={p.dndId}
                  id={p.dndId}
                  preview={p.preview}
                  onRemove={() => removePending(p.dndId)}
                />
              ))}
            </SortableContext>

            {images.map((img) => (
              <ImageCard key={img.id} {...img} />
            ))}
          </div>
        </DndContext>
      )}

    </div>
  )
}