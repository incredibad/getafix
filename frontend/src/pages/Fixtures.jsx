import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { RefreshCw, Users, Circle, Eye, EyeOff, Lock, ChevronRight, Trophy } from 'lucide-react'
import api from '../api/client'
import { groupByDate, formatMatchTime, isToday } from '../utils/date'
import toast from 'react-hot-toast'

const SOURCE_LABELS = { fd: 'FD', apf: 'APF', espn: 'ESPN', football_data: 'FD', api_football: 'APF' }

const BRISBANE_TZ = 'Australia/Brisbane'
function getDateCategory(utcDate) {
  const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: BRISBANE_TZ })
  const matchISO = new Date(utcDate).toLocaleDateString('en-CA', { timeZone: BRISBANE_TZ })
  if (matchISO === todayISO) return 'today'
  return matchISO < todayISO ? 'past' : 'future'
}

const DATE_CAT_STYLE = {
  past:   { background: 'rgba(239,68,68,0.07)',   borderColor: 'rgba(239,68,68,0.18)' },
  today:  { background: 'rgba(34,197,94,0.07)',   borderColor: 'rgba(34,197,94,0.2)'  },
  future: { background: 'rgba(59,130,246,0.07)',  borderColor: 'rgba(59,130,246,0.18)' },
}

function TeamCrest({ url, name, size = 28 }) {
  if (!url) return <span className="flex-shrink-0" style={{ fontSize: size * 0.85, lineHeight: 1 }}>⚽</span>
  return <img src={url} alt={name} style={{ width: size, height: size }} className="object-contain flex-shrink-0" />
}

