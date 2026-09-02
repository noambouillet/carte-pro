import { useState } from 'react'
import Qr from '../components/Qr'
import { Amount, SimulationNotice } from '../components/simulation'
import './Employee.css'
import type { Transaction } from '../types/transaction'

export const transactions: Transaction[] = [
  { date: '28/08/2026', partner: 'Boulangerie Petit Grain', city: 'Lyon 3e', amount: 9.8, status: 'Validée' },
  { date: '27/08/2026', partner: 'Restaurant Le Comptoir Sud', city: 'Lyon 2e', amount: 21.5, status: 'Validée' },
  { date: '26/08/2026', partner: 'Épicerie Marché & Cie', city: 'Lyon 7e', amount: 34.15, status: 'Validée' },
  { date: '25/08/2026', partner: 'Salle de sport Cadence', city: 'Lyon 3e', amount: 45, status: 'Validée' },
  { date: '22/08/2026', partner: 'Librairie du Vieux Pont', city: 'Lyon 1er', amount: 18.9, status: 'Validée' },
  { date: '31/07/2026', partner: 'Boulangerie Petit Grain', city: 'Lyon 3e', amount: 7.4, status: 'Validée' },
  { date: '30/07/2026', partner: 'Restaurant Le Comptoir Sud', city: 'Lyon 2e', amount: 19.2, status: 'Validée' },
  { date: '27/07/2026', partner: 'Épicerie Marché & Cie', city: 'Lyon 7e', amount: 41.05, status: 'Validée' },
  { date: '21/07/2026', partner: 'Salle de sport Cadence', city: 'Lyon 3e', amount: 45, status: 'Validée' },
  { date: '16/07/2026', partner: 'Boulangerie Petit Grain', city: 'Lyon 3e', amount: 6.3, status: 'Validée' },
  { date: '09/07/2026', partner: 'Librairie du Vieux Pont', city: 'Lyon 1er', amount: 12.5, status: 'Validée' },
  { date: '03/07/2026', partner: 'Restaurant Le Comptoir Sud', city: 'Lyon 2e', amount: 23.8, status: 'Validée' },
]

export const euro = (amount: number) =>
  amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })

const PREVIEW = 5

function Employee() {
  const [showQr, setShowQr] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const visible = showAll ? transactions : transactions.slice(0, PREVIEW)

  if (showQr) {
    return (
      <div className="dash-inner dash-body">
        <h1 className="dash-title">Mon QR code de paiement</h1>
        <SimulationNotice />
        <p className="dash-subtitle">
          Présentez ce code au commerçant. Il reste valable 5 minutes et ne peut
          servir qu&apos;une seule fois.
        </p>

        <div className="qr-card">
          <Qr />
          <p className="qr-value">CP-4471-8820-3106</p>
        </div>

        <p>
          <button
            className="action-secondary"
            type="button"
            onClick={() => setShowQr(false)}
          >
            Retour à mon espace
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="dash-inner dash-body">
      <h1 className="dash-title">Bonjour Camille Ferrand</h1>
      <SimulationNotice />

      <div className="dash-grid">
        <section className="balance-card" aria-labelledby="balance-title">
          <h2 className="balance-label" id="balance-title">
            Solde Ticket tout disponible
          </h2>
          <p className="balance-value">
            <Amount>168,40 €</Amount>
          </p>
          <p className="balance-meta">
             31/08/2026 à 09:12
          </p>

          
        </section>

        <aside className="pay-card" aria-labelledby="pay-title">
          <h2 id="pay-title">Payer chez un partenaire</h2>
          <p className="pay-intro">
            Présentez le QR code au commerçant. Il reste valable 5 minutes et ne
            peut servir qu&apos;une seule fois.
          </p>

          <button
            className="pay-primary"
            type="button"
            onClick={() => setShowQr(true)}
          >
            Générer mon QR code de paiement
          </button>
        </aside>
      </div>

      <section className="history" aria-labelledby="history-title">
        <div className="history-head">
          <h2 className="band-title" id="history-title">
            Historique des transactions
          </h2>
          
        </div>

        <p className="history-intro">
          Une transaction validée est définitive : elle ne peut pas être
          annulée.
        </p>

        <div className="history-card">
          <table className="history-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Partenaire</th>
                <th scope="col" className="cell-amount">
                  Montant
                </th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((line) => (
                <tr key={`${line.date}-${line.partner}-${line.amount}`}>
                  <td>{line.date}</td>
                  <td>
                    <span className="history-partner">{line.partner}</span>
                    <span className="history-city">{line.city}</span>
                  </td>
                  <td className="cell-amount">
                    <Amount>− {euro(line.amount)} €</Amount>
                  </td>
                  <td>
                    <span className="status-badge">{line.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="history-footer">
            {visible.length} transactions sur {transactions.length}
            {showAll ? null : (
              <>
                {' — '}
                <button
                  className="band-link"
                  type="button"
                  onClick={() => setShowAll(true)}
                >
                  voir tout l&apos;historique
                </button>
              </>
            )}
          </p>
        </div>
      </section>
    </div>
  )
}

export default Employee
