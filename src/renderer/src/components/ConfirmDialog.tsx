import { AlertTriangle } from 'lucide-react'
import { Button, Modal } from './ui'

/**
 * Diálogo de confirmação para ações destrutivas (limpar/excluir). Segunda
 * confirmação antes de aprovar — evita apagar dados sem querer.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} maxWidth="max-w-md">
      <div className="p-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blood-950/40 text-blood-400">
            <AlertTriangle size={20} />
          </span>
          <h3 className="display text-2xl text-zinc-100">{title}</h3>
        </div>
        <p className="text-sm leading-relaxed text-zinc-400">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
