import type { ReactNode } from 'react'
import './Modal.css'

type ModalProps = {
  title: string
  children: ReactNode
  onClose: () => void
  closeLabel?: string
}

function Modal({ title, children, onClose, closeLabel = 'Compris' }: ModalProps) {
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
        <button className="primary-button" type="button" onClick={onClose}>
          {closeLabel}
        </button>
      </div>
    </div>
  )
}

export default Modal
