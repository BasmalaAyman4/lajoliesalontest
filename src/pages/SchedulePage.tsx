import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { HiPlus, HiCalendar, HiViewList } from 'react-icons/hi'

import Modal from '@/components/shared/Modal'
import { ConfirmModal } from '@/components/shared/Modal/ConfirmModal'
import Table, { type Column } from '@/components/shared/Table'
import Button from '@/components/shared/Button'

import ScheduleCalendar from '@/features/schedule/ScheduleCalendar'
import EventForm from '@/features/schedule/EventForm'
import EventFilters from '@/features/schedule/EventFilters'

import {
  useGetScheduleEventsQuery,
  useDeleteScheduleEventMutation,
  useGetCategoryOptionsQuery,
} from '@/services/scheduleApi'
import { useFilters } from '@/hooks/useFilters'
import { useConfirm } from '@/hooks/useConfirm'
import type { ScheduleEvent } from '@/types'
import { cn } from '@/lib/cn'

type ViewMode = 'calendar' | 'table'

/**
 * SchedulePage – full CRUD page for the Schedule controller.
 *
 * Architecture:
 *  useFilters()           → filter/page state → passed to RTK Query
 *  useGetScheduleEvents() → cached, auto-refetched list
 *  useConfirm()           → wires delete confirmation modal
 *  ViewMode toggle        → switch between Calendar and Table views
 */
export default function SchedulePage() {
  const { t } = useTranslation()

  // ── View mode ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<ScheduleEvent | null>(null)
  const [defaultDates, setDefaultDates] = useState({ start: '', end: '' })

  // ── Filters ────────────────────────────────────────────────────────────────
  const { filters, setFilter, setPage, setLimit, resetFilters } = useFilters<
    typeof filters & { categoryId: string }
  >({ categoryId: '' })

  // ── Data ───────────────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isFetching,
  } = useGetScheduleEventsQuery(filters)

  const { data: categoryOptions = [] } = useGetCategoryOptionsQuery()

  const [deleteEvent, { isLoading: deleting }] = useDeleteScheduleEventMutation()
  const { confirmState, confirm, closeConfirm } = useConfirm()

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditEvent(null)
    setDefaultDates({ start: '', end: '' })
    setFormOpen(true)
  }

  const openCreateFromCalendar = (start: string, end: string) => {
    setEditEvent(null)
    setDefaultDates({ start, end })
    setFormOpen(true)
  }

  const openEdit = (event: ScheduleEvent) => {
    setEditEvent(event)
    setFormOpen(true)
  }

  const handleDelete = (id: string) => {
    confirm({
      title: t('schedule.deleteEvent'),
      message: t('common.deleteConfirm'),
      onConfirm: async () => {
        try {
          await deleteEvent(id).unwrap()
          toast.success(t('common.success'))
          closeConfirm()
        } catch {
          toast.error(t('common.error'))
        }
      },
    })
  }

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns: Column<ScheduleEvent>[] = [
    {
      key: 'title',
      label: t('schedule.eventTitle'),
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: row.color ?? 'var(--accent)' }}
          />
          <span className="font-medium">{row.title}</span>
        </div>
      ),
    },
    {
      key: 'start',
      label: t('schedule.startDate'),
      sortable: true,
      render: (row) => new Date(row.start).toLocaleString(),
    },
    {
      key: 'end',
      label: t('schedule.endDate'),
      render: (row) => (row.end ? new Date(row.end).toLocaleString() : '—'),
    },
    {
      key: 'location',
      label: t('schedule.location'),
      render: (row) => row.location ?? '—',
    },
    {
      key: 'actions',
      label: t('common.actions'),
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(row)}
          >
            {t('common.edit')}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(row.id)}
          >
            {t('common.delete')}
          </Button>
        </div>
      ),
    },
  ]

  const events = data?.data ?? []
  const loading = isLoading || isFetching

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {t('schedule.title')}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {data?.total ?? 0} {t('common.total')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] p-1 gap-1">
            {(
              [
                { mode: 'calendar', Icon: HiCalendar },
                { mode: 'table', Icon: HiViewList },
              ] as const
            ).map(({ mode, Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === mode
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                )}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>

          <Button leftIcon={<HiPlus />} onClick={openCreate}>
            {t('schedule.addEvent')}
          </Button>
        </div>
      </div>

      {/* Filters (visible in table view) */}
      {viewMode === 'table' && (
        <div className="bg-[var(--bg-card)] rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
          <EventFilters
            search={filters.search ?? ''}
            onSearchChange={(v) => setFilter('search', v)}
            categoryId={filters.categoryId ?? ''}
            onCategoryChange={(v) => setFilter('categoryId', v as string)}
            categoryOptions={categoryOptions}
            onReset={resetFilters}
          />
        </div>
      )}

      {/* Calendar view */}
      {viewMode === 'calendar' && (
        <ScheduleCalendar
          events={events}
          onDateClick={openCreateFromCalendar}
          onEventClick={openEdit}
        />
      )}

      {/* Table view */}
      {viewMode === 'table' && (
        <Table
          columns={columns}
          data={events}
          rowKey="id"
          loading={loading}
          total={data?.total}
          page={filters.page}
          limit={filters.limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      {/* Create / Edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editEvent ? t('schedule.editEvent') : t('schedule.addEvent')}
        size="lg"
      >
        <EventForm
          event={editEvent}
          defaultStart={defaultDates.start}
          defaultEnd={defaultDates.end}
          onSuccess={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      {/* Delete confirmation */}
      <ConfirmModal
        open={confirmState.open}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        loading={deleting}
      />
    </div>
  )
}
