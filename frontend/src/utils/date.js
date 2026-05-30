// All times displayed in Australian Eastern time (Brisbane, UTC+10, no DST)
const BRISBANE_TZ = 'Australia/Brisbane'

export function formatMatchDate(utcDate) {
  if (!utcDate) return ''
  const d = new Date(utcDate)
  return d.toLocaleDateString('en-AU', {
    timeZone: BRISBANE_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatMatchTime(utcDate) {
  if (!utcDate) return ''
  const d = new Date(utcDate)
  return d.toLocaleTimeString('en-AU', {
    timeZone: BRISBANE_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatMatchDateTime(utcDate) {
  if (!utcDate) return ''
  const d = new Date(utcDate)
  return d.toLocaleString('en-AU', {
    timeZone: BRISBANE_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function isToday(utcDate) {
  if (!utcDate) return false
  const d = new Date(utcDate)
  const todayStr = new Date().toLocaleDateString('en-AU', { timeZone: BRISBANE_TZ })
  const matchStr = d.toLocaleDateString('en-AU', { timeZone: BRISBANE_TZ })
  return todayStr === matchStr
}

export function isTomorrow(utcDate) {
  if (!utcDate) return false
  const d = new Date(utcDate)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toLocaleDateString('en-AU', { timeZone: BRISBANE_TZ })
  const matchStr = d.toLocaleDateString('en-AU', { timeZone: BRISBANE_TZ })
  return tomorrowStr === matchStr
}

export function groupByDate(fixtures) {
  const groups = {}
  for (const f of fixtures) {
    const d = new Date(f.utc_date)
    const key = d.toLocaleDateString('en-AU', {
      timeZone: BRISBANE_TZ,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    if (!groups[key]) groups[key] = []
    groups[key].push(f)
  }
  return groups
}
