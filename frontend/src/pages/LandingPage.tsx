import './LandingPage.css'
import { partners } from './partners'
import { getMe } from '../api/Auth'

type HomeProps = {
  onLogin: () => void
  onBecomePartner: () => void
  onEmployee?: () => void
  onAdmin?: () => void
  onPartner?: () => void
  isLoggedIn: boolean
}

const steps = [
  {
    title: "L'employeur crédite le compte",
    text: "L'abondement mensuel est versé sur le compte Ticket Tout de chaque salarié, à date fixe.",
  },
  {
    title: 'Le salarié paie par QR code',
    text: 'En caisse, le salarié présente un QR code valable 5 minutes. Le montant est débité du solde.',
  },
  {
    title: 'Le partenaire est réglé',
    text: 'Le virement est émis sous 48 heures ouvrées, avec un relevé détaillé des transactions.',
  },
]



function Home({ onLogin, onBecomePartner, onEmployee, onAdmin, onPartner, isLoggedIn }: HomeProps) {
  async function handleAccessPersonalSpace() {
    try {
      const response = await getMe()

      if (response && response.role) {
        if (response.role === 'employee' && onEmployee) {
          onEmployee()
        } else if (response.role === 'partner' && onPartner) {
          onPartner()
        } else if (response.role === 'admin' && onAdmin) {
          onAdmin()
        } else {
          console.error('Unknown role:', response.role)
          onLogin()
        }
      } else {
        onLogin()
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      onLogin()
    }
  }

  return (
    <>
      <div className="home">
        <div className="home-main">
          <span className="badge">Dispositif national</span>

          <h1 className="home-title">
            Les avantages salariés, crédités par l&apos;employeur et dépensés
            chez les commerçants du réseau.
          </h1>

          <p className="home-lead">
            Ticket Tout remplace les titres papier : votre employeur crédite votre
            compte, vous payez par QR code chez un partenaire référencé, le partenaire est réglé sous 48 heures.
          </p>

          {!isLoggedIn && (
            <div className="home-actions">
            <button className="action-primary" type="button" onClick={onLogin}>
              Se connecter
            </button>
            <button
              className="action-secondary"
              type="button"
              onClick={onBecomePartner}
            >
              Devenir partenaire
            </button>
          </div>
          )}

          <dl className="home-stats">
            <div className="stat">
              <dt className="stat-value">128 400</dt>
              <dd className="stat-label">salariés bénéficiaires</dd>
            </div>
            <div className="stat">
              <dt className="stat-value">5 731</dt>
              <dd className="stat-label">commerçants partenaires</dd>
            </div>
            <div className="stat">
              <dt className="stat-value">1 246</dt>
              <dd className="stat-label">employeurs adhérents</dd>
            </div>
          </dl>
        </div>

        <aside className="home-aside" aria-labelledby="audience-title">
          <h2 className="aside-title" id="audience-title">
            À qui s&apos;adresse Ticket Tout
          </h2>

          <div className="aside-block">
            <h3>Salariés</h3>
            <p>
              Consultez votre solde, générez votre QR code de paiement et
              retrouvez les partenaires autour de vous.
            </p>
            <button className="aside-link"
              type="button"
              onClick={handleAccessPersonalSpace}
            >
              Accéder à mon espace
            </button>
          </div>
        </aside>
      </div>

      <section className="band band-muted" aria-labelledby="steps-title">
        <div className="band-inner">
          <h2 className="band-title" id="steps-title">
            Comment ça marche
          </h2>

          <ol className="step-grid">
            {steps.map((step, index) => (
              <li className="step-card" key={step.title}>
                <span className="step-number" aria-hidden="true">
                  {index + 1}
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band" aria-labelledby="network-title">
        <div className="band-inner">
          <div className="band-head">
            <div>
              <h2 className="band-title" id="network-title">
                Le réseau de partenaires
              </h2>
              <p className="band-subtitle">
                5 731 commerçants référencés dans 13 régions. Aperçu de quelques
                établissements.
              </p>
            </div>
          </div>

          <ul className="partner-grid">
            {partners.slice(0, 6).map((partner) => (
              <li className="partner-card" key={partner.name}>
                <span className="partner-category">{partner.category}</span>
                <h3>{partner.name}</h3>
                <p>{partner.city}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}

export default Home
