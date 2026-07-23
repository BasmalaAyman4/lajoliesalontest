// ─── Salon Branch Page ────────────────────────────────────────────────────────
//
//  Lists all branches in a table.
//  Add / Edit → BranchFormModal (fetches full detail itself when editing)
//  Delete → ConfirmModal

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { HiPlus, HiPencil, HiTrash, HiPhone, HiLocationMarker, HiClock } from 'react-icons/hi'
import {
  Button,
  ConfirmModal,
  DataTable,
  type Column,
} from '@/components/shared'
import type { SalonBranchListItem } from '../types'
import {
  useGetSalonBranchesQuery,
  useDeleteSalonBranchMutation,
} from '../services/salonBranchApi'
import BranchFormModal from '../components/BranchFormModal'

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SalonBranchPage() {
  const { t } = useTranslation()

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: branches = [], isLoading, isError } = useGetSalonBranchesQuery()
  const [deleteBranch, { isLoading: isDeleting }] = useDeleteSalonBranchMutation()

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [formModal, setFormModal] = useState<{ open: boolean; branchId?: number }>({
    open: false,
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  })

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openAdd = () => setFormModal({ open: true })
  const openEdit = (id: number) => setFormModal({ open: true, branchId: id })
  const closeForm = () => setFormModal({ open: false })

  const confirmDelete = (id: number) => setDeleteModal({ open: true, id })

  const handleDelete = async () => {
    if (!deleteModal.id) return
    try {
      await deleteBranch(deleteModal.id).unwrap()
      toast.success(t('branch.deleteSuccess', 'Branch deleted'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setDeleteModal({ open: false, id: null })
    }
  }

  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns: Column<SalonBranchListItem>[] = [
    {
      key: 'nameEn',
      label: t('branch.nameEn', 'Name (EN)'),
      render: (row) => (
        <p className="font-medium text-[var(--text-primary)]">{row.nameEn}</p>
      ),
    },
    {
      key: 'nameAr',
      label: t('branch.nameAr', 'Name (Ar)'),
      render: (row) => (
        <p className="font-medium text-[var(--text-primary)]">{row.nameAr}</p>
      ),
    },
    {
      key: 'managerName',
      label: t('branch.managerName', 'Manager'),
      render: (row) => (
        <span className="text-sm text-[var(--text-secondary)]">{row.managerName}</span>
      ),
    },
    {
      key: 'telephone',
      label: t('branch.contact', 'Contact'),
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <HiPhone size={11} />
            {row.telephone}
          </span>
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <HiPhone size={11} />
            {row.mobile}
          </span>
        </div>
      ),
    },
    {
      key: 'address',
      label: t('branch.address', 'Address'),
      render: (row) => (
        <span className="flex items-start gap-1 text-xs text-[var(--text-muted)] max-w-[180px] line-clamp-2">
          <HiLocationMarker size={12} className="shrink-0 mt-0.5 text-[var(--accent)]" />
          {row.address}
        </span>
      ),
    },
    {
      key: 'openTime',
      label: t('branch.workingHours', 'Working Hours'),
      render: (row) => (
        <span className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
          <HiClock size={12} className="text-[var(--accent)]" />
          {row.openTime} – {row.closeTime}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: '100px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            title={t('common.edit', 'Edit')}
            onClick={() => openEdit(row.id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]
              transition-colors"
          >
            <HiPencil size={15} />
          </button>

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

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[var(--danger)]">Failed to load branches.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {t('branch.title', 'Salon Branches')}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {t('branch.description', 'Manage your salon locations')}
          </p>
        </div>

        <Button onClick={openAdd} leftIcon={<HiPlus size={15} />}>
          {t('branch.addBranch', 'Add Branch')}
        </Button>
      </div>

      <DataTable<SalonBranchListItem>
        columns={columns}
        data={branches}
        rowKey="id"
        loading={isLoading}
        searchKeys={['nameEn', 'nameAr', 'managerName', 'address']}
        searchPlaceholder={t('branch.searchPlaceholder', 'Search by name, manager, address…')}
        emptyMessage={t('branch.noBranches', 'No branches found. Add your first one!')}
      />

      <BranchFormModal
        open={formModal.open}
        onClose={closeForm}
        branchId={formModal.branchId}
      />

      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={handleDelete}
        loading={isDeleting}
        title={t('branch.deleteTitle', 'Delete Branch')}
        message={t(
          'branch.deleteMessage',
          'Are you sure you want to delete this branch? This action cannot be undone.',
        )}
      />
    </div>
  )
}