// ─── ServiceDiscountDetailsModal ──────────────────────────────────────────────
//
//  Shows the detail rows of a single discount.
//  Each row has a "Stop" action to call stopDetails/:id.

import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { HiStop } from 'react-icons/hi'
import { Modal, Button, ConfirmModal, StatusBadge } from '@/components/shared'
import type { ServiceDiscount, ServiceDiscountDetail } from '../types'
import { useStopDiscountDetailMutation } from '../services/serviceDiscountApi'

interface ServiceDiscountDetailsModalProps {
  open: boolean
  onClose: () => void
  discount: ServiceDiscount | null
}

export default function ServiceDiscountDetailsModal({
  open,
  onClose,
  discount,
}: ServiceDiscountDetailsModalProps) {
  const { t } = useTranslation()
  const [stopDetail, { isLoading: isStopping }] = useStopDiscountDetailMutation()

  const [confirmStop, setConfirmStop] = useState<ServiceDiscountDetail | null>(null)

  const handleStopDetail = async () => {
    if (!confirmStop) return
    try {
      await stopDetail(confirmStop.id).unwrap()
      toast.success(t('discount.detailStopped', 'Detail stopped'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setConfirmStop(null)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={t('discount.detailsTitle', 'Discount Details')}
        size="md"
        footer={
          <Button variant="secondary" onClick={onClose}>
            {t('common.close', 'Close')}
          </Button>
        }
      >
        {discount && (
          <div className="flex flex-col gap-4">
            {/* Date range summary */}
            <div className="rounded-[var(--radius-lg)] bg-[var(--bg-hover)] px-4 py-3 flex items-center gap-6">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-[var(--text-muted)]">
                  {t('discount.dateFrom', 'Start Date')}
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {discount.dateFrom.slice(0, 10)}
                </span>
              </div>
              <span className="text-[var(--text-muted)]">→</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-[var(--text-muted)]">
                  {t('discount.toDate', 'End Date')}
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {discount.toDate.slice(0, 10)}
                </span>
              </div>
              <div className="ml-auto">
                <StatusBadge
                  approved={!discount.isStopped}
                  approvedLabel={t('common.active', 'Active')}
                  pendingLabel={t('discount.stopped', 'Stopped')}
                />
              </div>
            </div>

            {/* Details table */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--bg-hover)] border-b border-[var(--border)]">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)]">
                      {t('discount.service', 'Service')}
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--text-muted)]">
                      {t('discount.discountValue', 'Discount')}
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-[var(--text-muted)]">
                      {t('common.status', 'Status')}
                    </th>
                    <th className="px-2 py-2.5 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {discount.details.map((detail) => (
                    <tr
                      key={detail.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <td className="px-4 py-3 text-[var(--text-primary)]">
                        {detail.serviceNameEn}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--accent)]">
                        {detail.discountValue}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge
                          approved={!detail.isStopped}
                          approvedLabel={t('common.active', 'Active')}
                          pendingLabel={t('discount.stopped', 'Stopped')}
                        />
                      </td>
                      <td className="px-2 py-3">
                        {!detail.isStopped && !discount.isStopped && (
                          <button
                            type="button"
                            title={t('discount.stopDetail', 'Stop this detail')}
                            onClick={() => setConfirmStop(detail)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center
                              text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50
                              transition-colors"
                          >
                            <HiStop size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm stop detail */}
      <ConfirmModal
        open={Boolean(confirmStop)}
        onClose={() => setConfirmStop(null)}
        onConfirm={handleStopDetail}
        loading={isStopping}
        title={t('discount.stopDetailTitle', 'Stop Discount Detail')}
        message={t(
          'discount.stopDetailMessage',
          'Are you sure you want to stop the discount for this service? This cannot be undone.',
        )}
      />
    </>
  )
}