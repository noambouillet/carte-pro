import { useCallback, useEffect, useState } from 'react'
import Qr from '../components/Qr'
import { Amount, SimulationNotice } from '../components/Simulation'
import './Employee.css'
import './Partner.css'
import Network from './Network'

import {
  getEmployeeBalance, getEmployeeTransactions, generateEmployeeQrCode,
  saveEmployeeBalance, getCachedEmployeeBalance, type EmployeeTransaction
} from '../api/Employee'
import { getMe, type EmployeeMe } from '../api/Auth'
import { getApiError } from '../api/Errors'

export const euro = (cents: number) => (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })

const formatDateFr = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const PREVIEW = 5
const tabs = ['Tableau de bord', 'Réseau des partenaires']

function Employee() {
  const [profile, setProfile] = useState<EmployeeMe['employee'] | null>(null)
  const [balanceCents, setBalanceCents] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<EmployeeTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [degradedMode, setDegradedMode] = useState(false)
  const [cachedAt, setCachedAt] = useState<string | null>(null)

  const [showQr, setShowQr] = useState(false)
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)

  const [showAll, setShowAll] = useState(false)
  const [tab, setTab] = useState(tabs[0])

  const loadData = useCallback(async () => {
    try {
      try {
        const balance = await getEmployeeBalance()
        setBalanceCents(balance.balanceCents)
        saveEmployeeBalance(balance.balanceCents)
        setDegradedMode(false)
      } catch {
        const cached = getCachedEmployeeBalance()
        if (cached) {
          setBalanceCents(cached.balanceCents)
          setDegradedMode(true)
          setCachedAt(cached.cachedAt)
        } else {
          setError('Impossible de charger votre solde.')
        }
      }

      try {
        const transaction = await getEmployeeTransactions()
        setTransactions(transaction.transactions)
      } catch {
      }
    } catch (err) {
      setError(getApiError(err).message ?? 'Impossible de charger vos données.')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const me = await getMe()

        if (cancelled) return
        if (me.role !== 'employee') {
          setError('Compte non employé.')
          setLoading(false)
          return
        }

        setProfile(me.employee)
        await loadData()
      } catch (err) {
        if (!cancelled) {
          setError(getApiError(err).message ?? 'Impossible de charger vos données.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [loadData])

  const handleCloseQr = useCallback(async () => {
    setShowQr(false)
    await loadData()
  }, [loadData])

  const visible = showAll ? transactions : transactions.slice(0, PREVIEW)

  const [, forceTick] = useState(0)
  useEffect(() => {
    if (!showQr || !qrExpiresAt)
      return
    const id = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [showQr, qrExpiresAt])

  const handleGenerateQr = async () => {
    setQrLoading(true)
    setQrError(null)
    try {
      const { token, expiresAt } = await generateEmployeeQrCode()
      setQrToken(token)
      setQrExpiresAt(expiresAt)
      setShowQr(true)
    } catch (err) {
      setQrError(getApiError(err).message ?? 'Impossible de générer le QR code.')
    } finally {
      setQrLoading(false)
    }
  }

  const renderTabs = () => (
    <nav className="dash-tabs" aria-label="Sections de l'espace employé">
      {tabs.map((item) => (
        <button
          key={item}
          className={item === tab ? 'dash-tab dash-tab-active' : 'dash-tab'}
          type="button"
          aria-current={item === tab ? 'page' : undefined}
          onClick={() => setTab(item)}
        >
          {item}
        </button>
      ))}
    </nav>
  )

  if (loading) {
    return (
      <>
        {renderTabs()}
        <div className="dash-inner dash-body">
          <p>Chargement…</p>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        {renderTabs()}
        <div className="dash-inner dash-body">
          <p role="alert">{error}</p>
        </div>
      </>
    )
  }

  if (tab === tabs[1]) {
    return (
      <>
        {renderTabs()}
        <Network establishment={profile ? `${profile.firstName} ${profile.lastName}` : ''} />
      </>
    )
  }

  if (showQr) {
    return (
      <>
        {renderTabs()}
        <div className="dash-inner dash-body">
          <h1 className="dash-title">Mon QR code de paiement</h1>
          <SimulationNotice />
          <p className="dash-subtitle">
            Présentez ce code au commerçant. Il reste valable 5 minutes et ne peut
            servir qu'une seule fois.
          </p>

          <div className="qr-card">
            <Qr value={qrToken ?? ''} />
          </div>

          <p>
            <button
              className="action-secondary"
              type="button"
              onClick={handleCloseQr}
            >
              Retour à mon espace
            </button>
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      {renderTabs()}

      <div className="dash-inner dash-body">
        <h1 className="dash-title">
          Bonjour {profile ? `${profile.firstName} ${profile.lastName}` : ''}
        </h1>
        <SimulationNotice />
        {degradedMode && (
          <div className="offline-notice" role="status">
            <strong>Mode dégradé</strong>
            <span>
              Solde affiché depuis la dernière synchronisation
              {cachedAt ? ` du ${new Date(cachedAt).toLocaleString('fr-FR')}` : ''}.
            </span>
          </div>
        )}

        <div className="dash-grid">
          <section className="balance-card" aria-labelledby="balance-title">
            <h2 className="balance-label" id="balance-title">
              Solde Carte Pro disponible
            </h2>
            <p className="balance-value">
              <Amount>{balanceCents !== null ? `${euro(balanceCents)} €` : '…'}</Amount>
            </p>
          </section>

          <aside className="pay-card" aria-labelledby="pay-title">
            <h2 id="pay-title">Payer chez un partenaire</h2>
            <p className="pay-intro">
              Présentez le QR code au commerçant. Il reste valable 5 minutes et ne
              peut servir qu'une seule fois.
            </p>

            {qrError && <p role="alert">{qrError}</p>}
            <button
              className="pay-primary"
              type="button"
              onClick={handleGenerateQr}
              disabled={qrLoading || degradedMode}
            >
              {qrLoading ? 'Génération…' : degradedMode ? 'Paiement indisponible hors connexion' : 'Générer mon QR code de paiement'}
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
            Retrouvez ici vos crédits accordés et vos paiements effectués.
            Une transaction validée est définitive : elle ne peut pas être annulée.
          </p>

          <div className="history-card">
            <table className="history-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Partenaire</th>
                  <th scope="col" className="cell-amount">Montant</th>
                  <th scope="col">Statut</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((line) => {
                  const isCredit = line.status === 'credit_granted'
                  const isApproved = line.status === 'approved'

                  return (
                    <tr key={`${line.status}-${line.id}`}>
                      <td>{formatDateFr(line.occurredAt)}</td>

                      <td>
                        {isCredit ? (
                          <>
                            <span className="history-partner">
                              Crédit accordé
                            </span>
                            <span className="history-city">
                              Crédit Carte Pro
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="history-partner">
                              {line.partnerName}
                            </span>
                            <span className="history-city">
                              {line.partnerRegion}
                            </span>
                          </>
                        )}
                      </td>

                      <td className="cell-amount">
                        <Amount>
                          {isCredit ? '+ ' : '− '}
                          {euro(Math.abs(line.amountCents))} €
                        </Amount>
                      </td>

                      <td>
                        {isCredit ? (
                          <span className="status-badge">
                            Crédit reçu
                          </span>
                        ) : isApproved ? (
                          <span className="status-badge">
                            Validée
                          </span>
                        ) : (
                          <span className="status-badge">
                            Refusée
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <p className="history-footer">
              {visible.length} transactions sur {transactions.length}
              {showAll || transactions.length <= PREVIEW ? null : (
                <>
                  {' — '}
                  <button
                    className="band-link"
                    type="button"
                    onClick={() => setShowAll(true)}
                  >
                    voir tout l'historique
                  </button>
                </>
              )}
            </p>
          </div>
        </section>
      </div>
    </>
  )
}

export default Employee