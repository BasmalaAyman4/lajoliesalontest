// ─── Service Discount Page ────────────────────────────────────────────────────
//
//  Lists all service discounts in a DataTable.
//  Add / Edit  → ServiceDiscountFormModal
//  Details     → ServiceDiscountDetailsModal  (shows detail rows + stop-detail)
//  Stop        → ConfirmModal → stopDiscount/:id
//  Delete      → ConfirmModal → DELETE

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { HiPlus, HiPencil, HiTrash, HiEye, HiStop } from 'react-icons/hi'
import {
  Button,
  ConfirmModal,
  DataTable,
  StatusBadge,
  type Column,
  type FilterConfig,
} from '@/components/shared'
import type { ServiceDiscount } from '../types'
import {
  useGetServiceDiscountsQuery,
  useDeleteServiceDiscountMutation,
  useStopDiscountMutation,
} from '../services/serviceDiscountApi'
import ServiceDiscountFormModal from '../components/ServiceDiscountFormModal'
import ServiceDiscountDetailsModal from '../components/ServiceDiscountDetailsModal'

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ServiceDiscountPage() {
  const { t } = useTranslation()

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: discounts = [], isLoading, isError } = useGetServiceDiscountsQuery()
  const [deleteDiscount, { isLoading: isDeleting }] = useDeleteServiceDiscountMutation()
  const [stopDiscount, { isLoading: isStopping }] = useStopDiscountMutation()

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [formModal, setFormModal] = useState<{ open: boolean; discount?: ServiceDiscount }>({
    open: false,
  })
  const [detailsModal, setDetailsModal] = useState<ServiceDiscount | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  })
  const [stopModal, setStopModal] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  })

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openAdd = () => setFormModal({ open: true })
  const openEdit = (discount: ServiceDiscount) => setFormModal({ open: true, discount })
  const closeForm = () => setFormModal({ open: false })

  const handleDelete = async () => {
    if (!deleteModal.id) return
    try {
      await deleteDiscount(deleteModal.id).unwrap()
      toast.success(t('discount.deleteSuccess', 'Discount deleted'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setDeleteModal({ open: false, id: null })
    }
  }

  const handleStop = async () => {
    if (!stopModal.id) return
    try {
      await stopDiscount(stopModal.id).unwrap()
      toast.success(t('discount.stopSuccess', 'Discount stopped'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setStopModal({ open: false, id: null })
    }
  }

  // ── Table filters ─────────────────────────────────────────────────────────
  const tableFilters: FilterConfig[] = [
    {
      key: 'isStopped',
      label: t('common.status', 'Status'),
      options: [
        { label: t('common.active', 'Active'), value: 'false' },
        { label: t('discount.stopped', 'Stopped'), value: 'true' },
      ],
    },
  ]

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns: Column<ServiceDiscount>[] = [
    {
      key: 'id',
      label: t('common.id', '#'),
      width: '60px',
      render: (row) => (
        <span className="text-xs font-mono text-[var(--text-muted)]">{row.id}</span>
      ),
    },
    {
      key: 'dateFrom',
      label: t('discount.dateFrom', 'Start Date'),
      render: (row) => (
        <span className="text-sm text-[var(--text-primary)]">{row.dateFrom.slice(0, 10)}</span>
      ),
    },
    {
      key: 'toDate',
      label: t('discount.toDate', 'End Date'),
      render: (row) => (
        <span className="text-sm text-[var(--text-primary)]">{row.toDate.slice(0, 10)}</span>
      ),
    },
    {
      key: 'details',
      label: t('discount.servicesCount', 'Services'),
      render: (row) => (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)]">
          {row.details.length} {t('discount.services', 'services')}
        </span>
      ),
    },
    {
      key: 'isStopped',
      label: t('common.status', 'Status'),
      render: (row) => (
        <StatusBadge
          approved={!row.isStopped}
          approvedLabel={t('common.active', 'Active')}
          pendingLabel={t('discount.stopped', 'Stopped')}
        />
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: '140px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {/* View details */}
          <button
            type="button"
            title={t('discount.viewDetails', 'View Details')}
            onClick={() => setDetailsModal(row)}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]
              transition-colors"
          >
            <HiEye size={15} />
          </button>

          {/* Edit — only when not stopped */}
          {!row.isStopped && (
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
          )}

          {/* Stop entire discount — only when active */}
          {!row.isStopped && (
            <button
              type="button"
              title={t('discount.stopDiscount', 'Stop Discount')}
              onClick={() => setStopModal({ open: true, id: row.id })}
              className="w-8 h-8 rounded-lg flex items-center justify-center
                text-[var(--text-muted)] hover:text-orange-500 hover:bg-orange-50
                transition-colors"
            >
              <HiStop size={15} />
            </button>
          )}

          {/* Delete */}
          <button
            type="button"
            title={t('common.delete')}
            onClick={() => setDeleteModal({ open: true, id: row.id })}
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

  // ── Error ────────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[var(--danger)]">Failed to load discounts.</p>
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
            {t('discount.title', 'Service Discounts')}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {t('discount.description', 'Manage discount campaigns for your salon services')}
          </p>
        </div>
        <Button onClick={openAdd} leftIcon={<HiPlus size={15} />}>
          {t('discount.addDiscount', 'Add Discount')}
        </Button>
      </div>

      {/* DataTable */}
      <DataTable<ServiceDiscount>
        columns={columns}
        data={discounts}
        rowKey="id"
        loading={isLoading}
        searchKeys={['dateFrom', 'toDate']}
        searchPlaceholder={t('discount.searchPlaceholder', 'Search by date…')}
        filters={tableFilters}
        emptyMessage={t('discount.noDiscounts', 'No discounts found. Create your first one!')}
      />

      {/* Add / Edit modal */}
      <ServiceDiscountFormModal
        open={formModal.open}
        onClose={closeForm}
        discount={formModal.discount}
      />

      {/* Details modal */}
      <ServiceDiscountDetailsModal
        open={Boolean(detailsModal)}
        onClose={() => setDetailsModal(null)}
        discount={detailsModal}
      />

      {/* Stop discount confirm */}
      <ConfirmModal
        open={stopModal.open}
        onClose={() => setStopModal({ open: false, id: null })}
        onConfirm={handleStop}
        loading={isStopping}
        title={t('discount.stopTitle', 'Stop Discount')}
        message={t(
          'discount.stopMessage',
          'Are you sure you want to stop this discount? All details will be deactivated.',
        )}
      />

      {/* Delete confirm modal */}
      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={handleDelete}
        loading={isDeleting}
        title={t('discount.deleteTitle', 'Delete Discount')}
        message={t(
          'discount.deleteMessage',
          'Are you sure you want to delete this discount? This action cannot be undone.',
        )}
      />
    </div>
  )
}