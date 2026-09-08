import './Admin.css'
import './Employee.css'
import './Partner.css'
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import type { Account, AccountType } from '../types/account'
import { Amount, SimulationNotice } from '../components/Simulation'
import type { ReferralRequest } from '../types/referral'

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

const referralRequests: ReferralRequest[] = [
  {
    establishment: 'Fleuriste Camélia',
    city: 'Angers',
    category: 'Commerce',
    siren: '904 118 552',
    submittedAt: '29/08/2026',
  },
  {
    establishment: 'Cinéma Le Rialto',
    city: 'Metz',
    category: 'Culture',
    siren: '512 663 041',
    submittedAt: '28/08/2026',
  },
  {
    establishment: 'Traiteur Les Deux Tables',
    city: 'Dijon',
    category: 'Restauration',
    siren: '833 907 216 ',
    submittedAt: '28/08/2026',
  },
  {
    establishment: 'Studio Pilates Aria',
    city: 'Reims',
    category: 'Sport',
    siren: '789 452 330',
    submittedAt: '27/08/2026',
  },
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

type SubsidyEmployee = {
  name: string
  identifier: string
  balance: number
}

const subsidyEmployees: SubsidyEmployee[] = [
  { name: 'Camille Ferrand', identifier: 'VAL-004471', balance: 168.4 },
  { name: 'Yanis Prunier', identifier: 'VAL-004472', balance: 94.1 },
  { name: 'Hélène Marchetti', identifier: 'VAL-004473', balance: 212.75 },
  { name: 'Abdel Rahmani', identifier: 'VAL-004474', balance: 36 },
  { name: 'Léa Vasseur', identifier: 'VAL-004475', balance: 128.6 },
  { name: 'Thomas Guérin', identifier: 'VAL-004476', balance: 77.25 },
]

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
  const [requests, setRequests] = useState<ReferralRequest[]>(referralRequests)
  const [accountList, setAccountList] = useState<Account[]>(accounts)
  const [accountFilter, setAccountFilter] = useState<'all' | AccountType>('all')
  const [accountQuery, setAccountQuery] = useState('')

  const maxRegion = Math.max(...regions.map((region) => region.count))

  const decideRequest = (siren: string) => {
    setRequests((current) => current.filter((request) => request.siren !== siren))
  }

  const [pendingDecision, setPendingDecision] = useState<
    { siren: string; kind: 'approve' | 'reject' } | null
  >(null)
  const [decisionReason, setDecisionReason] = useState('')

  const openDecision = (siren: string, kind: 'approve' | 'reject') => {
    setPendingDecision({ siren, kind })
    setDecisionReason('')
  }

  const cancelDecision = () => {
    setPendingDecision(null)
    setDecisionReason('')
  }

  const confirmDecision = () => {
    if (!pendingDecision) return
    decideRequest(pendingDecision.siren)
    setPendingDecision(null)
    setDecisionReason('')
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
  const [selectedIdentifiers, setSelectedIdentifiers] = useState<Set<string>>(
    () => new Set(),
  )
  const [subsidyFeedback, setSubsidyFeedback] = useState('')
  const [employeeQuery, setEmployeeQuery] = useState('')

  const selectedCount = selectedIdentifiers.size
  const numericAmount = amountPerEmployee === '' ? 0 : amountPerEmployee

  const visibleSubsidyEmployees = useMemo(() => {
    const search = employeeQuery.trim().toLowerCase()

    return subsidyEmployees.filter(
      (subsidyEmployee) =>
        search === '' ||
        subsidyEmployee.name.toLowerCase().includes(search) ||
        subsidyEmployee.identifier.toLowerCase().includes(search),
    )
  }, [employeeQuery])

  const toggleEmployee = (identifier: string) => {
    setSelectedIdentifiers((current) => {
      const next = new Set(current)
      if (next.has(identifier)) {
        next.delete(identifier)
      } else {
        next.add(identifier)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedCount === 0) {
      setSelectedIdentifiers(
        new Set(subsidyEmployees.map((subsidyEmployee) => subsidyEmployee.identifier)),
      )
    } else {
      setSelectedIdentifiers(new Set())
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
            <button className="band-link" type="button">
              Télécharger les données (CSV)
            </button>
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
            {requests.length} dossier{requests.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="history-card">
          <table className="history-table">
            <thead>
              <tr>
                <th scope="col">Établissement</th>
                <th scope="col">Catégorie</th>
                <th scope="col">SIREN</th>
                <th scope="col">Déposée le</th>
                <th scope="col">Décision</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <Fragment key={request.siren}>
                  <tr>
                    <td>
                      <span className="history-partner">
                        {request.establishment}
                      </span>
                      <span className="history-city">{request.city}</span>
                    </td>
                    <td>{request.category}</td>
                    <td className="admin-requests-siren">{request.siren}</td>
                    <td>{request.submittedAt}</td>
                    <td>
                      <div className="admin-requests-actions">
                        <button
                          className="admin-approve"
                          type="button"
                          onClick={() => openDecision(request.siren, 'approve')}
                        >
                          Valider
                        </button>
                        <button
                          className="admin-reject"
                          type="button"
                          onClick={() => openDecision(request.siren, 'reject')}
                        >
                          Refuser
                        </button>
                      </div>
                    </td>
                  </tr>

                  {pendingDecision?.siren === request.siren && (
                    <tr className="admin-decision-row">
                      <td colSpan={5}>
                        <div className="admin-decision-form">
                          <div className="admin-decision-field">
                            <label htmlFor={`decision-reason-${request.siren}`}>
                              {pendingDecision.kind === 'approve'
                                ? 'Motif de validation'
                                : 'Motif de refus'}
                            </label>
                            <input
                              id={`decision-reason-${request.siren}`}
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

                          <div className="admin-decision-buttons">
                            <button
                              className={
                                pendingDecision.kind === 'approve'
                                  ? 'admin-approve'
                                  : 'admin-reject'
                              }
                              type="button"
                              disabled={decisionReason.trim() === ''}
                              onClick={confirmDecision}
                            >
                              {pendingDecision.kind === 'approve'
                                ? 'Confirmer la validation'
                                : 'Confirmer le refus'}
                            </button>
                            <button
                              className="admin-action"
                              type="button"
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
              ))}
            </tbody>
          </table>

          {requests.length === 0 && (
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
              <label htmlFor="subsidy-search">Salariés</label>
              <input
                id="subsidy-search"
                type="search"
                value={employeeQuery}
                onChange={(event) => setEmployeeQuery(event.target.value)}
                placeholder="Rechercher un salarié ou un identifiant"
              />
            </div>

            <div className="pay-field">
              <label htmlFor="subsidy-amount">
                Montant par salarié{' '}
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
                disabled={selectedCount === 0 || numericAmount === 0}
                onClick={() =>
                  setSubsidyFeedback('Abondement enregistré (démonstration).')
                }
              >
                Créditer les comptes
              </button>
            </div>

            <p className="pay-receipt" role="status">
              {subsidyFeedback}
            </p>
          </div>

          <div
            className="chart-card admin-subsidy-employees"
            aria-labelledby="subsidy-employees-title"
          >
            <div className="admin-subsidy-employees-head">
              <h2 id="subsidy-employees-title">Salariés</h2>
              <button className="band-link" type="button">
                Importer un fichier CSV
              </button>
            </div>

            <table className="history-table admin-subsidy-table">
              <thead>
                <tr>
                  <th scope="col" aria-label="Sélection">
                  </th>
                  <th scope="col">Salarié</th>
                  <th scope="col">Identifiant</th>
                  <th scope="col" className="cell-amount">
                    Solde actuel
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleSubsidyEmployees.map((subsidyEmployee) => (
                  <tr key={subsidyEmployee.identifier}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIdentifiers.has(subsidyEmployee.identifier)}
                        onChange={() => toggleEmployee(subsidyEmployee.identifier)}
                        aria-label={`Inclure ${subsidyEmployee.name}`}
                      />
                    </td>
                    <td className="history-partner">{subsidyEmployee.name}</td>
                    <td className="admin-subsidy-identifier">
                      {subsidyEmployee.identifier}
                    </td>
                    <td className="cell-amount">
                      <Amount showLabel={false}>{euro(subsidyEmployee.balance)}</Amount>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {visibleSubsidyEmployees.length === 0 && (
              <p className="admin-requests-empty">
                Aucun salarié ne correspond à cette recherche.
              </p>
            )}

            <p className="chart-note">
              <span className="sim-mark">*</span> Soldes fictifs, aucune
              valeur réelle.
            </p>

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