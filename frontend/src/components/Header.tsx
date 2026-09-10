import './Header.css'
import { logout } from '../api/Auth'

type HeaderProps = {
  onHome: () => void
  onBecomePartner: () => void
  onLogin: () => void
  onLogout: () => void
  onDeleteAccount: () => void
  isLoggedIn: boolean
  isEmployee: boolean
}

function Header({
  onHome,
  onBecomePartner,
  onLogin,
  onLogout,
  onDeleteAccount,
  isLoggedIn,
  isEmployee,
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
          aria-label="Carte Pro, retour à l'accueil"
        >

          <span className="brand-separator" aria-hidden="true" />

          <span className="brand-product">
            <span className="brand-name">Carte Pro</span>
            <span className="brand-tagline">
              Avantages salariés dématérialisés
            </span>
          </span>
        </button>
        <nav className="site-nav site-nav-actions" aria-label="Navigation principale">
          {!isLoggedIn && (
            <button className="nav-link" type="button" onClick={onBecomePartner}>
              Créer un compte
            </button>
          )}
          
          {!isLoggedIn && (
            <button className="nav-button" type="button" onClick={onLogin}>
              Se connecter
            </button>
          )}

          {isLoggedIn && isEmployee && (
            <button className="nav-danger" type="button" onClick={onDeleteAccount}>
              Supprimer mon compte
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
