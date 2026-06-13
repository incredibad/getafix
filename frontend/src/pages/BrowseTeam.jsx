import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Star, Eye, EyeOff, TrendingUp, Clock, Info, LayoutGrid, BarChart2, Trophy, ArrowLeftRight, ArrowDownLeft, Calendar, Users, ArrowUpRight, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import api from '../api/client'
import { imgUrl } from '../utils/img'
import { groupByDate } from '../utils/date'
import { FixtureCard, RoundSeparator, SourceLED } from '../components/FixtureCard'
import { getSpoilersMode, getRevealPersist, getAutoRevealAge, isAutoRevealedByAge, REVEALED_IDS_KEY } from './Settings'
import BrowseHeader from '../components/BrowseHeader'
import toast from 'react-hot-toast'

const BRISBANE_TZ = 'Australia/Brisbane'

function getDateCategory(utcDate) {
  const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: BRISBANE_TZ })
  const matchISO = new Date(utcDate).toLocaleDateString('en-CA', { timeZone: BRISBANE_TZ })
  if (matchISO === todayISO) return 'today'
  return matchISO < todayISO ? 'past' : 'future'
}

function Card({ title, icon: Icon, subtitle, source, children, className = '' }) {
  return (
    <div className={`rounded-xl border p-4 ${className}`} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      {title && (
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={13} className="text-green-400 flex-shrink-0 mt-px" />}
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{title}</h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {subtitle && <span className="text-[10px] text-slate-600 text-right leading-tight">{subtitle}</span>}
            <SourceLED source={source} />
          </div>
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

function timeAgo(utcDate) {
  const ms = Date.now() - new Date(utcDate).getTime()
  const mins = Math.floor(ms / 60000)
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(ms / 86400000)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  if (months >= 2) return `${months} months ago`
  if (months === 1) return '1 month ago'
  if (weeks >= 2) return `${weeks} weeks ago`
  if (weeks === 1) return '1 week ago'
  if (days >= 2) return `${days} days ago`
  if (days === 1) return 'Yesterday'
  if (hours >= 2) return `${hours} hours ago`
  if (hours === 1) return '1 hour ago'
  return 'Today'
}

function FormCard({ form, source, spoilersMode, revealedIds, onRevealOne, autoRevealAge, className = '' }) {
  const navigate = useNavigate()
  if (!form.length) return null
  return (
    <Card title="Recent Form" icon={TrendingUp} source={source} className={className}>
      <div>
        {form.map((item, i) => {
          const fid = item.fid
          const revealed = !spoilersMode || isAutoRevealedByAge(item.utc_date, autoRevealAge) || (fid && revealedIds.has(fid))
          return (
            <div
              key={i}
              className={`flex items-center gap-2.5 py-2.5 border-b last:border-0 transition-colors${item.opponent.id ? ' cursor-pointer hover:bg-white/5 -mx-1 px-1 rounded' : ''}`}
              style={{ borderColor: 'var(--border)' }}
              onClick={item.opponent.id ? () => navigate(`/browse/team/${item.opponent.id}`, { state: { name: item.opponent.name, crest_url: item.opponent.crest_url, country: item.opponent.country } }) : undefined}
            >
              {revealed ? (
                <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold flex-shrink-0 ${RESULT_COLOURS[item.result]}`}>
                  {item.result}
                </span>
              ) : (
                <button className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-slate-600 hover:text-slate-300 transition-colors" onClick={e => { e.stopPropagation(); onRevealOne(fid) }} title="Reveal score">
                  <EyeOff size={14} />
                </button>
              )}
              <div className="relative flex-shrink-0 group/crest">
                {item.opponent.crest_url
                  ? <img src={imgUrl(item.opponent.crest_url)} alt={item.opponent.name} className="w-5 h-5 object-contain" />
                  : <div className="w-5 h-5" />
                }
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 pointer-events-none hidden group-hover/crest:block">
                  <div className="whitespace-nowrap rounded px-2 py-1 text-[10px] font-medium text-slate-200 shadow-lg" style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                    {item.opponent.name}
                  </div>
                </div>
              </div>
              <span className="text-xs text-slate-300 truncate flex-1">{item.opponent.short_name || item.opponent.name}</span>
              {item.utc_date && <span className="text-[10px] text-slate-600 flex-shrink-0 hidden sm:inline">{timeAgo(item.utc_date)}</span>}
              <span className="text-[10px] font-semibold text-slate-500 flex-shrink-0">{item.isHome ? 'H' : 'A'}</span>
              {revealed ? (
                <span className="flex flex-col items-end flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-200 tabular-nums">{item.gf}–{item.ga}</span>
                  {item.penH != null && <span className="text-[10px] text-slate-500 tabular-nums">{item.penH}–{item.penA} pens</span>}
                </span>
              ) : (
                <button className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0" onClick={e => { e.stopPropagation(); onRevealOne(fid) }} title="Reveal score">
                  <EyeOff size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function InjuriesCard({ injuries, source }) {
  return (
    <Card title="Injuries & Suspensions" icon={AlertTriangle} source={source}>
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

const POS_GROUP = { GK: 'G', SW: 'G', CB: 'D', LB: 'D', RB: 'D', LWB: 'D', RWB: 'D', DM: 'M', CM: 'M', AM: 'M', LM: 'M', RM: 'M', LW: 'M', RW: 'M', SS: 'F', CF: 'F', ST: 'F', FWD: 'F', MID: 'M', DEF: 'D' }

function posGroup(raw) {
  if (!raw) return '?'
  const up = raw.toUpperCase()
  if (POS_GROUP[up]) return POS_GROUP[up]
  const p = raw.toLowerCase()
  if (p.startsWith('g')) return 'G'
  if (p.startsWith('d')) return 'D'
  if (p.startsWith('m')) return 'M'
  if (p.startsWith('f') || p.startsWith('a')) return 'F'
  return '?'
}

const POS_FULL = {
  GK: 'Goalkeeper', SW: 'Sweeper',
  CB: 'Centre-Back', DC: 'Centre-Back', LB: 'Left Back', DL: 'Left Back', RB: 'Right Back', DR: 'Right Back',
  LWB: 'Left Wing-Back', RWB: 'Right Wing-Back',
  DM: 'Defensive Mid', CM: 'Central Mid', MC: 'Central Mid', AM: 'Attacking Mid',
  LM: 'Left Mid', RM: 'Right Mid',
  LW: 'Left Winger', RW: 'Right Winger',
  SS: 'Second Striker', CF: 'Centre Forward', ST: 'Striker',
  FWD: 'Forward', MID: 'Midfielder', DEF: 'Defender',
}

function PosTooltip({ abbr }) {
  const [show, setShow] = useState(false)
  const full = POS_FULL[abbr]
  const hasTooltip = full && full !== abbr
  return (
    <div className="relative inline-block">
      <button
        className="text-[10px] font-semibold text-slate-500 bg-white/5 rounded px-1.5 py-0.5 focus:outline-none"
        onMouseEnter={() => hasTooltip && setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => hasTooltip && setShow(s => !s)}
      >
        {abbr}
      </button>
      {show && hasTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 pointer-events-none">
          <div className="whitespace-nowrap rounded px-2 py-1 text-[10px] font-medium text-slate-200 shadow-lg" style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
            {full}
          </div>
        </div>
      )}
    </div>
  )
}

function posLabel(raw) {
  const p = (raw || '').toLowerCase()
  if (p.startsWith('g')) return 'GK'
  if (p.startsWith('d') || p.includes('back') || p.includes('defender')) return 'DEF'
  if (p.startsWith('m') || p.includes('midfielder')) return 'MID'
  if (p.startsWith('f') || p.startsWith('a') || p.includes('forward') || p.includes('winger') || p.includes('striker')) return 'FWD'
  return (raw || '').toUpperCase().slice(0, 3)
}

const POS_ORDER = ['G', 'D', 'M', 'F']
const POS_SECTION = { G: 'Goalkeepers', D: 'Defenders', M: 'Midfielders', F: 'Forwards' }

function SquadCard({ players, isNational, source }) {
  const navigate = useNavigate()

  const unique = useMemo(() => {
    const seen = new Set()
    return players.filter(p => {
      const key = p.id ?? `${p.name}|${p.jersey_number}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [players])

  const duplicateNumbers = useMemo(() => {
    const counts = {}
    for (const p of unique) {
      if (p.jersey_number != null) counts[p.jersey_number] = (counts[p.jersey_number] || 0) + 1
    }
    return new Set(Object.keys(counts).filter(n => counts[n] > 1).map(Number))
  }, [unique])

  const grouped = useMemo(() => {
    const map = {}
    for (const p of unique) {
      const key = posGroup(p.positions_detailed?.[0] || p.position)
      if (!map[key]) map[key] = []
      map[key].push(p)
    }
    return map
  }, [unique])

  const keys = [...POS_ORDER.filter(k => grouped[k]), ...Object.keys(grouped).filter(k => !POS_ORDER.includes(k) && k !== '?')]
  if (!keys.length) return null

  return (
    <Card title="Squad" icon={Users} source={source}>
      <div className="-mx-1">
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="text-right pr-3 pl-1 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wide w-8">#</th>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Name</th>
              <th className="text-right px-2 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wide w-20">Pos</th>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wide hidden sm:table-cell">{isNational ? 'Club' : 'Nat'}</th>
              <th className="text-center px-2 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wide w-12 hidden sm:table-cell">Ht</th>
              <th className="text-center px-2 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wide w-10 hidden sm:table-cell">Age</th>
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
                    const allPositions = p.positions_detailed?.length ? p.positions_detailed : [posLabel(p.position)]
                    const abbr = allPositions[0]
                    const clubOrNat = isNational
                      ? (p.club_short_name || p.club_name || null)
                      : (p.nationality || null)
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'var(--border)' }}>
                        <td className="text-right pr-3 pl-1 py-2 text-xs text-slate-600 tabular-nums">{p.jersey_number != null && !duplicateNumbers.has(p.jersey_number) ? p.jersey_number : '—'}</td>
                        <td className="px-2 py-2">
                          <span className="text-xs text-slate-200">{p.name}</span>
                          {/* Mobile sub-info: club/nat, height, age */}
                          <div className="sm:hidden flex items-center gap-2 mt-0.5 flex-wrap">
                            {clubOrNat && (
                              <button
                                className="text-[10px] text-slate-500 flex items-center gap-1 hover:opacity-70 transition-opacity"
                                onClick={e => {
                                  e.stopPropagation()
                                  if (isNational) {
                                    if (p.club_id) navigate(`/browse/team/${p.club_id}`, { state: { name: p.club_name, crest_url: p.club_crest_url } })
                                  } else {
                                    if (p.nationality_team_id) navigate(`/browse/team/${p.nationality_team_id}`, { state: { name: p.nationality, team_type: 'national' } })
                                    else navigate('/browse', { state: { initialQuery: p.nationality } })
                                  }
                                }}
                              >
                                {!isNational && p.nationality_flag
                                  ? <img src={imgUrl(p.nationality_flag)} alt="" className="h-2.5 w-auto flex-shrink-0" />
                                  : isNational && p.club_crest_url
                                  ? <img src={imgUrl(p.club_crest_url)} alt="" className="h-2.5 w-auto flex-shrink-0 object-contain" />
                                  : null}
                                {clubOrNat}
                              </button>
                            )}
                            {p.height && <span className="text-[10px] text-slate-600">{p.height}cm</span>}
                            {p.age != null && <span className="text-[10px] text-slate-600">{p.age}y</span>}
                          </div>
                        </td>
                        <td className="text-right px-2 py-2">
                          <div className="flex gap-0.5 justify-end">
                            {allPositions.map(a => <PosTooltip key={a} abbr={a} />)}
                          </div>
                        </td>
                        <td className="px-2 py-2 hidden sm:table-cell">
                          {isNational ? (
                            p.club_id ? (
                              <button
                                className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                                onClick={() => navigate(`/browse/team/${p.club_id}`, { state: { name: p.club_name, crest_url: p.club_crest_url } })}
                              >
                                <img src={imgUrl(p.club_crest_url)} alt="" className="h-3.5 w-auto flex-shrink-0 object-contain" />
                                <span className="text-xs text-slate-500">{p.club_short_name}</span>
                              </button>
                            ) : <span className="text-xs text-slate-600">—</span>
                          ) : (
                            p.nationality ? (
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
                            ) : <span className="text-xs text-slate-600">—</span>
                          )}
                        </td>
                        <td className="text-center px-2 py-2 text-xs text-slate-500 tabular-nums hidden sm:table-cell">{p.height ? `${p.height}cm` : '—'}</td>
                        <td className="text-center px-2 py-2 text-xs text-slate-500 tabular-nums hidden sm:table-cell">{p.age ?? '—'}</td>
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
        {(t.fee || t.date) && (
          <p className="text-[10px] text-slate-600 mt-0.5">
            {t.date && <span>{t.date}</span>}
            {t.fee && <span className="ml-1 text-slate-500">{t.fee}</span>}
          </p>
        )}
      </div>
    </div>
  )
}

function TransfersCard({ transfers, source }) {
  const hasIn = transfers.in?.length > 0
  const hasOut = transfers.out?.length > 0
  if (!hasIn && !hasOut) return null
  return (
    <Card title="Transfers" icon={ArrowLeftRight} source={source}>
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

function FixtureSection({ title, icon, fixtures, source, revealAll, revealedIds, onRevealOne, navigate, spoilersMode, autoRevealAge, compact = false }) {
  const [expanded, setExpanded] = useState(false)
  const canExpand = fixtures.length > INITIAL_SHOW
  const displayed = canExpand && !expanded ? fixtures.slice(0, INITIAL_SHOW) : fixtures
  const grouped = groupByDate(displayed)
  const dateKeys = Object.keys(grouped)
  if (!fixtures.length) return null

  return (
    <Card title={title} icon={icon} source={source}>
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
                  const revealed = !spoilersMode || revealAll || revealedIds.has(fid) || isAutoRevealedByAge(f.utc_date, autoRevealAge)
                  acc.push(
                    <FixtureCard key={fid} fixture={f} revealed={revealed}
                      onRevealScore={() => onRevealOne(fid)}
                      onViewDetail={() => navigate(`/fixtures/${f.external_id}`, { state: { source: f.source, leagueSlug: f.league_slug, revealed } })}
                      dateCategory={category}
                      compact={compact}
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
  const autoRevealAge = getAutoRevealAge()
  const [fixtures, setFixtures] = useState([])
  const [profile, setProfile] = useState(null)
  const [standingsMap, setStandingsMap] = useState({})
  const [cupMap, setCupMap] = useState({})
  const fetchedComps = useRef(new Set())
  const fetchedCupComps = useRef(new Set())
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

  const ALL_SECTIONS = ['standing', 'cup', 'stats', 'form', 'fixtures']
  const allRevealed = ALL_SECTIONS.every(s => revealedSections.has(s))
  const isRevealed = (s) => revealedSections.has(s)
  const revealSection = (s) => setRevealedSections(prev => new Set([...prev, s]))

  const teamName = navState.name
    ?? fixtures.find(f => f.home_team.id === parseInt(sofascoreId))?.home_team.name
    ?? fixtures.find(f => f.away_team.id === parseInt(sofascoreId))?.away_team.name
    ?? profile?.profile?.name ?? ''
  const teamCrest = navState.crest_url ?? `https://api.sofascore.com/api/v1/team/${sofascoreId}/image`
  const teamCountry = navState.country ?? profile?.profile?.country ?? null

  useEffect(() => {
    const fixtureParams = { days_back: 400, days_ahead: 365 }
    if (navState.name) fixtureParams.name = navState.name
    Promise.all([
      api.get(`/fixtures/team/sofascore/${sofascoreId}`, { params: fixtureParams }),
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

  // For each competition, find the latest season_id and season_year from finished fixtures.
  // Used to compare competitions against the domestic league's current season.
  const compSeasons = useMemo(() => {
    const map = {}
    for (const f of fixtures) {
      if (f.status === 'FINISHED' && f.competition?.id && f.season_id != null) {
        const cid = String(f.competition.id)
        if (!map[cid] || f.season_id > map[cid].id) {
          map[cid] = { id: f.season_id, year: f.season_year }
        }
      }
    }
    return map
  }, [fixtures])

  // For clubs: the domestic league's current season_year (e.g. "25/26"), used to
  // filter out previous-season competitions via label comparison.
  // For national teams: null — they use a date cutoff instead (Jan 1 of current year).
  const domesticSeasonYear = useMemo(() => {
    if (!!profile?.profile?.national) return null
    const compCounts = {}
    for (const f of fixtures) {
      if (f.status === 'FINISHED' && f.competition?.id) {
        const k = String(f.competition.id)
        compCounts[k] = (compCounts[k] || 0) + 1
      }
    }
    let domesticId = null, maxCount = 0
    for (const [cid, count] of Object.entries(compCounts)) {
      if (count > maxCount) { maxCount = count; domesticId = cid }
    }
    return domesticId ? (compSeasons[domesticId]?.year ?? null) : null
  }, [fixtures, profile, compSeasons])

  // Determine which competition(s) to show standings for:
  // — Exclude non-competitive fixtures (friendlies, exhibitions)
  // — Base: competitions whose season_year matches the domestic league's current season
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

    const isNational = !!profile?.profile?.national

    // Base: for clubs, match season_year label against domestic league's current season.
    // For national teams, include all finished competitive fixtures in the loaded window —
    // their competitions span multiple season labels so label comparison doesn't apply.
    const finishedComps = comps.filter(c => c.lastFinished)
    finishedComps
      .filter(c => {
        if (isNational) return true
        if (!domesticSeasonYear) return true
        const compYear = compSeasons[String(c.id)]?.year
        if (!compYear) return true
        return compYear === domesticSeasonYear
      })
      .forEach(c => selected.set(String(c.id), c))

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
  }, [fixtures, compSeasons, domesticSeasonYear, profile])

  // Fetch standings for each active competition (once each)
  useEffect(() => {
    if (!activeCompetitions.length) return
    activeCompetitions.forEach(comp => {
      const key = String(comp.id)
      if (fetchedComps.current.has(key)) return
      fetchedComps.current.add(key)
      const standingParams = compSeasons[key]?.id ? { season_id: compSeasons[key].id } : {}
      api.get(`/standings/sofascore/${comp.id}`, { params: standingParams }).then(({ data }) => {
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

      if (!fetchedCupComps.current.has(key)) {
        fetchedCupComps.current.add(key)
        api.get(`/standings/cups/sofascore/${comp.id}`, { params: { team_id: sofascoreId, season_id: compSeasons[key]?.id } })
          .then(({ data }) => setCupMap(prev => ({ ...prev, [key]: data })))
          .catch(() => setCupMap(prev => ({ ...prev, [key]: null })))
      }
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
      const fid = f.source && f.external_id ? `${f.source}:${f.external_id}` : null
      const penH = isHome ? f.score_pen_home : f.score_pen_away
      const penA = isHome ? f.score_pen_away : f.score_pen_home
      return { id: f.id, fid, result, opponent, gf, ga, penH, penA, isHome, utc_date: f.utc_date }
    }).filter(Boolean)
  }, [recent, sofascoreId])

  const seasonStats = useMemo(() => {
    const tid = parseInt(sofascoreId)
    const isNational = !!profile?.profile?.national
    const calendarYearStart = new Date(`${new Date().getFullYear()}-01-01T00:00:00Z`)
    const activeCompIds = new Set(activeCompetitions.map(c => String(c.id)))
    const finished = fixtures.filter(f => {
      if (f.status !== 'FINISHED' || f.score_home == null) return false
      const cid = String(f.competition?.id)
      if (!activeCompIds.has(cid)) return false
      // National teams: calendar year
      if (isNational) return new Date(f.utc_date) >= calendarYearStart
      // Clubs: filter by per-competition season_id
      const currentSeason = compSeasons[cid]
      if (!currentSeason || f.season_id == null) return true
      return f.season_id === currentSeason.id
    })
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
    const lastPlayed = finished.reduce((max, f) => {
      const t = new Date(f.utc_date).getTime()
      return t > max ? t : max
    }, 0) || null
    return { played: finished.length, w, d, l, gf, ga, gd: gf - ga, cs, competitions, lastPlayed }
  }, [fixtures, sofascoreId, activeCompetitions, compSeasons, profile])

  // Competition with the most finished matches = domestic league
  const domesticLeague = useMemo(() => {
    if (!activeCompetitions.length) return null
    const counts = {}
    for (const f of fixtures) {
      if (f.status === 'FINISHED' && f.competition?.id) {
        const k = String(f.competition.id)
        counts[k] = (counts[k] || 0) + 1
      }
    }
    return [...activeCompetitions].sort((a, b) => (counts[String(b.id)] || 0) - (counts[String(a.id)] || 0))[0] ?? null
  }, [activeCompetitions, fixtures])

  const _findTeamRow = useCallback((table, tid) => {
    const nameLower = teamName?.toLowerCase()
    return (table || []).find(r =>
      r.sofascore_id === tid ||
      (r.team_crest || '').includes(`/team/${tid}/image`) ||
      (nameLower && r.team_name?.toLowerCase() === nameLower)
    )
  }, [teamName])

  // Resolve a competition to { type: 'cup'|'standing', data } or null.
  // Cup run takes priority over group standing for the same competition.
  const resolveComp = useCallback((comp, tid) => {
    const key = String(comp.id)
    const cupData = cupMap[key]
    if (cupData?.rounds?.length) {
      return { type: 'cup', data: { ...cupData, lastPlayed: comp.lastFinished, competitionId: comp.id } }
    }
    const groups = standingsMap[key]
    if (groups?.length) {
      for (const group of groups) {
        const row = _findTeamRow(group.table, tid)
        if (row) return { type: 'standing', data: { row, competition: group.competition, lastPlayed: comp.lastFinished, competitionId: comp.id, source: group.source } }
      }
    }
    return null
  }, [cupMap, standingsMap, _findTeamRow])

  // Up to 2 competition cards to display.
  // Clubs: domestic league standing + most recent non-domestic (cup-first).
  // National teams: 2 most recent competitions (cup-first for each).
  const competitionCards = useMemo(() => {
    const tid = parseInt(sofascoreId)
    const isNational = !!profile?.profile?.national
    const sorted = [...activeCompetitions].sort((a, b) => (b.lastFinished ?? 0) - (a.lastFinished ?? 0))

    if (isNational) {
      const cards = []
      for (const comp of sorted) {
        if (cards.length >= 2) break
        const card = resolveComp(comp, tid)
        if (card) cards.push(card)
      }
      return cards
    }

    // Clubs: domestic league always shown as standing, then one non-domestic
    const cards = []
    if (domesticLeague) {
      const groups = standingsMap[String(domesticLeague.id)]
      if (groups) {
        for (const group of groups) {
          const row = _findTeamRow(group.table, tid)
          if (row) { cards.push({ type: 'standing', data: { row, competition: group.competition, lastPlayed: domesticLeague.lastFinished, competitionId: domesticLeague.id, source: group.source } }); break }
        }
      }
    }
    for (const comp of sorted.filter(c => c.id !== domesticLeague?.id)) {
      const card = resolveComp(comp, tid)
      if (card) { cards.push(card); break }
    }
    return cards
  }, [activeCompetitions, domesticLeague, cupMap, standingsMap, sofascoreId, profile, resolveComp, _findTeamRow])

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
  const fixtureSource = fixtures.find(f => f.source)?.source
  const profileSource = profile?.source
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

  const fixtureProps = { revealAll: isRevealed('fixtures'), revealedIds, onRevealOne: revealOne, navigate, spoilersMode, autoRevealAge, compact: true }

  return (
    <>
      <div className="h-14 lg:hidden" />
      <BrowseHeader
        canReveal={spoilersMode && hasScores}
        revealed={allRevealed}
        onToggleReveal={() => setRevealedSections(allRevealed ? new Set() : new Set(ALL_SECTIONS))}
      />
      <div className="p-4 sm:p-6 pb-24 lg:pb-6">

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* ── Header — full width ── */}
        <Card className="lg:col-span-4">
          {/* Mobile: 2-col grid — crest left (spans both rows), name+buttons stacked right */}
          {/* sm+: single flex row */}
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 sm:flex sm:items-center sm:gap-4">
            {teamCrest
              ? <img src={imgUrl(teamCrest)} alt="" className="row-span-2 self-center w-16 h-16 sm:w-14 sm:h-14 object-contain flex-shrink-0" />
              : <span className="row-span-2 self-center w-16 h-16 sm:w-14 sm:h-14 flex items-center justify-center text-3xl flex-shrink-0">⚽</span>
            }
            <div className="min-w-0 sm:flex-1">
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

        {/* ── Right 2 cols — DOM-first so Form/Upcoming/Recent appear at top on mobile ── */}
        <div className="lg:col-start-3 lg:col-span-2 lg:row-start-2 flex flex-col gap-4">
          <div className="lg:hidden"><FormCard form={form} source={recent[0]?.source} spoilersMode={spoilersMode} revealedIds={revealedIds} onRevealOne={revealOne} autoRevealAge={autoRevealAge} /></div>
          <FixtureSection title="Upcoming" icon={Calendar} fixtures={upcoming} source={upcoming[0]?.source} {...fixtureProps} />
          <FixtureSection title="Recent Results" icon={Clock} fixtures={recent} source={recent[0]?.source} {...fixtureProps} />
          {/* Desktop only: Transfers sits naturally below Recent Results in this column */}
          {hasTransfers && <div className="hidden lg:block"><TransfersCard transfers={transfers} source={profileSource} /></div>}
        </div>

        {/* ── Left 2 cols: 2-col sub-grid of stat cards + squad ── */}
        <div className="lg:col-start-1 lg:col-span-2 lg:row-start-2 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">

          {/* Club Info */}
          {(profileData.manager || profileData.venue || profileData.founded) && (
            <Card title="Club Info" icon={Info} source={profileSource} className="h-full">
              <div>
                {[
                  { label: 'Manager',  value: profileData.manager },
                  { label: 'Stadium',  value: profileData.venue ? [profileData.venue, profileData.venue_city].filter(Boolean).join(', ') : null },
                  { label: 'Capacity', value: profileData.venue_capacity ? profileData.venue_capacity.toLocaleString() : null },
                  { label: 'Founded',  value: profileData.founded },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-3 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
                    <span className="text-sm font-medium text-slate-200 text-right">{value ?? '—'}</span>
                  </div>
                ))}
                {profileData.colors ? (
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-xs text-slate-500 flex-shrink-0">Colours</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded border border-white/10 flex-shrink-0" style={{ background: profileData.colors.primary }} />
                      <span className="w-5 h-5 rounded border border-white/10 flex-shrink-0" style={{ background: profileData.colors.secondary }} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-xs text-slate-500 flex-shrink-0">Colours</span>
                    <span className="text-sm font-medium text-slate-200">—</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Recent Form — desktop only (mobile instance is in right col above) */}
          <div className="hidden lg:block">
            <FormCard form={form} source={recent[0]?.source} spoilersMode={spoilersMode} revealedIds={revealedIds} onRevealOne={revealOne} autoRevealAge={autoRevealAge} className="h-full" />
          </div>

          {/* Competition cards: domestic standing + cup/group for clubs; 2 most recent for national teams */}
          {competitionCards.map((card, ci) =>
            card.type === 'cup' ? (() => {
              const cup = card.data
              return (
                <Card key={ci} title="Cup Run" icon={Trophy} source="sofascore">
                  <button
                    onClick={() => navigate('/fixtures', { state: { initialFilter: { type: 'comp', value: cup.competition?.name, sofascore_id: cup.competitionId } } })}
                    className="flex items-center gap-2 mb-3 pb-3 w-full text-left border-b group transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {cup.competition?.emblem_url && (
                      <img src={imgUrl(cup.competition.emblem_url)} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium text-slate-200 group-hover:text-green-400 truncate flex-1 transition-colors">{cup.competition?.name}</span>
                    <ArrowUpRight size={12} className="text-slate-600 group-hover:text-green-400 flex-shrink-0 transition-colors" />
                  </button>
                  {spoilersMode && !isRevealed('cup') && !(cup.lastPlayed && isAutoRevealedByAge(cup.lastPlayed, autoRevealAge)) ? (
                    <div className="flex items-center justify-center min-h-[10rem] cursor-pointer text-slate-500 hover:text-slate-300 transition-colors" onClick={() => revealSection('cup')}>
                      <EyeOff size={18} />
                    </div>
                  ) : (
                    <div>
                      {cup.rounds.map((r, ri) => {
                        const isLast = ri === cup.rounds.length - 1
                        const [hs, as_] = (r.result || '').split(':')
                        const dateStr = r.utc_date ? new Date(r.utc_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'Australia/Brisbane' }) : null
                        return (
                          <div
                            key={ri}
                            className={`flex items-center gap-2 py-2 ${ri < cup.rounds.length - 1 ? 'border-b' : ''}`}
                            style={{ borderColor: 'var(--border)' }}
                          >
                            <div className="w-20 flex-shrink-0">
                              <div className="text-[10px] text-slate-500 uppercase tracking-wide truncate">{r.round}</div>
                              {dateStr && <div className="text-[10px] text-slate-600 truncate">{dateStr}</div>}
                            </div>
                            {r.opponent_crest
                              ? <img src={imgUrl(r.opponent_crest)} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                              : <div className="w-4 h-4 flex-shrink-0" />
                            }
                            <span className="text-slate-300 truncate flex-1 text-xs">{r.opponent ?? '—'}</span>
                            {r.finished && r.result && (
                              <span className="text-xs tabular-nums text-slate-400 flex-shrink-0">{hs}–{as_}</span>
                            )}
                            {r.finished && (
                              <span className={`text-[10px] font-bold flex-shrink-0 w-5 text-right ${
                                isLast ? (r.won ? 'text-yellow-400' : 'text-red-400') : (r.won ? 'text-green-400' : 'text-red-400')
                              }`}>
                                {isLast && r.won ? '🏆' : r.won ? 'W' : 'L'}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              )
            })() : (() => {
              const s = card.data
              return (
                <Card
                  key={ci}
                  title="Standing"
                  icon={LayoutGrid}
                  subtitle={s.lastPlayed ? new Date(s.lastPlayed).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined}
                  source={s.source}
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
                  {spoilersMode && !isRevealed('standing') && !(s.lastPlayed && isAutoRevealedByAge(s.lastPlayed, autoRevealAge)) ? (
                    <div className="flex items-center justify-center min-h-[10rem] cursor-pointer text-slate-500 hover:text-slate-300 transition-colors" onClick={() => revealSection('standing')}>
                      <EyeOff size={18} />
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
              )
            })()
          )}

          {/* Injuries & Suspensions */}
          <InjuriesCard injuries={injuries} source={profileSource} />

          {/* Season Stats */}
          {seasonStats && (
            <Card title={profileData.national ? `${new Date().getFullYear()} Stats` : 'Season Stats'} icon={BarChart2} source={fixtureSource}>
              {seasonStats.competitions.length > 0 && (
                <div className="relative group mb-3">
                  <p className="text-[10px] text-slate-600 leading-relaxed cursor-default">
                    {seasonStats.competitions.slice(0, 3).join(' · ')}
                    {seasonStats.competitions.length > 3 && ` · +${seasonStats.competitions.length - 3} more`}
                  </p>
                  {seasonStats.competitions.length > 3 && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 invisible group-hover:visible rounded-lg border shadow-xl py-2 px-3 w-52" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                      {seasonStats.competitions.map((c, i) => (
                        <p key={i} className="text-xs text-slate-300 py-0.5 leading-snug">{c}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {spoilersMode && !isRevealed('stats') && !(seasonStats.lastPlayed && isAutoRevealedByAge(seasonStats.lastPlayed, autoRevealAge)) ? (
                <div className="flex items-center justify-center min-h-[10rem] cursor-pointer text-slate-500 hover:text-slate-300 transition-colors" onClick={() => revealSection('stats')}>
                  <EyeOff size={18} />
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
              <SquadCard players={players} isNational={!!profileData.national} source={profileSource} />
            </div>
          )}

        </div>

        {/* Mobile only: Transfers last in DOM so it appears after Squad */}
        {hasTransfers && <div className="lg:hidden"><TransfersCard transfers={transfers} source={profileSource} /></div>}

      </div>
      </div>
    </>
  )
}
