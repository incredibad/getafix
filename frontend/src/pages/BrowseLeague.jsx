import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import api from '../api/client'
import { imgUrl } from '../utils/img'
import { groupByDate } from '../utils/date'
import { FixtureCard, RoundSeparator } from '../components/FixtureCard'
import { getSpoilersMode, getAutoRevealAge, getRevealPersist, isAutoRevealedByAge, REVEALED_IDS_KEY } from './Settings'
import BrowseHeader from '../components/BrowseHeader'
import toast from 'react-hot-toast'

const BRISBANE_TZ = 'Australia/Brisbane'

function getDateCategory(utcDate) {
  const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: BRISBANE_TZ })
  const matchISO = new Date(utcDate).toLocaleDateString('en-CA', { timeZone: BRISBANE_TZ })
  if (matchISO === todayISO) return 'today'
  return matchISO < todayISO ? 'past' : 'future'
}

function StandingsTable({ table, group, followed = [] }) {
  const navigate = useNavigate()
  const [hoveredRow, setHoveredRow] = useState(null)
  const label = group || null

  const findFollowedTeam = (rowTeamName) => {
    const rn = rowTeamName.toLowerCase()
    return followed.find(t => {
      const tn = (t.name || '').toLowerCase()
      const sn = (t.short_name || '').toLowerCase()
      return tn === rn || sn === rn || rn.includes(tn) || tn.includes(rn)
    })
  }

  const cellBg = (rowIdx, isFollowedRow = false) => {
    if (hoveredRow === rowIdx) return isFollowedRow ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)'
    if (isFollowedRow) return 'rgba(34,197,94,0.06)'
    return rowIdx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent'
  }

  return (
    <div className="mb-4">
      {label && (
        <p className="text-xs text-slate-500 uppercase tracking-wide px-1 mb-2">{label.replace(/_/g, ' ')}</p>
      )}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <th className="text-left px-3 py-2 w-8">#</th>
              <th className="text-left px-2 py-2">Team</th>
              <th className="text-center px-2 py-2 w-8">P</th>
              <th className="text-center px-2 py-2 w-8">W</th>
              <th className="text-center px-2 py-2 w-8">D</th>
              <th className="text-center px-2 py-2 w-8">L</th>
              <th className="text-center px-2 py-2 w-10 hidden sm:table-cell">GD</th>
              <th className="text-center px-3 py-2 w-10 font-bold text-slate-300">Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => {
              const ft = findFollowedTeam(row.team_name)
              const isFollowed = !!ft
              const sid = row.sofascore_id ?? ((row.team_crest || '').match(/\/team\/(\d+)\/image/)?.[1] ?? null)
              return (
                <tr
                  key={i}
                  className="border-b last:border-0 transition-colors"
                  style={{ borderColor: 'var(--border)', cursor: sid ? 'pointer' : 'default' }}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={sid ? () => navigate(`/browse/team/${sid}`, { state: { name: row.team_name, crest_url: row.team_crest } }) : undefined}
                >
                  <td className="px-3 py-2.5 text-xs tabular-nums" style={{ background: cellBg(i, isFollowed), color: isFollowed ? 'rgba(134,239,172,0.8)' : 'rgb(100,116,139)' }}>{row.position}</td>
                  <td className="px-2 py-2.5" style={{ background: cellBg(i, isFollowed) }}>
                    <div className="flex items-center gap-2 min-w-0">
                      {row.team_crest && <img src={imgUrl(row.team_crest)} alt="" className="w-4 h-4 object-contain flex-shrink-0" />}
                      <span className={`truncate ${isFollowed ? 'text-green-300 font-medium' : 'text-slate-200'}`}>{row.team_name}</span>
                    </div>
                  </td>
                  <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums" style={{ background: cellBg(i, isFollowed) }}>{row.played}</td>
                  <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums" style={{ background: cellBg(i, isFollowed) }}>{row.won}</td>
                  <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums" style={{ background: cellBg(i, isFollowed) }}>{row.draw}</td>
                  <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums" style={{ background: cellBg(i, isFollowed) }}>{row.lost}</td>
                  <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums hidden sm:table-cell" style={{ background: cellBg(i, isFollowed) }}>
                    {row.goal_difference > 0 ? '+' : ''}{row.goal_difference}
                  </td>
                  <td className="text-center px-3 py-2.5 font-bold text-white tabular-nums" style={{ background: cellBg(i, isFollowed) }}>{row.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function BrowseLeague() {
  const { tournamentId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state ?? {}

  const spoilersMode = getSpoilersMode()
  const autoRevealAge = getAutoRevealAge()
  const [tab, setTab] = useState('fixtures')
  const [fixtures, setFixtures] = useState([])
  const [standings, setStandings] = useState([])
  const [followedTeams, setFollowedTeams] = useState([])
  const [loadingFixtures, setLoadingFixtures] = useState(false)
  const [loadingStandings, setLoadingStandings] = useState(false)
  const [fixturesFetched, setFixturesFetched] = useState(false)
  const [standingsFetched, setStandingsFetched] = useState(false)
  const [revealAll, setRevealAll] = useState(false)
  const [revealedIds, setRevealedIds] = useState(() => {
    if (!getRevealPersist()) return new Set()
    try {
      const stored = JSON.parse(localStorage.getItem(REVEALED_IDS_KEY) || '{}')
      return new Set(Object.keys(stored))
    } catch { return new Set() }
  })

  const leagueName = navState.name ?? ''
  const leagueEmblem = navState.emblem_url ?? null

  useEffect(() => {
    api.get('/teams/followed').then(({ data }) => setFollowedTeams(data)).catch(() => {})
  }, [])

  // Fetch fixtures when tab becomes 'fixtures'
  useEffect(() => {
    if (tab !== 'fixtures' || fixturesFetched) return
    setLoadingFixtures(true)
    api.get('/fixtures/by-competition', { params: { name: leagueName, sofascore_id: parseInt(tournamentId), days_back: 90, days_ahead: 365 } })
      .then(({ data }) => { setFixtures(data); setFixturesFetched(true) })
      .catch(() => toast.error('Failed to load fixtures.'))
      .finally(() => setLoadingFixtures(false))
  }, [tab, fixturesFetched, tournamentId, leagueName])

  // Fetch standings when tab becomes 'table'
  useEffect(() => {
    if (tab !== 'table' || standingsFetched) return
    setLoadingStandings(true)
    api.get(`/standings/sofascore/${tournamentId}`)
      .then(({ data }) => { setStandings(data); setStandingsFetched(true) })
      .catch(() => toast.error('Failed to load standings.'))
      .finally(() => setLoadingStandings(false))
  }, [tab, standingsFetched, tournamentId])

  const grouped = useMemo(() => groupByDate(fixtures), [fixtures])
  const dateKeys = Object.keys(grouped)
  const hasScores = spoilersMode && fixtures.some(f => f.status !== 'SCHEDULED')

  const revealOne = (id) => {
    setRevealedIds(prev => new Set([...prev, id]))
    if (getRevealPersist()) {
      const stored = JSON.parse(localStorage.getItem(REVEALED_IDS_KEY) || '{}')
      stored[id] = Date.now()
      localStorage.setItem(REVEALED_IDS_KEY, JSON.stringify(stored))
    }
  }

  const standingsGroups = useMemo(() => {
    if (!standings.length) return []
    const map = {}
    for (const s of standings) {
      const key = s.competition?.name ?? leagueName ?? ''
      if (!map[key]) map[key] = { groups: [] }
      const groups = s.tables?.length > 0
        ? s.tables
        : [{ table: s.table || [], group: s.group, stage: s.stage }]
      map[key].groups.push(...groups.filter(g => g.table?.length > 0))
    }
    return Object.values(map)
  }, [standings, leagueName])

  return (
    <>
      <BrowseHeader
        canReveal={spoilersMode && tab === 'fixtures' && hasScores}
        revealed={revealAll}
        onToggleReveal={() => setRevealAll(r => !r)}
      />
      <div className="p-4 sm:p-6 pb-16">

      {/* League header */}
      <div className="flex items-center gap-3 mb-5">
        {leagueEmblem
          ? <img src={imgUrl(leagueEmblem)} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
          : <Trophy size={28} className="text-slate-500 flex-shrink-0" />
        }
        <h1 className="text-xl font-bold text-white">{leagueName}</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-5 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        {['fixtures', 'table'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors capitalize ${
              tab === t ? 'text-white border-b-2 border-green-500 -mb-px' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t === 'fixtures' ? 'Fixtures' : 'Table'}
          </button>
        ))}
      </div>

      {/* Fixtures tab */}
      {tab === 'fixtures' && (
        loadingFixtures ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dateKeys.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-12">No fixtures found.</p>
        ) : (
          <div className="space-y-1">
            {dateKeys.map(date => {
              const category = getDateCategory(grouped[date][0].utc_date)
              return (
                <div key={date}>
                  <div className="flex items-center gap-3 py-3">
                    <span className={`text-sm font-semibold flex-shrink-0 ${category === 'today' ? 'text-green-400' : 'text-slate-400'}`}>{date}</span>
                    <div className={`flex-1 ${category === 'today' ? 'h-0.5' : 'h-px'}`} style={{ background: category === 'today' ? 'rgb(74,222,128)' : 'var(--border)' }} />
                    {category === 'today' && <span className="text-sm font-bold text-green-400 tracking-widest uppercase flex-shrink-0">Today</span>}
                  </div>
                  <div className="space-y-2">
                    {grouped[date].reduce((acc, f, i) => {
                      const fid = `${f.source}:${f.external_id}`
                      const prev = grouped[date][i - 1]
                      if (f.round_name && prev && prev.round_name !== f.round_name) {
                        acc.push(<RoundSeparator key={`r-${date}-${f.round_name}`} label={f.round_name} />)
                      }
                      const revealed = !spoilersMode || revealAll || revealedIds.has(fid) || isAutoRevealedByAge(f.utc_date, autoRevealAge)
                      acc.push(
                        <FixtureCard
                          key={fid}
                          fixture={f}
                          revealed={revealed}
                          onRevealScore={() => revealOne(fid)}
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
        )
      )}

      {/* Table tab */}
      {tab === 'table' && (
        loadingStandings ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : standingsGroups.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-12">No standings available.</p>
        ) : (
          standingsGroups.map((comp, ci) =>
            comp.groups.map((g, gi) => (
              <StandingsTable key={`${ci}-${gi}`} table={g.table} group={g.group} followed={followedTeams} />
            ))
          )
        )
      )}

      </div>
    </>
  )
}
