const TEAMS_KEY = 'getafix:sidebar:teams'
const COMPS_KEY = 'getafix:sidebar:competitions'
const FIXTURES_KEY = 'getafix:cache:fixtures'

function safeGet(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
function safeSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}
// A list-shaped cache entry must come back as an array or not at all — every
// consumer reads these with `getCachedX() ?? []` and immediately calls array
// methods (.filter/.length) on the result with no further validation. If a
// non-list value (e.g. an error response body) ever got written here, it
// would crash the page on mount, before the next successful fetch could
// overwrite it. Guard at the read so a bad write can't brick the page.
function safeGetList(key) {
  const v = safeGet(key)
  return Array.isArray(v) ? v : null
}
// Mirror the guard on write so a caller passing a non-array (e.g. an error
// body) can't poison the cache for the next load in the first place.
function safeSetList(key, data) {
  if (Array.isArray(data)) safeSet(key, data)
}

export const getCachedTeams = () => safeGetList(TEAMS_KEY)
export const setCachedTeams = data => safeSetList(TEAMS_KEY, data)
export const bustTeamsCache = () => localStorage.removeItem(TEAMS_KEY)

export const getCachedCompetitions = () => safeGetList(COMPS_KEY)
export const setCachedCompetitions = data => safeSetList(COMPS_KEY, data)

export const getCachedFixtures = () => safeGetList(FIXTURES_KEY)
export const setCachedFixtures = data => safeSetList(FIXTURES_KEY, data)

// Generic stale-while-revalidate cache for any page-level data, keyed by caller.
// Prefix keys with 'getafix:cache:' by convention.
export const getCachedEntry = key => safeGet(key)
export const setCachedEntry = (key, data) => safeSet(key, data)
