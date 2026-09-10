import { useEffect, useState } from 'react'
import './App.css'
import './shared.css'
import { getMe } from './api/Auth'
import { deleteEmployeeAccount } from './api/Employee'
import { getApiError } from './api/Errors'
import Admin from './pages/Admin'
import CreateAccount from './pages/Register'
import Footer from './components/Footer'
import Header from './components/Header'
import Home from './pages/LandingPage'
import Login from './pages/Login'
import Modal from './components/Modal'
import Partner from './pages/Partner'
import Employee from './pages/Employee'

type Screen = 'home' | 'login' | 'create' | 'employee' | 'partner' | 'admin'

const wideScreens: Screen[] = ['home', 'employee', 'partner', 'admin']

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteAccount = async () => {
    if (deleting)
      return

    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteEmployeeAccount()
      setShowDeleteConfirm(false)
      setDeleting(false)
      setIsLoggedIn(false)
      setScreen('home')
    } catch (err) {
      setDeleteError(getApiError(err).message ?? 'Impossible de supprimer votre compte.')
      setDeleting(false)
    }
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  useEffect(() => {
    getMe()
      .then((me) => {
        setIsLoggedIn(true)
        setScreen(me.role)
      })
      .catch(() => {
      })
      .finally(() => setCheckingSession(false))
  }, [])

  if (checkingSession) {
    return <p className="page-shell">Chargement…</p>
  }

  return (
    <div className="app-shell">
      <Header
        onHome={() => setScreen('home')}
        onBecomePartner={() => setScreen('create')}
        onLogin={() => setScreen('login')}
        isLoggedIn={isLoggedIn}
        isEmployee={screen === 'employee'}
        onDeleteAccount={() => setShowDeleteConfirm(true)}
        onLogout={() => {
          setIsLoggedIn(false)
          setScreen('home')
        }}
      />

      <main
        className={
          wideScreens.includes(screen)
            ? 'page-shell page-shell-flush'
            : 'page-shell'
        }
      >
        {screen === 'home' && (
          <Home
            onLogin={() => setScreen('login')}
            onBecomePartner={() => setScreen('create')}
            onEmployee={() => setScreen('employee')}
            onAdmin={() => setScreen('admin')}
            onPartner={() => setScreen('partner')}
            isLoggedIn={isLoggedIn}
          />
        )}

        {screen === 'login' && (
          <Login
            onCreateAccount={() => setScreen('create')} 
            onLoginSuccess={(role) => {
              if (role === 'employee') {
                setScreen('employee')
                setIsLoggedIn(true)
              } else if (role === 'partner') {
                setScreen('partner')
                setIsLoggedIn(true)
              } else if (role === 'admin') {
                setScreen('admin')
                setIsLoggedIn(true)
              }
            }}
          />
        )}

        {screen === 'create' && (
          <CreateAccount onBackToLogin={() => setScreen('login')} />
        )}

        {screen === 'employee' && <Employee />}

        {screen === 'partner' && <Partner />}

        {screen === 'admin' && <Admin />}
      </main>

      <Footer />

      {showDeleteConfirm && (
        <Modal
          title="Supprimer votre compte ?"
          closeLabel="Annuler"
          confirmLabel={deleting ? 'Suppression…' : 'Supprimer'}
          confirmDisabled={deleting}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteAccount}
        >
          <p>
            Cette action désactive votre compte Carte Pro et vous déconnecte
            immédiatement. Vous ne pourrez plus vous reconnecter tant qu'un
            administrateur n'aura pas réactivé votre compte.
          </p>
          {deleteError && <p role="alert">{deleteError}</p>}
        </Modal>
      )}
    </div>
  )
}

export default App
