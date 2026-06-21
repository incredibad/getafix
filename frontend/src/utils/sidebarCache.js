const TEAMS_KEY = 'getafix:sidebar:teams'
const COMPS_KEY = 'getafix:sidebar:competitions'

function safeGet(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
function safeSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

export const getCachedTeams = () => safeGet(TEAMS_KEY)
export const setCachedTeams = data => safeSet(TEAMS_KEY, data)
export const bustTeamsCache = () => localStorage.removeItem(TEAMS_KEY)

export const getCachedCompetitions = () => safeGet(COMPS_KEY)
export const setCachedCompetitions = data => safeSet(COMPS_KEY, data)
