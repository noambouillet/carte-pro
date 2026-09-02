import './Footer.css'

const footerLinks = [
  'Gestion des cookies',
]

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <div className="footer-identity">
            <span className="brand-flag" aria-hidden="true" />
            <span className="brand-ministry">
              Ministère
              <br />
              du job
              <br />
              et bonheur
            </span>
          </div>

          <p className="footer-note">
            Ticket Tout est un dispositif d&apos;avantages salariés dématérialisés
            opéré par le Ministère du Job et Bonheur.
          </p>
        </div>

        <nav className="footer-nav" aria-label="Liens de bas de page">
          <ul>
            {footerLinks.map((label) => (
              <li key={label}>
                <a href="/">{label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
