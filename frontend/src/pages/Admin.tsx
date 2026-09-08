import './Admin.css'
import './Employee.css'
import './Partner.css'
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Account, AccountType } from '../types/account'
import { Amount, SimulationNotice } from '../components/Simulation'
import {
  getAdminAccounts,
  grantCredit,
  validatePartner,
  type AdminAccountsResponse,
} from '../api/Admin'
import { getApiError } from '../api/Errors'

type Kpi = {
  label: string
  value: string
  hint: string
  warning?: boolean
}

const kpis: Kpi[] = [
  {
    label: 'Volume de transactions',
    value: '41,7 M€',
    hint: 'Cumul 2026',
  },
  {
    label: 'Partenaires actifs',
    value: '5 731',
    hint: '+ 214 sur 30 jours',
  },
  {
    label: 'Salariés actifs',
    value: '128 400',
    hint: 'Sur 1 246 employeurs adhérents',
  },
  {
    label: 'Demandes en attente',
    value: '4',
    hint: 'Délai moyen d’instruction : 3,2 jours',
    warning: true,
  },
]

const regions = [
  { name: 'Île-de-France', count: 1240 },
  { name: 'Auvergne-Rhône-Alpes', count: 812 },
  { name: 'Provence-Alpes-Côte d’Azur', count: 604 },
  { name: 'Occitanie', count: 517 },
  { name: 'Nouvelle-Aquitaine', count: 498 },
  { name: 'Hauts-de-France', count: 431 },
  { name: 'Grand Est', count: 402 },
]

const accounts: Account[] = [
  {
    name: 'Le Comptoir du Midi',
    type: 'partner',
    attachment: 'Restauration',
    status: 'active',
  },
  {
    name: 'Sport Loisirs Aubagne',
    type: 'partner',
    attachment: 'Sport',
    status: 'suspended',
  },
  {
    name: 'Pharmacie du Parc',
    type: 'partner',
    attachment: 'Santé',
    status: 'active',
  },
  {
    name: 'Épicerie Sainte-Claire',
    type: 'partner',
    attachment: 'Alimentation',
    status: 'active',
  },
  {
    name: 'Librairie Vasseur',
    type: 'partner',
    attachment: 'Culture',
    status: 'active',
  },
  {
    name: 'Transports Régionaux Unifiés',
    type: 'partner',
    attachment: 'Mobilité',
    status: 'active',
  },
]

const accountTypeLabels: Record<AccountType, string> = {
  employee: 'Salarié',
  partner: 'Partenaire',
}

const accountStatusLabels: Record<Account['status'], string> = {
  active: 'Actif',
  suspended: 'Suspendu',
  closed: 'Clôturé',
}

const euro = (amount: number) =>
  `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`

const tabs = [
  'Tableau de bord national',
  'Demandes de référencement',
  'Comptes',
  'Abondements employeurs',
] as const

type Tab = (typeof tabs)[number]

