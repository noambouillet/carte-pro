import { useMemo, useState } from 'react'
import './Network.css'
import { partners } from './partners'

type NetworkProps = {
  establishment: string
}

function Network({ establishment }: NetworkProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('toutes')


  const others = useMemo(
    () => partners.filter((partner) => partner.name !== establishment),
    [establishment],
  )

  const categories = useMemo(
    () => [...new Set(others.map((partner) => partner.category))].sort(),
    [others],
  )

  const results = useMemo(() => {
    const search = query.trim().toLowerCase()

    return others.filter((partner) => {
      const matchCategory =
        category === 'toutes' || partner.category === category
      const matchSearch =
        search === '' ||
        partner.name.toLowerCase().includes(search) ||
        partner.city.toLowerCase().includes(search)

      return matchCategory && matchSearch
    })
  }, [others, query, category])

  return (
    <div className="dash-inner dash-body">
      <h1 className="dash-title">Réseau des partenaires</h1>
      <p className="dash-subtitle">
        Consultez les établissements référencés par le ministère. Les
        commerçants du réseau acceptent tous le paiement Ticket Tout.
      </p>

      <div className="filters">
        <div className="filter-field">
          <label htmlFor="search">Rechercher un établissement ou une ville</label>
          <input
            id="search"
            type="search"
            value={query}
            placeholder="Exemple : librairie, Nantes"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="filter-field filter-field-narrow">
          <label htmlFor="category">Catégorie</label>
          <select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="toutes">Toutes les catégories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="filter-count" role="status">
        {results.length} établissement{results.length > 1 ? 's' : ''} sur{' '}
        {others.length}
      </p>

      {results.length === 0 ? (
        <p className="filter-empty">
          Aucun établissement ne correspond à cette recherche.
        </p>
      ) : (
        <ul className="partner-grid">
          {results.map((partner) => (
            <li className="partner-card" key={partner.name}>
              <span className="partner-category">{partner.category}</span>
              <h2>{partner.name}</h2>
              <p>{partner.city}</p>
              <p className="partner-since">Référencé depuis le {partner.since}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Network