function FixtureCard({ fixture, revealed, onRevealScore, onViewDetail, dateCategory }) {
  const { home_team, away_team, competition, utc_date, status, score_home, score_away, source } = fixture
  const isLive = status === 'LIVE'
  const hasScore = status !== 'SCHEDULED' && (score_home != null || score_away != null)
  const hasDetail = status === 'FINISHED' || status === 'LIVE'
  const catStyle = DATE_CAT_STYLE[dateCategory] ?? DATE_CAT_STYLE.future
  const cardStyle = isLive ? { ...catStyle, borderColor: 'rgba(248,113,113,0.35)' } : catStyle
  const sep = { borderColor: 'rgba(255,255,255,0.06)' }

  return (
    <div className="w-full rounded-xl border flex items-stretch overflow-hidden" style={cardStyle}>

      {/* Col 1 — competition */}
      <div className="w-36 flex-shrink-0 flex flex-col items-start justify-center gap-1 px-3 py-3 border-r" style={sep}>
        <div className="flex items-center gap-1.5 w-full min-w-0">
          {competition.emblem_url
            ? <span className="w-4 h-4 rounded bg-slate-200 flex items-center justify-center flex-shrink-0"><img src={competition.emblem_url} alt="" className="w-3 h-3 object-contain" /></span>
            : <span className="w-4 h-4 rounded bg-slate-200 flex items-center justify-center flex-shrink-0"><Trophy size={10} className="text-slate-600" /></span>
          }
          <span className="text-xs text-slate-400 truncate">{competition.name}</span>
        </div>
      </div>

      {/* Col 2 — results: home · score/time · away */}
      <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3">

        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-xl font-semibold text-slate-200 truncate text-right leading-tight">
            {home_team.short_name || home_team.name}
          </span>
          <TeamCrest url={home_team.crest_url} name={home_team.name} />
        </div>

        <div className="flex-shrink-0 w-28 flex flex-col items-center justify-center gap-0.5">
          {hasScore ? (
            !revealed ? (
              <div
                className="cursor-pointer text-slate-500 hover:text-slate-300 transition-colors"
                onClick={e => { e.stopPropagation(); onRevealScore() }}
                title="Click to reveal score"
              >
                <Lock size={20} />
              </div>
            ) : (
              <span className="text-[26px] font-bold text-white tabular-nums leading-none">
                {score_home ?? 0} – {score_away ?? 0}
              </span>
            )
          ) : status === 'POSTPONED' ? (
            <span className="text-sm font-bold text-yellow-500">PST</span>
          ) : status === 'CANCELLED' ? (
            <span className="text-sm font-bold text-red-500">CANC</span>
          ) : (
            <span className="text-xl font-medium text-slate-400 tabular-nums">
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

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamCrest url={away_team.crest_url} name={away_team.name} />
          <span className="text-xl font-semibold text-slate-200 truncate leading-tight">
            {away_team.short_name || away_team.name}
          </span>
        </div>

      </div>

      {/* Col 3 — provider badge */}
      <div className="w-14 flex-shrink-0 flex items-center justify-center border-l" style={sep}>
        {source && (
          <span className="text-xs font-mono px-1 py-0.5 rounded border border-slate-700 text-slate-400">
            {SOURCE_LABELS[source] ?? source}
          </span>
        )}
      </div>

      {/* Detail chevron */}
      {hasDetail && (
        <button
          onClick={onViewDetail}
          className="w-9 flex-shrink-0 flex items-center justify-center border-l text-slate-500 hover:text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] transition-colors rounded-r-xl"
          style={sep}
          title="View match details"
        >
          <ChevronRight size={13} />
        </button>
      )}

    </div>
  )
}

function DateGroupHeader({ label }) {
  const isT = isToday(label) || label.toLowerCase().startsWith('today')
  return (
    <div className="flex items-center gap-3 py-3">
      <span className={`text-sm font-semibold ${isT ? 'text-green-400' : 'text-slate-400'}`}>{label}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  )
}

function FilterPill({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 border ${
        active
          ? 'bg-green-600 border-green-500 text-white'
          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
      }`}
      style={active ? {} : { background: 'var(--surface)' }}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {label}
    </button>
  )
}

export default function Fixtures() {
  const [fixtures, setFixtures] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const location = useLocation()
  const [activeFilter, setActiveFilter] = useState(() => location.state?.initialFilter ?? null)
  const [revealAll, setRevealAll] = useState(false)
  const [revealedIds, setRevealedIds] = useState(new Set())
  const navigate = useNavigate()

  const load = useCallback(async (showToast = false) => {
    try {
      const [fixturesRes, teamsRes] = await Promise.all([
        api.get('/fixtures', { params: { days_back: 365, days_ahead: 90 } }),
        api.get('/teams/followed'),
      ])
      setFixtures(fixturesRes.data)
      setTeams(teamsRes.data)
      if (showToast) toast.success('Fixtures refreshed.')
    } catch {
      toast.error('Failed to load fixtures.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRefresh = async () => { setRefreshing(true); await load(true) }

  const toggleRevealAll = () => {
    if (revealAll) {
      setRevealAll(false)
      setRevealedIds(new Set())
    } else {
      setRevealAll(true)
    }
  }

  const [showAllForComp, setShowAllForComp] = useState(false)
  const [compAllFixtures, setCompAllFixtures] = useState([])
  const [loadingCompAll, setLoadingCompAll] = useState(false)

  const todayRef = useRef(null)
  // null = no today section in view, true = visible, false = exists but scrolled away
  const [todayVisible, setTodayVisible] = useState(null)

  const updateTodayVisibility = useCallback(() => {
    const el = todayRef.current
    if (!el) { setTodayVisible(null); return }
    const { top, bottom } = el.getBoundingClientRect()
    setTodayVisible(top < window.innerHeight && bottom > 0)
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

  const revealOne = (id) => setRevealedIds(prev => new Set([...prev, id]))
  const isRevealed = (id) => revealAll || revealedIds.has(id)

  useEffect(() => {
    if (!showAllForComp || activeFilter?.type !== 'comp') {
      setCompAllFixtures([])
      return
    }
    let cancelled = false
    setLoadingCompAll(true)
    setCompAllFixtures([])
    api.get('/fixtures/by-competition', { params: { name: activeFilter.value } })
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
      .map(f => ({ name: f.competition.name, emblem_url: f.competition.emblem_url }))
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

  const setFilter = (type, value) => {
    setActiveFilter(prev => prev?.type === type && prev?.value === value ? null : { type, value })
    setRevealAll(false)
    setRevealedIds(new Set())
  }

  const hasScores = fixtures.some(f => f.status !== 'SCHEDULED')

  return (
    <>
    <div className="lg:flex lg:h-full">

      {/* ── Desktop left column: filters ── */}
      <div className="hidden lg:flex flex-col w-[250px] flex-shrink-0 border-r overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-4 h-14 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h1 className="text-sm font-semibold text-white">Fixtures</h1>
          <div className="flex items-center gap-0.5">
            {hasScores && (
              <button onClick={toggleRevealAll} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors" title={revealAll ? 'Hide scores' : 'Reveal scores'}>
                {revealAll ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
            <button onClick={handleRefresh} disabled={refreshing} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50" title="Refresh">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {sortedTeams.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 pt-4 pb-1">Teams</p>
                  {sortedTeams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => setFilter('team', team.name)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                        activeFilter?.type === 'team' && activeFilter.value === team.name
                          ? 'bg-white/10 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <span className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center flex-shrink-0">
                        {team.crest_url && <img src={team.crest_url} alt="" className="w-3.5 h-3.5 object-contain" />}
                      </span>
                      <span className="text-sm truncate">{team.name}</span>
                    </button>
                  ))}
                </>
              )}

              {competitions.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-4 pt-4 pb-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Leagues</p>
                    <div className="flex text-[10px] rounded border border-slate-700 overflow-hidden">
                      <button
                        onClick={() => setShowAllForComp(false)}
                        className={`px-2 py-0.5 transition-colors ${!showAllForComp ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-400'}`}
                      >Mine</button>
                      <button
                        onClick={() => setShowAllForComp(true)}
                        className={`px-2 py-0.5 border-l border-slate-700 transition-colors ${showAllForComp ? 'bg-green-600/20 text-green-400' : 'text-slate-500 hover:text-slate-400'}`}
                      >All</button>
                    </div>
                  </div>
                  {competitions.map(comp => (
                    <button
                      key={comp.name}
                      onClick={() => setFilter('comp', comp.name)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                        activeFilter?.type === 'comp' && activeFilter.value === comp.name
                          ? 'bg-white/10 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <span className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center flex-shrink-0">
                        {comp.emblem_url
                          ? <img src={comp.emblem_url} alt="" className="w-3.5 h-3.5 object-contain" />
                          : <Trophy size={11} className="text-slate-600" />
                        }
                      </span>
                      <span className="text-sm truncate">{comp.name}</span>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 min-w-0 lg:overflow-y-auto">
        <div className="p-4 sm:p-6 pt-16 lg:p-6 pb-24">

          {/* Mobile header */}
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <h1 className="text-xl font-bold text-white">Fixtures</h1>
            <div className="flex items-center gap-2">
              {hasScores && (
                <button onClick={toggleRevealAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                  {revealAll ? <EyeOff size={15} /> : <Eye size={15} />}
                  {revealAll ? 'Hide' : 'Reveal'}
                </button>
              )}
              <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50">
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

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
              {/* Mobile filter pills */}
              <div className="mb-4 space-y-2 lg:hidden">
                {sortedTeams.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6" style={{ scrollbarWidth: 'none' }}>
                    {sortedTeams.map(team => (
                      <FilterPill
                        key={team.id}
                        label={team.name}
                        icon={<span className="w-4 h-4 rounded bg-slate-200 flex items-center justify-center flex-shrink-0"><img src={team.crest_url} alt="" className="w-3 h-3 object-contain" /></span>}
                        active={activeFilter?.type === 'team' && activeFilter.value === team.name}
                        onClick={() => setFilter('team', team.name)}
                      />
                    ))}
                  </div>
                )}
                {competitions.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6" style={{ scrollbarWidth: 'none' }}>
                    {competitions.map(comp => (
                      <FilterPill
                        key={comp.name}
                        label={comp.name}
                        icon={comp.emblem_url
                          ? <span className="w-4 h-4 rounded bg-slate-200 flex items-center justify-center flex-shrink-0"><img src={comp.emblem_url} alt="" className="w-3 h-3 object-contain" /></span>
                          : <span className="w-4 h-4 rounded bg-slate-200 flex items-center justify-center flex-shrink-0"><Trophy size={10} className="text-slate-600" /></span>
                        }
                        active={activeFilter?.type === 'comp' && activeFilter.value === comp.name}
                        onClick={() => setFilter('comp', comp.name)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {dateKeys.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">No fixtures match this filter.</div>
              ) : (
                <div className="space-y-1">
                  {dateKeys.map(date => {
                    const category = getDateCategory(grouped[date][0].utc_date)
                    const isToday = category === 'today'
                    return (
                      <div key={date} ref={isToday ? todayRef : null}>
                        <DateGroupHeader label={date} />
                        <div className="space-y-2">
                          {grouped[date].map(f => {
                            const fid = `${f.source}:${f.external_id}`
                            return (
                              <FixtureCard
                                key={fid}
                                fixture={f}
                                revealed={isRevealed(fid)}
                                onRevealScore={() => revealOne(fid)}
                                onViewDetail={() => navigate(`/fixtures/${f.external_id}`, { state: { source: f.source, leagueSlug: f.league_slug } })}
                                dateCategory={category}
                              />
                            )
                          })}
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
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-green-600 hover:bg-green-500 text-white text-sm font-semibold shadow-lg transition-colors"
      >
        Today
      </button>
    )}
    </>
  )
}
