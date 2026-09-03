import { useState } from 'react'
import Network from './Network'
import { Amount, SimulationNotice } from '../components/simulation'
import './Partner.css'

type Period = 'jour' | 'semaine' | 'mois'

type Bar = {
  label: string
  value: number
  current?: boolean
}

type Kpi = {
  label: string
  value: string
  hint: string
}

type PeriodData = {
  caption: string
  bars: Bar[]
  kpis: [Kpi, Kpi]
}

const periods: { id: Period; label: string }[] = [
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
]

const data: Record<Period, PeriodData> = {
  jour: {
    caption: 'Dimanche 30 août 2026 — montants encaissés par tranche horaire',
    bars: [
      { label: '08 h', value: 74 },
      { label: '10 h', value: 118 },
      { label: '12 h', value: 96 },
      { label: '14 h', value: 63 },
      { label: '16 h', value: 89 },
      { label: '18 h', value: 62, current: true },
    ],
    kpis: [
      {
        label: 'Montant reçu — 30 août 2026',
        value: '502,00 €',
        hint: '− 38,7 % par rapport à samedi',
      },
      {
        label: 'Transactions encaissées',
        value: '45',
        hint: 'Panier moyen 11,16 €',
      },
    ],
  },
  semaine: {
    caption: 'Semaine du 24 au 30 août 2026 — montants encaissés',
    bars: [
      { label: 'lun. 24', value: 482 },
      { label: 'mar. 25', value: 596 },
      { label: 'mer. 26', value: 631 },
      { label: 'jeu. 27', value: 574 },
      { label: 'ven. 28', value: 708 },
      { label: 'sam. 29', value: 819 },
      { label: 'dim. 30', value: 502, current: true },
    ],
    kpis: [
      {
        label: 'Montant reçu — semaine du 24 août',
        value: '4 312,60 €',
        hint: '+ 8,4 % par rapport à la semaine précédente',
      },
      {
        label: 'Transactions encaissées',
        value: '386',
        hint: 'Panier moyen 11,17 €',
      },
    ],
  },
  mois: {
    caption: 'Août 2026 — montants encaissés par semaine',
    bars: [
      { label: '1re sem.', value: 3964 },
      { label: '2e sem.', value: 4187 },
      { label: '3e sem.', value: 4517 },
      { label: '4e sem.', value: 4312, current: true },
    ],
    kpis: [
      {
        label: 'Montant reçu — août 2026',
        value: '16 980,00 €',
        hint: '+ 8,4 % par rapport à juillet',
      },
      {
        label: 'Transactions encaissées',
        value: '1 521',
        hint: 'Panier moyen 11,16 €',
      },
    ],
  },
}

const establishment = 'Boulangerie Petit Grain'

const tabs = ['Tableau de bord', 'Réseau des partenaires']

const euro = (value: number) => `${value.toLocaleString('fr-FR')} €`

function Partner() {
  const [period, setPeriod] = useState<Period>('semaine')
  const [tab, setTab] = useState(tabs[0])
  const [receipt, setReceipt] = useState('')

  const current = data[period]
  const max = Math.max(...current.bars.map((bar) => bar.value))
  const total = current.bars.reduce((sum, bar) => sum + bar.value, 0)

  return (
    <>

      <nav className="dash-tabs" aria-label="Sections de l'espace partenaire">
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


      {tab === tabs[1] ? (
        <Network establishment={establishment} />
      ) : (
        <div className="dash-inner dash-body">
          <SimulationNotice />

          <div className="dash-head">
            <h1 className="dash-title">{establishment}</h1>

            <div
              className="segmented"
              role="group"
              aria-label="Période affichée"
            >
              {periods.map((item) => (
                <button
                  key={item.id}
                  className={
                    item.id === period ? 'segment segment-active' : 'segment'
                  }
                  type="button"
                  aria-pressed={item.id === period}
                  onClick={() => setPeriod(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <dl className="kpi-grid">
            {current.kpis.map((kpi) => (
              <div className="kpi-card" key={kpi.label}>
                <dt className="kpi-label">{kpi.label}</dt>
                <dd className="kpi-value">
                  {kpi.value.includes('€') ? (
                    <Amount>{kpi.value}</Amount>
                  ) : (
                    kpi.value
                  )}
                </dd>
                <dd className="kpi-hint">
                  {kpi.hint.includes('€') ? <Amount>{kpi.hint}</Amount> : kpi.hint}
                </dd>
              </div>
            ))}
          </dl>

          <div className="dash-grid">
            <figure className="chart-card">
              <figcaption>
                <h2>Transactions par jour</h2>
                <p>{current.caption}</p>
              </figcaption>

              <div
                className="chart"
                role="img"
                aria-label={`${current.caption}. Total ${euro(total)} sur ${
                  current.bars.length
                } périodes.`}
              >
                {current.bars.map((bar) => (
                  <div className="chart-column" key={bar.label}>
                    <span className="chart-value">
                      <Amount showLabel={false}>{euro(bar.value)}</Amount>
                    </span>
                    <div className="chart-track">
                      <div
                        className={
                          bar.current ? 'chart-bar current' : 'chart-bar'
                        }
                        style={{ height: `${(bar.value / max) * 100}%` }}
                      />
                    </div>
                    <span className="chart-label">{bar.label}</span>
                  </div>
                ))}
              </div>

              <p className="chart-legend">
                <span className="chart-key" aria-hidden="true" />
                Période en cours, montant non consolidé.
              </p>

              {/* The notice is not repeated on every bar: shown once at the
                  bottom of the block, tied to the asterisks on the values. */}
              <p className="chart-note">
                <span className="sim-mark">*</span> Montants fictifs, aucune
                valeur réelle.
              </p>
            </figure>

            <aside className="pay-card" aria-labelledby="pay-title">
              <h2 id="pay-title">Recevoir un paiement</h2>
              <p className="pay-intro">
                Deux méthodes d&apos;encaissement au choix.
              </p>

              <div className="pay-method">
                <h3>1. Scanner le QR code du salarié</h3>
                <p>
                  La caméra s&apos;ouvre, le montant est confirmé à l&apos;écran
                  avant validation.
                </p>
                <button
                  className="pay-primary"
                  type="button"
                  onClick={() =>
                    setReceipt('Scanner indisponible.')
                  }
                >
                  Ouvrir le scanner
                </button>
              </div>

              <form
                className="pay-method"
                onSubmit={(event) => {
                  event.preventDefault()
                  setReceipt(
                    'Saisie manuelle indisponible.',
                  )
                }}
              >
                <h3>2. Saisie manuelle</h3>

                <div className="pay-field">
                  <label htmlFor="amount">
                    Montant en euros{' '}
                    <span className="required" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input id="amount" type="text" placeholder="11,80" required />
                </div>

                <div className="pay-field">
                  <label htmlFor="code">
                    Référence du code salarié{' '}
                    <span className="required" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="code"
                    className="pay-mono"
                    type="text"
                    placeholder="CP-4471-8820-3106"
                    required
                  />
                </div>

                <button className="pay-secondary" type="submit">
                  Valider l&apos;encaissement
                </button>
              </form>

              <p className="pay-receipt" role="status">
                {receipt}
              </p>
            </aside>
          </div>
        </div>
      )}
    </>
  )
}

export default Partner
