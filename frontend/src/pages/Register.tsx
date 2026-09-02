import { useState } from 'react'
import { cleanSiren, formatSiren, validateSiren } from '../components/siren'
import './Register.css'

type CreateAccountProps = {
  onBackToLogin: () => void
}

const PURPOSE_MIN = 10

function CreateAccount({ onBackToLogin }: CreateAccountProps) {
  const [role, setRole] = useState('')
  const [siren, setSiren] = useState('')
  const [purpose, setPurpose] = useState('')
  const [touched, setTouched] = useState({ siren: false, purpose: false })
  const [submitted, setSubmitted] = useState(false)

  const isPartner = role === 'partner'

  const sirenError = isPartner ? validateSiren(siren) : null
  const purposeError =
    isPartner && purpose.trim().length < PURPOSE_MIN
      ? `Décrivez l'activité en ${PURPOSE_MIN} caractères minimum.`
      : null

  const showSirenError = Boolean(sirenError) && (touched.siren || submitted)
  const showPurposeError =
    Boolean(purposeError) && (touched.purpose || submitted)

  return (
    <section className="login-card" aria-label="Création de compte">
      <h1>Créer un compte</h1>
      <p className="intro">
        Renseignez vos informations pour accéder à votre espace et gérer vos
        projets.
      </p>

      <form
        className="login-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(true)
        }}
      >
        <div className="field-group">
          <label htmlFor="fullname">Nom complet</label>
          <input
            id="fullname"
            type="text"
            placeholder="Exemple : Jean Dupont"
          />
        </div>

        <div className="field-group">
          <label htmlFor="create-email">Adresse e-mail</label>
          <input
            id="create-email"
            type="email"
            placeholder="Exemple : nom@domaine.gouv.fr"
          />
        </div>

        <div className="field-group">
          <label htmlFor="create-password">Mot de passe</label>
          <input
            id="create-password"
            type="password"
            placeholder="Créez votre mot de passe"
          />
        </div>

        <div className="field-group">
          <label htmlFor="confirm-password">Confirmer le mot de passe</label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Confirmez votre mot de passe"
          />
        </div>

        <div className="field-group">
          <label htmlFor="role">Rôle</label>
          <select
            id="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="" disabled>
              Sélectionnez un rôle
            </option>
            <option value="employee">Salarié</option>
            <option value="partner">Partenaire</option>
          </select>
        </div>

        {isPartner && (
          <>
            <div className="field-group">
              <label htmlFor="siren">Numéro SIREN</label>
              <input
                id="siren"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={formatSiren(siren)}
                placeholder="Exemple : 732 829 320"
                aria-invalid={showSirenError || undefined}
                aria-describedby={showSirenError ? 'siren-error' : 'siren-hint'}
                onChange={(event) => setSiren(cleanSiren(event.target.value))}
                onBlur={() => setTouched((prev) => ({ ...prev, siren: true }))}
              />
              {showSirenError ? (
                <p className="field-error" id="siren-error">
                  {sirenError}
                </p>
              ) : (
                <p className="field-hint" id="siren-hint">
                  9 chiffres, figurant sur votre avis de situation INSEE.
                </p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="purpose">Objet social</label>
              <input
                id="purpose"
                type="text"
                maxLength={160}
                value={purpose}
                placeholder="Exemple : boulangerie-pâtisserie artisanale"
                aria-invalid={showPurposeError || undefined}
                aria-describedby={
                  showPurposeError ? 'purpose-error' : 'purpose-hint'
                }
                onChange={(event) => setPurpose(event.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, purpose: true }))}
              />
              {showPurposeError ? (
                <p className="field-error" id="purpose-error">
                  {purposeError}
                </p>
              ) : (
                <p className="field-hint" id="purpose-hint">
                  Activité principale déclarée lors de l&apos;immatriculation.
                </p>
              )}
            </div>
          </>
        )}

        <button className="primary-button" type="submit">
          Créer mon compte
        </button>

        <button
          className="secondary-button secondary-button-spaced"
          type="button"
          onClick={onBackToLogin}
        >
          Retour à la connexion
        </button>
      </form>
    </section>
  )
}

export default CreateAccount
