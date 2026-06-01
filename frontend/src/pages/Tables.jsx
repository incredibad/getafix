import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, ChevronDown, Calendar } from 'lucide-react'
import api from '../api/client'
import { imgUrl } from '../utils/img'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'footrack:tables:competition'

function CompLogo({ url, size = 'sm' }) {
  const imgDim = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'
  const wrapDim = size === 'lg' ? 'w-7 h-7' : size === 'md' ? 'w-6 h-6' : 'w-5 h-5'
  const iconSize = size === 'lg' ? 16 : size === 'md' ? 14 : 12
  if (!url) {
    return (
      <div className={`${wrapDim} rounded flex items-center justify-center flex-shrink-0 bg-slate-200`}>
        <Trophy size={iconSize} className="text-slate-600" />
      </div>
    )
  }
  return (
    <div className={`${wrapDim} rounded flex items-center justify-center flex-shrink-0 bg-slate-200`}>
      <img src={imgUrl(url)} alt="" className={`${imgDim} object-contain`} />
    </div>
  )
}

function RoundStatus({ startDate, endDate }) {
  if (!startDate && !endDate) return null
  const now = new Date()
  const start = startDate ? new Date(startDate) : null
  const end = endDate ? new Date(endDate) : null
  const fmt = (d) => d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })

  if (end && end < now) {
    return <span className="text-xs text-slate-400 font-normal normal-case ml-2">Ended {fmt(end)}</span>
  }
  if (start && start > now) {
    return <span className="text-xs text-blue-500 font-normal normal-case ml-2">Starts {fmt(start)}</span>
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-500 font-normal normal-case ml-2">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
      Active
    </span>
  )
}

