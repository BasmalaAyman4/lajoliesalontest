// ─── Salon Schedule Page ──────────────────────────────────────────────────────
//
//  Calendar view (FullCalendar) + list fallback.
//  Click a day  → open Add modal pre-filled with that date.
//  Click an event → open Edit modal.
//  Each calendar event chip shows inline Edit + Delete/Play icon buttons.

import { useState, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import type { EventClickArg, DateClickArg, EventContentArg } from '@fullcalendar/core'
import { HiPlus, HiPencil, HiTrash, HiCalendar, HiViewList, HiPlay } from 'react-icons/hi'
import { Button, ConfirmModal, DataTable, type Column } from '@/components/shared'
import type { SalonSchedule } from '../types'
import {
  useGetSalonSchedulesQuery,
  useDeleteSalonScheduleMutation,
} from '../services/salonScheduleApi'
import ScheduleFormModal from '../components/ScheduleFormModal'

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')

const scheduleToDate = (s: SalonSchedule) => {
  const year = s.year ?? new Date().getFullYear()
  return `${year}-${pad(s.month)}-${pad(s.day)}`
}

const formatTime = (t: string | { hour: number; minute: number }): string => {
  if (typeof t === 'string') return t.slice(0, 5)
  return `${pad(t.hour)}:${pad(t.minute)}`
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SalonSchedulePage() {
  const { t } = useTranslation()

  const { data: schedules = [], isLoading, isError } = useGetSalonSchedulesQuery()
  const [deleteSchedule, { isLoading: isDeleting }] = useDeleteSalonScheduleMutation()

  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [formModal, setFormModal] = useState<{
    open: boolean
    schedule?: SalonSchedule
    defaultDate?: { year: number; month: number; day: number }
  }>({ open: false })
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean
    id: number | null
    isStoped: boolean
  }>({ open: false, id: null, isStoped: false })

  const calendarRef = useRef<FullCalendar>(null)

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const openAdd  = () => setFormModal({ open: true })
  const openEdit = (schedule: SalonSchedule) => setFormModal({ open: true, schedule })
  const closeForm = () => setFormModal({ open: false })

  const confirmDelete = (id: number, isStoped: boolean) =>
    setDeleteModal({ open: true, id, isStoped })

  const handleDelete = async () => {
    if (!deleteModal.id) return
    try {
      await deleteSchedule(deleteModal.id).unwrap()
      toast.success(
        deleteModal.isStoped
          ? t('schedule.playSuccess', 'Schedule played')
          : t('schedule.stopSuccess', 'Schedule stoped'),
      )
    } catch {
      toast.error(t('common.error'))
    } finally {
      setDeleteModal({ open: false, id: null, isStoped: false })
    }
  }

  const handleDateClick = useCallback((arg: DateClickArg) => {
    const d = new Date(arg.dateStr)
    setFormModal({
      open: true,
      defaultDate: { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() },
    })
  }, [])

  // Clicking the event area (not the action buttons) opens the edit modal
  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      // Ignore clicks that originated from our action buttons
      if ((arg.jsEvent.target as HTMLElement).closest('[data-action]')) return
      const id = Number(arg.event.id)
      const schedule = schedules.find((s) => s.id === id)
      if (schedule) openEdit(schedule)
    },
    [schedules],
  )

  // ── FullCalendar events ───────────────────────────────────────────────────────
  const calendarEvents = useMemo(
    () =>
      schedules.map((s) => ({
        id: String(s.id),
        title: s.salonServiceName || `Service #${s.salonServiceId}`,
        date: scheduleToDate(s),
        classNames: s.isStoped ? ['fc-event-stopped'] : [],
        extendedProps: { schedule: s },
      })),
    [schedules],
  )

  // ── Event chip renderer ───────────────────────────────────────────────────────
  const renderEventContent = (info: EventContentArg) => {
    const s: SalonSchedule = info.event.extendedProps.schedule
    const isList = info.view.type.includes('list')

    if (isList) {
      return (
        <div className="flex items-center gap-3 py-1 w-full flex-wrap">
          <span className="text-xs font-semibold">{info.event.title}</span>
          <span className="text-xs opacity-75">
            {formatTime(s.timeFrom)} – {formatTime(s.timeTo)}
          </span>
          {s.salonBranchName && (
            <span className="text-xs opacity-60">{s.salonBranchName}</span>
          )}
          {s.serviceDuration && (
            <span className="text-xs opacity-50">{s.serviceDuration} min</span>
          )}
          {/* Actions in list view */}
          <div className="ms-auto flex items-center gap-1" data-action="group">
            <button
              type="button"
              data-action="edit"
              title={t('common.edit', 'Edit')}
              onClick={(e) => { e.stopPropagation(); openEdit(s) }}
              className="w-6 h-6 rounded-md flex items-center justify-center
                bg-white/20 hover:bg-white/40 transition-colors"
            >
              <HiPencil size={11} />
            </button>
            <button
              type="button"
              data-action="delete"
              title={s.isStoped ? t('common.play', 'Play') : t('common.delete', 'Delete')}
              onClick={(e) => { e.stopPropagation(); confirmDelete(s.id, s.isStoped) }}
              className="w-6 h-6 rounded-md flex items-center justify-center
                bg-white/20 hover:bg-red-400/60 transition-colors"
            >
              {s.isStoped ? <HiPlay size={11} /> : <HiTrash size={11} />}
            </button>
          </div>
        </div>
      )
    }

    // ── Day-grid chip ─────────────────────────────────────────────────────────
    return (
      <div className="group/chip flex items-center gap-0.5 px-1 py-0.5 w-full overflow-hidden">
        {/* Text info — shrinks to make room for buttons */}
        <div className="flex flex-col gap-0 flex-1 min-w-0 overflow-hidden">
          <span className="text-[11px] font-semibold leading-tight truncate">
            {info.event.title}
          </span>
          <span className="text-[10px] opacity-80 leading-tight hidden sm:block">
            {formatTime(s.timeFrom)} – {formatTime(s.timeTo)}
          </span>
          {s.salonBranchName && (
            <span className="text-[10px] opacity-70 leading-tight truncate hidden md:block">
              {s.salonBranchName}
            </span>
          )}
        </div>

        {/* Action buttons — always visible on mobile, hover-revealed on desktop */}
        <div
          data-action="group"
          className="flex items-center gap-0.5 shrink-0
            opacity-100 sm:opacity-0 sm:group-hover/chip:opacity-100
            transition-opacity duration-150"
        >
          {/* Edit */}
          <button
            type="button"
            data-action="edit"
            title={t('common.edit', 'Edit')}
            onClick={(e) => { e.stopPropagation(); openEdit(s) }}
            className="w-5 h-5 rounded flex items-center justify-center
              bg-white/25 hover:bg-white/50 transition-colors"
          >
            <HiPencil size={10} />
          </button>

          {/* Delete / Play */}
          <button
            type="button"
            data-action="delete"
            title={s.isStoped ? t('common.play', 'Play') : t('common.delete', 'Delete')}
            onClick={(e) => { e.stopPropagation(); confirmDelete(s.id, s.isStoped) }}
            className="w-5 h-5 rounded flex items-center justify-center
              bg-white/25 hover:bg-red-500/70 transition-colors"
          >
            {s.isStoped ? <HiPlay size={10} /> : <HiTrash size={10} />}
          </button>
        </div>
      </div>
    )
  }

  // ── DataTable columns (list view) ─────────────────────────────────────────────
  const columns: Column<SalonSchedule>[] = [
    {
      key: 'salonServiceName',
      label: t('schedule.service', 'Service'),
      render: (row) => (
        <span className="font-medium text-[var(--text-primary)]">
          {row.salonServiceName || `#${row.salonServiceId}`}
        </span>
      ),
    },
    {
      key: 'salonBranchName',
      label: t('schedule.branch', 'Branch'),
      render: (row) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {row.salonBranchName || `#${row.branchId}`}
        </span>
      ),
    },
    {
      key: 'day',
      label: t('schedule.date', 'Date'),
      render: (row) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {row.day} {MONTHS[row.month - 1]} {row.year ?? ''}
        </span>
      ),
    },
    {
      key: 'timeFrom',
      label: t('schedule.timeRange', 'Time Range'),
      render: (row) => (
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {formatTime(row.timeFrom)} – {formatTime(row.timeTo)}
        </span>
      ),
    },
    {
      key: 'serviceDuration',
      label: t('schedule.serviceDuration', 'Duration'),
      render: (row) => (
        <span className="text-sm text-[var(--text-muted)]">{row.serviceDuration} min</span>
      ),
    },
    {
      key: 'requiredDesposit',
      label: t('schedule.deposit', 'Deposit'),
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            row.requiredDesposit
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'bg-[var(--surface-raised)] text-[var(--text-muted)]'
          }`}
        >
          {row.requiredDesposit ? t('common.yes', 'Yes') : t('common.no', 'No')}
        </span>
      ),
    },
    {
      key: 'requiredSalonApproved',
      label: t('schedule.approval', 'Approval'),
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            row.requiredSalonApproved
              ? 'bg-amber-50 text-amber-600'
              : 'bg-[var(--surface-raised)] text-[var(--text-muted)]'
          }`}
        >
          {row.requiredSalonApproved ? t('common.required', 'Required') : t('common.auto', 'Auto')}
        </span>
      ),
    },
    {
      key: 'isStoped',
      label: t('schedule.isStoped', 'Stopped'),
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            row.isStoped
              ? 'bg-[var(--error-soft)] text-[var(--error)]'
              : 'bg-[var(--success-soft)] text-[var(--success)]'
          }`}
        >
          {row.isStoped ? t('common.yes', 'Yes') : t('common.no', 'No')}
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
            onClick={() => openEdit(row)}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]
              transition-colors"
          >
            <HiPencil size={15} />
          </button>
          <button
            type="button"
            title={row.isStoped ? t('common.play', 'Play') : t('common.delete', 'Delete')}
            onClick={() => confirmDelete(row.id, row.isStoped)}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50
              transition-colors"
          >
            {row.isStoped ? <HiPlay size={15} /> : <HiTrash size={15} />}
          </button>
        </div>
      ),
    },
  ]

  // ── Error state ───────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[var(--danger)]">Failed to load schedules.</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {t('schedule.title', 'Salon Schedules')}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {t('schedule.description', 'Manage your service availability')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center bg-[var(--surface-raised)] rounded-lg p-1 border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                transition-colors ${
                  view === 'calendar'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              <HiCalendar size={14} />
              <span className="hidden xs:inline">{t('schedule.calendarView', 'Calendar')}</span>
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                transition-colors ${
                  view === 'list'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              <HiViewList size={14} />
              <span className="hidden xs:inline">{t('schedule.listView', 'List')}</span>
            </button>
          </div>

          <Button onClick={openAdd} leftIcon={<HiPlus size={15} />}>
            <span className="hidden sm:inline">{t('schedule.addSchedule', 'Add Schedule')}</span>
            <span className="sm:hidden">{t('common.add', 'Add')}</span>
          </Button>
        </div>
      </div>

      {/* ── Calendar view ─────────────────────────────────────────────────────── */}
      {view === 'calendar' && (
        <div
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]
            overflow-hidden shadow-sm schedule-calendar"
        >
          <style>{`
            /* ─── FullCalendar theme overrides ─────────────────────────── */
            .schedule-calendar .fc { font-family: inherit; }
            .schedule-calendar .fc-toolbar {
              padding: 16px 20px 12px;
              flex-wrap: wrap;
              gap: 8px;
            }
            .schedule-calendar .fc-toolbar-title {
              font-size: 1rem;
              font-weight: 600;
              color: var(--text-primary);
            }
            .schedule-calendar .fc-button {
              background: var(--surface-raised) !important;
              border: 1px solid var(--border) !important;
              color: var(--text-secondary) !important;
              border-radius: 8px !important;
              font-size: 12px !important;
              font-weight: 500 !important;
              padding: 5px 12px !important;
              box-shadow: none !important;
              transition: all 0.15s !important;
            }
            .schedule-calendar .fc-button:hover {
              background: var(--accent-soft) !important;
              color: var(--accent) !important;
              border-color: var(--accent) !important;
            }
            .schedule-calendar .fc-button-active,
            .schedule-calendar .fc-button-primary:not(:disabled).fc-button-active {
              background: var(--accent) !important;
              border-color: var(--accent) !important;
              color: white !important;
            }
            .schedule-calendar .fc-col-header-cell {
              background: var(--surface-raised);
              padding: 8px 0;
            }
            .schedule-calendar .fc-col-header-cell-cushion {
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              color: var(--text-muted);
              text-decoration: none !important;
            }
            .schedule-calendar .fc-daygrid-day-number {
              font-size: 12px;
              font-weight: 500;
              color: var(--text-secondary);
              text-decoration: none !important;
              padding: 6px 8px;
            }
            .schedule-calendar .fc-day-today { background: var(--accent-soft) !important; }
            .schedule-calendar .fc-day-today .fc-daygrid-day-number {
              color: var(--accent) !important;
              font-weight: 700;
            }
            .schedule-calendar .fc-daygrid-event {
              border-radius: 6px !important;
              border: none !important;
              background: var(--accent) !important;
              cursor: pointer;
              margin-bottom: 2px !important;
              /* ensure overflow is hidden so buttons don't bleed */
              overflow: hidden;
            }
              .schedule-calendar .fc-daygrid-event.fc-event-stopped {
  background: var(--text-muted) !important;
  opacity: 0.75;
}
            .schedule-calendar .fc-event:hover { opacity: 0.95; }
            .schedule-calendar .fc-daygrid-day:hover {
              background: var(--surface-raised);
              cursor: pointer;
            }
            .schedule-calendar .fc-scrollgrid { border-color: var(--border) !important; }
            .schedule-calendar td, .schedule-calendar th { border-color: var(--border) !important; }
            .schedule-calendar .fc-more-link { font-size: 11px; color: var(--accent); font-weight: 500; }
            .schedule-calendar .fc-list-event:hover td {
              background: var(--surface-raised) !important;
              cursor: pointer;
            }
            .schedule-calendar .fc-list-day-cushion {
              background: var(--surface-raised) !important;
              color: var(--text-secondary);
              font-size: 12px;
              font-weight: 600;
            }
            .schedule-calendar .fc-list-event-dot { border-color: var(--accent) !important; }
            .schedule-calendar .fc-list-event-time { color: var(--text-muted); font-size: 11px; }
            .schedule-calendar .fc-list-event-title { color: var(--text-primary); }

            /* Stop FullCalendar from intercepting pointer events on our buttons */
            .schedule-calendar .fc-event [data-action] { pointer-events: auto; }

            /* ── Mobile overrides ──────────────────────────────────────── */
            @media (max-width: 640px) {
              .schedule-calendar .fc-toolbar {
                flex-direction: column;
                align-items: flex-start;
                padding: 12px 12px 8px;
                gap: 8px;
              }
              .schedule-calendar .fc-toolbar-chunk { display: flex; gap: 4px; }
              .schedule-calendar .fc-toolbar-title { font-size: 0.875rem; }
              .schedule-calendar .fc-button { font-size: 11px !important; padding: 4px 8px !important; }
              .schedule-calendar .fc-daygrid-day-number { font-size: 10px; padding: 4px 5px; }
              .schedule-calendar .fc-col-header-cell-cushion { font-size: 9px; letter-spacing: 0; }
              .schedule-calendar .fc-daygrid-event { font-size: 9px; }
              .schedule-calendar .fc-daygrid-day-frame { min-height: 48px; }
            }
          `}</style>

          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,listMonth',
            }}
            views={{
              listMonth: {
                listDayFormat: { weekday: 'long', month: 'long', day: 'numeric' },
              },
            }}
            buttonText={{
              today: t('schedule.today', 'Today'),
              month: t('schedule.month', 'Month'),
              list: t('schedule.list', 'List'),
            }}
            events={calendarEvents}
            eventContent={renderEventContent}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            loading={(loading) => { void loading }}
            dayMaxEvents={3}
            height="auto"
            aspectRatio={1.6}
          />
        </div>
      )}

      {/* ── List view ─────────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <DataTable<SalonSchedule>
          columns={columns}
          data={schedules}
          rowKey="id"
          loading={isLoading}
          searchKeys={['salonServiceName', 'salonBranchName']}
          searchPlaceholder={t('schedule.searchPlaceholder', 'Search by service or branch…')}
          emptyMessage={t('schedule.noSchedules', 'No schedules found. Add your first one!')}
        />
      )}

      {/* Add / Edit modal */}
      <ScheduleFormModal
        open={formModal.open}
        onClose={closeForm}
        schedule={formModal.schedule}
        defaultDate={formModal.defaultDate}
      />

      {/* Delete / Play confirm modal */}
      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, isStoped: false })}
        onConfirm={handleDelete}
        loading={isDeleting}
        title={
          deleteModal.isStoped
            ? t('schedule.playTitle', 'Play Schedule')
            : t('schedule.stopTitle', 'Stop Schedule')
        }
        message={
          deleteModal.isStoped
            ? t('schedule.playMessage', 'Are you sure you want to play this schedule.')
            : t('schedule.stopMessage', 'Are you sure you want to stop this schedule? This action cannot be undone.')
        }
        play={deleteModal.isStoped}
      />
    </div>
  )
}