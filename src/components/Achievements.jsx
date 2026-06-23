import { Lock, Stamp } from 'lucide-react'

export function Achievements({ achievements }) {
  return (
    <section className="content-section" aria-labelledby="achievements-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Quest board</p>
          <h2 id="achievements-title">Achievement badges</h2>
        </div>
      </div>
      <div className="achievement-grid">
        {achievements.map((achievement) => (
          <article
            className={achievement.unlocked ? 'achievement achievement--unlocked' : 'achievement'}
            key={achievement.id}
          >
            <div className="achievement__icon">
              {achievement.unlocked ? <Stamp size={22} aria-hidden="true" /> : <Lock size={22} aria-hidden="true" />}
            </div>
            <div>
              <h3>{achievement.name}</h3>
              <p>{achievement.description}</p>
              <span>
                {achievement.progress}/{achievement.total}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
