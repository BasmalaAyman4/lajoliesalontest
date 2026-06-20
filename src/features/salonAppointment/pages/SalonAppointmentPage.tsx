// ─── Salon Appointment Page ───────────────────────────────────────────────────
//
//  Lists all appointments with server-side pagination + debounced search.
//  Row actions:
//   • HiQrCode   → QR modal  (statusId === 4 "Confirmed" AND qrToken !== null)
//   • HiRefresh  → status transition modal (all rows)
//   • HiPencil   → pricing detail modal    (all rows)

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { HiCalendar, HiLocationMarker, HiClock, HiRefresh, HiPencil } from 'react-icons/hi'
import { HiQrCode } from 'react-icons/hi2'
import {
  Button,
  DataTable,
  type Column,
} from '@/components/shared'
import type { SalonAppointment } from '../types'
import { useGetSalonAppointmentsQuery } from '../services/salonAppointmentApi'
import AppointmentStatusModal from '../components/AppointmentStatusModal'
import AppointmentQrModal    from '../components/AppointmentQrModal'
import AppointmentDetailModal from '../components/AppointmentDetailModal'
import { useDebounce } from '@/hooks/useDebounce'

// ── Status colour map ─────────────────────────────────────────────────────────
function getStatusStyle(statusId: number): { bg: string; text: string } {
  switch (statusId) {
    case 3:  return { bg: 'bg-yellow-50',  text: 'text-yellow-700' }  // Pending Approval
    case 4:  return { bg: 'bg-green-50',   text: 'text-green-700'  }  // Confirmed
    case 5:  return { bg: 'bg-red-50',     text: 'text-red-700'    }  // Rejected
    case 6:  return { bg: 'bg-orange-50',  text: 'text-orange-700' }  // Cancelled
    case 8:  return { bg: 'bg-blue-50',    text: 'text-blue-700'   }  // Completed
    case 9:  return { bg: 'bg-gray-100',   text: 'text-gray-500'   }  // Expired
    case 10: return { bg: 'bg-purple-50',  text: 'text-purple-700' }  // Checked In
    default: return { bg: 'bg-[var(--bg-hover)]', text: 'text-[var(--text-muted)]' }
  }
}

// ── Modal state helper ────────────────────────────────────────────────────────
interface ModalState {
  open: boolean
  appointment: SalonAppointment | null
}

