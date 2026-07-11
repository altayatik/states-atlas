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
  X,
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

const canadaAchievementIds = new Set([
  'canada_stamp',
  'canadian_park_starter',
  'canada_province_sampler',
  'canada_halfway',
  'canadian_park_trail',
  'north_of_border_city',
])

export function Achievements({ achievements }) {
  const [selectedId, setSelectedId] = useState('')
  const selectedAchievement = achievements.find((achievement) => achievement.id === selectedId)
  const canadaAchievements = achievements.filter((achievement) => canadaAchievementIds.has(achievement.id))
  const mainAchievements = achievements.filter((achievement) => !canadaAchievements.includes(achievement))
  const orderedAchievements = [...mainAchievements, ...canadaAchievements]
  const SelectedIcon = selectedAchievement
    ? selectedAchievement.unlocked
      ? achievementIcons[selectedAchievement.icon] ?? Stamp
      : Lock
    : null

  return (
    <section className="content-section achievements-section" aria-labelledby="achievements-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Quest board</p>
          <h2 id="achievements-title">Achievement badges</h2>
        </div>
        <p>Unlocked tiles stay vivid, locked ones stay quiet, and each badge keeps its progress available on tap.</p>
      </div>
      <div className="achievement-grid">
        {orderedAchievements.map((achievement, index) => {
          const Icon = achievement.unlocked
            ? achievementIcons[achievement.icon] ?? Stamp
            : Lock

          return (
            <article
              className={[
                'achievement',
                achievement.unlocked ? 'achievement--unlocked' : '',
              ].filter(Boolean).join(' ')}
              key={achievement.id}
              style={{ '--achievement-accent': achievement.accent, '--i': index }}
            >
              <button
                className="achievement__button"
                aria-label={`${achievement.name}: ${achievement.unlocked ? 'Unlocked' : 'Locked'}, ${achievement.progressText}`}
                type="button"
                onClick={() => setSelectedId(achievement.id)}
              >
                <span className="achievement__icon">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span className="achievement__text">
                  <strong>{achievement.name}</strong>
                  <small>{achievement.unlocked ? 'Unlocked' : 'Locked'} · {achievement.progressText}</small>
                </span>
              </button>
            </article>
          )
        })}
      </div>

      {selectedAchievement && (
        <div
          className="achievement-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedId('')
          }}
        >
          <article
            aria-labelledby="achievement-modal-title"
            aria-modal="true"
            className="achievement-modal glass-panel"
            role="dialog"
            style={{ '--achievement-accent': selectedAchievement.accent }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              aria-label="Close achievement"
              className="icon-button achievement-modal__close"
              type="button"
              onClick={() => setSelectedId('')}
            >
              <X size={18} aria-hidden="true" />
            </button>
            <div className="achievement-modal__icon">
              {SelectedIcon && <SelectedIcon size={26} aria-hidden="true" />}
            </div>
            <p className="eyebrow">{selectedAchievement.unlocked ? 'Unlocked' : 'Locked'} badge</p>
            <h3 id="achievement-modal-title">{selectedAchievement.name}</h3>
            <p>{selectedAchievement.description}</p>
            <span>{selectedAchievement.progressText}</span>
          </article>
        </div>
      )}
    </section>
  )
}
