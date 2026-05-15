// ─── Salon Reel Page ──────────────────────────────────────────────────────────
//
//  Lists all reels in a table.
//  Add → ReelFormModal → auto-opens ReelVideoModal on success
//  Upload video → ReelVideoModal (via camera icon)
//  Delete → ConfirmModal

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { HiPlus, HiTrash, HiFilm, HiPlay } from 'react-icons/hi'
import {
  Button,
  ConfirmModal,
  DataTable,
  type Column,
  StatusBadge,
  type FilterConfig,
} from '@/components/shared'
import type { Reel } from '../types'
import {
  useGetSalonReelsQuery,
  useDeleteSalonReelMutation,
  useLazyGetReelByIdQuery,
} from '../services/salonReelApi'
import ReelFormModal from '../components/ReelFormModal'
import ReelVideoModal from '../components/ReelVideoModal'
import ReelPreviewModal from '../components/ReelPreviewModal'

export default function SalonReelPage() {
  const { t } = useTranslation()

  // ── Data ─────────────────────────────────────────────────────────────────────
  const { data: reels = [], isLoading, isError } = useGetSalonReelsQuery()
  const [deleteReel, { isLoading: isDeleting }] = useDeleteSalonReelMutation()
const [fetchReelById, { isFetching: isFetchingDetail }] = useLazyGetReelByIdQuery()

  // ── Modal state ───────────────────────────────────────────────────────────────
  const [formModal, setFormModal] = useState(false)
  const [videoModal, setVideoModal] = useState<{
    open: boolean
    reelId: number
    reelTitle: string
  } | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  })

const [previewModal, setPreviewModal] = useState<{
  open: boolean
  videoUrl: string
  reelTitle: string
  thumbnailUrl?: string
} | null>(null)


  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleCreated = (id: number, title: string) => {
    setVideoModal({ open: true, reelId: id, reelTitle: title })
  }

  const openVideoModal = (r: Reel) =>
    setVideoModal({ open: true, reelId: r.id, reelTitle: r.title })

  const confirmDelete = (id: number) => setDeleteModal({ open: true, id })

  const handleDelete = async () => {
    if (!deleteModal.id) return
    try {
      await deleteReel(deleteModal.id).unwrap()
      toast.success(t('reel.deleteSuccess', 'Reel deleted'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setDeleteModal({ open: false, id: null })
    }
  }

const openPreview = async (r: Reel) => {
  try {
    const detail = await fetchReelById(r.id).unwrap()
    if (!detail.videoUrl) {
      toast.error(t('reel.noVideo', 'No video uploaded yet for this reel.'))
      return
    }
    setPreviewModal({
      open: true,
      videoUrl: detail.videoUrl,
      reelTitle: detail.title,
      thumbnailUrl: detail.imageThumbnailUrl,
    })
  } catch {
    toast.error(t('common.error'))
  }
}
  // ── Filters ───────────────────────────────────────────────────────────────────
  const tableFilters: FilterConfig[] = [
    {
      key: 'isVideoApproved',
      label: t('reel.videoStatus', 'Video Status'),
      options: [
        { label: t('common.approved', 'Approved'), value: 'true' },
        { label: t('common.pendingApproval', 'Pending Approval'), value: 'false' },
      ],
    },
  ]

  // ── Columns ───────────────────────────────────────────────────────────────────
  const columns: Column<Reel>[] = [
// updated column — img thumbnail instead of <video> tag

    {
      key: 'isApproved',
      label: t('reel.videoStatus', 'Video Status'),
      render: (row) => (
        <StatusBadge
          approved={row.isApproved}
          approvedLabel={t('common.approved', 'Approved')}
          pendingLabel={t('common.pendingApproval', 'Pending Approval')}
        />
      ),
    },
    {
      key: 'title',
      label: t('reel.title', 'Title'),
    },
    {
      key: 'description',
      label: t('reel.description', 'Description'),
      render: (row) => (
        <span className="text-[var(--text-muted)] line-clamp-1 max-w-[260px] block">
          {row.description}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: '96px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
              <button
            type="button"
            title={t('reel.watchVideo', 'Watch Video')}
            onClick={() => openPreview(row)}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]
              transition-colors"
          >
            <HiPlay size={15} />
          </button>

          {/* Upload video */}
          <button
            type="button"
            title={t('reel.uploadVideo', 'Upload Video')}
            onClick={() => openVideoModal(row)}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]
              transition-colors"
          >
            <HiFilm size={15} />
          </button>

          {/* Delete */}
          <button
            type="button"
            title={t('common.delete')}
            onClick={() => confirmDelete(row.id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50
              transition-colors"
          >
            <HiTrash size={15} />
          </button>
        </div>
      ),
    },
    // updated column

  ]

  // ── Loading / error ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[var(--danger)]">Failed to load reels.</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {t('reel.title', 'Salon Reels')}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {t('reel.description', 'Manage your salon video reels')}
          </p>
        </div>
        <Button onClick={() => setFormModal(true)} leftIcon={<HiPlus size={15} />}>
          {t('reel.addReel', 'Add Reel')}
        </Button>
      </div>

      {/* Table */}
      <DataTable<Reel>
        columns={columns}
        data={reels}
        rowKey="id"
        loading={isLoading}
        searchKeys={['title', 'description']}
        searchPlaceholder={t('reel.searchPlaceholder', 'Search by title or description…')}
        filters={tableFilters}
        emptyMessage={t('reel.noReels', 'No reels yet. Add your first one!')}
      />

      {/* Create modal */}
      <ReelFormModal
        open={formModal}
        onClose={() => setFormModal(false)}
        onCreated={handleCreated}
      />

      {/* Video upload modal */}
      {videoModal && (
        <ReelVideoModal
          open={videoModal.open}
          onClose={() => setVideoModal(null)}
          reelId={videoModal.reelId}
          reelTitle={videoModal.reelTitle}
        />
      )}
{previewModal && (
  <ReelPreviewModal
    open={previewModal.open}
    onClose={() => setPreviewModal(null)}
    videoUrl={previewModal.videoUrl}
    reelTitle={previewModal.reelTitle}
    thumbnailUrl={previewModal.thumbnailUrl}
  />
)}
      {/* Delete confirm */}
      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={handleDelete}
        loading={isDeleting}
        title={t('reel.deleteTitle', 'Delete Reel')}
        message={t(
          'reel.deleteMessage',
          'Are you sure you want to delete this reel? This action cannot be undone.',
        )}
      />
    </div>
  )
}