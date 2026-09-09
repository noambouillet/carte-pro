import './Login.css'
import { useState } from 'react'
import { login } from '../api/Auth'
import { getApiError } from '../api/Errors'
import Modal from '../components/Modal'

type LoginProps = {
  onCreateAccount: () => void
  onLoginSuccess: (role: string) => void
}

function Login({ onCreateAccount, onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPartnerNotValidated, setShowPartnerNotValidated] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    try {
      const response = await login({ email, password })
      if (response.role === 'employee') {
        onLoginSuccess('employee')
      } else if (response.role === 'partner') {
        onLoginSuccess('partner')
      } else if (response.role === 'admin') {
        onLoginSuccess('admin')
      } else {
        setError("L'e-mail ou le mot de passe est incorrect.")
      }
    } catch (caughtError) {
      const { error: code } = getApiError(caughtError)

      if (code === 'partner_not_validated') {
        setShowPartnerNotValidated(true)
      } else {
        setError("L'e-mail ou le mot de passe est incorrect.")
      }
    }
  }

  return (
    <section className="login-card" aria-label="Connexion">
      <h1>Se connecter</h1>
      <p className="intro">
        Accédez à votre espace d&apos;administration de la transition numérique
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
        En continuant, vous acceptez les conditions générales d'utilisation.
      </p>

      {showPartnerNotValidated && (
        <Modal
          title="Compte en cours de vérification"
          onClose={() => setShowPartnerNotValidated(false)}
        >
          <p>
            Votre compte partenaire n&apos;est pas encore vérifié. Un
            administrateur doit valider votre dossier avant que vous
            puissiez vous connecter.
          </p>
        </Modal>
      )}
    </section>
  )
}

export default Login
