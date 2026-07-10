export function TravelNav({ activeSection }) {
  return (
    <nav className="travel-nav" aria-label="Travel atlas sections">
      <a className={activeSection === 'states' ? 'is-active' : ''} href="#/states">
        States
      </a>
      <a className={activeSection === 'parks' ? 'is-active' : ''} href="#/parks">
        National Parks
      </a>
    </nav>
  )
}
