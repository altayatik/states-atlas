import { useState } from 'react'
import {
  Compass,
  Diamond,
  Flag,
  Gauge,
  Lock,
  MapPin,
  Mountain,
  Palmtree,
  Route,
  Sparkles,
  Stamp,
  Star,
  Sun,
  Trees,
  Trophy,
  Waves,
} from 'lucide-react'

const achievementIcons = {
  compass: Compass,
  diamond: Diamond,
  flag: Flag,
  gauge: Gauge,
  island: Palmtree,
  mountain: Mountain,
  pin: MapPin,
  route: Route,
  sparkles: Sparkles,
  stamp: Stamp,
  star: Star,
  sun: Sun,
  tree: Trees,
  trophy: Trophy,
  waves: Waves,
}

export function Achievements({ achievements }) {
  const [expandedId, setExpandedId] = useState('')

  return (
    <section className="content-section" aria-labelledby="achievements-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Quest board</p>
          <h2 id="achievements-title">Achievement badges</h2>
        </div>
      </div>
      <div className="achievement-grid">
        {achievements.map((achievement) => {
          const Icon = achievement.unlocked
            ? achievementIcons[achievement.icon] ?? Stamp
            : Lock
          const isExpanded = expandedId === achievement.id

          return (
            <article
              className={[
                'achievement',
                achievement.unlocked ? 'achievement--unlocked' : '',
                isExpanded ? 'achievement--expanded' : '',
              ].filter(Boolean).join(' ')}
              key={achievement.id}
              style={{ '--achievement-accent': achievement.accent }}
            >
              <button
                aria-expanded={isExpanded}
                className="achievement__button"
                type="button"
                onClick={() => setExpandedId(isExpanded ? '' : achievement.id)}
              >
                <span className="achievement__icon">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span className="achievement__text">
                  <strong>{achievement.name}</strong>
                  <small>{achievement.unlocked ? 'Unlocked' : 'Locked'} · {achievement.progressText}</small>
                </span>
              </button>
              {isExpanded && (
                <div className="achievement__details">
                  <p>{achievement.description}</p>
                  <span>{achievement.progressText}</span>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
