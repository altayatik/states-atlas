export function LatestMemories({ states }) {
  const memories = states
    .filter((state) => state.favoriteMemory)
    .sort((a, b) => {
      if (a.updatedAt || b.updatedAt) return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      return (b.firstVisitedYear || 0) - (a.firstVisitedYear || 0)
    })
    .slice(0, 5)

  return (
    <section className="content-section" aria-labelledby="memories-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Recently updated</p>
          <h2 id="memories-title">Latest memories</h2>
        </div>
      </div>
      {memories.length ? (
        <div className="memory-grid">
          {memories.map((state) => (
            <article className="memory-card" key={state.code}>
              <span>{state.code}</span>
              <h3>{state.name}</h3>
              <p>{state.favoriteMemory}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">No states logged yet. Time to hit the road.</div>
      )}
    </section>
  )
}
