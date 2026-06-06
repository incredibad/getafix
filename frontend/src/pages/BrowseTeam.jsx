import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Star, Eye, EyeOff, Lock, Trophy, Calendar, Users, MapPin, User, ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import api from '../api/client'
import { imgUrl } from '../utils/img'
import { groupByDate } from '../utils/date'
import { FixtureCard, RoundSeparator } from '../components/FixtureCard'
import { getSpoilersMode, getRevealPersist, REVEALED_IDS_KEY } from './Settings'
import toast from 'react-hot-toast'

const BRISBANE_TZ = 'Australia/Brisbane'

function getDateCategory(utcDate) {
  const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: BRISBANE_TZ })
  const matchISO = new Date(utcDate).toLocaleDateString('en-CA', { timeZone: BRISBANE_TZ })
  if (matchISO === todayISO) return 'today'
  return matchISO < todayISO ? 'past' : 'future'
}

function Card({ title, icon: Icon, subtitle, children, className = '' }) {
  return (
    <div className={`rounded-xl border p-4 ${className}`} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      {title && (
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={13} className="text-green-400 flex-shrink-0 mt-px" />}
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{title}</h3>
          </div>
          {subtitle && <span className="text-[10px] text-slate-600 text-right leading-tight">{subtitle}</span>}
        </div>
      )}
      {children}
    </div>
  )
}

const RESULT_COLOURS = {
  W: 'bg-green-500/20 text-green-400',
  D: 'bg-slate-600/40 text-slate-400',
  L: 'bg-red-500/20 text-red-400',
}

