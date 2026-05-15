// ─── Salon Service Page ───────────────────────────────────────────────────────
//
//  Lists all salon services in a DataTable.
//  Add / Edit  → ServiceFormModal  (fetches its own dropdowns internally)
//  Image       → ServiceImageModal (auto-opens after create, or via icon)
//  Delete      → ConfirmModal

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { HiPlus, HiPencil, HiTrash, HiPhotograph } from 'react-icons/hi'
import {
  Button,
  ConfirmModal,
  DataTable,
  StatusBadge,
  type Column,
  type FilterConfig,
} from '@/components/shared'
import type { SalonService } from '../types'
import {
  useGetSalonServicesQuery,
  useDeleteSalonServiceMutation,
  useGetServiceCategoryDropdownQuery,
} from '../services/salonServiceApi'
import ServiceFormModal from '../components/ServiceFormModal'
import ServiceImageModal from '../components/ServiceImageModal'

// ── Price display helper ───────────────────────────────────────────────────────
function PriceCell({ service }: { service: SalonService }) {
  if (service.isPriceRange) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {service.minPrice} – {service.maxPrice}
        </span>
        {service.priceNoteEn && (
          <span className="text-xs text-[var(--text-muted)]">{service.priceNoteEn}</span>
        )}
      </div>
    )
  }
  return (
    <span className="text-sm font-medium text-[var(--text-primary)]">{service.price}</span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SalonServicePage() {
  const { t } = useTranslation()

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: services = [], isLoading, isError } = useGetSalonServicesQuery()

  // Fetch categories here only for the table filter — modal fetches its own
  const { data: categories = [] } = useGetServiceCategoryDropdownQuery()

  const [deleteService, { isLoading: isDeleting }] = useDeleteSalonServiceMutation()

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [formModal, setFormModal] = useState<{ open: boolean; service?: SalonService }>({
    open: false,
  })
  const [imageModal, setImageModal] = useState<{
    open: boolean
    serviceId: number
    serviceName: string
  } | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  })

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openAdd = () => setFormModal({ open: true })
  const openEdit = (service: SalonService) => setFormModal({ open: true, service })
  const closeForm = () => setFormModal({ open: false })

  const handleCreated = (id: number, name: string) =>
     setImageModal({ open: true, serviceId: id, serviceName: name })

  const openImageModal = (s: SalonService) =>
    setImageModal({ open: true, serviceId: s.id, serviceName: s.nameEn })

  const closeImageModal = () => setImageModal(null)

  const confirmDelete = (id: number) => setDeleteModal({ open: true, id })

  const handleDelete = async () => {
    if (!deleteModal.id) return
    try {
      await deleteService(deleteModal.id).unwrap()
      toast.success(t('service.deleteSuccess', 'Service deleted'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setDeleteModal({ open: false, id: null })
    }
  }

  // ── Table filters ─────────────────────────────────────────────────────────
  const categoryFilterOptions = categories.map((c) => ({ label: c.name, value: c.name }))

  const tableFilters: FilterConfig[] = [
    {
      key: 'categoryName',
      label: t('service.category', 'Category'),
      options: categoryFilterOptions,
    },
    {
      key: 'isActive',
      label: t('service.isActive', 'Status'),
      options: [
        { label: t('common.active', 'Active'), value: 'true' },
        { label: t('common.inactive', 'Inactive'), value: 'false' },
      ],
    },
    {
      key: 'isFeatured',
      label: t('service.isFeatured', 'Featured'),
      options: [
        { label: t('common.yes', 'Yes'), value: 'true' },
        { label: t('common.no', 'No'), value: 'false' },
      ],
    },
  ]

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns: Column<SalonService>[] = [
    {
      key: 'imageUrl',
      label: t('service.image', 'Image'),
      width: '56px',
      align: 'center',
      render: (row) =>
        row.imageUrl ? (
          <img
            src={row.imageUrl}
            alt={row.nameEn}
            className="w-9 h-9 rounded-lg object-cover border border-[var(--border)] mx-auto"
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-[var(--bg-hover)] flex items-center justify-center mx-auto">
            <HiPhotograph size={16} className="text-[var(--text-muted)]" />
          </div>
        ),
    },

    {
      key: 'nameEn',
      label: t('service.nameEn', 'Name (EN)'),
    },
    {
      key: 'nameAr',
      label: t('service.nameAr', 'Name (AR)'),
      render: (row) => <span dir="rtl">{row.nameAr}</span>,
    },
    {
      key: 'codeKey',
      label: t('service.codeKey', 'Code Key'),
      render: (row) => (
        <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-[var(--bg-hover)] text-[var(--text-secondary)]">
          {row.codeKey}
        </code>
      ),
    },
    {
      key: 'serviceCategoryName',
      label: t('service.category', 'Category'),
      render: (row) => (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)]">
          {row.serviceCategoryName}
        </span>
      ),
    },
    {
      key: 'serviceTypeName',
      label: t('service.serviceType', 'Type'),
      render: (row) => (
        <span className="text-sm text-[var(--text-secondary)]">{row.serviceTypeName}</span>
      ),
    },
    {
      key: 'price',
      label: t('service.price', 'Price'),
      render: (row) => <PriceCell service={row} />,
    },
    {
      key: 'isActive',
      label: t('service.isActive', 'Status'),
      render: (row) => (
        <StatusBadge
          approved={row.isActive}
          approvedLabel={t('common.active', 'Active')}
          pendingLabel={t('common.inactive', 'Inactive')}
        />
      ),
    },
    {
      key: 'isFeatured',
      label: t('service.isFeatured', 'Featured'),
      render: (row) =>
        row.isFeatured ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-600">
            {t('common.yes', 'Yes')}
          </span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">{t('common.no', 'No')}</span>
        ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: '120px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
        {/*   <button
            type="button"
            title={t('service.uploadImage', 'Upload Image')}
            onClick={() => openImageModal(row)}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]
              transition-colors"
          >
            <HiPhotograph size={15} />
          </button> */}
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

  // ── Error ────────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[var(--danger)]">Failed to load services.</p>
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
            {t('service.title', 'Salon Services')}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {t('service.description', 'Manage the services offered by your salon')}
          </p>
        </div>
        <Button onClick={openAdd} leftIcon={<HiPlus size={15} />}>
          {t('service.addService', 'Add Service')}
        </Button>
      </div>

      {/* DataTable */}
      <DataTable<SalonService>
        columns={columns}
        data={services}
        rowKey="id"
        loading={isLoading}
        searchKeys={['nameEn', 'nameAr', 'codeKey', 'categoryName', 'serviceTypeName']}
        searchPlaceholder={t('service.searchPlaceholder', 'Search by name, code, category…')}
        filters={tableFilters}
        emptyMessage={t('service.noServices', 'No services found. Add your first one!')}
      />

      {/* Add / Edit modal — fetches its own dropdowns */}
      <ServiceFormModal
        open={formModal.open}
        onClose={closeForm}
        service={formModal.service}
     /*    onCreated={handleCreated} */
      />
{/* 
  
      {imageModal && (
        <ServiceImageModal
          open={imageModal.open}
          onClose={closeImageModal}
          serviceId={imageModal.serviceId}
          serviceName={imageModal.serviceName}
        /> 
      )}
*/}
      {/* Delete confirm modal */}
      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={handleDelete}
        loading={isDeleting}
        title={t('service.deleteTitle', 'Delete Service')}
        message={t(
          'service.deleteMessage',
          'Are you sure you want to delete this service? This action cannot be undone.',
        )}
      />
    </div>
  )
}