const CLOSED: ModalState  = { open: false, appointment: null }
const openFor = (a: SalonAppointment): ModalState => ({ open: true, appointment: a })

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SalonAppointmentPage() {
  const { t } = useTranslation()

  // ── Pagination ───────────────────────────────────────────────────────────
  const [page,  setPage]  = useState(1)
  const [limit, setLimit] = useState(20)

  // ── Search ───────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 400)

  const handleSearch = useCallback((q: string) => {
    setSearchInput(q)
    setPage(1)
  }, [])

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useGetSalonAppointmentsQuery({
    pageNo:   page,
    pageSize: limit,
    search,
  })

  const appointments = data?.data       ?? []
  const totalCount   = data?.totalCount ?? 0

  // ── Modal state ──────────────────────────────────────────────────────────
  const [statusModal, setStatusModal] = useState<ModalState>(CLOSED)
  const [qrModal,     setQrModal]     = useState<ModalState>(CLOSED)
  const [detailModal, setDetailModal] = useState<ModalState>(CLOSED)

  // ── Date formatter ───────────────────────────────────────────────────────
  const formatDate = (a: SalonAppointment) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${a.day} ${months[a.month - 1]} ${a.year}`
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns: Column<SalonAppointment>[] = [
    {
      key: 'appointmentId',
      label: t('appointment.id'),
      width: '60px',
      render: (row) => (
        <span className="text-xs font-mono text-[var(--text-muted)]">
          {row.appointmentId}
        </span>
      ),
    },
    {
      key: 'clientName',
      label: t('appointment.client'),
      render: (row) => (
        <span className="font-medium text-[var(--text-primary)]">{row.clientName}</span>
      ),
    },
    {
      key: 'serviceName',
      label: t('appointment.service'),
      render: (row) => (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)]">
          {row.serviceName}
        </span>
      ),
    },
    {
      key: 'day',
      label: t('appointment.date'),
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-sm text-[var(--text-primary)]">
            <HiCalendar size={13} className="text-[var(--text-muted)]" />
            {formatDate(row)}
          </div>
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <HiClock size={12} />
            {row.timeFrom} – {row.timeTo}
          </div>
        </div>
      ),
    },
    {
      key: 'branchAddress',
      label: t('appointment.branch'),
      render: (row) => (
        <div className="flex items-start gap-1 max-w-[220px]">
          <HiLocationMarker size={13} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
          <span className="text-xs text-[var(--text-muted)] line-clamp-2">
            {row.branchAddress}
          </span>
        </div>
      ),
    },
    {
      key: 'payedDeposit',
      label: t('appointment.deposit'),
      align: 'center',
      render: (row) =>
        row.payedDeposit !== null ? (
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {row.payedDeposit}
          </span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">—</span>
        ),
    },
    {
      key: 'status',
      label: t('appointment.status'),
      render: (row) => {
        const style = getStatusStyle(row.statusId)
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${style.bg} ${style.text}`}>
            {row.status}
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: '112px',
      render: (row) => {
        // Show QR button only when appointment is Confirmed AND has a qrToken
        const hasQr = row.statusId === 4 && row.qrToken != null
        return (
          <div className="flex items-center justify-end gap-1">
            {/* Pricing / detail edit */}
            <ActionButton
              title={t('appointment.editPricing', 'Edit Pricing')}
              onClick={() => setDetailModal(openFor(row))}
              icon={<HiPencil size={14} />}
            />

            {/* QR Code — visible only when Confirmed and qrToken exists */}
            {hasQr && (
              <ActionButton
                title={t('appointment.showQr', 'Show QR Code')}
                onClick={() => setQrModal(openFor(row))}
                icon={<HiQrCode size={15} />}
                accent
              />
            )}

            {/* Status transition */}
            <ActionButton
              title={t('appointment.changeStatus', 'Change Status')}
              onClick={() => setStatusModal(openFor(row))}
              icon={<HiRefresh size={15} />}
            />
          </div>
        )
      },
    },
  ]

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-[var(--danger)]">{t('appointment.loadError')}</p>
        <Button variant="secondary" onClick={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {t('appointment.title')}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {t('appointment.description')}
          </p>
        </div>
      </div>

      {/* Table */}
      <DataTable<SalonAppointment>
        columns={columns}
        data={appointments}
        rowKey="appointmentId"
        loading={isLoading}
        searchPlaceholder={t('appointment.searchPlaceholder')}
        onSearch={handleSearch}
        emptyMessage={t('appointment.noAppointments')}
        total={totalCount}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1) }}
      />

      {/* ── Modals ── */}
      <AppointmentStatusModal
        open={statusModal.open}
        onClose={() => setStatusModal(CLOSED)}
        appointment={statusModal.appointment}
      />

      {/* QR code modal — just displays the existing token, no check-in action */}
      <AppointmentQrModal
        open={qrModal.open}
        onClose={() => setQrModal(CLOSED)}
        appointment={qrModal.appointment}
      />

      <AppointmentDetailModal
        open={detailModal.open}
        onClose={() => setDetailModal(CLOSED)}
        appointment={detailModal.appointment}
      />
    </div>
  )
}

// ── Small reusable icon button ────────────────────────────────────────────────
function ActionButton({
  title,
  onClick,
  icon,
  accent = false,
}: {
  title:   string
  onClick: () => void
  icon:    React.ReactNode
  accent?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
        accent
          ? 'text-[var(--accent)] hover:bg-[var(--accent-soft)]'
          : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]',
      ].join(' ')}
    >
      {icon}
    </button>
  )
}