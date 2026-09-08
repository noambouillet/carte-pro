import { useEffect, useState } from 'react'
import './App.css'
import './shared.css'
import Admin from './pages/Admin'
import CreateAccount from './pages/Register'
import Footer from './components/Footer'
import Header from './components/Header'
import Home from './pages/LandingPage'
import Login from './pages/Login'
import Partner from './pages/Partner'
import Employee from './pages/Employee'

type Screen = 'home' | 'login' | 'create' | 'employee' | 'partner' | 'admin'

const wideScreens: Screen[] = ['home', 'employee', 'partner', 'admin']

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  return (
    <div className="app-shell">
      <Header
        onHome={() => setScreen('home')}
        onBecomePartner={() => setScreen('create')}
        onLogin={() => setScreen('login')}
        isLoggedIn={isLoggedIn}
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
    </div>
  )
}

export default App