function Admin() {
  const [tab, setTab] = useState<Tab>(tabs[0])
  const [accountList, setAccountList] = useState<Account[]>(accounts)
  const [accountFilter, setAccountFilter] = useState<'all' | AccountType>('all')
  const [accountQuery, setAccountQuery] = useState('')

  const [adminAccounts, setAdminAccounts] = useState<AdminAccountsResponse | null>(null)
  const [accountsLoading, setAccountsLoading] = useState(false)

  const [pendingDecision, setPendingDecision] = useState<
    { partnerId: string; kind: 'approve' | 'reject' } | null
  >(null)
  const [decisionReason, setDecisionReason] = useState('')
  const [decisionSubmitting, setDecisionSubmitting] = useState(false)
  const [decisionError, setDecisionError] = useState('')

  const fetchAccounts = () => {
    setAccountsLoading(true)
    getAdminAccounts()
      .then((data) => {
        setAdminAccounts(data)
      })
      .catch((err) => {
        console.error('Erreur chargement des comptes:', getApiError(err).message)
      })
      .finally(() => {
        setAccountsLoading(false)
      })
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const pendingPartners = useMemo(() => {
    if (!adminAccounts) return []
    return adminAccounts.partners.filter((p) => p.status === 'pending')
  }, [adminAccounts])

  const maxRegion = Math.max(...regions.map((region) => region.count))

  const openDecision = (partnerId: string, kind: 'approve' | 'reject') => {
    setPendingDecision({ partnerId, kind })
    setDecisionReason('')
    setDecisionError('')
  }

  const cancelDecision = () => {
    setPendingDecision(null)
    setDecisionReason('')
    setDecisionError('')
  }

  const confirmDecision = async () => {
    if (!pendingDecision || !decisionReason.trim()) return

    setDecisionSubmitting(true)
    setDecisionError('')

    try {
      await validatePartner(
        pendingDecision.partnerId,
        pendingDecision.kind === 'approve' ? 'approved' : 'rejected',
        decisionReason.trim(),
      )
      setPendingDecision(null)
      setDecisionReason('')
      fetchAccounts()
    } catch (err) {
      setDecisionError(
        getApiError(err).message ?? "Échec lors de l'enregistrement de la décision.",
      )
    } finally {
      setDecisionSubmitting(false)
    }
  }

  const setAccountStatus = (name: string, status: Account['status']) => {
    setAccountList((current) =>
      current.map((account) =>
        account.name === name ? { ...account, status } : account,
      ),
    )
  }

  const visibleAccounts = useMemo(() => {
    const search = accountQuery.trim().toLowerCase()

    return accountList.filter((account) => {
      const matchesType = accountFilter === 'all' || account.type === accountFilter
      const matchesSearch =
        search === '' ||
        account.name.toLowerCase().includes(search) ||
        account.attachment.toLowerCase().includes(search)

      return matchesType && matchesSearch
    })
  }, [accountList, accountFilter, accountQuery])

  const [amountPerEmployee, setAmountPerEmployee] = useState<number | ''>('')
  const [valueDate, setValueDate] = useState('2026-09-01')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [subsidyFeedback, setSubsidyFeedback] = useState('')
  const [subsidySubmitting, setSubsidySubmitting] = useState(false)
  const [employeeQuery, setEmployeeQuery] = useState('')

  const selectedCount = selectedIds.size
  const numericAmount = amountPerEmployee === '' ? 0 : amountPerEmployee

  const subsidyEmployees = useMemo(() => {
    if (!adminAccounts) return []
    return adminAccounts.employees.map((emp) => ({
      id: Number(emp.id),
      name: `${emp.firstName} ${emp.lastName}`,
      email: emp.email,
    }))
  }, [adminAccounts])

  const visibleSubsidyEmployees = useMemo(() => {
    const search = employeeQuery.trim().toLowerCase()

    return subsidyEmployees.filter(
      (emp) =>
        search === '' ||
        emp.name.toLowerCase().includes(search) ||
        emp.email.toLowerCase().includes(search),
    )
  }, [subsidyEmployees, employeeQuery])

  const toggleEmployee = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedCount === 0) {
      setSelectedIds(new Set(subsidyEmployees.map((emp) => emp.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleGrantCredits = async () => {
    if (selectedCount === 0 || numericAmount <= 0) return

    setSubsidySubmitting(true)
    setSubsidyFeedback('')
    const amountCents = Math.round(numericAmount * 100)

    try {
      await Promise.all(
        Array.from(selectedIds).map((employeeId) =>
          grantCredit(employeeId, amountCents),
        ),
      )
      setSubsidyFeedback(
        `Abondement de ${euro(numericAmount)} accordé avec succès à ${selectedCount} salarié(s).`,
      )
      setSelectedIds(new Set())
    } catch (err) {
      setSubsidyFeedback(
        getApiError(err).message ?? "Échec lors de l'attribution des crédits.",
      )
    } finally {
      setSubsidySubmitting(false)
    }
  }

  let body: ReactNode

  if (tab === tabs[0]) {
    body = (
      <div className="dash-inner dash-body">
        <h1 className="dash-title">Tableau de bord national</h1>
        <SimulationNotice />

        <dl className="kpi-grid">
          {kpis.map((kpi) => (
            <div
              className={kpi.warning ? 'kpi-card kpi-card-warning' : 'kpi-card'}
              key={kpi.label}
            >
              <dt className="kpi-label">{kpi.label}</dt>
              <dd className="kpi-value">
                {kpi.value.includes('€') ? (
                  <Amount>{kpi.value}</Amount>
                ) : (
                  kpi.value
                )}
              </dd>
              <dd className="kpi-hint">{kpi.hint}</dd>
            </div>
          ))}
        </dl>

        <section
          className="admin-regions"
          aria-labelledby="admin-regions-title"
        >
          <div className="admin-regions-head">
            <h2 className="band-title" id="admin-regions-title">
              Régions les plus actives
            </h2>
          </div>

          <ol className="admin-region-list">
            {regions.map((region) => (
              <li className="admin-region-row" key={region.name}>
                <span className="admin-region-name">{region.name}</span>
                <span className="admin-region-track">
                  <span
                    className="admin-region-bar"
                    style={{ width: `${(region.count / maxRegion) * 100}%` }}
                  />
                </span>
                <span className="admin-region-count">
                  {region.count.toLocaleString('fr-FR')}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    )
  } else if (tab === tabs[1]) {
    body = (
      <div className="dash-inner dash-body">
        <div className="admin-requests-head">
          <div>
            <h1 className="dash-title">
              Demandes d&apos;inscription partenaires en attente
            </h1>
          </div>
          <span className="admin-requests-count">
            {pendingPartners.length} dossier{pendingPartners.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="history-card">
          {accountsLoading ? (
            <p>Chargement des demandes…</p>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th scope="col">Établissement</th>
                  <th scope="col">Contact / Email</th>
                  <th scope="col">Déposée le</th>
                  <th scope="col">Décision</th>
                </tr>
              </thead>
              <tbody>
                {pendingPartners.map((partner) => {
                  const formattedDate = partner.createdAt
                    ? new Date(partner.createdAt).toLocaleDateString('fr-FR')
                    : 'Date inconnue'

                  return (
                    <Fragment key={partner.id}>
                      <tr>
                        <td>
                          <span className="history-partner">
                            {partner.name || 'Nom non renseigné'}
                          </span>
                        </td>
                        <td>{partner.email || 'Non renseigné'}</td>
                        <td>{formattedDate}</td>
                        <td>
                          <div className="admin-requests-actions">
                            <button
                              className="admin-approve"
                              type="button"
                              onClick={() => openDecision(partner.id, 'approve')}
                            >
                              Valider
                            </button>
                            <button
                              className="admin-reject"
                              type="button"
                              onClick={() => openDecision(partner.id, 'reject')}
                            >
                              Refuser
                            </button>
                          </div>
                        </td>
                      </tr>

                      {pendingDecision?.partnerId === partner.id && (
                        <tr className="admin-decision-row">
                          <td colSpan={4}>
                            <div className="admin-decision-form">
                              <div className="admin-decision-field">
                                <label htmlFor={`decision-reason-${partner.id}`}>
                                  {pendingDecision.kind === 'approve'
                                    ? 'Motif de validation'
                                    : 'Motif de refus'}
                                </label>
                                <input
                                  id={`decision-reason-${partner.id}`}
                                  type="text"
                                  value={decisionReason}
                                  onChange={(event) =>
                                    setDecisionReason(event.target.value)
                                  }
                                  placeholder={
                                    pendingDecision.kind === 'approve'
                                      ? 'Ex. : dossier conforme, SIREN vérifié.'
                                      : 'Ex. : pièces manquantes, activité hors périmètre.'
                                  }
                                  autoFocus
                                />
                              </div>

                              {decisionError && (
                                <p className="pay-receipt" role="alert">
                                  {decisionError}
                                </p>
                              )}

                              <div className="admin-decision-buttons">
                                <button
                                  className={
                                    pendingDecision.kind === 'approve'
                                      ? 'admin-approve'
                                      : 'admin-reject'
                                  }
                                  type="button"
                                  disabled={
                                    decisionReason.trim() === '' || decisionSubmitting
                                  }
                                  onClick={confirmDecision}
                                >
                                  {decisionSubmitting
                                    ? 'Enregistrement…'
                                    : pendingDecision.kind === 'approve'
                                      ? 'Confirmer la validation'
                                      : 'Confirmer le refus'}
                                </button>
                                <button
                                  className="admin-action"
                                  type="button"
                                  disabled={decisionSubmitting}
                                  onClick={cancelDecision}
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          )}

          {!accountsLoading && pendingPartners.length === 0 && (
            <p className="admin-requests-empty">
              Aucune demande en attente.
            </p>
          )}
        </div>
      </div>
    )
  } else if (tab === tabs[2]) {
    body = (
      <div className="dash-inner dash-body">
        <h1 className="dash-title">Gestion des comptes</h1>

        <div className="admin-accounts-toolbar">
          <div
            className="admin-account-filters"
            role="group"
            aria-label="Filtrer par type de compte"
          >
            <button
              className={
                accountFilter === 'all'
                  ? 'admin-filter admin-filter-active'
                  : 'admin-filter'
              }
              type="button"
              aria-pressed={accountFilter === 'all'}
              onClick={() => setAccountFilter('all')}
            >
              Tous
            </button>
            <button
              className={
                accountFilter === 'employee'
                  ? 'admin-filter admin-filter-active'
                  : 'admin-filter'
              }
              type="button"
              aria-pressed={accountFilter === 'employee'}
              onClick={() => setAccountFilter('employee')}
            >
              Salariés
            </button>
            <button
              className={
                accountFilter === 'partner'
                  ? 'admin-filter admin-filter-active'
                  : 'admin-filter'
              }
              type="button"
              aria-pressed={accountFilter === 'partner'}
              onClick={() => setAccountFilter('partner')}
            >
              Partenaires
            </button>
          </div>

          <input
            className="admin-search"
            type="search"
            value={accountQuery}
            onChange={(event) => setAccountQuery(event.target.value)}
            placeholder="Rechercher un compte, un SIREN, un employeur"
            aria-label="Rechercher un compte, un SIREN, un employeur"
          />
        </div>

        <div className="history-card">
          <table className="history-table">
            <thead>
              <tr>
                <th scope="col">Compte</th>
                <th scope="col">Type</th>
                <th scope="col">Rattachement</th>
                <th scope="col">État</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleAccounts.map((account) => (
                <tr key={account.name}>
                  <td>
                    <span className="history-partner">{account.name}</span>
                  </td>
                  <td>{accountTypeLabels[account.type]}</td>
                  <td>{account.attachment}</td>
                  <td>
                    <span
                      className={
                        account.status === 'active'
                          ? 'status-badge'
                          : account.status === 'suspended'
                            ? 'status-badge status-badge-warning'
                            : 'status-badge status-badge-danger'
                      }
                    >
                      {accountStatusLabels[account.status]}
                    </span>
                  </td>
                  <td>
                    <div className="admin-requests-actions">
                      <button
                        className="admin-action"
                        type="button"
                        disabled={account.status === 'active'}
                        onClick={() => setAccountStatus(account.name, 'active')}
                      >
                        Activer
                      </button>
                      <button
                        className="admin-action-warning"
                        type="button"
                        disabled={account.status === 'suspended'}
                        onClick={() =>
                          setAccountStatus(account.name, 'suspended')
                        }
                      >
                        Suspendre
                      </button>
                      <button
                        className="admin-reject"
                        type="button"
                        disabled={account.status === 'closed'}
                        onClick={() => setAccountStatus(account.name, 'closed')}
                      >
                        Clôturer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {visibleAccounts.length === 0 && (
            <p className="admin-requests-empty">
              Aucun compte ne correspond à cette recherche.
            </p>
          )}
        </div>
      </div>
    )
  } else {
    body = (
      <div className="dash-inner dash-body">
        <h1 className="dash-title">Gestion des abondements employeurs</h1>
        <p className="dash-subtitle">
          Sélectionnez les salariés à créditer et le montant à verser. Le
          crédit est effectif à la date de valeur choisie et notifié aux
          salariés concernés.
        </p>
        <SimulationNotice />

        <div className="admin-subsidy-grid">
          <div className="pay-card admin-subsidy-form">
            <div className="pay-field">
              <label htmlFor="subsidy-search">Filtrer la liste</label>
              <input
                id="subsidy-search"
                type="search"
                value={employeeQuery}
                onChange={(event) => setEmployeeQuery(event.target.value)}
                placeholder="Rechercher par nom ou email"
              />
            </div>

            <div className="pay-field">
              <label htmlFor="subsidy-amount">
                Montant par salarié (€){' '}
                <span className="required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="subsidy-amount"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={amountPerEmployee}
                placeholder="Exemple : 120"
                onChange={(event) => {
                  const digitsOnly = event.target.value.replace(/\D/g, '')
                  setAmountPerEmployee(digitsOnly === '' ? '' : Number(digitsOnly))
                }}
              />
            </div>

            <div className="pay-field">
              <label htmlFor="subsidy-date">Date de valeur</label>
              <input
                id="subsidy-date"
                type="date"
                value={valueDate}
                onChange={(event) => setValueDate(event.target.value)}
              />
            </div>

            <div className="admin-subsidy-actions">
              <button
                className="pay-primary"
                type="button"
                disabled={selectedCount === 0 || numericAmount === 0 || subsidySubmitting}
                onClick={handleGrantCredits}
              >
                {subsidySubmitting ? 'Enregistrement…' : 'Créditer les comptes'}
              </button>
            </div>

            {subsidyFeedback && (
              <p className="pay-receipt" role="status">
                {subsidyFeedback}
              </p>
            )}
          </div>

          <div
            className="chart-card admin-subsidy-employees"
            aria-labelledby="subsidy-employees-title"
          >
            <div className="admin-subsidy-employees-head">
              <h2 id="subsidy-employees-title">Salariés</h2>
            </div>

            {accountsLoading ? (
              <p>Chargement des salariés…</p>
            ) : (
              <table className="history-table admin-subsidy-table">
                <thead>
                  <tr>
                    <th scope="col" aria-label="Sélection"></th>
                    <th scope="col">Salarié</th>
                    <th scope="col">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSubsidyEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(emp.id)}
                          onChange={() => toggleEmployee(emp.id)}
                          aria-label={`Inclure ${emp.name}`}
                        />
                      </td>
                      <td className="history-partner">{emp.name}</td>
                      <td className="admin-subsidy-identifier">{emp.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!accountsLoading && visibleSubsidyEmployees.length === 0 && (
              <p className="admin-requests-empty">
                Aucun salarié ne correspond à cette recherche.
              </p>
            )}

            <div className="admin-subsidy-employees-footer">
              <span>
                {visibleSubsidyEmployees.length} ligne
                {visibleSubsidyEmployees.length > 1 ? 's' : ''} affichée
                {visibleSubsidyEmployees.length > 1 ? 's' : ''} sur{' '}
                {selectedCount} sélectionnée{selectedCount > 1 ? 's' : ''}
              </span>
              <button className="band-link" type="button" onClick={toggleSelectAll}>
                {selectedCount === 0 ? 'Tout sélectionner' : 'Tout désélectionner'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <nav className="dash-tabs" aria-label="Sections de l'espace administrateur">
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

      {body}
    </>
  )
}

export default Admin