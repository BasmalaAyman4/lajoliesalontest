// ─── AppointmentDetailModal ───────────────────────────────────────────────────
//
//  Two-tab modal:
//   • "Pricing"  — edit mainServicePrice + manage additionalServices list
//
//  Each section saves independently so a partial failure doesn't lose both.

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { HiTrash, HiPlus } from 'react-icons/hi'
import { Modal, Button } from '@/components/shared'
import type { SalonAppointment } from '../types'
import {
  useUpdateMainServicePriceMutation,
  useUpdateAdditionalServicesMutation,
} from '../services/salonAppointmentApi'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdditionalServiceRow {
  key: string          // local stable key for React list
  salonServiceId: number
  serviceName: string  // display only
  price: number
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface AppointmentDetailModalProps {
  open: boolean
  onClose: () => void
  appointment: SalonAppointment | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
let _key = 0
const nextKey = () => String(++_key)

// ── Component ─────────────────────────────────────────────────────────────────
export default function AppointmentDetailModal({
  open,
  onClose,
  appointment,
}: AppointmentDetailModalProps) {
  const { t } = useTranslation()

  // ── Local form state ─────────────────────────────────────────────────────
  const [mainPrice, setMainPrice] = useState('')
  const [additionalRows, setAdditionalRows] = useState<AdditionalServiceRow[]>([])

  const [updateMainPrice, { isLoading: isSavingMain }] = useUpdateMainServicePriceMutation()
  const [updateAdditional, { isLoading: isSavingAdditional }] = useUpdateAdditionalServicesMutation()

  // Seed state whenever a new appointment is opened
  useEffect(() => {
    if (!open || !appointment) return
    setMainPrice(
      appointment.mainServicePrice != null
        ? String(appointment.mainServicePrice)
        : '',
    )
    setAdditionalRows(
      (appointment.additionalServices ?? []).map((s) => ({
        key: nextKey(),
        salonServiceId: s.salonServiceId,
        serviceName: s.serviceName,
        price: s.price,
      })),
    )
  }, [open, appointment?.appointmentId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    onClose()
  }

  // ── Main price save ──────────────────────────────────────────────────────
  const handleSaveMainPrice = async () => {
    if (!appointment) return
    const parsed = parseFloat(mainPrice)
    if (isNaN(parsed) || parsed < 0) {
      toast.error(t('appointment.invalidPrice', 'Please enter a valid price'))
      return
    }
    try {
      await updateMainPrice({ id: appointment.appointmentId, price: parsed }).unwrap()
      toast.success(t('common.success'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  // ── Additional services ──────────────────────────────────────────────────
  const addRow = useCallback(() => {
    setAdditionalRows((prev) => [
      ...prev,
      { key: nextKey(), salonServiceId: 0, serviceName: '', price: 0 },
    ])
  }, [])

  const removeRow = useCallback((key: string) => {
    setAdditionalRows((prev) => prev.filter((r) => r.key !== key))
  }, [])

  const updateRow = useCallback(
    (key: string, field: 'salonServiceId' | 'price', value: number) => {
      setAdditionalRows((prev) =>
        prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
      )
    },
    [],
  )

  const handleSaveAdditional = async () => {
    if (!appointment) return

    // Validate rows
    const invalid = additionalRows.some((r) => r.salonServiceId <= 0 || r.price < 0)
    if (invalid) {
      toast.error(t('appointment.invalidAdditionalService', 'Each service needs a valid ID and price'))
      return
    }

    try {
      await updateAdditional({
        id: appointment.appointmentId,
        items: additionalRows.map(({ salonServiceId, price }) => ({
          salonServiceId,
          price,
        })),
      }).unwrap()
      toast.success(t('common.success'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const additionalTotal = additionalRows.reduce((sum, r) => sum + (r.price || 0), 0)
  const mainPriceNum = parseFloat(mainPrice) || 0
  const expectedTotal = mainPriceNum + additionalTotal

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('appointment.editPricing', 'Edit Pricing')}
      size="md"
      footer={
        <Button variant="secondary" onClick={handleClose}>
          {t('common.close', 'Close')}
        </Button>
      }
    >
      {appointment && (
        <div className="flex flex-col gap-6">
          {/* Meta */}
          <p className="text-xs text-[var(--text-muted)]">
            #{appointment.appointmentId} · {appointment.clientName} · {appointment.serviceName}
          </p>

          {/* ── Main Service Price ───────────────────────────────────────── */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {t('appointment.mainServicePrice', 'Main Service Price')}
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={mainPrice}
                  onChange={(e) => setMainPrice(e.target.value)}
                  placeholder="0.00"
                  className={[
                    'w-full px-3 py-2 pr-12 rounded-[var(--radius)] border text-sm',
                    'border-[var(--border)] bg-[var(--bg-input,var(--bg-hover))]',
                    'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
                    'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent',
                    'transition-shadow',
                  ].join(' ')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                  EGP
                </span>
              </div>
              <Button
                onClick={handleSaveMainPrice}
                loading={isSavingMain}
                disabled={isSavingMain}
                className="shrink-0"
              >
                {t('common.save')}
              </Button>
            </div>
          </section>

          {/* Divider */}
          <hr className="border-[var(--border)]" />

          {/* ── Additional Services ──────────────────────────────────────── */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {t('appointment.additionalServices', 'Additional Services')}
              </h3>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
              >
                <HiPlus size={14} />
                {t('common.add', 'Add')}
              </button>
            </div>

            {additionalRows.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-2">
                {t('appointment.noAdditionalServices', 'No additional services. Click Add to include one.')}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_120px_36px] gap-2 px-1">
                  <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">
                    {t('appointment.serviceId', 'Service ID')}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">
                    {t('appointment.price', 'Price (EGP)')}
                  </span>
                  <span />
                </div>

                {additionalRows.map((row) => (
                  <div key={row.key} className="grid grid-cols-[1fr_120px_36px] gap-2 items-center">
                    {/* Service ID */}
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        value={row.salonServiceId || ''}
                        onChange={(e) =>
                          updateRow(row.key, 'salonServiceId', parseInt(e.target.value) || 0)
                        }
                        placeholder={t('appointment.serviceIdPlaceholder', 'e.g. 14')}
                        className={[
                          'w-full px-3 py-2 rounded-[var(--radius)] border text-sm',
                          'border-[var(--border)] bg-[var(--bg-input,var(--bg-hover))]',
                          'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
                          'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent',
                        ].join(' ')}
                      />
                      {/* Show service name as tooltip if available */}
                      {row.serviceName && (
                        <span className="absolute -bottom-4 left-0 text-[10px] text-[var(--accent)] truncate max-w-full">
                          {row.serviceName}
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.price || ''}
                      onChange={(e) =>
                        updateRow(row.key, 'price', parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                      className={[
                        'w-full px-3 py-2 rounded-[var(--radius)] border text-sm',
                        'border-[var(--border)] bg-[var(--bg-input,var(--bg-hover))]',
                        'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
                        'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent',
                      ].join(' ')}
                    />

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="w-9 h-9 flex items-center justify-center rounded-[var(--radius)]
                        text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <HiTrash size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Save additional */}
            <div className="flex items-center justify-between pt-1 mt-1 border-t border-[var(--border)]">
              <span className="text-xs text-[var(--text-muted)]">
                {t('appointment.additionalTotal', 'Additional total')}:{' '}
                <strong className="text-[var(--text-primary)]">
                  {additionalTotal.toFixed(2)} EGP
                </strong>
              </span>
              <Button
                onClick={handleSaveAdditional}
                loading={isSavingAdditional}
                disabled={isSavingAdditional}
              >
                {t('common.save')}
              </Button>
            </div>
          </section>

          {/* ── Expected total summary ───────────────────────────────────── */}
          <div className="rounded-[var(--radius)] bg-[var(--bg-hover)] px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              {t('appointment.expectedTotal', 'Expected Total')}
            </span>
            <span className="text-base font-semibold text-[var(--text-primary)]">
              {expectedTotal.toFixed(2)} EGP
            </span>
          </div>
        </div>
      )}
    </Modal>
  )
}