import './Header.css'
import { logout } from '../api/Auth'

type HeaderProps = {
  onHome: () => void
  onBecomePartner: () => void
  onLogin: () => void
  onLogout: () => void
  isLoggedIn: boolean
}

function Header({
  onHome,
  onBecomePartner,
  onLogin,
  onLogout,
  isLoggedIn,
}: HeaderProps) {
  async function handleLogout() {
    try {
      await logout()
      onLogout()
    } catch (error) {
      console.error('Erreur lors de la déconnexion :', error)
    }
  }

  return (
    <header className="site-header">  
      <div className="site-header-inner">
        <button
          className="brand"
          type="button"
          onClick={onHome}
          aria-label="Ticket Tout, retour à l'accueil"
        >

          <span className="brand-separator" aria-hidden="true" />

          <span className="brand-product">
            <span className="brand-name">Ticket Tout</span>
            <span className="brand-tagline">
              Avantages salariés dématérialisés
            </span>
          </span>
        </button>
        <nav className="site-nav site-nav-actions" aria-label="Navigation principale">
          {!isLoggedIn && (
            <button className="nav-link" type="button" onClick={onBecomePartner}>
              Devenir partenaire
            </button>
          )}
          
          {!isLoggedIn && (
            <button className="nav-button" type="button" onClick={onLogin}>
              Se connecter
            </button>
          )}

          {isLoggedIn && (
            <button className="nav-button" type="button" onClick={handleLogout}>
              Se déconnecter
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header
