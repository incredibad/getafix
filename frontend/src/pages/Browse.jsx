import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Users, Trophy, X } from 'lucide-react'
import api from '../api/client'
import { imgUrl } from '../utils/img'

const normalize = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

function slugAlias(name, slug) {
  if (!slug) return null
  const alias = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  return normalize(name) !== normalize(alias) ? alias : null
}

export default function Browse() {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState(() => location.state?.initialQuery ?? '')
  const [teamResults, setTeamResults] = useState([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [allComps, setAllComps] = useState([])
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    api.get('/competitions/sofascore/all').then(({ data }) => setAllComps(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (location.state?.initialQuery) setQuery(location.state.initialQuery)
  }, [location.state?.initialQuery])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.trim().length < 2) { setTeamResults([]); setTeamLoading(false); return }
    setTeamLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/teams/search', { params: { q: query.trim() } })
        setTeamResults(data)
      } catch { setTeamResults([]) }
      finally { setTeamLoading(false) }
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const compResults = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (q.length < 2) return []
    return allComps
      .filter(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
      .sort((a, b) => (b.user_count ?? 0) - (a.user_count ?? 0))
      .slice(0, 20)
  }, [allComps, query])

  const searching = query.trim().length >= 2
  const hasResults = teamResults.length > 0 || compResults.length > 0

  return (
    <div className="p-4 sm:p-6 pt-16 lg:pt-6 max-w-2xl mx-auto">

      {/* Search input */}
      <div
        className="flex items-center gap-3 px-5 py-4 rounded-xl border mb-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <Search size={18} className="text-slate-500 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search teams or leagues…"
          className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 outline-none text-sm"
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Empty state */}
      {!searching && (
        <div className="text-center py-16 text-slate-600">
          <Search size={40} className="mx-auto mb-3" />
          <p className="text-sm">Search for any team or league</p>
        </div>
      )}

      {/* No results */}
      {searching && !hasResults && !teamLoading && (
        <p className="text-center text-slate-500 text-sm py-8">No results for "{query}"</p>
      )}

      {/* Teams */}
      {(teamLoading || teamResults.length > 0) && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Users size={13} className="text-slate-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Teams</p>
          </div>
          <div className="rounded-xl border overflow-hidden divide-y" style={{ borderColor: 'var(--border)', background: 'var(--surface)', '--tw-divide-opacity': 1, borderBottomColor: 'var(--border)' }}>
            {teamLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : teamResults.map((team, i) => (
              <button
                key={i}
                onClick={() => team.sofascore_id && navigate(`/browse/team/${team.sofascore_id}`, {
                  state: { name: team.name, short_name: team.short_name, crest_url: team.crest_url, country: team.country, team_type: team.team_type, is_followed: team.already_followed }
                })}
                disabled={!team.sofascore_id}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors disabled:opacity-40"
                style={{ borderColor: 'var(--border)' }}
              >
                {team.crest_url
                  ? <img src={imgUrl(team.crest_url)} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
                  : <span className="w-8 h-8 flex-shrink-0" />
                }
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200 truncate">{team.name}</p>
                  {team.country && <p className="text-xs text-slate-500">{team.country}</p>}
                </div>
                {team.already_followed && (
                  <span className="text-xs text-green-400 flex-shrink-0">Following</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Leagues */}
      {compResults.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Trophy size={13} className="text-slate-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Leagues</p>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            {compResults.map((comp, i) => (
              <button
                key={i}
                onClick={() => navigate(`/browse/league/${comp.id}`, {
                  state: { name: comp.name, emblem_url: comp.emblem_url, country: comp.country, tournament_id: comp.id }
                })}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b last:border-0"
                style={{ borderColor: 'var(--border)' }}
              >
                {comp.emblem_url
                  ? <img src={imgUrl(comp.emblem_url)} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
                  : <Trophy size={20} className="text-slate-500 flex-shrink-0" />
                }
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200 truncate">{comp.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {comp.country}
                    {slugAlias(comp.name, comp.slug) && (
                      <span className="text-slate-600 ml-1">· {slugAlias(comp.name, comp.slug)}</span>
                    )}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
