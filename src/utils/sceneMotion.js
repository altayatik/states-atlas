const TARGET_FRAME_MS = 1000 / 30
const TANGENT_SAMPLE_PX = 2

const sceneItems = [
  { selector: '.scene-flyer--a', path: '#fly-a', svg: '.scene-sky', duration: 42_000, lead: 0, rotateOffset: 0 },
  { selector: '.scene-flyer--b', path: '#fly-b', svg: '.scene-sky', duration: 58_000, lead: 20_000, rotateOffset: 0 },
  { selector: '.scene-vehicle--a', path: '#road', svg: '.scene-road', duration: 30_000, lead: 0, rotateOffset: 0, flipX: true },
  { selector: '.scene-vehicle--b', path: '#road', svg: '.scene-road', duration: 44_000, lead: 15_000, rotateOffset: 0, flipX: true },
  { selector: '.scene-vehicle--c', path: '#road', svg: '.scene-road', duration: 56_000, lead: 34_000, rotateOffset: 0, flipX: true },
]

function getViewBox(svg) {
  const viewBox = svg.viewBox?.baseVal
  if (viewBox?.width && viewBox?.height) return viewBox

  const [x, y, width, height] = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number)
  if (!width || !height) return null
  return { height, width, x, y }
}

function getPreserveAspect(svg) {
  const value = svg.getAttribute('preserveAspectRatio') || ''
  return {
    meetOrSlice: value.includes('slice') ? 'slice' : 'meet',
    x: value.includes('xMin') ? 'min' : value.includes('xMax') ? 'max' : 'mid',
    y: value.includes('YMin') ? 'min' : value.includes('YMax') ? 'max' : 'mid',
  }
}

function getSvgMapper(svg) {
  const rect = svg.getBoundingClientRect()
  const viewBox = getViewBox(svg)
  if (!viewBox || !rect.width || !rect.height) return null

  const aspect = getPreserveAspect(svg)
  const scaleX = rect.width / viewBox.width
  const scaleY = rect.height / viewBox.height
  const scale = aspect.meetOrSlice === 'slice'
    ? Math.max(scaleX, scaleY)
    : Math.min(scaleX, scaleY)
  const scaledWidth = viewBox.width * scale
  const scaledHeight = viewBox.height * scale
  const extraX = rect.width - scaledWidth
  const extraY = rect.height - scaledHeight
  const offsetX = aspect.x === 'min' ? 0 : aspect.x === 'max' ? extraX : extraX / 2
  const offsetY = aspect.y === 'min' ? 0 : aspect.y === 'max' ? extraY : extraY / 2

  return (point) => ({
    x: rect.left + offsetX + ((point.x - viewBox.x) * scale),
    y: rect.top + offsetY + ((point.y - viewBox.y) * scale),
  })
}

function getAngle(path, distance, length) {
  const before = path.getPointAtLength(Math.max(0, distance - TANGENT_SAMPLE_PX))
  const after = path.getPointAtLength(Math.min(length, distance + TANGENT_SAMPLE_PX))
  return Math.atan2(after.y - before.y, after.x - before.x) * (180 / Math.PI)
}

function buildItems() {
  return sceneItems.map((item) => {
    const element = document.querySelector(item.selector)
    const path = document.querySelector(item.path)
    const svg = document.querySelector(item.svg)
    if (!element || !path || !svg) return null

    return {
      ...item,
      element,
      length: path.getTotalLength(),
      mapPoint: getSvgMapper(svg),
      path,
      svg,
    }
  }).filter(Boolean)
}

function shouldRun() {
  return document.documentElement.dataset.atlasMotion === 'running'
    && !document.hidden
    && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function positionItem(item, now, startTime) {
  const mapPoint = item.mapPoint
  if (!mapPoint) return

  const elapsed = (now - startTime + item.lead) % item.duration
  const distance = (elapsed / item.duration) * item.length
  const point = mapPoint(item.path.getPointAtLength(distance))
  const angle = getAngle(item.path, distance, item.length) + item.rotateOffset
  const scale = item.flipX ? ' scaleX(-1)' : ''

  item.element.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%) rotate(${angle}deg)${scale}`
}

function startSceneMotion() {
  if (!window.requestAnimationFrame) return

  let items = buildItems()
  let frameId = 0
  let startTime = performance.now()
  let lastFrame = 0
  let isRunning = false

  const refreshGeometry = () => {
    items = items.map((item) => ({
      ...item,
      mapPoint: getSvgMapper(item.svg),
    }))
  }

  const render = (now) => {
    if (!shouldRun()) {
      frameId = 0
      isRunning = false
      return
    }

    if (now - lastFrame >= TARGET_FRAME_MS) {
      items.forEach((item) => positionItem(item, now, startTime))
      lastFrame = now
    }

    frameId = window.requestAnimationFrame(render)
  }

  const sync = () => {
    if (!items.length) items = buildItems()
    refreshGeometry()
    if (shouldRun() && !isRunning) {
      isRunning = true
      lastFrame = 0
      frameId = window.requestAnimationFrame(render)
    } else if (!shouldRun() && frameId) {
      window.cancelAnimationFrame(frameId)
      frameId = 0
      isRunning = false
    }
  }

  const observer = new MutationObserver(sync)
  observer.observe(document.documentElement, {
    attributeFilter: ['data-atlas-motion'],
    attributes: true,
  })
  document.addEventListener('visibilitychange', sync)
  window.addEventListener('resize', sync)
  sync()

  window.addEventListener('pagehide', () => {
    if (frameId) window.cancelAnimationFrame(frameId)
    observer.disconnect()
  }, { once: true })
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startSceneMotion, { once: true })
  } else {
    startSceneMotion()
  }
}
