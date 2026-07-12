import { metroAreas } from '../data/metroAreas'
import { StateDetailPanel } from './StateDetailPanel'
import { TravelMap } from './TravelMap'

export function StatesSection({
  onSelectMetro,
  onSelectPark,
  onSelectState,
  parks,
  selectedPlace,
  selectedState,
  selectedStateCode,
  states,
  stats,
}) {
  return (
    <main className="states-stage">
      <TravelMap
        metros={metroAreas}
        onSelectState={onSelectState}
        onSelectMetro={onSelectMetro}
        onSelectPark={onSelectPark}
        parks={parks}
        selectedPlace={selectedPlace}
        selectedStateCode={selectedStateCode}
        states={states}
      />
      <aside className="states-dock">
        <div className="states-dock__hud glass-panel">
          <p className="eyebrow">States &amp; provinces</p>
          <h2 className="states-dock__title">Where we&rsquo;ve been</h2>
          <div className="hud-rail">
            <span><strong>{stats.statesVisited}</strong>/{stats.statesTotal} states</span>
            <span><strong>{stats.citiesLogged}</strong> cities</span>
            <span><strong>{stats.parksMarked}</strong> parks</span>
            <span><strong>{Math.round(stats.completionPercent)}%</strong> explored</span>
          </div>
        </div>
        <StateDetailPanel
          selectedItem={selectedPlace}
          state={selectedState}
          states={states}
        />
      </aside>
    </main>
  )
}
