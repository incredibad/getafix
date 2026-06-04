import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Users, Circle, Eye, EyeOff, Lock, ChevronRight, ChevronUp, ChevronDown, Trophy, Star, Search, X } from 'lucide-react'
import api from '../api/client'
import { getDaysBack, getSpoilersMode, getRevealPersist, REVEALED_IDS_KEY } from './Settings'
import { useSidebarResize } from '../utils/useSidebarResize'
import ExpandableSidebarItem from '../components/ExpandableSidebarItem'
import { groupByDate, formatMatchTime, isToday } from '../utils/date'
import { imgUrl } from '../utils/img'
import toast from 'react-hot-toast'

const BRISBANE_TZ = 'Australia/Brisbane'
function getDateCategory(utcDate) {
  const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: BRISBANE_TZ })
  const matchISO = new Date(utcDate).toLocaleDateString('en-CA', { timeZone: BRISBANE_TZ })
  if (matchISO === todayISO) return 'today'
  return matchISO < todayISO ? 'past' : 'future'
}

const DATE_CAT_STYLE = {
  past:   { background: 'rgba(239,68,68,0.13)',   borderColor: 'rgba(239,68,68,0.32)' },
  today:  { background: 'rgba(34,197,94,0.13)',   borderColor: 'rgb(74,222,128)'  },
  future: { background: 'rgba(59,130,246,0.13)',  borderColor: 'rgba(59,130,246,0.32)' },
}

function TeamCrest({ url, name, country, league, national, size = 28 }) {
  const inner = url
    ? <img src={imgUrl(url)} alt={name} style={{ width: size, height: size }} className="object-contain" />
    : <span style={{ fontSize: size * 0.85, lineHeight: 1 }}>⚽</span>

  return (
    <div className="relative group flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      {inner}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap text-xs" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)' }}>
          <p className="font-semibold text-white leading-tight">{name}</p>
          {!national && country && <p className="text-slate-400 leading-tight mt-0.5">{country}</p>}
          {league && <p className="text-slate-500 leading-tight mt-0.5">{league}</p>}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1e293b' }} />
      </div>
    </div>
  )
}

