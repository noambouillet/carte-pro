export type Transaction = {
  date: string
  partner: string
  city: string
  amount: number
  status: string
}

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
