// ─── AppointmentCheckInModal ──────────────────────────────────────────────────
//
//  Unified check-in flow for Confirmed (statusId === 4) appointments:
//
//  Step 1 — "Ready to Check In?"
//    • Shows appointment meta
//    • Fetches allowed transitions, finds the check-in transition automatically
//    • "Check In" button calls changeAppointmentState
//
//  Step 2 — QR Code Display (after successful state change)
//    • Re-fetches the appointment to get the fresh qrToken
//    • Renders the QR code for the client to scan
//    • Falls back gracefully if token is still null
//
//  Usage:
//    <AppointmentCheckInModal
//      open={checkInModal.open}
//      onClose={() => setCheckInModal(CLOSED)}
//      appointment={checkInModal.appointment}
//    />

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Button } from '@/components/shared'
import type { SalonAppointment } from '../types'
import {
  useGetAllowedTransitionsQuery,
  useChangeAppointmentStateMutation,
  useGetSalonAppointmentByIdQuery,  // ← see note below *
} from '../services/salonAppointmentApi'
import { toast } from 'sonner'
import { getApiError } from '@/services/apiHelpers'

// * If you don't have a getById query yet, add one to salonAppointmentApi:
//
//   getSalonAppointmentById: builder.query<SalonAppointment, number>({
//     query: (id) => `/api/salon/SalonAppointment/${id}`,
//     providesTags: (_r, _e, id) => [{ type: 'SalonAppointment', id }],
//   }),
//
//  Then export `useGetSalonAppointmentByIdQuery` alongside the others.
//  Alternatively, rely on RTK Query cache invalidation: after changeAppointmentState
//  invalidates the LIST tag, the parent page re-fetches and passes the updated
//  appointment down — in that case skip the byId query entirely (see OPTION B).

// ── Types ─────────────────────────────────────────────────────────────────────
type Step = 'confirm' | 'qr'

