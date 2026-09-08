import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import Network from './Network'
import { Amount, SimulationNotice } from '../components/Simulation'
import QrScanner from '../components/QrScanner'
import {
  getPartnerTransactions,
  redeemQrCode,
  type PartnerTransaction,
} from '../api/Partners'
import { getMe } from '../api/Auth'
import { getApiError } from '../api/Errors'
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

const tabs = ['Tableau de bord', 'Réseau des partenaires']
const DAY_MS = 24 * 60 * 60 * 1000

const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
})

const euro = (value: number) =>
  `${value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function startOfDay(date: Date) {
  const dateCopy = new Date(date)
  dateCopy.setHours(0, 0, 0, 0)
  return dateCopy
}

function startOfWeek(date: Date) {
  const dateCopy = startOfDay(date)
  const day = dateCopy.getDay()
  const daysSinceMonday = (day + 6) % 7

  return addDays(dateCopy, -daysSinceMonday)
}

function addDays(date: Date, days: number) {
  const dateCopy = new Date(date)
  dateCopy.setDate(dateCopy.getDate() + days)
  return dateCopy
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function dayLabel(date: Date) {
  return `${weekdayFormatter.format(date)} ${date.getDate()}`
}

function hourSlotIndex(hour: number, slots: number[]) {
  const index = slots.findIndex(
    (_, slotIndex) => hour < (slots[slotIndex + 1] ?? 24),
  )

  return index === -1 ? slots.length - 1 : index
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0)
    return current === 0 ? 0 : null

  return ((current - previous) / previous) * 100
}

function formatDelta(
  current: number,
  previous: number,
  comparisonLabel: string,
): string {
  const change = percentChange(current, previous)

  if (change === null) {
    return 'Première période avec des données'
  }

  const sign = change >= 0 ? '+' : '−'

  return `${sign} ${Math.abs(change).toFixed(1)} % par rapport ${comparisonLabel}`
}

function buildDayData(transactions: PartnerTransaction[], now: Date, isCurrentPeriod: boolean): PeriodData {
  const todayStart = startOfDay(now)
  const yesterdayStart = addDays(todayStart, -1)
  const tomorrowStart = addDays(todayStart, 1)
  const slots = [8, 10, 12, 14, 16, 18]

  const bars: Bar[] = slots.map((hour) => ({
    label: `${String(hour).padStart(2, '0')} h`,
    value: 0,
  }))

  if (isCurrentPeriod) {
    bars[hourSlotIndex(now.getHours(), slots)].current = true
  }
  let todayTotal = 0
  let todayCount = 0
  let yesterdayTotal = 0

  for (const transaction of transactions) {
    const createdDate = new Date(transaction.createdAt)
    const amount = transaction.amountCents / 100

    if (createdDate >= todayStart && createdDate < tomorrowStart) {
      todayTotal += amount
      todayCount += 1
      bars[hourSlotIndex(createdDate.getHours(), slots)].value += amount
    } else if (
      createdDate >= yesterdayStart &&
      createdDate < todayStart
    ) {
      yesterdayTotal += amount
    }
  }

  const average = todayCount > 0 ? todayTotal / todayCount : 0

  return {
    caption: capitalize(
      `${now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })} - montants encaissés par tranche horaire`,
    ),
    bars,
    kpis: [
      {
        label: `Montant reçu - ${now.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}`,
        value: euro(todayTotal),
        hint: formatDelta(todayTotal, yesterdayTotal, 'à hier'),
      },
      {
        label: 'Transactions encaissées',
        value: String(todayCount),
        hint: `Panier moyen ${euro(average)}`,
      },
    ],
  }
}

function buildWeekData(transactions: PartnerTransaction[], now: Date, isCurrentPeriod: boolean): PeriodData {
  const todayStart = startOfDay(now)
  const weekStart = startOfWeek(now)
  const weekEnd = addDays(weekStart, 7)
  const prevWeekStart = addDays(weekStart, -7)

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))

  const bars: Bar[] = days.map((date) => ({
    label: dayLabel(date),
    value: 0,
    current: isCurrentPeriod && date.getTime() === todayStart.getTime(),
  }))

  let weekTotal = 0
  let weekCount = 0
  let prevWeekTotal = 0

  for (const transaction of transactions) {
    const createdDate = new Date(transaction.createdAt)
    const amount = transaction.amountCents / 100

    if (createdDate >= weekStart && createdDate < weekEnd) {
      weekTotal += amount
      weekCount += 1

      const dayIndex = Math.floor(
        (startOfDay(createdDate).getTime() - weekStart.getTime()) / DAY_MS,
      )

      if (dayIndex >= 0 && dayIndex < 7) {
        bars[dayIndex].value += amount
      }
    } else if (createdDate >= prevWeekStart && createdDate < weekStart) {
      prevWeekTotal += amount
    }
  }

  const average = weekCount > 0 ? weekTotal / weekCount : 0

  return {
    caption: capitalize(
      `Semaine du ${days[0].toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
      })} au ${days[6].toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })} - montants encaissés`,
    ),
    bars,
    kpis: [
      {
        label: `Montant reçu - semaine du ${days[0].toLocaleDateString(
          'fr-FR',
          {
            day: 'numeric',
            month: 'long',
          },
        )}`,
        value: euro(weekTotal),
        hint: formatDelta(
          weekTotal,
          prevWeekTotal,
          'à la semaine précédente',
        ),
      },
      {
        label: 'Transactions encaissées',
        value: String(weekCount),
        hint: `Panier moyen ${euro(average)}`,
      },
    ],
  }
}

function buildMonthData(transactions: PartnerTransaction[], now: Date, isCurrentPeriod: boolean): PeriodData {
  const monthStart = startOfMonth(now)
  const prevMonthStart = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() - 1,
    1,
  )
  const nextMonthStart = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    1,
  )

  const daysInMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  ).getDate()

  const offset = (monthStart.getDay() + 6) % 7
  const weekCount = Math.floor((daysInMonth - 1 + offset) / 7) + 1
  const currentWeekIndex = Math.floor((now.getDate() - 1 + offset) / 7)

  const bars: Bar[] = Array.from(
    { length: weekCount },
    (_, index) => ({
      label: `${index + 1}${index === 0 ? 're' : 'e'} sem.`,
      value: 0,
      current: isCurrentPeriod && index === currentWeekIndex,
    }),
  )

  let monthTotal = 0
  let monthCount = 0
  let prevMonthTotal = 0

  for (const transaction of transactions) {
    const createdDate = new Date(transaction.createdAt)
    const amount = transaction.amountCents / 100

    if (createdDate >= monthStart && createdDate < nextMonthStart) {
      monthTotal += amount
      monthCount += 1

      const weekIndex = Math.floor((createdDate.getDate() - 1 + offset) / 7)

      if (bars[weekIndex]) {
        bars[weekIndex].value += amount
      }
    } else if (createdDate >= prevMonthStart && createdDate < monthStart) {
      prevMonthTotal += amount
    }
  }

  const average = monthCount > 0 ? monthTotal / monthCount : 0

  const monthName = monthStart.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })

  const prevMonthName = prevMonthStart.toLocaleDateString('fr-FR', {
    month: 'long',
  })

  return {
    caption: capitalize(
      `${monthName} - montants encaissés par semaine`,
    ),
    bars,
    kpis: [
      {
        label: `Montant reçu - ${monthName}`,
        value: euro(monthTotal),
        hint: formatDelta(
          monthTotal,
          prevMonthTotal,
          `à ${prevMonthName}`,
        ),
      },
      {
        label: 'Transactions encaissées',
        value: String(monthCount),
        hint: `Panier moyen ${euro(average)}`,
      },
    ],
  }
}

function shiftPeriod(date: Date, period: Period, offset: number) {
  const result = new Date(date)

  if (period === 'jour') {
    result.setDate(result.getDate() + offset)
  } else if (period === 'semaine') {
    result.setDate(result.getDate() + offset * 7)
  } else {
    result.setMonth(result.getMonth() + offset)
  }
  return result
}

function transactionsSince(now: Date, period: Period, periodOffset: number) {
  const displayedDate = shiftPeriod(now, period, periodOffset)

  if (period === 'jour') {
    return addDays(startOfDay(displayedDate), -1)
  }
  if (period === 'semaine') {
    return addDays(startOfWeek(displayedDate), -14)
  }
  return new Date(
    displayedDate.getFullYear(),
    displayedDate.getMonth() - 1,
    1,
  )
}

const redeemErrorMessages: Record<string, string> = {
  invalid_qr_code:
    "Ce code n'est pas reconnu, vérifiez la référence saisie.",
  qr_expired_or_used:
    'Ce code a expiré ou a déjà été utilisé.',
  insufficient_balance:
    'Solde insuffisant pour valider ce paiement.',
  account_inactive:
    'Le compte du salarié est inactif.',
  partner_not_validated:
    "Votre compte partenaire n'est pas encore validé.",
}

function Partner() {
  const [period, setPeriod] = useState<Period>('semaine')
  const [periodOffset, setPeriodOffset] = useState(0)
  const [tab, setTab] = useState(tabs[0])
  const [transactions, setTransactions] = useState<PartnerTransaction[]>([])
  const [partnerName, setPartnerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [amountInput, setAmountInput] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  const loadTransactions = useCallback(
    async (selectedPeriod: Period, selectedOffset: number) => {
      try {
        const { transactions: fetched } = await getPartnerTransactions(
          transactionsSince(
            new Date(),
            selectedPeriod,
            selectedOffset,
          ),
        )

        setTransactions(fetched)
        setLoadError(null)
      } catch {
        setLoadError((previous) => previous ?? 'Impossible de charger les données du tableau de bord.')
      }
    },
    [],
  )

  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)

      const [meResult] = await Promise.allSettled([
        getMe(),
      ])

      if (cancelled)
        return

      if (meResult.status === 'fulfilled' && meResult.value.role === 'partner') {
        setPartnerName(meResult.value.partner.name ?? '')
      } else if (meResult.status === 'rejected') {
        setLoadError(
          (previous) =>
            previous ??
            'Impossible de charger les informations du partenaire.',
        )
      }

      setLoading(false)
    }
    init()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
      let cancelled = false

      async function load() {
        setLoading(true)

        try {
          await loadTransactions(period, periodOffset)
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      }

      load()

      return () => {
        cancelled = true
      }
    }, [loadTransactions, period, periodOffset])

  const current = useMemo(() => {
    const now = shiftPeriod(
      new Date(),
      period,
      periodOffset,
    )

    const isCurrentPeriod = periodOffset === 0

    if (period === 'jour') {
      return buildDayData(
        transactions,
        now,
        isCurrentPeriod,
      )
    }

    if (period === 'mois') {
      return buildMonthData(
        transactions,
        now,
        isCurrentPeriod,
      )
    }

    return buildWeekData(
      transactions,
      now,
      isCurrentPeriod,
    )
  }, [transactions, period, periodOffset])

  const maxValue = Math.max(1, ...current.bars.map((bar) => bar.value))
  const totalAmount = current.bars.reduce((sum, bar) => sum + bar.value, 0)

  const handleQrScan = useCallback((value: string) => {
    setCodeInput(value)
    setShowScanner(false)
    setReceipt('QR code reconnu. Vérifiez le montant avant de valider.')
  }, [])

  async function handleRedeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedAmount = Number(amountInput.replace(',', '.'))

    if (!codeInput.trim() || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setReceipt('Merci de renseigner un montant et une référence valides.')
      return
    }

    setSubmitting(true)
    setReceipt('')

    try {
      const { transaction } = await redeemQrCode({
        qrToken: codeInput.trim(),
        amountCents: Math.round(normalizedAmount * 100),
        idempotencyKey: crypto.randomUUID(),
      })

      setReceipt(`Paiement de ${euro(transaction.amountCents / 100)} validé.`)
      setAmountInput('')
      setCodeInput('')

      await loadTransactions(period, periodOffset)
    } catch (caughtError) {
      const { error: code } = getApiError(caughtError)

      setReceipt(redeemErrorMessages[code] ?? 'Une erreur est survenue, veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <nav className="dash-tabs" aria-label="Sections de l'espace partenaire">
        {tabs.map((item) => (
          <button
            key={item}
            className={item === tab ? 'dash-tab dash-tab-active' : 'dash-tab'}
            type="button"
            aria-current={
              item === tab ? 'page' : undefined
            }
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      {tab === tabs[1] ? (
        <Network establishment={partnerName} />
      ) : (
        <div className="dash-inner dash-body">
          <SimulationNotice />

          <div className="dash-head">
            <h1 className="dash-title">
              {partnerName || 'Chargement…'}
            </h1>

            <div className="dash-period-controls">
              <div
                className="segmented"
                role="group"
                aria-label="Période affichée"
              >
                {periods.map((item) => (
                  <button
                    key={item.id}
                    className={
                      item.id === period
                        ? 'segment segment-active'
                        : 'segment'
                    }
                    type="button"
                    aria-pressed={item.id === period}
                    onClick={() => {
                      setPeriod(item.id)
                      setPeriodOffset(0)
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="period-navigation">
                <button
                  type="button"
                  className="period-nav-button"
                  onClick={() => setPeriodOffset((offset) => offset - 1)}
                >
                  ← Précédent
                </button>

                {periodOffset !== 0 && (
                  <button
                    type="button"
                    className="period-nav-button"
                    onClick={() => setPeriodOffset(0)}
                  >
                    Aujourd’hui
                  </button>
                )}
              </div>
            </div>
          </div>

          {loadError && (
            <p className="chart-note" role="alert">
              {loadError}
            </p>
          )}

          <dl className="kpi-grid">
            {current.kpis.map((kpi) => (
              <div className="kpi-card" key={kpi.label}>
                <dt className="kpi-label">
                  {kpi.label}
                </dt>

                <dd className="kpi-value">
                  {kpi.value.includes('€') ? (
                    <Amount>{kpi.value}</Amount>
                  ) : (
                    kpi.value
                  )}
                </dd>

                <dd className="kpi-hint">
                  {kpi.hint.includes('€') ? (
                    <Amount>{kpi.hint}</Amount>
                  ) : (
                    kpi.hint
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <div className="dash-grid">
            <figure className="chart-card">
              <figcaption>
                <h2>
                  {period === 'jour' ? 'Transactions par tranche horaire' : period === 'semaine' ? 'Transactions par jour' : 'Transactions par semaine'}
                </h2>
                <p>
                  {loading ? 'Chargement des données…' : current.caption}
                </p>
              </figcaption>

              <div
                className="chart"
                role="img"
                aria-label={`${current.caption}. Total ${euro(
                  totalAmount,
                )} sur ${current.bars.length} périodes.`}
              >
                {current.bars.map((bar) => (
                  <div className="chart-column" key={bar.label}>
                    <span className="chart-value">
                      <Amount showLabel={false}>
                        {euro(bar.value)}
                      </Amount>
                    </span>

                    <div className="chart-track">
                      <div
                        className={
                          bar.current
                            ? 'chart-bar current'
                            : 'chart-bar'
                        }
                        style={{
                          height: `${
                            (bar.value / maxValue) * 100
                          }%`,
                        }}
                      />
                    </div>

                    <span className="chart-label">
                      {bar.label}
                    </span>
                  </div>
                ))}
              </div>

              <p className="chart-legend">
                <span className="chart-key" aria-hidden="true" />
                {periodOffset === 0 ? 'Période en cours, montant non consolidé.' : 'Période passée, montant consolidé.'}
              </p>
            </figure>

            <aside className="pay-card" aria-labelledby="pay-title">
              <h2 id="pay-title">
                Recevoir un paiement
              </h2>

              <p className="pay-intro">
                Deux méthodes d'encaissement au choix.
              </p>

              <div className="pay-method">
                <h3>
                  1. Scanner le QR code du salarié
                </h3>

                <p>
                  La caméra s'ouvre, le montant est
                  confirmé à l'écran avant validation.
                </p>

                <button
                  className="pay-primary"
                  type="button"
                  onClick={() => {
                    setReceipt('')
                    setShowScanner(true)
                  }}
                >
                  Ouvrir le scanner
                </button>
              </div>

              <form
                className="pay-method"
                onSubmit={handleRedeem}
              >
                <h3>2. Saisie manuelle</h3>

                <div className="pay-field">
                  <label htmlFor="amount">
                    Montant en euros{' '}
                    <span className="required" aria-hidden="true" >
                      *
                    </span>
                  </label>

                  <input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="11,80"
                    value={amountInput}
                    onChange={(event) =>
                      setAmountInput(event.target.value)
                    }
                    required
                  />
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
                    value={codeInput}
                    onChange={(event) =>
                      setCodeInput(event.target.value)
                    }
                    required
                  />
                </div>

                <button className="pay-secondary" type="submit" disabled={submitting}>
                  {submitting ? 'Validation…' : "Valider l'encaissement"}
                </button>
              </form>

              <p className="pay-receipt" role="status" aria-live="polite">
                {receipt}
              </p>
            </aside>
          </div>
        </div>
      )}

      {showScanner && (<QrScanner onScan={handleQrScan} onClose={() => setShowScanner(false)} />)}
    </>
  )
}

export default Partner
