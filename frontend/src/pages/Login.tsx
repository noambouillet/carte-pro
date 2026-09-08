import './Login.css'
import { useState } from 'react'
import { login } from '../api/Auth'

type LoginProps = {
  onCreateAccount: () => void
  onLoginSuccess: (role: string) => void
}

function Login({ onCreateAccount, onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    try {
      const loginPayload = { email, password }
      const response = await login(loginPayload)
      console.log('Login successful:', response)
      if (response.role === 'employee') {
        onLoginSuccess('employee')
      } else if (response.role === 'partner') {
        onLoginSuccess('partner')
      } else if (response.role === 'admin') {
        onLoginSuccess('admin')
      } else {
        setError("L'e-mail ou le mot de passe est incorrect.")
      }
    } catch {
      setError("L'e-mail ou le mot de passe est incorrect.")
    }
  }

  return (
    <section className="login-card" aria-label="Connexion">
      <h1>Se connecter</h1>
      <p className="intro">
        Accédez à votre espace d'administration de la transition numérique
        et gérez vos projets.
      </p>

      <form
        className="login-form"
        noValidate
        onSubmit={handleSubmit}
        >
        <div className="field-group">
          <label htmlFor="email">Adresse e-mail</label>
          <input
            id="email"
            type="email"
            placeholder="Exemple : nom@domaine.gouv.fr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field-group">
          <div className="label-row">
            <label htmlFor="password">Mot de passe</label>
            <a href="/">Mot de passe oublié ?</a>
          </div>
          <input
            id="password"
            type="password"
            placeholder="Saisissez votre mot de passe"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="primary-button" type="submit">
          Se connecter
        </button>

        <div className="divider" aria-hidden="true">
          <span>ou</span>
        </div>

        <button
          className="secondary-button"
          type="button"
          onClick={onCreateAccount}
        >
          Créer un compte
        </button>
      </form>

      <p className="legal">
        En continuant, vous acceptez les conditions générales d&apos;utilisation.
      </p>
    </section>
  )
}

export default Login