function StandingsTable({ table, group, stage, startDate, endDate, followed = [] }) {
  const [hoveredRow, setHoveredRow] = useState(null)
  const navigate = useNavigate()
  const label = group || stage || null

  const findFollowedTeam = (rowTeamName) => {
    const rn = rowTeamName.toLowerCase()
    return followed.find(t => {
      const tn = (t.name || '').toLowerCase()
      const sn = (t.short_name || '').toLowerCase()
      return tn === rn || sn === rn || rn.includes(tn) || tn.includes(rn)
    })
  }

  const goToFixturesTeam = (teamName) =>
    navigate('/fixtures', { state: { initialFilter: { type: 'team', value: teamName } } })

  const cellBg = (rowIdx, colIdx, isFollowedRow = false) => {
    if (hoveredRow === rowIdx) return isFollowedRow ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)'
    if (isFollowedRow) return `rgba(34,197,94,${0.06 + (colIdx % 2 === 0 ? 0.02 : 0)})`
    const row = rowIdx % 2 === 1 ? 0.015 : 0
    const col = colIdx % 2 === 0 ? 0.02 : 0
    const v = row + col
    return v > 0 ? `rgba(255,255,255,${v})` : 'transparent'
  }
  const headColBg = (colIdx) =>
    colIdx % 2 === 0 ? { background: 'rgba(255,255,255,0.03)' } : {}

  return (
    <div className="mb-4">
      {/* Group/stage label — mobile only */}
      {label && (
        <div className="flex items-center mb-2 px-1 lg:hidden">
          <p className="text-xs text-slate-500 uppercase tracking-wide flex items-center">
            {label.replace(/_/g, ' ')}
            <RoundStatus startDate={startDate} endDate={endDate} />
          </p>
        </div>
      )}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <th className="text-left px-3 py-2 w-8" style={headColBg(0)}>#</th>
              <th className="text-left px-2 py-2" style={headColBg(1)}>Team</th>
              <th className="text-center px-2 py-2 w-8" style={headColBg(2)}>P</th>
              <th className="text-center px-2 py-2 w-8" style={headColBg(3)}>W</th>
              <th className="text-center px-2 py-2 w-8" style={headColBg(4)}>D</th>
              <th className="text-center px-2 py-2 w-8" style={headColBg(5)}>L</th>
              <th className="text-center px-2 py-2 w-10 hidden sm:table-cell" style={headColBg(6)}>GD</th>
              <th className="text-center px-3 py-2 w-10 font-bold text-slate-300" style={headColBg(7)}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => {
              const ft = findFollowedTeam(row.team_name)
              const isFollowed = !!ft
              return (
                <tr
                  key={i}
                  className="border-b last:border-0 transition-colors"
                  style={{ borderColor: 'var(--border)', cursor: isFollowed ? 'pointer' : 'default' }}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={isFollowed ? () => goToFixturesTeam(ft.name) : undefined}
                >
                  <td className="px-3 py-2.5 text-xs tabular-nums" style={{ background: cellBg(i, 0, isFollowed), color: isFollowed ? 'rgba(134,239,172,0.8)' : 'rgb(100,116,139)' }}>{row.position}</td>
                  <td className="px-2 py-2.5" style={{ background: cellBg(i, 1, isFollowed) }}>
                    <div className="flex items-center gap-2 min-w-0">
                      {row.team_crest && (
                        <img src={imgUrl(row.team_crest)} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                      )}
                      <span className={`truncate ${isFollowed ? 'text-green-300 font-medium' : 'text-slate-200'}`}>{row.team_name}</span>
                    </div>
                  </td>
                  <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums" style={{ background: cellBg(i, 2, isFollowed) }}>{row.played}</td>
                  <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums" style={{ background: cellBg(i, 3, isFollowed) }}>{row.won}</td>
                  <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums" style={{ background: cellBg(i, 4, isFollowed) }}>{row.draw}</td>
                  <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums" style={{ background: cellBg(i, 5, isFollowed) }}>{row.lost}</td>
                  <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums hidden sm:table-cell" style={{ background: cellBg(i, 6, isFollowed) }}>
                    {row.goal_difference > 0 ? '+' : ''}{row.goal_difference}
                  </td>
                  <td className="text-center px-3 py-2.5 font-bold text-white tabular-nums" style={{ background: cellBg(i, 7, isFollowed) }}>{row.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MobileSticky({ competitions, selectedName, onSelect, onFixtures }) {
  const [open, setOpen] = useState(false)
  const selected = competitions.find(c => c.name === selectedName)

  return (
    <div className="lg:hidden sticky top-14 z-20 border-b" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-left z-20 relative"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CompLogo url={selected?.emblem_url} size="md" />
            <span className="text-sm font-medium text-white truncate">{selected?.name ?? 'Select competition'}</span>
            {selected?.season && <span className="text-xs text-slate-500 flex-shrink-0">{selected.season}</span>}
          </div>
          <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
        {selected && (
          <button
            onClick={onFixtures}
            className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="View fixtures"
          >
            <Calendar size={20} />
          </button>
        )}
      </div>

      {open && (
        <div
          className="absolute z-20 top-full left-4 right-4 rounded-xl border shadow-xl overflow-hidden max-h-72 overflow-y-auto"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {competitions.map(comp => (
            <button
              key={comp.name}
              onClick={() => { onSelect(comp.name); setOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b last:border-0 ${comp.name === selectedName ? 'text-green-400' : 'text-slate-200'}`}
              style={{ borderColor: 'var(--border)' }}
            >
              <CompLogo url={comp.emblem_url} size="sm" />
              <span className="text-sm truncate">{comp.name}</span>
              {comp.season && <span className="text-xs text-slate-500 ml-auto flex-shrink-0">{comp.season}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Tables() {
  const navigate = useNavigate()
  const [standings, setStandings] = useState([])
  const [followed, setFollowed] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedName, setSelectedName] = useState(() => localStorage.getItem(STORAGE_KEY))

  const load = async () => {
    try {
      const [standingsRes, followedRes] = await Promise.all([
        api.get('/standings/followed'),
        api.get('/teams/followed'),
      ])
      setStandings(standingsRes.data)
      setFollowed(followedRes.data)
    } catch {
      toast.error('Failed to load standings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const competitions = useMemo(() => {
    const map = {}
    for (const s of standings) {
      const key = s.competition.name
      if (!map[key]) map[key] = { name: key, emblem_url: s.competition.emblem_url, season: s.season, groups: [] }
      const groups = s.tables?.length > 0
        ? s.tables.map(t => ({ ...t, start_date: t.start_date ?? s.start_date, end_date: t.end_date ?? s.end_date }))
        : [{ table: s.table || [], group: s.group, stage: s.stage, start_date: s.start_date, end_date: s.end_date }]
      map[key].groups.push(...groups.filter(g => g.table?.length > 0))
    }
    return Object.values(map)
  }, [standings])

  useEffect(() => {
    if (competitions.length === 0) return
    const valid = competitions.find(c => c.name === selectedName)
    if (!valid) {
      setSelectedName(competitions[0].name)
      localStorage.setItem(STORAGE_KEY, competitions[0].name)
    }
  }, [competitions])

  const handleSelect = (name) => {
    setSelectedName(name)
    localStorage.setItem(STORAGE_KEY, name)
  }

  const selectedComp = competitions.find(c => c.name === selectedName)

  const goToFixtures = () => {
    if (!selectedComp) return
    navigate('/fixtures', { state: { initialFilter: { type: 'comp', value: selectedComp.name } } })
  }

  return (
    <div className="lg:flex lg:h-full">

      {/* ── Desktop left column: competition tabs ── */}
      <div className="hidden lg:flex flex-col w-[250px] flex-shrink-0 border-r overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center px-4 h-14 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h1 className="text-sm font-semibold text-white">Tables</h1>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : competitions.map(comp => (
            <button
              key={comp.name}
              onClick={() => handleSelect(comp.name)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                comp.name === selectedName
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <CompLogo url={comp.emblem_url} size="sm" />
              <span className="text-sm truncate">{comp.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 min-w-0 lg:overflow-y-auto">

        {/* Spacer for fixed mobile top bar */}
        <div className="h-14 lg:hidden" />

        {/* Mobile sticky competition bar */}
        {!loading && competitions.length > 0 && (
          <MobileSticky
            competitions={competitions}
            selectedName={selectedName}
            onSelect={handleSelect}
            onFixtures={goToFixtures}
          />
        )}

        <div className="p-4 sm:p-6 lg:p-6">

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : competitions.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-center">
              <Trophy size={40} className="text-slate-600" />
              <p className="text-slate-300 font-medium">No standings available</p>
              <p className="text-slate-500 text-sm">Follow teams and load their fixtures to see tables.</p>
            </div>
          ) : selectedComp ? (
            <>
              {/* Competition heading — desktop only */}
              <div className="hidden lg:flex items-center gap-2 mb-4">
                <CompLogo url={selectedComp.emblem_url} size="lg" />
                <h2 className="text-base font-semibold text-white">{selectedComp.name}</h2>
                {selectedComp.season && <span className="text-xs text-slate-500 ml-1">Season {selectedComp.season}</span>}
                <button
                  onClick={goToFixtures}
                  className="ml-auto p-1 text-slate-500 hover:text-slate-300 transition-colors"
                  title="View fixtures"
                >
                  <Calendar size={20} />
                </button>
              </div>

              {selectedComp.groups.map((g, i) => (
                <StandingsTable
                  key={i}
                  table={g.table}
                  group={g.group}
                  stage={g.stage}
                  startDate={g.start_date}
                  endDate={g.end_date}
                  followed={followed}
                />
              ))}
            </>
          ) : null}

        </div>
      </div>

    </div>
  )
}
