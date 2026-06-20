// ─── AppointmentQrModal ───────────────────────────────────────────────────────
//
//  Displays the existing qrToken as a scannable QR code.
//  No check-in action — the token is already on the appointment.
//  Only rendered when qrToken is not null (enforced by the page).
//
//  Usage:
//    <AppointmentQrModal
//      open={qrModal.open}
//      onClose={() => setQrModal(CLOSED)}
//      appointment={qrModal.appointment}
//    />

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Button } from '@/components/shared'
import type { SalonAppointment } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(a: SalonAppointment) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${a.day} ${months[a.month - 1]} ${a.year}`
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface AppointmentQrModalProps {
  open: boolean
  onClose: () => void
  appointment: SalonAppointment | null
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AppointmentQrModal({
  open,
  onClose,
  appointment,
}: AppointmentQrModalProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const token     = appointment?.qrToken        ?? null
  const isExpired = appointment?.isQrTokenExpired ?? false

  // Draw QR code onto canvas whenever modal opens with a valid token
  useEffect(() => {
    if (!open || !token || !canvasRef.current) return

    import('qrcode')
      .then((QRCode) => {
        if (!canvasRef.current) return
        QRCode.toCanvas(canvasRef.current, token, {
          width: 240,
          margin: 2,
          color: {
            dark:  '#111827',
            light: '#ffffff',
          },
        })
      })
      .catch(() => {
        // Fallback: show token text if library fails
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx || !canvasRef.current) return
        canvasRef.current.width  = 240
        canvasRef.current.height = 240
        ctx.fillStyle = '#f3f4f6'
        ctx.fillRect(0, 0, 240, 240)
        ctx.fillStyle = '#374151'
        ctx.font = '11px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('QR unavailable', 120, 110)
        ctx.fillText(token.slice(0, 20) + '…', 120, 130)
      })
    
  }, [open, token])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('appointment.checkInQr', 'Check-In QR Code')}
      size="sm"
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('common.close', 'Close')}
        </Button>
      }
    >
      {appointment && (
        <div className="flex flex-col items-center gap-4">
          {/* Appointment meta */}
          <div className="w-full text-center">
            <p className="font-medium text-[var(--text-primary)]">
              {appointment.clientName}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              #{appointment.appointmentId} · {appointment.serviceName}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {formatDate(appointment)} · {appointment.timeFrom} – {appointment.timeTo}
            </p>
          </div>

          {/* QR code — token is guaranteed non-null when this modal is opened */}
          {token ? (
            <div className="flex flex-col items-center gap-3">
              {/* Canvas */}
              <div
                className={[
                  'p-3 rounded-xl border-2',
                  isExpired
                    ? 'border-[var(--danger,#ef4444)] opacity-50'
                    : 'border-[var(--accent)]',
                ].join(' ')}
              >
                <canvas ref={canvasRef} className="block rounded" />
              </div>

              {/* Expiry badge */}
              {isExpired ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  {t('appointment.qrExpired', 'QR code expired')}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  {t('appointment.qrValid', 'Ready to scan')}
                </div>
              )}

              {/* Raw token text (manual fallback) */}
              <p className="text-[10px] font-mono text-[var(--text-muted)] break-all text-center max-w-[240px]">
                {token}
              </p>
            </div>
          ) : (
            /* Shouldn't reach here since page guards hasQr, but just in case */
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                {t('appointment.noQrToken', 'No QR token available for this appointment.')}
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}