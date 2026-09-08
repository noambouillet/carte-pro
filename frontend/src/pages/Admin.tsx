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
    siret: '904 118 552 00014',
    submittedAt: '29/08/2026',
  },
  {
    establishment: 'Cinéma Le Rialto',
    city: 'Metz',
    category: 'Culture',
    siret: '512 663 041 00027',
    submittedAt: '28/08/2026',
  },
  {
    establishment: 'Traiteur Les Deux Tables',
    city: 'Dijon',
    category: 'Restauration',
    siret: '833 907 216 00019',
    submittedAt: '28/08/2026',
  },
  {
    establishment: 'Studio Pilates Aria',
    city: 'Reims',
    category: 'Sport',
    siret: '789 452 330 00032',
    submittedAt: '27/08/2026',
  },
]

const accounts: Account[] = [
  {
    name: 'Le Comptoir du Midi',
    code: 'PAR-2210-4417',
    type: 'partner',
    attachment: 'Restauration',
    status: 'active',
  },
  {
    name: 'Sport Loisirs Aubagne',
    code: 'PAR-3390-1188',
    type: 'partner',
    attachment: 'Sport',
    status: 'suspended',
  },
  {
    name: 'Pharmacie du Parc',
    code: 'PAR-4471-9903',
    type: 'partner',
    attachment: 'Santé',
    status: 'active',
  },
  {
    name: 'Épicerie Sainte-Claire',
    code: 'PAR-5512-3067',
    type: 'partner',
    attachment: 'Alimentation',
    status: 'active',
  },
  {
    name: 'Librairie Vasseur',
    code: 'PAR-6640-2214',
    type: 'partner',
    attachment: 'Culture',
    status: 'active',
  },
  {
    name: 'Transports Régionaux Unifiés',
    code: 'PAR-7789-4456',
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
  matricule: string
  balance: number
}

const REGULATORY_CAP = 250

const employer = { name: 'Groupe Vallonis', employeeCount: 1480 }

const subsidyEmployees: SubsidyEmployee[] = [
  { name: 'Camille Ferrand', matricule: 'VAL-004471', balance: 168.4 },
  { name: 'Yanis Prunier', matricule: 'VAL-004472', balance: 94.1 },
  { name: 'Hélène Marchetti', matricule: 'VAL-004473', balance: 212.75 },
  { name: 'Abdel Rahmani', matricule: 'VAL-004474', balance: 36 },
  { name: 'Léa Vasseur', matricule: 'VAL-004475', balance: 128.6 },
  { name: 'Thomas Guérin', matricule: 'VAL-004476', balance: 77.25 },
]

const ROSTER_SIZE = 42
const HIDDEN_ROSTER_SIZE = ROSTER_SIZE - subsidyEmployees.length

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

  const decideRequest = (siret: string) => {
    setRequests((current) => current.filter((request) => request.siret !== siret))
  }

  // Valider/Refuser n'agit pas tout de suite : ça ouvre un champ de motif
  // sous la ligne concernee, et c'est la confirmation qui applique la
  // decision.
  const [pendingDecision, setPendingDecision] = useState<
    { siret: string; kind: 'approve' | 'reject' } | null
  >(null)
  const [decisionReason, setDecisionReason] = useState('')

  const openDecision = (siret: string, kind: 'approve' | 'reject') => {
    setPendingDecision({ siret, kind })
    setDecisionReason('')
  }

  const cancelDecision = () => {
    setPendingDecision(null)
    setDecisionReason('')
  }

  const confirmDecision = () => {
    if (!pendingDecision) return
    decideRequest(pendingDecision.siret)
    setPendingDecision(null)
    setDecisionReason('')
  }


  const setAccountStatus = (code: string, status: Account['status']) => {
    setAccountList((current) =>
      current.map((account) =>
        account.code === code ? { ...account, status } : account,
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
        account.code.toLowerCase().includes(search) ||
        account.attachment.toLowerCase().includes(search)

      return matchesType && matchesSearch
    })
  }, [accountList, accountFilter, accountQuery])

  const [amountPerEmployee, setAmountPerEmployee] = useState(120)
  const [valueDate, setValueDate] = useState('2026-09-01')
  const [selectedMatricules, setSelectedMatricules] = useState(
    () => new Set(subsidyEmployees.map((subsidyEmployee) => subsidyEmployee.matricule)),
  )
  const [hiddenSelectedCount, setHiddenSelectedCount] = useState(HIDDEN_ROSTER_SIZE)
  const [subsidyFeedback, setSubsidyFeedback] = useState('')

  const selectedCount = selectedMatricules.size + hiddenSelectedCount
  const subsidyTotal = amountPerEmployee * selectedCount
  const overCap = amountPerEmployee > REGULATORY_CAP

  const toggleEmployee = (matricule: string) => {
    setSelectedMatricules((current) => {
      const next = new Set(current)
      if (next.has(matricule)) {
        next.delete(matricule)
      } else {
        next.add(matricule)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedCount === 0) {
      setSelectedMatricules(
        new Set(subsidyEmployees.map((subsidyEmployee) => subsidyEmployee.matricule)),
      )
      setHiddenSelectedCount(HIDDEN_ROSTER_SIZE)
    } else {
      setSelectedMatricules(new Set())
      setHiddenSelectedCount(0)
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
                <th scope="col">SIRET</th>
                <th scope="col">Déposée le</th>
                <th scope="col">Décision</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <Fragment key={request.siret}>
                  <tr>
                    <td>
                      <span className="history-partner">
                        {request.establishment}
                      </span>
                      <span className="history-city">{request.city}</span>
                    </td>
                    <td>{request.category}</td>
                    <td className="admin-requests-siret">{request.siret}</td>
                    <td>{request.submittedAt}</td>
                    <td>
                      <div className="admin-requests-actions">
                        <button
                          className="admin-approve"
                          type="button"
                          onClick={() => openDecision(request.siret, 'approve')}
                        >
                          Valider
                        </button>
                        <button
                          className="admin-reject"
                          type="button"
                          onClick={() => openDecision(request.siret, 'reject')}
                        >
                          Refuser
                        </button>
                      </div>
                    </td>
                  </tr>

                  {pendingDecision?.siret === request.siret && (
                    <tr className="admin-decision-row">
                      <td colSpan={5}>
                        <div className="admin-decision-form">
                          <div className="admin-decision-field">
                            <label htmlFor={`decision-reason-${request.siret}`}>
                              {pendingDecision.kind === 'approve'
                                ? 'Motif de validation'
                                : 'Motif de refus'}
                            </label>
                            <input
                              id={`decision-reason-${request.siret}`}
                              type="text"
                              value={decisionReason}
                              onChange={(event) =>
                                setDecisionReason(event.target.value)
                              }
                              placeholder={
                                pendingDecision.kind === 'approve'
                                  ? 'Ex. : dossier conforme, SIRET vérifié.'
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
            placeholder="Rechercher un compte, un SIRET, un employeur"
            aria-label="Rechercher un compte, un SIRET, un employeur"
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
                <tr key={account.code}>
                  <td>
                    <span className="history-partner">{account.name}</span>
                    <span className="history-city">{account.code}</span>
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
                        onClick={() => setAccountStatus(account.code, 'active')}
                      >
                        Activer
                      </button>
                      <button
                        className="admin-action-warning"
                        type="button"
                        disabled={account.status === 'suspended'}
                        onClick={() =>
                          setAccountStatus(account.code, 'suspended')
                        }
                      >
                        Suspendre
                      </button>
                      <button
                        className="admin-reject"
                        type="button"
                        disabled={account.status === 'closed'}
                        onClick={() => setAccountStatus(account.code, 'closed')}
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
        <SimulationNotice />

        <div className="admin-subsidy-grid">
          <div className="pay-card admin-subsidy-form">
            <div className="pay-field">
              <label htmlFor="subsidy-employer">Employeur</label>
              <select id="subsidy-employer" defaultValue={employer.name}>
                <option value={employer.name}>
                  {employer.name} — {employer.employeeCount.toLocaleString('fr-FR')}{' '}
                  salariés
                </option>
              </select>
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
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                aria-invalid={overCap || undefined}
                aria-describedby="subsidy-amount-hint"
                value={amountPerEmployee}
                onChange={(event) =>
                  setAmountPerEmployee(Number(event.target.value))
                }
              />
              <p
                className={overCap ? 'field-error' : 'field-hint'}
                id="subsidy-amount-hint"
              >
                {overCap
                  ? `Le montant dépasse le plafond réglementaire de ${euro(REGULATORY_CAP)} par mois.`
                  : `Plafond réglementaire : ${euro(REGULATORY_CAP)} par mois.`}
              </p>
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

            <div className="pay-method admin-subsidy-summary">
              <p className="admin-subsidy-summary-label">
                Total de l&apos;abondement
              </p>
              <p className="admin-subsidy-total">
                <Amount>{euro(subsidyTotal)}</Amount>
              </p>
              <p className="admin-subsidy-summary-hint">
                <Amount>
                  {selectedCount} salarié{selectedCount > 1 ? 's' : ''}{' '}
                  sélectionné{selectedCount > 1 ? 's' : ''} ×{' '}
                  {euro(amountPerEmployee)}
                </Amount>
              </p>
            </div>

            <div className="admin-subsidy-actions">
              <button
                className="pay-primary"
                type="button"
                disabled={overCap || selectedCount === 0}
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
              <h2 id="subsidy-employees-title">
                Salariés concernés — {employer.name}
              </h2>
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
                  <th scope="col">Matricule</th>
                  <th scope="col" className="cell-amount">
                    Solde actuel
                  </th>
                </tr>
              </thead>
              <tbody>
                {subsidyEmployees.map((subsidyEmployee) => (
                  <tr key={subsidyEmployee.matricule}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedMatricules.has(subsidyEmployee.matricule)}
                        onChange={() => toggleEmployee(subsidyEmployee.matricule)}
                        aria-label={`Inclure ${subsidyEmployee.name}`}
                      />
                    </td>
                    <td className="history-partner">{subsidyEmployee.name}</td>
                    <td className="admin-subsidy-matricule">
                      {subsidyEmployee.matricule}
                    </td>
                    <td className="cell-amount">
                      <Amount showLabel={false}>{euro(subsidyEmployee.balance)}</Amount>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="chart-note">
              <span className="sim-mark">*</span> Soldes fictifs, aucune
              valeur réelle.
            </p>

            <div className="admin-subsidy-employees-footer">
              <span>
                {subsidyEmployees.length} lignes affichées sur {selectedCount}{' '}
                sélectionnées
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
