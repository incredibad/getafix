import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Trophy } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

function StandingsTable({ table, group, stage }) {
  const label = group || stage || null
  return (
    <div className="mb-4">
      {label && (
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 px-1">
          {label.replace(/_/g, ' ')}
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

export default function Tables() {
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

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

  // Group standings items by competition name, normalising FD/APF (tables[]) and ESPN (table) formats
  const competitions = useMemo(() => {
    const map = {}
    for (const s of standings) {
      const key = s.competition.name
      if (!map[key]) map[key] = { name: key, emblem_url: s.competition.emblem_url, season: s.season, groups: [] }
      const groups = s.tables?.length > 0
        ? s.tables
        : [{ table: s.table || [], group: s.group, stage: s.stage }]
      map[key].groups.push(...groups.filter(g => g.table?.length > 0))
    }
    return Object.values(map)
  }, [standings])

  // Clamp active tab if competitions list shrinks on refresh
  const tabIndex = Math.min(activeTab, Math.max(0, competitions.length - 1))
  const current = competitions[tabIndex]

  const handleRefresh = () => { setRefreshing(true); load(true) }

  return (
    <div className="pt-16 lg:pt-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 mb-4">
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
          <div className="flex flex-col items-center py-16 gap-3 text-center px-4">
            <Trophy size={40} className="text-slate-600" />
            <p className="text-slate-300 font-medium">No standings available</p>
            <p className="text-slate-500 text-sm">Follow teams and load their fixtures to see tables.</p>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div
              className="flex gap-1 overflow-x-auto border-b px-4 sm:px-6 mb-5"
              style={{ borderColor: 'var(--border)', scrollbarWidth: 'none' }}
            >
              {competitions.map((comp, i) => (
                <button
                  key={comp.name}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 -mb-px ${
                    i === tabIndex
                      ? 'border-green-500 text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {comp.emblem_url && (
                    <img src={comp.emblem_url} alt="" className="w-4 h-4 object-contain" />
                  )}
                  {comp.name}
                </button>
              ))}
            </div>

            {/* Active competition tables */}
            <div className="px-4 sm:px-6 pb-6">
              {current.season && (
                <p className="text-xs text-slate-500 mb-4">Season {current.season}</p>
              )}
              {current.groups.map((g, i) => (
                <StandingsTable key={i} table={g.table} group={g.group} stage={g.stage} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
