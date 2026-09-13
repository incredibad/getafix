const TEAMS_KEY = 'getafix:sidebar:teams'
const COMPS_KEY = 'getafix:sidebar:competitions'
const FIXTURES_KEY = 'getafix:cache:fixtures'

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

export const getCachedFixtures = () => safeGet(FIXTURES_KEY)
export const setCachedFixtures = data => safeSet(FIXTURES_KEY, data)

// Generic stale-while-revalidate cache for any page-level data, keyed by caller.
// Prefix keys with 'getafix:cache:' by convention.
export const getCachedEntry = key => safeGet(key)
export const setCachedEntry = (key, data) => safeSet(key, data)
