import type { ReactNode } from 'react'
import './Modal.css'

type ModalProps = {
  title: string
  children: ReactNode
  onClose: () => void
  closeLabel?: string
  onConfirm?: () => void
  confirmLabel?: string
  confirmDisabled?: boolean
}

function Modal({
  title,
  children,
  onClose,
  closeLabel = 'Compris',
  onConfirm,
  confirmLabel = 'Confirmer',
  confirmDisabled = false,
}: ModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="modal-title">{title}</h2>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          {onConfirm && (
            <button className="secondary-button" type="button" onClick={onClose}>
              {closeLabel}
            </button>
          )}
          <button
            className="primary-button"
            type="button"
            disabled={onConfirm ? confirmDisabled : false}
            onClick={onConfirm ?? onClose}
          >
            {onConfirm ? confirmLabel : closeLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Modal
