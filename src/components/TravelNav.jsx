import { Home, MapPinned, Mountain, Trophy, Wrench } from 'lucide-react'

const navItems = [
  ['states', '#/states', 'Map', MapPinned],
  ['overview', '#/overview', 'Overview', Home],
  ['parks', '#/parks', 'National Parks', Mountain],
  ['achievements', '#/achievements', 'Achievements', Trophy],
]

export function TravelNav({ activeSection }) {
  return (
    <nav className="travel-nav glass-nav" aria-label="Travel atlas sections">
      {navItems.map(([key, href, label, Icon]) => (
        <a className={activeSection === key ? 'is-active' : ''} href={href} key={key}>
          <Icon size={17} aria-hidden="true" />
          <span>{label}</span>
        </a>
      ))}
      <a className="travel-nav__edit" href="#/edit">
        <Wrench size={17} aria-hidden="true" />
        <span>Edit</span>
      </a>
    </nav>
  )
}
