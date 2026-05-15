// ─── Salon Appointment Page ───────────────────────────────────────────────────
//
//  Lists all appointments with server-side pagination + server-side search.
//  Uses a debounced search query so every keystroke doesn't fire a request.

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { HiCalendar, HiLocationMarker, HiClock, HiRefresh } from 'react-icons/hi'
import {
  Button,
  DataTable,
  type Column,
} from '@/components/shared'
import type { SalonAppointment } from '../types'
import {
  useGetSalonAppointmentsQuery,
  useChangeAppointmentStateMutation,
} from '../services/salonAppointmentApi'
import AppointmentStatusModal from '../components/AppointmentStatusModal'
import { useDebounce } from '@/hooks/useDebounce'

// ── Status colour map ─────────────────────────────────────────────────────────
function getStatusStyle(statusId: number): { bg: string; text: string } {
  switch (statusId) {
    case 3:  return { bg: 'bg-yellow-50',  text: 'text-yellow-700' }  // Pending Approval
    case 4:  return { bg: 'bg-green-50',   text: 'text-green-700'  }  // Confirmed
    case 5:  return { bg: 'bg-red-50',     text: 'text-red-700'    }  // Rejected by Salon
    case 6:  return { bg: 'bg-orange-50',  text: 'text-orange-700' }  // Cancelled by Client
    case 9:  return { bg: 'bg-gray-100',   text: 'text-gray-500'   }  // Expired
    default: return { bg: 'bg-[var(--bg-hover)]', text: 'text-[var(--text-muted)]' }
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SalonAppointmentPage() {
  const { t } = useTranslation()

  // ── Pagination ───────────────────────────────────────────────────────────
  const [page, setPage]   = useState(1)
  const [limit, setLimit] = useState(20)

  // ── Search (debounced so we don't spam the server) ───────────────────────
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 400)

  // Reset to page 1 whenever search changes
  const handleSearch = useCallback((q: string) => {
    setSearchInput(q)
    setPage(1)
  }, [])

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useGetSalonAppointmentsQuery({
    pageNo: page,
    pageSize: limit,
    search,          // ← sent to server; remove if your API doesn't support it yet
  })

  const appointments = data?.data       ?? []
  const totalCount   = data?.totalCount ?? 0

  // ── Status change ────────────────────────────────────────────────────────
  const [changeState, { isLoading: isChanging }] = useChangeAppointmentStateMutation()
  const [transitionModal, setTransitionModal] = useState<{
    open: boolean
    appointment: SalonAppointment | null
  }>({ open: false, appointment: null })

  const openTransitionModal  = (a: SalonAppointment) =>
    setTransitionModal({ open: true, appointment: a })
  const closeTransitionModal = () =>
    setTransitionModal({ open: false, appointment: null })

  const handleStateChange = async (statusId: number) => {
    if (!transitionModal.appointment) return
    try {
      await changeState({
        id:     transitionModal.appointment.appointmentId,
        status: statusId,
      }).unwrap()
      toast.success(t('common.success'))
      closeTransitionModal()
    } catch {
      toast.error(t('common.error'))
    }
  }

  // ── Date formatter ───────────────────────────────────────────────────────
  const formatDate = (a: SalonAppointment) => {
    const months = [
      'Jan','Feb','Mar','Apr','May','Jun',
      'Jul','Aug','Sep','Oct','Nov','Dec',
    ]
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
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${style.bg} ${style.text}`}
          >
            {row.status}
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: '80px',
      render: (row) => (
        <button
          type="button"
          title={t('appointment.changeStatus')}
          onClick={() => openTransitionModal(row)}
          className="w-8 h-8 rounded-lg flex items-center justify-center
            text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]
            transition-colors"
        >
          <HiRefresh size={15} />
        </button>
      ),
    },
  ]

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-[var(--danger)]">
          {t('appointment.loadError')}
        </p>
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

      {/* Table — server-side pagination + search */}
      <DataTable<SalonAppointment>
        columns={columns}
        data={appointments}
        rowKey="appointmentId"
        loading={isLoading}
        // Hand the typed value to DataTable so its internal input is controlled,
        // but route changes through our handler so page resets properly.
        searchPlaceholder={t('appointment.searchPlaceholder')}
        onSearch={handleSearch}
        emptyMessage={t('appointment.noAppointments')}
        // Server-side pagination
        total={totalCount}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1) }}
      />

      {/* Status modal */}
      <AppointmentStatusModal
        open={transitionModal.open}
        onClose={closeTransitionModal}
        appointment={transitionModal.appointment}
      />
    </div>
  )
}