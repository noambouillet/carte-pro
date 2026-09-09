import { useEffect, useState } from 'react'
import { searchPartners, type PartnerDirectoryEntry } from '../api/Partners'
import { getApiError } from '../api/Errors'
import './Network.css'

type NetworkProps = {
  establishment: string
}

function Network({ }: NetworkProps) {
  const [partnersList, setPartnersList] = useState<PartnerDirectoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    searchPartners(query)
      .then((data) => {
        if (!cancelled) {
          setPartnersList(data.partners)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiError(err).message ?? 'Impossible de charger les partenaires.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <div className="dash-inner dash-body">
      <h1 className="dash-title">Réseau des partenaires</h1>
      <p className="dash-subtitle">
        Consultez les établissements référencés. Les commerçants du réseau acceptent tous le paiement Carte Pro.
      </p>

      <div className="filters">
        <div className="filter-field">
          <label htmlFor="search">Rechercher un établissement ou une adresse</label>
          <input
            id="search"
            type="search"
            value={query}
            placeholder="Exemple : Boulangerie, Rue de Paris"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p>Chargement des partenaires…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <>
          <p className="filter-count" role="status">
            {partnersList.length} établissement{partnersList.length > 1 ? 's' : ''} trouvé{partnersList.length > 1 ? 's' : ''}
          </p>

          {partnersList.length === 0 ? (
            <p className="filter-empty">
              Aucun établissement trouvé.
            </p>
          ) : (
            <ul className="partner-grid">
              {partnersList.map((partner) => (
                <li className="partner-card" key={partner.id}>
                  <h2>{partner.name}</h2>
                  <p>{partner.address}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export default Network