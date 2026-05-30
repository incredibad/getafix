import { useState, useEffect } from 'react'
import { RefreshCw, Trophy } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

function StandingsTable({ table, stage, group }) {
  const label = group || stage || null
  return (
    <div className="mb-4">
      {label && (
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 px-1">{label.replace(/_/g, ' ')}</p>
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

function CompetitionStandings({ standings }) {
  const { competition, tables, season, cached_at } = standings
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        {competition.emblem_url && (
          <img src={competition.emblem_url} alt="" className="w-7 h-7 object-contain" />
        )}
        <div>
          <h2 className="text-base font-bold text-white">{competition.name}</h2>
          {season && <p className="text-xs text-slate-500">Season {season}</p>}
        </div>
      </div>
      {tables.map((t, i) => (
        <StandingsTable key={i} table={t.table} stage={t.stage} group={t.group} />
      ))}
    </div>
  )
}

export default function Tables() {
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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

  const handleRefresh = () => { setRefreshing(true); load(true) }

  return (
    <div className="p-4 sm:p-6 pt-16 lg:pt-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Tables</h1>
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : standings.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <Trophy size={40} className="text-slate-600" />
            <p className="text-slate-300 font-medium">No standings available</p>
            <p className="text-slate-500 text-sm">Follow teams and link them to competitions to see tables.</p>
          </div>
        ) : (
          standings.map((s, i) => <CompetitionStandings key={i} standings={s} />)
        )}
      </div>
    </div>
  )
}
