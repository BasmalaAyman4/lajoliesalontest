// ─── Branch Chair Page ────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { HiPlus, HiPencil, HiTrash } from 'react-icons/hi'
import { Button, ConfirmModal, DataTable, type Column } from '@/components/shared'
import type { BranchChair } from '../types'
import {
  useGetBranchChairsQuery,
  useDeleteBranchChairMutation,
  useUpdateBranchChairMutation,
} from '../services/branchChairApi'
import {
  useGetBranchDropdownQuery,
  useGetChairTypeDropdownQuery,
} from '../services/branchChairApi'
import BranchChairFormModal from '../components/BranchChairFormModal'

export default function BranchChairPage() {
  const { t } = useTranslation()

  const { data: branchChairs = [], isLoading, isError } = useGetBranchChairsQuery()
  const { data: branchOptions = [] } = useGetBranchDropdownQuery()
  const { data: chairTypeOptions = [] } = useGetChairTypeDropdownQuery()
  const [deleteBranchChair, { isLoading: isDeleting }] = useDeleteBranchChairMutation()
  const [updateBranchChair] = useUpdateBranchChairMutation()

  const branchNameById = useMemo(
    () => new Map(branchOptions.map((b) => [b.id, b.name])),
    [branchOptions],
  )
  const chairTypeNameById = useMemo(
    () => new Map(chairTypeOptions.map((c) => [c.id, c.name])),
    [chairTypeOptions],
  )

  const [formModal, setFormModal] = useState<{ open: boolean; branchChair?: BranchChair }>({
    open: false,
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  })

  const openAdd = () => setFormModal({ open: true })
  const openEdit = (row: BranchChair) => setFormModal({ open: true, branchChair: row })
  const closeForm = () => setFormModal({ open: false })

  const confirmDelete = (id: number) => setDeleteModal({ open: true, id })

  const handleDelete = async () => {
    if (!deleteModal.id) return
    try {
      await deleteBranchChair(deleteModal.id).unwrap()
      toast.success(t('branchChair.deleteSuccess', 'Chair deleted'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setDeleteModal({ open: false, id: null })
    }
  }

  const handleToggleActive = async (row: BranchChair) => {
    try {
      await updateBranchChair({
        id: row.id,
        quantity: row.quantity,
        isActive: !row.isActive,
      }).unwrap()
    } catch {
      toast.error(t('common.error'))
    }
  }

  const columns: Column<BranchChair>[] = [
    {
      key: 'salonBranchId',
      label: t('branchChair.branch', 'Branch'),
      render: (row) => (
        <span className="font-medium text-[var(--text-primary)]">
          {branchNameById.get(row.salonBranchId) ?? '—'}
        </span>
      ),
    },
    {
      key: 'chairTypeId',
      label: t('branchChair.chairType', 'Chair Type'),
      render: (row) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {chairTypeNameById.get(row.chairTypeId) ?? '—'}
        </span>
      ),
    },
    {
      key: 'quantity',
      label: t('branchChair.quantity', 'Quantity'),
      render: (row) => (
        <span className="text-sm text-[var(--text-secondary)]">{row.quantity}</span>
      ),
    },
    {
      key: 'isActive',
      label: t('branchChair.isActive', 'Active'),
      render: (row) => (
        <button
          type="button"
          onClick={() => handleToggleActive(row)}
          className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
            row.isActive
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'bg-gray-100 text-[var(--text-muted)]'
          }`}
        >
          {row.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
        </button>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: '90px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
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
        <p className="text-sm text-[var(--danger)]">Failed to load chairs.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {t('branchChair.title', 'Branch Chairs')}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {t('branchChair.description', 'Manage chair inventory per branch')}
          </p>
        </div>
        <Button onClick={openAdd} leftIcon={<HiPlus size={15} />}>
          {t('branchChair.addChair', 'Add Chair')}
        </Button>
      </div>

      <DataTable<BranchChair>
        columns={columns}
        data={branchChairs}
        rowKey="id"
        loading={isLoading}
        emptyMessage={t('branchChair.noChairs', 'No chairs found. Add your first one!')}
      />

      <BranchChairFormModal
        open={formModal.open}
        onClose={closeForm}
        branchChair={formModal.branchChair}
      />

      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={handleDelete}
        loading={isDeleting}
        title={t('branchChair.deleteTitle', 'Delete Chair')}
        message={t(
          'branchChair.deleteMessage',
          'Are you sure you want to delete this chair? This action cannot be undone.',
        )}
      />
    </div>
  )
}