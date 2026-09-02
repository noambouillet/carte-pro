import './Header.css'

type HeaderProps = {
  onHome: () => void
  onEmployee: () => void
  onPartner: () => void
  onAdmin: () => void
  onBecomePartner: () => void
  onLogin: () => void
}

function Header({
  onHome,
  onEmployee,
  onPartner,
  onAdmin,
  onBecomePartner,
  onLogin,
}: HeaderProps) {
  return (
    <header className="site-header">
      <div className="brand-rule" aria-hidden="true">
        <span className="brand-rule-blue" />
        <span className="brand-rule-red" />
      </div>

      <div className="site-header-inner">
        <button
          className="brand"
          type="button"
          onClick={onHome}
          aria-label="Ticket Tout, retour à l'accueil"
        >
          <span className="brand-flag" aria-hidden="true" />
          <span className="brand-ministry">
            Ministère
            <br />
            du job
            <br />
            et bonheur
          </span>

          <span className="brand-separator" aria-hidden="true" />

          <span className="brand-product">
            <span className="brand-name">Ticket Tout</span>
            <span className="brand-tagline">
              Avantages salariés dématérialisés
            </span>
          </span>
        </button>

        <nav className="site-nav site-nav-roles" aria-label="Espaces">
          <button className="nav-role-button" type="button" onClick={onEmployee}>
            Salarié
          </button>
          <button
            className="nav-role-button"
            type="button"
            onClick={onPartner}
          >
            Partenaire
          </button>
          <button className="nav-role-button" type="button" onClick={onAdmin}>
            Admin
          </button>
        </nav>

        <nav className="site-nav site-nav-actions" aria-label="Navigation principale">
          <button className="nav-link" type="button" onClick={onBecomePartner}>
            Devenir partenaire
          </button>
          <button className="nav-button" type="button" onClick={onLogin}>
            Se connecter
          </button>
        </nav>
      </div>
    </header>
  )
}

export default Header
