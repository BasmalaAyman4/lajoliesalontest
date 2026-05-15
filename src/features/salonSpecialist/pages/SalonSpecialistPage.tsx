// ─── Salon Specialist Page ────────────────────────────────────────────────────
//
//  Lists all specialists in a table.
//  Add / Edit → SpecialistFormModal
//  Upload image → SpecialistImageModal (auto-opens after create, or via icon)
//  Delete → ConfirmModal

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { HiPlus, HiPencil, HiTrash, HiPhotograph } from 'react-icons/hi'
import { Button, ConfirmModal, DataTable, type Column, StatusBadge, type FilterConfig } from '@/components/shared'
import type { SalonSpecialist } from '../types'
import {
  useGetSalonSpecialistsQuery,
  useDeleteSalonSpecialistMutation,
  useGetJobsDropdownQuery,
} from '../services/salonSpecialistApi'
import SpecialistFormModal from '../components/SpecialistFormModal'
import SpecialistImageModal from '../components/SpecialistImageModal'

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SalonSpecialistPage() {
  const { t } = useTranslation()

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: specialists = [], isLoading, isError } = useGetSalonSpecialistsQuery()
  const { data: jobs = [] } = useGetJobsDropdownQuery()
  const [deleteSpecialist, { isLoading: isDeleting }] = useDeleteSalonSpecialistMutation()

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [formModal, setFormModal] = useState<{ open: boolean; specialist?: SalonSpecialist }>({
    open: false,
  })
  const [imageModal, setImageModal] = useState<{
    open: boolean
    specialistId: number
    specialistName: string
  } | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  })

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openAdd = () => setFormModal({ open: true })
  const openEdit = (specialist: SalonSpecialist) => setFormModal({ open: true, specialist })
  const closeForm = () => setFormModal({ open: false })

  // After create: auto-open the image upload modal
  const handleCreated = (id: number, name: string) => {
    setImageModal({ open: true, specialistId: id, specialistName: name })
  }

  const openImageModal = (s: SalonSpecialist) =>
    setImageModal({ open: true, specialistId: s.id, specialistName: s.nameEn })

  const closeImageModal = () => setImageModal(null)

  const confirmDelete = (id: number) => setDeleteModal({ open: true, id })

  const handleDelete = async () => {
    if (!deleteModal.id) return
    try {
      await deleteSpecialist(deleteModal.id).unwrap()
      toast.success(t('specialist.deleteSuccess', 'Specialist deleted'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setDeleteModal({ open: false, id: null })
    }
  }

  // ── Table columns ─────────────────────────────────────────────────────────────
  // jobName comes directly from the API — no client-side lookup needed

  // Build filter options from jobs data
  const jobFilterOptions = jobs.map((j) => ({ label: j.name, value: j.name }))

  const tableFilters: FilterConfig[] = [
    { key: 'jobName', label: t('specialist.job', 'Job Title'), options: jobFilterOptions },
    {
      key: 'isImageApproved',
      label: t('specialist.imageStatus', 'Image Status'),
      options: [
        { label: t('common.approved', 'Approved'), value: 'true' },
        { label: t('common.pendingApproval', 'Pending Approval'), value: 'false' },
      ],
    },
  ]

  const columns: Column<SalonSpecialist>[] = [
    {
      key: 'imageUrl',
      label: t('specialist.image', 'Image'),
      width: '56px',
      align: 'center',
      render: (row) => (
        row.imageUrl ? (
          <img
            src={row.imageUrl}
            alt={row.nameEn}
            className="w-9 h-9 rounded-full object-cover border border-[var(--border)] mx-auto"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mx-auto">
            <HiPhotograph size={16} className="text-[var(--text-muted)]" />
          </div>
        )
      ),
    },
{
  key: 'isImageApproved',
  label: t('specialist.imageStatus', 'Image Status'),
  filterOptions: [
    { label: t('common.approved', 'Approved'), value: 'true' },
    { label: t('common.pendingApproval', 'Pending Approval'), value: 'false' },
  ],
  render: (row) => (
    <StatusBadge
      approved={row.isImageApproved}
      approvedLabel={t('common.approved', 'Approved')}
      pendingLabel={t('common.pendingApproval', 'Pending Approval')}
    />
  ),
},
    {
      key: 'nameEn',
      label: t('specialist.nameEn', 'Name (EN)'),
    },
    {
      key: 'nameAr',
      label: t('specialist.nameAr', 'Name (AR)'),
      render: (row) => <span dir="rtl">{row.nameAr}</span>,
    },
    {
      key: 'jobName',
      label: t('specialist.job', 'Job Title'),
      render: (row) => (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)]">
          {row.jobName}
        </span>
      ),
    },
    {
      key: 'brief',
      label: t('specialist.brief', 'Brief'),
      render: (row) => (
        <span className="text-[var(--text-muted)] line-clamp-1 max-w-[200px] block">
          {row.brief}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: '120px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {/* Upload image */}
          <button
            type="button"
            title={t('specialist.uploadImage', 'Upload Image')}
            onClick={() => openImageModal(row)}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]
              transition-colors"
          >
            <HiPhotograph size={15} />
          </button>

          {/* Edit */}
          <button
            type="button"
            title={t('common.edit', 'Edit')}
            onClick={() => openEdit(row)}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]
              transition-colors"
          >
            <HiPencil size={15} />
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
  ]

  // ── Loading / error ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[var(--danger)]">Failed to load specialists.</p>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Page header */}
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          {t('specialist.title', 'Salon Specialists')}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          {t('specialist.description', 'Manage your salon team members')}
        </p>
      </div>

      <Button onClick={openAdd} leftIcon={<HiPlus size={15} />}>
        {t('specialist.addSpecialist', 'Add Specialist')}
      </Button>
    </div>

    {/* DataTable — search + filter + pagination built-in */}
    <DataTable<SalonSpecialist>
      columns={columns}
      data={specialists}
      rowKey="id"
      loading={isLoading}
      searchKeys={['nameEn', 'nameAr', 'jobName', 'brief']}
      searchPlaceholder={t('specialist.searchPlaceholder', 'Search by name, job…')}
      filters={tableFilters}
      emptyMessage={t('specialist.noSpecialists', 'No specialists found. Add your first one!')}
      // toolbar prop removed
    />

      {/* Add / Edit modal */}
      <SpecialistFormModal
        open={formModal.open}
        onClose={closeForm}
        specialist={formModal.specialist}
        jobs={jobs}
        onCreated={(id) => {
          // Find the name of the just-created specialist from the form is not possible here,
          // so we pass a temporary label; the image modal shows the id as fallback
          handleCreated(id, t('specialist.newSpecialist', 'New Specialist'))
        }}
      />

      {/* Image upload modal */}
      {imageModal && (
        <SpecialistImageModal
          open={imageModal.open}
          onClose={closeImageModal}
          specialistId={imageModal.specialistId}
          specialistName={imageModal.specialistName}
        />
      )}

      {/* Delete confirm modal */}
      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={handleDelete}
        loading={isDeleting}
        title={t('specialist.deleteTitle', 'Delete Specialist')}
        message={t('specialist.deleteMessage', 'Are you sure you want to delete this specialist? This action cannot be undone.')}
      />
    </div>
  )
}