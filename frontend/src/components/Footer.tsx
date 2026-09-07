import './Footer.css'

const footerLinks = [
  'Gestion des cookies',
]

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <p className="footer-disclaimer">
            Démonstrateur technique, ne constitue pas un service public en
            exploitation.
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
