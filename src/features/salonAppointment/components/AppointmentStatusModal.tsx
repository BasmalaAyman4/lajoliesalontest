// ─── AppointmentStatusModal ───────────────────────────────────────────────────
//
//  Handles appointment status transitions in a proper shared Modal.
//  Pass `appointment` to open; it fetches allowed transitions automatically.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Button } from '@/components/shared'
import type { SalonAppointment, AllowedTransition } from '../types'
import {
  useGetAllowedTransitionsQuery,
  useChangeAppointmentStateMutation,
} from '../services/salonAppointmentApi'
import { toast } from 'sonner'

// ── Status style map ──────────────────────────────────────────────────────────
function getStatusStyle(statusId: number): { bg: string; text: string } {
  switch (statusId) {
    case 3:  return { bg: 'bg-yellow-50',  text: 'text-yellow-700' }
    case 4:  return { bg: 'bg-green-50',   text: 'text-green-700'  }
    case 5:  return { bg: 'bg-red-50',     text: 'text-red-700'    }
    case 6:  return { bg: 'bg-orange-50',  text: 'text-orange-700' }
    case 9:  return { bg: 'bg-gray-100',   text: 'text-gray-500'   }
    default: return { bg: 'bg-[var(--bg-hover)]', text: 'text-[var(--text-muted)]' }
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface AppointmentStatusModalProps {
  open: boolean
  onClose: () => void
  appointment: SalonAppointment | null
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AppointmentStatusModal({
  open,
  onClose,
  appointment,
}: AppointmentStatusModalProps) {
  const { t } = useTranslation()
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null)

  const { data: transitions = [], isFetching } = useGetAllowedTransitionsQuery(
    appointment?.appointmentId ?? 0,
    { skip: !appointment || !open },
  )

  const [changeState, { isLoading: isChanging }] = useChangeAppointmentStateMutation()

  // Reset selection whenever modal opens for a (possibly different) appointment
  useEffect(() => {
    if (open) setSelectedStatus(null)
  }, [open, appointment?.appointmentId])

  const handleClose = () => {
    setSelectedStatus(null)
    onClose()
  }

  const handleConfirm = async () => {
    if (!appointment || selectedStatus === null) return
    try {
      await changeState({ id: appointment.appointmentId, status: selectedStatus }).unwrap()
      toast.success(t('common.success'))
      handleClose()
    } catch {
      toast.error(t('common.error'))
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('appointment.changeStatus', 'Change Status')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isChanging}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            loading={isChanging}
            disabled={selectedStatus === null || transitions.length === 0}
          >
            {t('common.save')}
          </Button>
        </>
      }
    >
      {/* Appointment meta */}
      {appointment && (
        <p className="text-xs text-[var(--text-muted)] mb-4">
          #{appointment.appointmentId} · {appointment.clientName}
        </p>
      )}

      {/* Transitions */}
      {isFetching ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-10 rounded-[var(--radius)] bg-[var(--bg-hover)] animate-pulse"
            />
          ))}
        </div>
      ) : transitions.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">
          {t('appointment.noTransitions', 'No status changes available for this appointment.')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[var(--text-muted)] mb-1">
            {t('appointment.selectNewStatus', 'Select the new status:')}
          </p>
          {transitions.map((tr: AllowedTransition) => {
            const style = getStatusStyle(tr.id)
            const isSelected = selectedStatus === tr.id
            return (
              <button
                key={tr.id}
                type="button"
                onClick={() => setSelectedStatus(tr.id)}
                className={[
                  'w-full text-left px-4 py-2.5 rounded-[var(--radius)] text-sm font-medium transition-all',
                  'border-2',
                  isSelected
                    ? `${style.bg} ${style.text} border-current`
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                ].join(' ')}
              >
                {tr.name}
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}