function FixtureCard({ fixture, revealed, onRevealScore, onViewDetail, dateCategory }) {
  const { home_team, away_team, competition, utc_date, status, score_home, score_away } = fixture
  const isLive = status === 'LIVE'
  const hasScore = status !== 'SCHEDULED' && (score_home != null || score_away != null)
  const hasDetail = status === 'FINISHED' || status === 'LIVE'
  const catStyle = DATE_CAT_STYLE[dateCategory] ?? DATE_CAT_STYLE.future
  const cardStyle = isLive ? { ...catStyle, borderColor: 'rgba(248,113,113,0.35)' } : catStyle
  const sep = { borderColor: 'rgba(255,255,255,0.06)' }

  return (
    <div className="fixture-card w-full rounded-xl border" style={cardStyle}>

      {/* Cell 1 — competition */}
      <div className="flex items-center justify-center lg:flex-col lg:items-start lg:justify-center gap-1 px-2 lg:px-3 py-3 border-r rounded-l-xl" style={sep}>
        <div className="flex items-center gap-1.5 lg:w-full min-w-0">
          {competition.emblem_url
            ? <img src={imgUrl(competition.emblem_url)} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
            : <Trophy size={14} className="text-slate-500 flex-shrink-0" />
          }
          <span className="hidden lg:inline text-xs text-slate-400 truncate">{competition.name}</span>
        </div>
      </div>

      {/* Cell 2 — home team */}
      <div className="flex items-center gap-1.5 lg:gap-2 justify-end min-w-0 pl-3 lg:pl-4 pr-3 py-3">
        <span className="text-base lg:text-xl font-semibold text-slate-200 truncate text-right leading-tight">
          {home_team.short_name || home_team.name}
        </span>
        <TeamCrest url={home_team.crest_url} name={home_team.name} country={home_team.country} league={home_team.home_league !== competition.name ? home_team.home_league : undefined} national={home_team.national} />
      </div>

      {/* Cell 3 — score/time */}
      <div className="flex flex-col items-center justify-center gap-0.5 px-3 lg:px-4 py-3">
        {hasScore ? (
          !revealed ? (
            <div
              className="cursor-pointer text-slate-500 hover:text-slate-300 transition-colors"
              onClick={e => { e.stopPropagation(); onRevealScore() }}
              title="Click to reveal score"
            >
              <Lock size={18} />
            </div>
          ) : (
            <span className="text-xl lg:text-[26px] font-bold text-white tabular-nums leading-none">
              {score_home ?? 0} – {score_away ?? 0}
            </span>
          )
        ) : status === 'POSTPONED' ? (
          <span className="text-xs lg:text-sm font-bold text-yellow-500">PST</span>
        ) : status === 'CANCELLED' ? (
          <span className="text-xs lg:text-sm font-bold text-red-500">CANC</span>
        ) : (
          <span className="text-base lg:text-xl font-medium text-slate-400 tabular-nums">
            {formatMatchTime(utc_date)}
          </span>
        )}
        {isLive && (
          <span className="flex items-center gap-1 text-xs font-bold text-red-400">
            <Circle size={6} fill="currentColor" className="animate-pulse" />
            {fixture.minute ? `${fixture.minute}'` : 'LIVE'}
          </span>
        )}
      </div>

      {/* Cell 4 — away team */}
      <div className="flex items-center gap-1.5 lg:gap-2 min-w-0 pr-3 lg:pr-4 pl-3 py-3">
        <TeamCrest url={away_team.crest_url} name={away_team.name} country={away_team.country} league={away_team.home_league !== competition.name ? away_team.home_league : undefined} national={away_team.national} />
        <span className="text-base lg:text-xl font-semibold text-slate-200 truncate leading-tight">
          {away_team.short_name || away_team.name}
        </span>
      </div>

      {/* Cell 5 — chevron */}
      {hasDetail ? (
        <button
          onClick={onViewDetail}
          className="flex items-center justify-center border-l rounded-r-xl text-slate-500 hover:text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          style={sep}
          title="View match details"
        >
          <ChevronRight size={13} />
        </button>
      ) : (
        <div className="border-l rounded-r-xl" style={sep} />
      )}

    </div>
  )
}

