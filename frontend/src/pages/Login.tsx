import './Login.css'

type LoginViewProps = {
  onCreateAccount: () => void
}

function LoginView({ onCreateAccount }: LoginViewProps) {
  return (
    <section className="login-card" aria-label="Connexion">
      <h1>Se connecter</h1>
      <p className="intro">
        Accédez à votre espace d&apos;administration de la transition numérique
        et gérez vos projets.
      </p>

      <form className="login-form">
        <div className="field-group">
          <label htmlFor="email">Adresse e-mail</label>
          <input
            id="email"
            type="email"
            placeholder="Exemple : nom@domaine.gouv.fr"
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
          />
        </div>

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
        En continuant, vous acceptez les conditions générales d&apos;utilisation
        du portail ministériel. Ce site est protégé par les systèmes de
        sécurité de l&apos;État.
      </p>
    </section>
  )
}

export default LoginView