function FormCard({ form, spoilersMode, revealAll, onReveal }) {
  const navigate = useNavigate()
  if (!form.length) return null
  return (
    <Card title="Recent Form" icon={Trophy} className="lg:col-span-2">
      {spoilersMode && !revealAll ? (
        <div className="flex justify-center py-3 cursor-pointer text-slate-500 hover:text-slate-300 transition-colors" onClick={onReveal}>
          <Lock size={18} />
        </div>
      ) : (
        <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
          {form.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderColor: 'var(--border)' }}>
              <span className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded text-xs font-bold ${RESULT_COLOURS[item.result]}`}>
                {item.result}
              </span>
              <div
                className={`flex items-center gap-2 flex-1 min-w-0${item.opponent.id ? ' cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
                onClick={item.opponent.id ? () => navigate(`/browse/team/${item.opponent.id}`, { state: { name: item.opponent.name, crest_url: item.opponent.crest_url, country: item.opponent.country } }) : undefined}
              >
                {item.opponent.crest_url && (
                  <img src={imgUrl(item.opponent.crest_url)} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                )}
                <span className="text-sm text-slate-200 truncate">{item.opponent.short_name || item.opponent.name}</span>
                <span className="text-[10px] font-semibold text-slate-600 flex-shrink-0 bg-white/5 px-1 rounded">{item.isHome ? 'H' : 'A'}</span>
              </div>
              <span className="text-sm font-semibold text-slate-300 tabular-nums flex-shrink-0">{item.gf}–{item.ga}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function InjuriesCard({ injuries }) {
  return (
    <Card title="Injuries & Suspensions" icon={AlertTriangle}>
      {!injuries.length ? (
        <p className="text-xs text-slate-500 py-1">No injuries or suspensions reported.</p>
      ) : (
        <div>
          {injuries.map((p, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${p.severity === 'red' ? 'bg-red-500' : 'bg-yellow-500'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-200 truncate">{p.player}</p>
                {p.type && <p className="text-xs text-slate-500">{p.type}</p>}
              </div>
              {p.expected_return && (
                <span className="text-[10px] text-slate-600 flex-shrink-0 mt-0.5">Ret. {p.expected_return}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function posGroup(raw) {
  const p = (raw || '').toLowerCase()
  if (!p) return '?'
  if (p.startsWith('g')) return 'G'
  if (p.startsWith('d')) return 'D'
  if (p.startsWith('m')) return 'M'
  if (p.startsWith('f') || p.startsWith('a')) return 'F'
  return p.charAt(0).toUpperCase()
}

function posLabel(raw) {
  const p = (raw || '').toLowerCase()
  if (p.startsWith('g')) return 'GK'
  if (p.startsWith('d')) return 'DEF'
  if (p.startsWith('m')) return 'MID'
  if (p.startsWith('f') || p.startsWith('a')) return 'FWD'
  return (raw || '').toUpperCase().slice(0, 3)
}

const POS_ORDER = ['G', 'D', 'M', 'F']
const POS_SECTION = { G: 'Goalkeepers', D: 'Defenders', M: 'Midfielders', F: 'Forwards' }

function SquadCard({ players }) {
  const navigate = useNavigate()
  const grouped = useMemo(() => {
    const map = {}
    for (const p of players) {
      const key = posGroup(p.position)
      if (!map[key]) map[key] = []
      map[key].push(p)
    }
    return map
  }, [players])

  const keys = [...POS_ORDER.filter(k => grouped[k]), ...Object.keys(grouped).filter(k => !POS_ORDER.includes(k) && k !== '?')]
  if (!keys.length) return null

  return (
    <Card title="Squad" icon={Users}>
      <div className="-mx-1">
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="text-right pr-3 pl-1 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wide w-8">#</th>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Name</th>
              <th className="text-center px-2 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wide w-12">Pos</th>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wide hidden sm:table-cell">Nationality</th>
              <th className="text-center px-2 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wide w-12 hidden md:table-cell">Ht</th>
              <th className="text-center px-2 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wide w-10 hidden md:table-cell">Age</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(key => (
              <>
                <tr key={`hdr-${key}`}>
                  <td colSpan={6} className="pt-3 pb-0.5 pl-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{POS_SECTION[key] ?? key}</span>
                  </td>
                </tr>
                {grouped[key]
                  .sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99))
                  .map((p, i) => {
                    const detailedPos = p.positions_detailed?.[0] ?? posLabel(p.position)
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'var(--border)' }}>
                        <td className="text-right pr-3 pl-1 py-2 text-xs text-slate-600 tabular-nums">{p.jersey_number ?? '—'}</td>
                        <td className="px-2 py-2 text-xs text-slate-200">{p.name}</td>
                        <td className="text-center px-2 py-2">
                          <span className="text-[10px] font-semibold text-slate-500 bg-white/5 rounded px-1.5 py-0.5">{detailedPos}</span>
                        </td>
                        <td className="px-2 py-2 hidden sm:table-cell">
                          {p.nationality ? (
                            <button
                              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                              onClick={() => p.nationality_team_id
                                ? navigate(`/browse/team/${p.nationality_team_id}`, { state: { name: p.nationality, team_type: 'national' } })
                                : navigate('/browse', { state: { initialQuery: p.nationality } })
                              }
                            >
                              {p.nationality_flag && (
                                <img src={imgUrl(p.nationality_flag)} alt="" className="h-3 w-auto flex-shrink-0" />
                              )}
                              <span className="text-xs text-slate-500">{p.nationality}</span>
                            </button>
                          ) : <span className="text-xs text-slate-600">—</span>}
                        </td>
                        <td className="text-center px-2 py-2 text-xs text-slate-500 tabular-nums hidden md:table-cell">{p.height ? `${p.height}cm` : '—'}</td>
                        <td className="text-center px-2 py-2 text-xs text-slate-500 tabular-nums hidden md:table-cell">{p.age ?? '—'}</td>
                      </tr>
                    )
                  })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function TransferRow({ t, direction }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <span className={`mt-0.5 flex-shrink-0 ${direction === 'in' ? 'text-green-400' : 'text-red-400'}`}>
        {direction === 'in' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-200 truncate">{t.player}</p>
        <p className="text-xs text-slate-500 truncate">
          {direction === 'in' ? `From ${t.from_team ?? '?'}` : `To ${t.to_team ?? '?'}`}
          {t.transfer_type === 'loan' && <span className="ml-1 text-yellow-500">· Loan</span>}
        </p>
      </div>
      {t.date && <span className="text-[10px] text-slate-600 flex-shrink-0 mt-0.5">{t.date}</span>}
    </div>
  )
}

function TransfersCard({ transfers }) {
  const hasIn = transfers.in?.length > 0
  const hasOut = transfers.out?.length > 0
  if (!hasIn && !hasOut) return null
  return (
    <Card title="Transfers" icon={ArrowDownLeft}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
        {hasIn && (
          <div>
            <p className="text-[10px] font-semibold text-green-400/80 uppercase tracking-wider mb-1">Arrivals</p>
            {transfers.in.slice(0, 10).map((t, i) => <TransferRow key={i} t={t} direction="in" />)}
          </div>
        )}
        {hasOut && (
          <div className={hasIn ? 'mt-4 sm:mt-0' : ''}>
            <p className="text-[10px] font-semibold text-red-400/80 uppercase tracking-wider mb-1">Departures</p>
            {transfers.out.slice(0, 10).map((t, i) => <TransferRow key={i} t={t} direction="out" />)}
          </div>
        )}
      </div>
    </Card>
  )
}

const INITIAL_SHOW = 3

function FixtureSection({ title, icon, fixtures, revealAll, revealedIds, onRevealOne, navigate, spoilersMode }) {
  const [expanded, setExpanded] = useState(false)
  const canExpand = fixtures.length > INITIAL_SHOW
  const displayed = canExpand && !expanded ? fixtures.slice(0, INITIAL_SHOW) : fixtures
  const grouped = groupByDate(displayed)
  const dateKeys = Object.keys(grouped)
  if (!fixtures.length) return null

  return (
    <Card title={title} icon={icon}>
      <div className="space-y-1">
        {dateKeys.map(date => {
          const category = getDateCategory(grouped[date][0].utc_date)
          return (
            <div key={date}>
              <div className="flex items-center gap-3 py-2">
                <span className={`text-xs font-semibold flex-shrink-0 ${category === 'today' ? 'text-green-400' : 'text-slate-500'}`}>{date}</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
              <div className="space-y-2">
                {grouped[date].reduce((acc, f, i) => {
                  const fid = `${f.source}:${f.external_id}`
                  const prev = grouped[date][i - 1]
                  if (f.round_name && prev && prev.round_name !== f.round_name)
                    acc.push(<RoundSeparator key={`r-${date}-${f.round_name}`} label={f.round_name} />)
                  const revealed = !spoilersMode || revealAll || revealedIds.has(fid)
                  acc.push(
                    <FixtureCard key={fid} fixture={f} revealed={revealed}
                      onRevealScore={() => onRevealOne(fid)}
                      onViewDetail={() => navigate(`/fixtures/${f.external_id}`, { state: { source: f.source, leagueSlug: f.league_slug, revealed } })}
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
      {canExpand && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors border-t pt-3"
          style={{ borderColor: 'var(--border)' }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Show less' : `${fixtures.length - INITIAL_SHOW} more`}
        </button>
      )}
    </Card>
  )
}

export default function BrowseTeam() {
  const { sofascoreId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state ?? {}

  const spoilersMode = getSpoilersMode()
  const [fixtures, setFixtures] = useState([])
  const [profile, setProfile] = useState(null)
  const [standingsMap, setStandingsMap] = useState({})
  const fetchedComps = useRef(new Set())
  const [followedTeams, setFollowedTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [revealedSections, setRevealedSections] = useState(() => new Set())
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

  const ALL_SECTIONS = ['standing', 'stats', 'form', 'fixtures']
  const allRevealed = ALL_SECTIONS.every(s => revealedSections.has(s))
  const isRevealed = (s) => revealedSections.has(s)
  const revealSection = (s) => setRevealedSections(prev => new Set([...prev, s]))

  const teamName = navState.name
    ?? fixtures.find(f => f.home_team.id === parseInt(sofascoreId))?.home_team.name
    ?? fixtures.find(f => f.away_team.id === parseInt(sofascoreId))?.away_team.name
    ?? profile?.profile?.name ?? ''
  const teamCrest = navState.crest_url ?? null
  const teamCountry = navState.country ?? profile?.profile?.country ?? null

  useEffect(() => {
    Promise.all([
      api.get(`/fixtures/team/sofascore/${sofascoreId}`, { params: { days_back: 400, days_ahead: 365 } }),
      api.get('/teams/followed'),
    ]).then(([fixturesRes, followedRes]) => {
      setFixtures(fixturesRes.data)
      setFollowedTeams(followedRes.data)
    }).catch(() => toast.error('Failed to load fixtures.'))
      .finally(() => setLoading(false))

    api.get(`/teams/sofascore/${sofascoreId}/profile`)
      .then(({ data }) => setProfile(data))
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [sofascoreId])

  // Determine which competition(s) to show standings for:
  // — Exclude non-competitive fixtures (friendlies, exhibitions)
  // — Base: always show the most recently played competition(s)
  // — Supplement: also show any competition with a match within 7 days (e.g. WC starting soon)
  // — Fallback: if no finished matches at all, show the soonest upcoming competition
  const activeCompetitions = useMemo(() => {
    if (!fixtures.length) return []
    const now = new Date()
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000

    const isCompetitive = (name) => {
      const n = (name || '').toLowerCase()
      return !n.includes('friendly') && !n.includes('fifa series') && !n.includes('test match') && !n.includes('exhibition')
    }

    const compMap = {}
    for (const f of fixtures) {
      const cid = f.competition.id
      if (!cid || !isCompetitive(f.competition.name)) continue
      const key = String(cid)
      if (!compMap[key]) compMap[key] = {
        id: cid, name: f.competition.name, emblem_url: f.competition.emblem_url,
        lastFinished: null, nextUpcoming: null,
      }
      const date = new Date(f.utc_date)
      if (f.status === 'FINISHED') {
        if (!compMap[key].lastFinished || date > compMap[key].lastFinished) compMap[key].lastFinished = date
      }
      if (f.status === 'SCHEDULED' || f.status === 'LIVE') {
        if (!compMap[key].nextUpcoming || date < compMap[key].nextUpcoming) compMap[key].nextUpcoming = date
      }
    }

    const comps = Object.values(compMap)
    const selected = new Map()

    // Base: most recently played competition(s), including any that finished within 24h of the most recent
    const withFinished = comps.filter(c => c.lastFinished).sort((a, b) => b.lastFinished - a.lastFinished)
    if (withFinished.length) {
      const cutoff = withFinished[0].lastFinished - 24 * 60 * 60 * 1000
      withFinished.filter(c => c.lastFinished >= cutoff).forEach(c => selected.set(String(c.id), c))
    }

    // Supplement: any competition with a match within 7 days not already in the set
    comps.filter(c => c.nextUpcoming && (c.nextUpcoming - now) <= ONE_WEEK)
      .forEach(c => selected.set(String(c.id), c))

    // Fallback: nothing played yet, show soonest upcoming
    if (!selected.size) {
      const future = comps.filter(c => c.nextUpcoming).sort((a, b) => a.nextUpcoming - b.nextUpcoming)
      if (future.length) selected.set(String(future[0].id), future[0])
    }

    // Sort: imminent competitions first, then by most recently played
    return [...selected.values()].sort((a, b) => {
      const aImminent = a.nextUpcoming && (a.nextUpcoming - now) <= ONE_WEEK
      const bImminent = b.nextUpcoming && (b.nextUpcoming - now) <= ONE_WEEK
      if (aImminent !== bImminent) return aImminent ? -1 : 1
      if (a.nextUpcoming && b.nextUpcoming) return a.nextUpcoming - b.nextUpcoming
      if (a.lastFinished && b.lastFinished) return b.lastFinished - a.lastFinished
      return 0
    })
  }, [fixtures])

  // Fetch standings for each active competition (once each)
  useEffect(() => {
    if (!activeCompetitions.length) return
    activeCompetitions.forEach(comp => {
      const key = String(comp.id)
      if (fetchedComps.current.has(key)) return
      fetchedComps.current.add(key)
      api.get(`/standings/sofascore/${comp.id}`).then(({ data }) => {
        setStandingsMap(prev => ({
          ...prev,
          [key]: data.map(group => ({
            ...group,
            competition: {
              ...group.competition,
              name: group.competition?.name || comp.name || '',
              emblem_url: group.competition?.emblem_url || comp.emblem_url || null,
            },
          })),
        }))
      }).catch(() => setStandingsMap(prev => ({ ...prev, [key]: [] })))
    })
  }, [activeCompetitions])

  const followedEntry = useMemo(() =>
    followedTeams.find(t => t.sofascore_id === parseInt(sofascoreId)),
  [followedTeams, sofascoreId])
  const isFollowed = !!followedEntry

  const upcoming = useMemo(() =>
    fixtures.filter(f => f.status === 'SCHEDULED' || f.status === 'LIVE')
      .sort((a, b) => new Date(a.utc_date) - new Date(b.utc_date)),
  [fixtures])

  const recent = useMemo(() =>
    fixtures.filter(f => f.status === 'FINISHED')
      .sort((a, b) => new Date(b.utc_date) - new Date(a.utc_date))
      .slice(0, 20),
  [fixtures])

  // Rich form: result + opponent + score for last 5
  const form = useMemo(() => {
    const tid = parseInt(sofascoreId)
    return recent.slice(0, 5).map(f => {
      const isHome = f.home_team.id === tid
      const opponent = isHome ? f.away_team : f.home_team
      const gf = isHome ? f.score_home : f.score_away
      const ga = isHome ? f.score_away : f.score_home
      if (gf == null || ga == null) return null
      const result = gf > ga ? 'W' : gf === ga ? 'D' : 'L'
      return { result, opponent, gf, ga, isHome }
    }).filter(Boolean)
  }, [recent, sofascoreId])

  const seasonStats = useMemo(() => {
    const tid = parseInt(sofascoreId)
    const finished = fixtures.filter(f => f.status === 'FINISHED' && f.score_home != null)
    if (!finished.length) return null
    let gf = 0, ga = 0, w = 0, d = 0, l = 0, cs = 0
    for (const f of finished) {
      const isHome = f.home_team.id === tid
      const scored = isHome ? f.score_home : f.score_away
      const conceded = isHome ? f.score_away : f.score_home
      gf += scored ?? 0; ga += conceded ?? 0
      if (conceded === 0) cs++
      if (scored > conceded) w++; else if (scored === conceded) d++; else l++
    }
    const competitions = [...new Set(finished.map(f => f.competition.name))].sort()
    return { played: finished.length, w, d, l, gf, ga, gd: gf - ga, cs, competitions }
  }, [fixtures, sofascoreId])

  const activeStandings = useMemo(() => {
    const tid = parseInt(sofascoreId)
    return activeCompetitions.flatMap(comp => {
      const groups = standingsMap[String(comp.id)]
      if (!groups) return []
      for (const group of groups) {
        const row = (group.table || []).find(r =>
          r.sofascore_id === tid || (r.team_crest || '').includes(`/team/${tid}/image`)
        )
        if (row) return [{ row, competition: group.competition, lastPlayed: comp.lastFinished, competitionId: comp.id }]
      }
      return []
    })
  }, [activeCompetitions, standingsMap, sofascoreId])

  const handleFollow = async () => {
    setFollowing(true)
    try {
      await api.post('/teams/follow', {
        name: teamName,
        short_name: navState.short_name ?? profile?.profile?.short_name ?? teamName,
        country: teamCountry,
        crest_url: teamCrest,
        team_type: navState.team_type ?? (profile?.profile?.national ? 'national' : 'club'),
        sofascore_id: parseInt(sofascoreId),
      })
      const { data } = await api.get('/teams/followed')
      setFollowedTeams(data)
      toast.success(`Now following ${teamName}`)
    } catch { toast.error('Failed to follow team.') }
    finally { setFollowing(false) }
  }

  const handleUnfollow = async () => {
    if (!followedEntry) return
    setFollowing(true)
    try {
      await api.delete(`/teams/${followedEntry.id}/unfollow`)
      setFollowedTeams(prev => prev.filter(t => t.id !== followedEntry.id))
      toast.success(`Unfollowed ${teamName}`)
    } catch { toast.error('Failed to unfollow team.') }
    finally { setFollowing(false) }
  }

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
  const hasScores = spoilersMode && fixtures.some(f => f.status !== 'SCHEDULED')
  const players = profile?.players ?? []
  const transfers = profile?.transfers ?? { in: [], out: [] }
  const injuries = profile?.injuries ?? []
  const profileData = profile?.profile ?? {}
  const hasTransfers = transfers.in?.length > 0 || transfers.out?.length > 0

  if (loading && profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const fixtureProps = { revealAll: isRevealed('fixtures'), revealedIds, onRevealOne: revealOne, navigate, spoilersMode }

  return (
    <div className="p-4 sm:p-6 pt-16 lg:pt-6 pb-16">

      {/* Nav row */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        {hasScores && (
          <button
            onClick={() => setRevealedSections(allRevealed ? new Set() : new Set(ALL_SECTIONS))}
            className={`p-2 rounded-lg transition-colors ${allRevealed ? 'text-green-400 bg-green-500/20 hover:bg-green-500/30' : 'text-red-400 bg-red-500/20 hover:bg-red-500/30'}`}
          >
            {allRevealed ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* ── Header — full width ── */}
        <Card className="lg:col-span-4">
          <div className="flex items-center gap-4">
            {teamCrest
              ? <img src={imgUrl(teamCrest)} alt="" className="w-14 h-14 object-contain flex-shrink-0" />
              : <span className="w-14 h-14 flex items-center justify-center text-3xl flex-shrink-0">⚽</span>
            }
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-white truncate">{teamName}</h1>
              {profileData.national && profileData.ranking ? (
                <p className="text-sm text-slate-400">FIFA ranking #{profileData.ranking}</p>
              ) : (teamCountry || profileData.primary_tournament_name) ? (
                <p className="text-sm text-slate-400">
                  {teamCountry}
                  {teamCountry && profileData.primary_tournament_name && ' · '}
                  {profileData.primary_tournament_name}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {profileData.slug && (
                <a
                  href={`https://www.sofascore.com/team/football/${profileData.slug}/${sofascoreId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors border"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <ArrowUpRight size={13} />
                  Sofascore
                </a>
              )}
              {isFollowed && (
                <button
                  onClick={() => navigate('/fixtures', { state: { initialFilter: { type: 'team', value: teamName } } })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors border"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <Calendar size={13} />
                  My Fixtures
                </button>
              )}
              <button
                onClick={isFollowed ? handleUnfollow : handleFollow}
                disabled={following}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isFollowed
                    ? 'text-green-400 bg-green-500/20 hover:bg-red-500/20 hover:text-red-400'
                    : 'text-white bg-green-600 hover:bg-green-500'
                }`}
              >
                <Star size={13} fill={isFollowed ? 'currentColor' : 'none'} />
                {following ? '…' : isFollowed ? 'Following' : 'Follow'}
              </button>
            </div>
          </div>
        </Card>

        {/* ── Left 2 cols: 2-col sub-grid of stat cards + squad ── */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">

          {/* Club Info */}
          {(profileData.manager || profileData.venue || profileData.founded) && (
            <Card title="Club Info" icon={User}>
              <div className="space-y-3">
                {profileData.manager && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Manager</p>
                    <p className="text-sm text-slate-200 flex items-center gap-1.5">
                      <User size={12} className="text-slate-600 flex-shrink-0" />{profileData.manager}
                    </p>
                  </div>
                )}
                {profileData.venue && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Stadium</p>
                    <p className="text-sm text-slate-200 flex items-center gap-1.5">
                      <MapPin size={12} className="text-slate-600 flex-shrink-0" />{profileData.venue}
                    </p>
                    {profileData.venue_city && <p className="text-xs text-slate-500 ml-[18px]">{profileData.venue_city}</p>}
                  </div>
                )}
                {profileData.founded && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Founded</p>
                    <p className="text-sm text-slate-200">{profileData.founded}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* League Standing(s) — one card per active competition */}
          {activeStandings.map((s, i) => (
            <Card
              key={i}
              title="Standing"
              icon={Trophy}
              subtitle={s.lastPlayed ? new Date(s.lastPlayed).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined}
            >
              <button
                onClick={() => navigate('/tables', { state: { tab: 'all', competition: { id: s.competitionId, name: s.competition?.name, emblem_url: s.competition?.emblem_url } } })}
                className="flex items-center gap-2 mb-3 pb-3 w-full text-left border-b group transition-colors"
                style={{ borderColor: 'var(--border)' }}
              >
                {s.competition?.emblem_url && (
                  <img src={imgUrl(s.competition.emblem_url)} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                )}
                <span className="text-sm font-medium text-slate-200 group-hover:text-green-400 truncate flex-1 transition-colors">{s.competition?.name}</span>
                <ArrowUpRight size={12} className="text-slate-600 group-hover:text-green-400 flex-shrink-0 transition-colors" />
              </button>
              {spoilersMode && !isRevealed('standing') ? (
                <div className="flex justify-center py-3 cursor-pointer text-slate-500 hover:text-slate-300 transition-colors" onClick={() => revealSection('standing')}>
                  <Lock size={18} />
                </div>
              ) : (
                <>
                  <div className="flex justify-center gap-8 py-2 mb-3">
                    {[['Position', s.row.position], ['Points', s.row.points]].map(([label, val]) => (
                      <div key={label} className="text-center">
                        <p className="text-3xl font-bold text-white leading-none tabular-nums">{val}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 text-center gap-1">
                    {[['P', s.row.played], ['W', s.row.won], ['D', s.row.draw], ['L', s.row.lost], ['GD', (s.row.goal_difference > 0 ? '+' : '') + s.row.goal_difference]].map(([k, v]) => (
                      <div key={k} className="rounded py-1.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-sm font-semibold text-slate-200 tabular-nums">{v}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{k}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          ))}

          {/* Injuries & Suspensions */}
          <InjuriesCard injuries={injuries} />

          {/* Season Stats */}
          {seasonStats && (
            <Card title="Season Stats" icon={Trophy}>
              {seasonStats.competitions.length > 0 && (
                <p className="text-[10px] text-slate-600 mb-3 leading-relaxed">
                  {seasonStats.competitions.slice(0, 3).join(' · ')}
                  {seasonStats.competitions.length > 3 && ` · +${seasonStats.competitions.length - 3} more`}
                </p>
              )}
              {spoilersMode && !isRevealed('stats') ? (
                <div className="flex justify-center py-3 cursor-pointer text-slate-500 hover:text-slate-300 transition-colors" onClick={() => revealSection('stats')}>
                  <Lock size={18} />
                </div>
              ) : (
                <table className="w-full">
                  <tbody>
                    {[
                      ['Played', seasonStats.played],
                      ['Wins', seasonStats.w],
                      ['Draws', seasonStats.d],
                      ['Losses', seasonStats.l],
                      ['Goals For', seasonStats.gf],
                      ['Goals Against', seasonStats.ga],
                      ['Goal Difference', `${seasonStats.gd >= 0 ? '+' : ''}${seasonStats.gd}`],
                      ['Clean Sheets', seasonStats.cs],
                    ].map(([label, val]) => (
                      <tr key={label} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-1.5 text-xs text-slate-500">{label}</td>
                        <td className="py-1.5 text-xs font-semibold text-white text-right tabular-nums">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {/* Squad — spans both sub-columns */}
          {players.length > 0 && (
            <div className="sm:col-span-2">
              <SquadCard players={players} />
            </div>
          )}

        </div>

        {/* ── Right 2 cols: form + fixtures ── */}
        <div className="lg:col-span-2 space-y-4">
          <FormCard form={form} spoilersMode={spoilersMode} revealAll={isRevealed('form')} onReveal={() => revealSection('form')} />
          <FixtureSection title="Upcoming" icon={Calendar} fixtures={upcoming} {...fixtureProps} />
          <FixtureSection title="Recent Results" icon={Trophy} fixtures={recent} {...fixtureProps} />
        </div>

        {/* ── Transfers — full width ── */}
        {hasTransfers && (
          <div className="lg:col-span-4">
            <TransfersCard transfers={transfers} />
          </div>
        )}

      </div>
    </div>
  )
}
