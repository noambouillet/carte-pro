import type { ReactNode } from 'react'
import './simulation.css'

export function SimulationNotice() {
  return (
    <p className="simulation-notice" role="note">
      <strong>Simulation</strong> — aucune valeur monétaire réelle ne circule.
      Les montants suivis d&apos;un astérisque sont fictifs et aucun paiement
      n&apos;est exécuté.
    </p>
  )
}

export function Amount({
  children,
  showLabel = true,
}: {
  children: ReactNode
  showLabel?: boolean
}) {
  return (
    <>
      {children}
      <span className="sim-mark">*</span>
      {showLabel ? <span className="sim-label">montant fictif</span> : null}
    </>
  )
}
