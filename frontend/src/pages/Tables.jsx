import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Trophy, ChevronDown } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

const SOURCE_LABELS = { football_data: 'FD', api_football: 'APF', espn: 'ESPN', fd: 'FD', apf: 'APF' }
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
      <img src={url} alt="" className={`${imgDim} object-contain`} />
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

function StandingsTable({ table, group, stage, startDate, endDate }) {
  const label = group || stage || null
  return (
    <div className="mb-4">
      {label && (
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 px-1 flex items-center">
          {label.replace(/_/g, ' ')}
          <RoundStatus startDate={startDate} endDate={endDate} />
        </p>
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
            {table.map((row, i) => (
              <tr
                key={i}
                className="border-b last:border-0 hover:bg-white/5 transition-colors"
                style={{ borderColor: 'var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
              >
                <td className="px-3 py-2.5 text-slate-500 text-xs tabular-nums">{row.position}</td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {row.team_crest && (
                      <img src={row.team_crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                    )}
                    <span className="text-slate-200 truncate">{row.team_name}</span>
                  </div>
                </td>
                <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums">{row.played}</td>
                <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums">{row.won}</td>
                <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums">{row.draw}</td>
                <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums">{row.lost}</td>
                <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums hidden sm:table-cell">
                  {row.goal_difference > 0 ? '+' : ''}{row.goal_difference}
                </td>
                <td className="text-center px-3 py-2.5 font-bold text-white tabular-nums">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MobileDropdown({ competitions, selectedName, onSelect }) {
  const [open, setOpen] = useState(false)
  const selected = competitions.find(c => c.name === selectedName)

  return (
    <div className="relative mb-4 lg:hidden">
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CompLogo url={selected?.emblem_url} size="md" />
          <span className="text-sm font-medium text-white truncate">{selected?.name ?? 'Select competition'}</span>
        </div>
        <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute z-20 top-full mt-1 left-0 right-0 rounded-xl border shadow-xl overflow-hidden max-h-72 overflow-y-auto"
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
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Tables() {
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedName, setSelectedName] = useState(() => localStorage.getItem(STORAGE_KEY))

  const load = async (showToast = false) => {
    try {
      const { data } = await api.get('/standings/followed')
      setStandings(data)
      if (showToast) toast.success('Tables refreshed.')
    } catch {
      toast.error('Failed to load standings.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const competitions = useMemo(() => {
    const map = {}
    for (const s of standings) {
      const key = s.competition.name
      if (!map[key]) map[key] = { name: key, emblem_url: s.competition.emblem_url, season: s.season, source: s.source, groups: [] }
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

  const handleRefresh = () => { setRefreshing(true); load(true) }

  const selectedComp = competitions.find(c => c.name === selectedName)

  return (
    <div className="p-4 sm:p-6 pt-16 lg:pt-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <h1 className="text-xl font-bold text-white">Tables</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

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
        ) : (
          <div className="lg:flex lg:gap-6">
            {/* Mobile dropdown */}
            <MobileDropdown competitions={competitions} selectedName={selectedName} onSelect={handleSelect} />

            {/* Desktop vertical tab list */}
            <div className="hidden lg:block w-44 flex-shrink-0">
              <div className="sticky top-6 space-y-0.5">
                {competitions.map(comp => (
                  <button
                    key={comp.name}
                    onClick={() => handleSelect(comp.name)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
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

            {/* Standings content */}
            <div className="flex-1 min-w-0">
              {selectedComp && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <CompLogo url={selectedComp.emblem_url} size="lg" />
                    <h2 className="text-base font-semibold text-white">{selectedComp.name}</h2>
                    <div className="flex items-center gap-2 ml-1">
                      {selectedComp.season && <span className="text-xs text-slate-500">Season {selectedComp.season}</span>}
                      {selectedComp.source && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded border border-slate-700 text-slate-400">
                          {SOURCE_LABELS[selectedComp.source] ?? selectedComp.source}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedComp.groups.map((g, i) => (
                    <StandingsTable key={i} table={g.table} group={g.group} stage={g.stage} startDate={g.start_date} endDate={g.end_date} />
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
