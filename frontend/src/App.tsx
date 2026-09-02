import { useEffect, useState } from 'react'
import './App.css'
import './shared.css'
import Admin from './pages/Admin.tsx'
import CreateAccount from './pages/Register.tsx'
import Footer from './components/Footer.tsx'
import Header from './components/Header.tsx'
import Home from './pages/LandingPage.tsx'
import LoginView from './pages/Login.tsx'
import Partner from './pages/Partner.tsx'
import Employee from './pages/Employee.tsx'

type Screen = 'home' | 'login' | 'create' | 'employee' | 'partner' | 'admin'

const wideScreens: Screen[] = ['home', 'employee', 'partner', 'admin']

function App() {
  const [screen, setScreen] = useState<Screen>('home')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  return (
    <div className="app-shell">
      <Header
        onHome={() => setScreen('home')}
        onEmployee={() => setScreen('employee')}
        onPartner={() => setScreen('partner')}
        onAdmin={() => setScreen('admin')}
        onBecomePartner={() => setScreen('create')}
        onLogin={() => setScreen('login')}
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
            onPartner={() => setScreen('login')}
          />
        )}

        {screen === 'login' && (
          <LoginView onCreateAccount={() => setScreen('create')} />
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
