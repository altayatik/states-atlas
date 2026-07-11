import { Compass, PencilLine } from 'lucide-react'

const navItems = [
  ['overview', '#/overview', 'Overview'],
  ['states', '#/states', 'Map'],
  ['parks', '#/parks', 'Parks'],
  ['achievements', '#/achievements', 'Milestones'],
]

export function TravelNav({ activeSection }) {
  return (
    <header className="topbar">
      <a className="topbar__brand" href="#/overview" aria-label="Travel Atlas home">
        <span className="topbar__mark" aria-hidden="true">
          <Compass size={16} />
        </span>
        <span className="topbar__name">Travel Atlas</span>
      </a>

      <nav className="topbar__nav" aria-label="Sections">
        {navItems.map(([key, href, label]) => (
          <a
            aria-current={activeSection === key ? 'page' : undefined}
            className={activeSection === key ? 'is-active' : ''}
            href={href}
            key={key}
          >
            {label}
          </a>
        ))}
      </nav>

      <a className="topbar__edit" href="#/edit">
        <PencilLine size={15} aria-hidden="true" />
        <span>Edit</span>
      </a>
    </header>
  )
}
