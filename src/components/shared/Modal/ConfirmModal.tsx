import Modal from './index'
import { useTranslation } from 'react-i18next'
import { HiExclamation, HiPlay } from 'react-icons/hi'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  loading?: boolean
  play?: boolean
}

/**
 * ConfirmModal – standardised delete/confirm dialog.
 * Used with useConfirm() hook.
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading,
  play,
}: ConfirmModalProps) {
  const { t } = useTranslation()

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-[var(--radius)] border border-[var(--border)]
              text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]
              transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-[var(--radius)] text-white
              text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 ${play ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`}
          >
            {loading ? t('common.loading') : play ? t('common.play') : t('common.delete')}
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className={`w-12 h-12 rounded-full  flex items-center justify-center ${play ? 'bg-[var(--success)]/10' : 'bg-danger-500/10'}`}>
          {play ? <HiPlay size={24} className="text-[var(--success)]" /> : <HiExclamation size={24} className="text-[var(--danger)]" />}
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">
            {title || t('common.confirm')}
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {message || play ? t('common.playConfirm') : t('common.deleteConfirm')}
          </p>
        </div>
      </div>
    </Modal>
  )
}
