import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Trophy, ChevronDown } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

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

function AccordionItem({ comp, open, onToggle }) {
  return (
    <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors"
        style={{ background: 'var(--surface)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {comp.emblem_url && (
            <img src={comp.emblem_url} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
          )}
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-white truncate">{comp.name}</p>
            {comp.season && <p className="text-xs text-slate-500">Season {comp.season}</p>}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-4 pt-3 pb-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {comp.groups.map((g, i) => (
            <StandingsTable key={i} table={g.table} group={g.group} stage={g.stage} startDate={g.start_date} endDate={g.end_date} />
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
  const [openName, setOpenName] = useState(null)

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
      if (!map[key]) map[key] = { name: key, emblem_url: s.competition.emblem_url, season: s.season, groups: [] }
      const groups = s.tables?.length > 0
        ? s.tables.map(t => ({ ...t, start_date: t.start_date ?? s.start_date, end_date: t.end_date ?? s.end_date }))
        : [{ table: s.table || [], group: s.group, stage: s.stage, start_date: s.start_date, end_date: s.end_date }]
      map[key].groups.push(...groups.filter(g => g.table?.length > 0))
    }
    return Object.values(map)
  }, [standings])

  // Auto-open the first competition once loaded
  useEffect(() => {
    if (competitions.length > 0 && openName === null) {
      setOpenName(competitions[0].name)
    }
  }, [competitions])

  const handleRefresh = () => { setRefreshing(true); load(true) }

  const toggle = (name) => setOpenName(prev => prev === name ? null : name)

  return (
    <div className="p-4 sm:p-6 pt-16 lg:pt-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
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
          <div className="space-y-2">
            {competitions.map(comp => (
              <AccordionItem
                key={comp.name}
                comp={comp}
                open={openName === comp.name}
                onToggle={() => toggle(comp.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
