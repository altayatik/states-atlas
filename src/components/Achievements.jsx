import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
import { achievementCategories } from '../data/achievements'

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

function AchievementTile({ achievement, index, onSelect }) {
  const Icon = achievement.unlocked ? achievementIcons[achievement.icon] ?? Stamp : Lock

  return (
    <article
      className={`achievement${achievement.unlocked ? ' achievement--unlocked' : ''}`}
      style={{ '--achievement-accent': achievement.accent, '--i': index }}
    >
      <button
        className="achievement__button"
        aria-label={`${achievement.name}: ${achievement.unlocked ? 'Unlocked' : 'Locked'}, ${achievement.progressText}`}
        type="button"
        onClick={() => onSelect(achievement.id)}
      >
        <span className="achievement__icon">
          <Icon size={19} aria-hidden="true" />
        </span>
        <span className="achievement__text">
          <strong>{achievement.name}</strong>
          <small>{achievement.unlocked ? 'Unlocked' : achievement.progressText}</small>
        </span>
      </button>
    </article>
  )
}

export function Achievements({ achievements }) {
  const [selectedId, setSelectedId] = useState('')
  const selectedAchievement = achievements.find((achievement) => achievement.id === selectedId)
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length

  useEffect(() => {
    if (!selectedId) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedId('')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId])

  const grouped = achievementCategories
    .map((category) => ({
      ...category,
      items: achievements.filter((achievement) => achievement.category === category.id),
    }))
    .filter((category) => category.items.length)

  const SelectedIcon = selectedAchievement
    ? selectedAchievement.unlocked
      ? achievementIcons[selectedAchievement.icon] ?? Stamp
      : Lock
    : null

  return (
    <main className="page page--achievements">
      <header className="quest-head">
        <p className="eyebrow">Quest board</p>
        <h1>Milestones</h1>
        <p className="quest-head__note">
          <strong>{unlockedCount}</strong> of {achievements.length} badges earned — collected across the
          map, the cities, and the poster wall.
        </p>
      </header>

      {grouped.map((category) => {
        const earned = category.items.filter((item) => item.unlocked).length
        return (
          <section className="quest-cat" key={category.id} aria-labelledby={`cat-${category.id}`}>
            <div className="quest-cat__head">
              <div>
                <h2 id={`cat-${category.id}`}>{category.label}</h2>
                <p>{category.blurb}</p>
              </div>
              <span className="quest-cat__count">{earned}<em>/{category.items.length}</em></span>
            </div>
            <div className="achievement-grid">
              {category.items.map((achievement, index) => (
                <AchievementTile
                  achievement={achievement}
                  index={index}
                  key={achievement.id}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          </section>
        )
      })}

      {selectedAchievement && createPortal(
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
        </div>,
        document.body,
      )}
    </main>
  )
}