interface Props {
  open: boolean
  onClose: () => void
  appointment: SalonAppointment | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(a: SalonAppointment) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${a.day} ${months[a.month - 1]} ${a.year}`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AppointmentCheckInModal({ open, onClose, appointment }: Props) {
  const { t } = useTranslation()

  const [step, setStep]                   = useState<Step>('confirm')
  const [appointmentId, setAppointmentId] = useState<number | null>(null)
  const [skipById, setSkipById]           = useState(true)

  // Reset on open
  useEffect(() => {
    if (open && appointment) {
      setStep('confirm')
      setAppointmentId(appointment.appointmentId)
      setSkipById(true)
    }
  }, [open, appointment?.appointmentId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Allowed transitions (to auto-detect the check-in transition ID) ──────
  const { data: transitions = [], isFetching: isFetchingTransitions } =
    useGetAllowedTransitionsQuery(appointment?.appointmentId ?? 0, {
      skip: !appointment || !open || step !== 'confirm',
    })

  // ── Mutation ─────────────────────────────────────────────────────────────
  const [changeState, { isLoading: isChanging }] = useChangeAppointmentStateMutation()

  // ── Fetch refreshed appointment after check-in to get qrToken ────────────
  // OPTION A — dedicated getById endpoint (preferred)
  const { data: refreshedAppointment, isFetching: isRefreshing } =
    useGetSalonAppointmentByIdQuery(appointmentId ?? 0, {
      skip: skipById || appointmentId === null,
    })

  // The token we'll render: prefer refreshed data, fall back to prop
  const displayAppointment = refreshedAppointment ?? appointment
  const token     = displayAppointment?.qrToken ?? null
  const isExpired = displayAppointment?.isQrTokenExpired ?? false

  // ── Canvas ref for QR rendering ──────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (step !== 'qr' || !token || isRefreshing) return
    if (!canvasRef.current) return

    import('qrcode')
      .then((QRCode) => {
        if (!canvasRef.current) return
        QRCode.toCanvas(canvasRef.current, token, {
          width: 240,
          margin: 2,
          color: { dark: '#111827', light: '#ffffff' },
        })
      })
      .catch(() => {
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
  }, [step, token, isRefreshing])

  // ── Detect check-in transition ────────────────────────────────────────────
  // Adjust the name filter to match whatever your API returns
  // e.g. "Check In", "Checked In", "CheckIn" — case-insensitive match
  const checkInTransition = transitions.find((tr) =>
    /check.?in/i.test(tr.name),
  )

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    if (!appointment || !checkInTransition) return
    try {
      await changeState({
        id: appointment.appointmentId,
        status: checkInTransition.id,
      }).unwrap()

      // Trigger the byId refetch to get the fresh qrToken
      setSkipById(false)
      setStep('qr')
      toast.success(t('appointment.checkInSuccess', 'Checked in successfully'))
    } catch (error) {
        toast.error(getApiError(error, t('common.error')))
            }
  }

  const handleClose = () => {
    setStep('confirm')
    setSkipById(true)
    onClose()
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        step === 'confirm'
          ? t('appointment.checkIn', 'Check In')
          : t('appointment.checkInQr', 'Check-In QR Code')
      }
      size="sm"
      footer={
        step === 'confirm' ? (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={isChanging}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleCheckIn}
              loading={isChanging}
              disabled={
                isChanging ||
                isFetchingTransitions ||
                !checkInTransition
              }
            >
              {t('appointment.confirmCheckIn', 'Check In')}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={handleClose}>
            {t('common.close', 'Close')}
          </Button>
        )
      }
    >
      {appointment && (
        <>
          {/* ── Step 1: Confirm ─────────────────────────────────────────── */}
          {step === 'confirm' && (
            <div className="flex flex-col gap-4">
              {/* Meta */}
              <div className="rounded-[var(--radius)] bg-[var(--bg-hover)] px-4 py-3 flex flex-col gap-1">
                <p className="font-medium text-[var(--text-primary)]">
                  {appointment.clientName}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  #{appointment.appointmentId} · {appointment.serviceName}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {formatDate(appointment)} · {appointment.timeFrom} – {appointment.timeTo}
                </p>
              </div>

              {/* Transitions loading */}
              {isFetchingTransitions ? (
                <div className="h-8 rounded-[var(--radius)] bg-[var(--bg-hover)] animate-pulse" />
              ) : !checkInTransition ? (
                <p className="text-sm text-[var(--danger,#ef4444)] text-center py-2">
                  {t(
                    'appointment.noCheckInTransition',
                    'Check-in is not available for this appointment.',
                  )}
                </p>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  {t(
                    'appointment.checkInConfirmText',
                    'This will mark the appointment as checked in and generate a QR code for the client.',
                  )}
                </p>
              )}
            </div>
          )}

          {/* ── Step 2: QR Code ─────────────────────────────────────────── */}
          {step === 'qr' && (
            <div className="flex flex-col items-center gap-4">
              {/* Meta */}
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

              {/* Loading state while fetching QR token */}
              {isRefreshing ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-[240px] h-[240px] rounded-xl bg-[var(--bg-hover)] animate-pulse" />
                  <p className="text-xs text-[var(--text-muted)]">
                    {t('appointment.generatingQr', 'Generating QR code…')}
                  </p>
                </div>
              ) : token ? (
                <div className="flex flex-col items-center gap-3">
                  {/* QR canvas */}
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

                  {/* Status badge */}
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

                  {/* Token text fallback */}
                  <p className="text-[10px] font-mono text-[var(--text-muted)] break-all text-center max-w-[240px]">
                    {token}
                  </p>
                </div>
              ) : (
                /* No token yet — API may generate it async */
                <div className="py-6 text-center flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-500 text-2xl">
                    ⏳
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">
                    {t(
                      'appointment.qrPending',
                      'QR code is being generated. Please close and reopen to check again.',
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}