function MobileFilterSheet({ teams, competitions, activeFilter, onSelect, onClear }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return {
      teams: teams.filter(t => !q || t.name.toLowerCase().includes(q)),
      comps: competitions.filter(c => !q || c.name.toLowerCase().includes(q)),
    }
  }, [teams, competitions, query])

  const close = () => { setOpen(false); setQuery('') }

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const activeLabel = activeFilter
    ? activeFilter.value
    : 'All My Fixtures'

  const activeCrest = useMemo(() => {
    if (!activeFilter) return <Star size={14} className="text-green-400 flex-shrink-0" />
    if (activeFilter.type === 'team') {
      const t = teams.find(t => t.name === activeFilter.value)
      return t?.crest_url ? <img src={imgUrl(t.crest_url)} alt="" className="w-4 h-4 object-contain flex-shrink-0" /> : null
    }
    const c = competitions.find(c => c.name === activeFilter.value)
    return c?.emblem_url ? <img src={imgUrl(c.emblem_url)} alt="" className="w-4 h-4 object-contain flex-shrink-0" /> : null
  }, [activeFilter, teams, competitions])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left"
        style={{ background: 'var(--surface)', borderColor: activeFilter ? 'rgba(34,197,94,0.4)' : 'var(--border)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {activeCrest}
          <span className={`text-sm font-medium truncate ${activeFilter ? 'text-white' : 'text-slate-400'}`}>
            {activeLabel}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {activeFilter && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); onClear() }}
              className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown size={14} className="text-slate-500" />
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 h-0.54 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <Search size={16} className="text-slate-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search teams or leagues…"
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
            />
            <button onClick={close} className="text-slate-400 hover:text-white p-1">
              <X size={20} />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto pb-24">
            {/* All My Fixtures */}
            <button
              onClick={() => { onClear(); close() }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b transition-colors ${
                !activeFilter ? 'text-green-400 bg-green-600/10' : 'text-slate-300 hover:bg-white/5'
              }`}
              style={{ borderColor: 'var(--border)' }}
            >
              <Star size={16} className="flex-shrink-0" />
              <span className="text-sm font-medium">All My Fixtures</span>
            </button>

            {filtered.teams.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 pt-4 pb-1">Teams</p>
                {filtered.teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => { onSelect('team', team.name); close() }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      activeFilter?.type === 'team' && activeFilter.value === team.name
                        ? 'text-green-400 bg-green-600/10'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {team.crest_url
                      ? <img src={imgUrl(team.crest_url)} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                      : <span className="w-5 h-5 flex-shrink-0" />
                    }
                    <span className="text-sm">{team.name}</span>
                  </button>
                ))}
              </>
            )}

            {filtered.comps.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 pt-4 pb-1">Leagues</p>
                {filtered.comps.map(comp => (
                  <button
                    key={comp.name}
                    onClick={() => { onSelect('comp', comp.name, comp.sofascore_id); close() }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      activeFilter?.type === 'comp' && activeFilter.value === comp.name
                        ? 'text-green-400 bg-green-600/10'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {comp.emblem_url
                      ? <img src={imgUrl(comp.emblem_url)} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                      : <Trophy size={16} className="text-slate-500 flex-shrink-0" />
                    }
                    <span className="text-sm">{comp.name}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function RoundSeparator({ label }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex-shrink-0">{label}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  )
}

function DateGroupHeader({ label, isToday: isT = false, round = null }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className={`text-sm font-semibold flex-shrink-0 ${isT ? 'text-green-400' : 'text-slate-400'}`}>{label}</span>
      <div className={`flex-1 ${isT ? 'h-0.5' : 'h-px'}`} style={{ background: isT ? 'rgb(74,222,128)' : 'var(--border)' }} />
      {round && <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex-shrink-0">{round}</span>}
      {isT && <span className="text-sm font-bold text-green-400 tracking-widest uppercase flex-shrink-0">Today</span>}
    </div>
  )
}


const FILTER_KEY   = 'footrack:fixtures:filter'
const SHOW_ALL_KEY = 'footrack:fixtures:show_all'

export default function Fixtures() {
  const [fixtures, setFixtures] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  const [activeFilter, setActiveFilter] = useState(() => {
    if (location.state?.initialFilter) return location.state.initialFilter
    try { return JSON.parse(localStorage.getItem(FILTER_KEY)) ?? null } catch { return null }
  })
  const { width: sidebarWidth, nearEdge: sidebarNearEdge, onMouseMove: sidebarMouseMove, onMouseLeave: sidebarMouseLeave, onMouseDown: sidebarMouseDown } = useSidebarResize()
  const spoilersMode = getSpoilersMode()
  const [revealAll, setRevealAll] = useState(false)
  const [revealedIds, setRevealedIds] = useState(() => {
    if (!getSpoilersMode()) return new Set()
    const persist = getRevealPersist()
    if (persist === 'session') return new Set()
    try {
      const stored = JSON.parse(localStorage.getItem(REVEALED_IDS_KEY) || '{}')
      if (persist === 'forever') return new Set(Object.keys(stored))
      const ttl = { '7d': 7, '30d': 30, '180d': 180 }[persist] * 86400000
      const now = Date.now()
      return new Set(Object.keys(stored).filter(id => now - (stored[id] || 0) < ttl))
    } catch { return new Set() }
  })
  const navigate = useNavigate()

  const load = useCallback(async (showToast = false) => {
    try {
      const [fixturesRes, teamsRes] = await Promise.all([
        api.get('/fixtures', { params: { days_back: getDaysBack(), days_ahead: 365 } }),
        api.get('/teams/followed'),
      ])
      setFixtures(fixturesRes.data)
      setTeams(teamsRes.data)
      if (showToast) toast.success('Fixtures refreshed.')
    } catch {
      toast.error('Failed to load fixtures.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

const toggleRevealAll = () => setRevealAll(r => !r)

  const [showAllForComp, setShowAllForComp] = useState(() => localStorage.getItem(SHOW_ALL_KEY) === 'true')
  const [compAllFixtures, setCompAllFixtures] = useState([])
  const [loadingCompAll, setLoadingCompAll] = useState(false)

  const activeFilterRef = useRef(null)
  useEffect(() => {
    if (!loading && activeFilterRef.current) {
      activeFilterRef.current.scrollIntoView({ behavior: 'instant', block: 'center' })
    }
  }, [loading])

  const todayRef = useRef(null)
  const [todayVisible, setTodayVisible] = useState(null)
  const [todayDirection, setTodayDirection] = useState('down')

  const updateTodayVisibility = useCallback(() => {
    const el = todayRef.current
    if (!el) { setTodayVisible(null); return }
    const { top, bottom } = el.getBoundingClientRect()
    const visible = top < window.innerHeight && bottom > 0
    setTodayVisible(visible)
    if (!visible) setTodayDirection(top < 0 ? 'up' : 'down')
  }, [])

  // Capture scroll from any container (right column on desktop, main on mobile)
  useEffect(() => {
    window.addEventListener('scroll', updateTodayVisibility, true)
    return () => window.removeEventListener('scroll', updateTodayVisibility, true)
  }, [updateTodayVisibility])

  // Re-check after renders triggered by filter/load changes
  useEffect(() => { updateTodayVisibility() }, [activeFilter, loading, loadingCompAll, showAllForComp, updateTodayVisibility])

  useEffect(() => {
    if (loading || loadingCompAll || !todayRef.current) return
    todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [loading, loadingCompAll, activeFilter, showAllForComp])

  const revealOne = (id) => {
    setRevealedIds(prev => new Set([...prev, id]))
    const persist = getRevealPersist()
    if (getSpoilersMode() && persist !== 'session') {
      try {
        const stored = JSON.parse(localStorage.getItem(REVEALED_IDS_KEY) || '{}')
        stored[id] = Date.now()
        localStorage.setItem(REVEALED_IDS_KEY, JSON.stringify(stored))
      } catch {}
    }
  }
  const isRevealed = (id) => !spoilersMode || revealAll || revealedIds.has(id)

  useEffect(() => {
    if (!showAllForComp || activeFilter?.type !== 'comp') {
      setCompAllFixtures([])
      return
    }
    let cancelled = false
    setLoadingCompAll(true)
    setCompAllFixtures([])
    api.get('/fixtures/by-competition', { params: { name: activeFilter.value, days_back: getDaysBack(), ...(activeFilter.sofascore_id ? { sofascore_id: activeFilter.sofascore_id } : {}) } })
      .then(({ data }) => { if (!cancelled) setCompAllFixtures(data) })
      .catch(() => { if (!cancelled) toast.error('Failed to load all competition fixtures.') })
      .finally(() => { if (!cancelled) setLoadingCompAll(false) })
    return () => { cancelled = true }
  }, [showAllForComp, activeFilter])

  const sortedTeams = useMemo(() =>
    [...teams].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
  [teams])

  const competitions = useMemo(() => {
    const seen = new Set()
    return fixtures
      .map(f => ({ name: f.competition.name, emblem_url: f.competition.emblem_url, sofascore_id: f.competition.id }))
      .filter(c => { if (!c.name || seen.has(c.name)) return false; seen.add(c.name); return true })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [fixtures])

  const visibleFixtures = useMemo(() => {
    if (!activeFilter) return fixtures
    if (activeFilter.type === 'team') {
      const t = activeFilter.value.toLowerCase()
      return fixtures.filter(f =>
        f.home_team.name.toLowerCase().includes(t) ||
        f.away_team.name.toLowerCase().includes(t) ||
        t.includes(f.home_team.name.toLowerCase()) ||
        t.includes(f.away_team.name.toLowerCase())
      )
    }
    if (activeFilter.type === 'comp') {
      return fixtures.filter(f => f.competition.name === activeFilter.value)
    }
    return fixtures
  }, [fixtures, activeFilter])

  const displayFixtures = (showAllForComp && activeFilter?.type === 'comp')
    ? compAllFixtures
    : visibleFixtures

  const grouped = groupByDate(displayFixtures)
  const dateKeys = Object.keys(grouped)

  const renderItems = useMemo(() => {
    const hasTodayFixtures = dateKeys.some(d => getDateCategory(grouped[d][0].utc_date) === 'today')
    const items = []
    let dividerInserted = false
    for (const date of dateKeys) {
      const cat = getDateCategory(grouped[date][0].utc_date)
      if (!hasTodayFixtures && !dividerInserted && cat !== 'past') {
        items.push({ type: 'divider' })
        dividerInserted = true
      }
      items.push({ type: 'date', date, isToday: cat === 'today' })
    }
    if (!hasTodayFixtures && !dividerInserted) items.push({ type: 'divider' })
    return items
  }, [dateKeys, grouped])

  const setFilter = (type, value, sofascore_id = null) => {
    setActiveFilter(prev => {
      const next = prev?.type === type && prev?.value === value ? null : { type, value, sofascore_id }
      localStorage.setItem(FILTER_KEY, JSON.stringify(next))
      return next
    })
    setRevealAll(false)
  }

  const clearFilter = () => {
    setActiveFilter(null)
    localStorage.removeItem(FILTER_KEY)
    setRevealAll(false)
  }

  const setShowAll = (val) => {
    setShowAllForComp(val)
    localStorage.setItem(SHOW_ALL_KEY, String(val))
  }

  const hasScores = spoilersMode && fixtures.some(f => f.status !== 'SCHEDULED')

  return (
    <>
    <div className="lg:flex lg:h-full">

      {/* ── Desktop left column: filters ── */}
      <div
        className="hidden lg:flex flex-col flex-shrink-0 border-r overflow-hidden"
        style={{ borderColor: 'var(--border)', width: sidebarWidth, cursor: sidebarNearEdge ? 'col-resize' : '' }}
        onMouseMove={sidebarMouseMove}
        onMouseLeave={sidebarMouseLeave}
        onMouseDown={sidebarMouseDown}
      >
        <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          {(() => {
            const active = activeFilter?.type === 'comp'
            return (
              <>
                <button
                  onClick={active ? () => setShowAll(false) : undefined}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                    active
                      ? !showAllForComp ? 'text-white border-b-2 border-green-500 -mb-px' : 'text-slate-500 hover:text-slate-300'
                      : 'text-slate-600 border-b-2 border-slate-700 -mb-px cursor-default'
                  }`}
                >Mine</button>
                <button
                  onClick={active ? () => setShowAll(true) : undefined}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                    active
                      ? showAllForComp ? 'text-green-400 border-b-2 border-green-500 -mb-px' : 'text-slate-500 hover:text-slate-300'
                      : 'text-slate-600 cursor-default'
                  }`}
                >All</button>
              </>
            )
          })()}
          <div className="w-10 flex-shrink-0 flex items-center justify-center border-l" style={{ borderColor: 'var(--border)' }}>
            {hasScores && (
              <button onClick={toggleRevealAll} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors" title={revealAll ? 'Hide scores' : 'Reveal scores'}>
                {revealAll ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* All My Fixtures */}
              <div className="px-2 pt-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <button
                  ref={!activeFilter ? activeFilterRef : null}
                  onClick={clearFilter}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    !activeFilter ? 'bg-green-600/20 text-green-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Star size={18} className="flex-shrink-0" />
                  All My Fixtures
                </button>
              </div>

              {sortedTeams.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 pt-4 pb-1">Teams</p>
                  {sortedTeams.map(team => (
                    <ExpandableSidebarItem
                      key={team.id}
                      ref={activeFilter?.type === 'team' && activeFilter.value === team.name ? activeFilterRef : null}
                      onClick={() => setFilter('team', team.name)}
                      isActive={activeFilter?.type === 'team' && activeFilter.value === team.name}
                      icon={team.crest_url
                        ? <img src={imgUrl(team.crest_url)} alt="" className="w-6 h-6 object-contain" />
                        : <span className="w-6 h-6" />
                      }
                      label={team.name}
                    />
                  ))}
                </>
              )}

              {competitions.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 pt-4 pb-1">Leagues</p>
                  {competitions.map(comp => (
                    <ExpandableSidebarItem
                      key={comp.name}
                      ref={activeFilter?.type === 'comp' && activeFilter.value === comp.name ? activeFilterRef : null}
                      onClick={() => setFilter('comp', comp.name, comp.sofascore_id)}
                      isActive={activeFilter?.type === 'comp' && activeFilter.value === comp.name}
                      icon={comp.emblem_url
                        ? <img src={imgUrl(comp.emblem_url)} alt="" className="w-6 h-6 object-contain" />
                        : <Trophy size={18} className="text-slate-500" />
                      }
                      label={comp.name}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 min-w-0 lg:overflow-y-auto">

        {/* Spacer for fixed mobile top bar */}
        <div className="h-0.54 lg:hidden" />

        {/* Mobile sticky filter bar */}
        {!loading && fixtures.length > 0 && (
          <div className="lg:hidden sticky top-14 z-20 border-b" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 px-4 py-2">
              <div className="flex-1 min-w-0">
                <MobileFilterSheet
                  teams={sortedTeams}
                  competitions={competitions}
                  activeFilter={activeFilter}
                  onSelect={(type, value, sofascore_id) => setFilter(type, value, sofascore_id)}
                  onClear={clearFilter}
                />
              </div>
              {activeFilter?.type === 'comp' && (
                <div className="flex text-[10px] rounded border border-slate-700 overflow-hidden flex-shrink-0">
                  <button onClick={() => setShowAll(false)} className={`px-2.5 py-1 transition-colors ${!showAllForComp ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-400'}`}>Mine</button>
                  <button onClick={() => setShowAll(true)} className={`px-2.5 py-1 border-l border-slate-700 transition-colors ${showAllForComp ? 'bg-green-600/20 text-green-400' : 'text-slate-500 hover:text-slate-400'}`}>All</button>
                </div>
              )}
              {hasScores && (
                <button onClick={toggleRevealAll} className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                  {revealAll ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 lg:p-6 pb-48 lg:pb-16">

          {loading || loadingCompAll ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : fixtures.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-4 text-center">
              <Users size={40} className="text-slate-600" />
              <div>
                <p className="text-slate-300 font-medium">No fixtures yet</p>
                <p className="text-slate-500 text-sm mt-1">Follow some teams to see their fixtures here.</p>
              </div>
              <button onClick={() => navigate('/teams')} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors">
                Browse Teams
              </button>
            </div>
          ) : (
            <>
              {dateKeys.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">No fixtures match this filter.</div>
              ) : (
                <div className="space-y-1">
                  {renderItems.map((item, i) => {
                    if (item.type === 'divider') {
                      return (
                        <div key="today-divider" ref={todayRef} className="flex items-center gap-3 py-3 scroll-mt-[116px] lg:scroll-mt-4">
                          <div className="flex-1 h-0.5" style={{ background: 'rgb(74,222,128)' }} />
                          <span className="text-sm font-bold text-green-400 tracking-widest uppercase flex-shrink-0">Today</span>
                        </div>
                      )
                    }
                    const { date, isToday: isTodayDate } = item
                    const category = getDateCategory(grouped[date][0].utc_date)
                    return (
                      <div key={date} ref={isTodayDate ? todayRef : null} className={isTodayDate ? 'scroll-mt-[116px] lg:scroll-mt-4' : ''}>
                        <DateGroupHeader label={date} isToday={isTodayDate} round={grouped[date][0]?.round_name ?? null} />
                        <div className="space-y-2">
                          {grouped[date].reduce((acc, f, i) => {
                            const fid = `${f.source}:${f.external_id}`
                            const prev = grouped[date][i - 1]
                            if (f.round_name && prev && prev.round_name !== f.round_name) {
                              acc.push(<RoundSeparator key={`round-${date}-${f.round_name}`} label={f.round_name} />)
                            }
                            acc.push(
                              <FixtureCard
                                key={fid}
                                fixture={f}
                                revealed={isRevealed(fid)}
                                onRevealScore={() => revealOne(fid)}
                                onViewDetail={() => navigate(`/fixtures/${f.external_id}`, { state: { source: f.source, leagueSlug: f.league_slug, revealed: isRevealed(fid) } })}
                                dateCategory={category}
                              />
                            )
                            return acc
                          }, [])}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

        </div>
      </div>

    </div>

    {todayVisible === false && (
      <button
        onClick={() => todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className="fixed bottom-[72px] lg:bottom-[10px] left-1/2 lg:left-[calc(50%_+_237px)] -translate-x-1/2 z-40 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-green-600 hover:bg-green-500 text-white text-xs font-semibold shadow-lg transition-colors"
      >
        {todayDirection === 'up' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        Today
      </button>
    )}
    </>
  )
}
