import { useState, useCallback } from 'react'

interface ConfirmState {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
}

const INITIAL: ConfirmState = {
  open: false,
  title: '',
  message: '',
  onConfirm: () => {},
}

/**
 * useConfirm – programmatic confirmation dialog.
 *
 * Usage:
 *   const { confirmState, confirm, closeConfirm } = useConfirm()
 *   // somewhere:
 *   confirm({ title: 'Delete?', message: '...', onConfirm: handleDelete })
 *   // render: <ConfirmModal {...confirmState} onClose={closeConfirm} />
 */
export function useConfirm() {
  const [confirmState, setConfirmState] = useState<ConfirmState>(INITIAL)

  const confirm = useCallback(
    (opts: Omit<ConfirmState, 'open'>) =>
      setConfirmState({ open: true, ...opts }),
    [],
  )

  const closeConfirm = useCallback(
    () => setConfirmState((s) => ({ ...s, open: false })),
    [],
  )

  return { confirmState, confirm, closeConfirm }
}
