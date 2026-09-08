import { useState } from 'react'
import { cleanSiren, formatSiren, validateSiren } from '../components/Siren'
import { registerEmployee } from '../api/Employee'
import { registerPartner } from '../api/Partners'
import './Register.css'

type CreateAccountProps = {
  onBackToLogin: () => void
}

const PURPOSE_MIN = 10

function CreateAccount({ onBackToLogin }: CreateAccountProps) {
  const [role, setRole] = useState('')
  const [touched, setTouched] = useState({ siren: false, purpose: false })
  const [submitted, setSubmitted] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [siren, setSiren] = useState('')
  const [socialPurpose, setSocialPurpose] = useState('')
  const [establishmentName, setEstablishmentName] = useState('')
  const [establishmentAddress, setEstablishmentAddress] = useState('')
  const [establishmentPhone, setEstablishmentPhone] = useState('')

  const isPartner = role === 'partner'

  const sirenError = isPartner ? validateSiren(siren) : null
  const purposeError =
    isPartner && socialPurpose.trim().length < PURPOSE_MIN
      ? `Décrivez l'activité en ${PURPOSE_MIN} caractères minimum.`
      : null

  const showSirenError = Boolean(sirenError) && (touched.siren || submitted)
  const showPurposeError =
    Boolean(purposeError) && (touched.purpose || submitted)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    try {
      if (role === 'employee') {
        console.log('Registering employee:', firstName, lastName, email)
        await registerEmployee({ first_name: firstName, last_name: lastName, email, password })
      } else if (role === 'partner') {
        await registerPartner(
            firstName,
            lastName,
            email,
            password,
            cleanSiren(siren),
            socialPurpose,
            establishmentName,
            establishmentAddress,
            establishmentPhone
        )
      }

      onBackToLogin()
    } catch (error) {
      console.error('Erreur lors de l\'inscription :', error)
    }
  }

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
        onSubmit={handleSubmit}
      >
        <div className="field-group">
          <label htmlFor="firstname">Prénom</label>
          <input
            id="firstname"
            type="text"
            placeholder="Jean"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </div>

        <div className="field-group">
          <label htmlFor="lastname">Nom</label>
          <input
            id="lastname"
            type="text"
            placeholder="Dupont"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </div>

        <div className="field-group">
          <label htmlFor="create-email">Adresse e-mail</label>
          <input
            id="create-email"
            type="email"
            placeholder="jean.dupont@domaine.gouv.fr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field-group">
          <label htmlFor="create-password">Mot de passe</label>
          <input
            id="create-password"
            type="password"
            placeholder="Entrez votre mot de passe"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className="field-group">
          <label htmlFor="confirm-password">Confirmer le mot de passe</label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Confirmez votre mot de passe"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
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
                placeholder="732 829 320"
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
                value={socialPurpose}
                placeholder="boulangerie-pâtisserie artisanale"
                aria-invalid={showPurposeError || undefined}
                aria-describedby={
                  showPurposeError ? 'purpose-error' : 'purpose-hint'
                }
                onChange={(event) => setSocialPurpose(event.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, purpose: true }))}
              />
              {showPurposeError ? (
                <p className="field-error" id="purpose-error">
                  {purposeError}
                </p>
              ) : (
                <p className="field-hint" id="purpose-hint">
                  Activité principale déclarée lors de l'immatriculation.
                </p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="name">Nom de l'établissement</label>
              <input
                id="name"
                type="text"
                placeholder="Boulangerie Dupont"
                value={establishmentName}
                onChange={(event) => setEstablishmentName(event.target.value)}
              />

            </div>

            <div className="field-group">
              <label htmlFor="address">Adresse de l'établissement</label>
              <input
                id="address"
                type="text"
                placeholder="12 rue de la République, 75001 Paris"
                value={establishmentAddress}
                onChange={(event) => setEstablishmentAddress(event.target.value)}
              />
            </div>

            <div className="field-group">
              <label htmlFor="phone">Numéro de téléphone (public)</label>
              <input
                id="phone"
                type="tel"
                placeholder="01 23 45 67 89"
                value={establishmentPhone}
                onChange={(event) => setEstablishmentPhone(event.target.value)}
              />
            </div>
          </>
        )}

        <button
          className="primary-button"
          type="submit"
        >
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
