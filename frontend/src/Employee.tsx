import { useState } from 'react'
import Qr from './Qr.tsx'
import { Amount, SimulationNotice } from './simulation.tsx'
import { euro, transactions } from './transactions.tsx'
import './Employee.css'

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
