import { useState, useEffect, useMemo, useRef } from 'react'
import { ArrowLeft, Search, X, Eye, EyeOff, Users, Trophy, UserPlus, UserMinus, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { imgUrl } from '../utils/img'
import toast from 'react-hot-toast'

function TeamResult({ team, followed, onFollow, onUnfollow }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleFollow = async e => {
    e.stopPropagation()
    setLoading(true)
    try { followed ? await onUnfollow(team) : await onFollow(team) }
    finally { setLoading(false) }
  }

  return (
    <div
      onClick={() => team.sofascore_id && navigate(`/browse/team/${team.sofascore_id}`, {
        state: { name: team.name, short_name: team.short_name, crest_url: team.crest_url, country: team.country, team_type: team.team_type }
      })}
      className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors ${team.sofascore_id ? 'cursor-pointer hover:bg-white/5' : ''}`}
    >
      {team.crest_url
        ? <img src={imgUrl(team.crest_url)} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
        : <span className="w-6 h-6 flex-shrink-0" />
      }
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 truncate">{team.name}</p>
        {team.country && <p className="text-xs text-slate-500">{team.country}</p>}
      </div>
      <button
        onClick={handleFollow}
        disabled={loading}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
          followed ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
        }`}
      >
        {loading ? <Loader2 size={11} className="animate-spin" />
          : followed ? <><UserMinus size={11} /> Unfollow</>
          : <><UserPlus size={11} /> Follow</>
        }
      </button>
    </div>
  )
}

export default function BrowseHeader({ canReveal, revealed, onToggleReveal, autoFocus, hideBack }) {
  const navigate = useNavigate()

  const [localQuery, setLocalQuery]   = useState('')
  const [focused, setFocused]         = useState(false)
  const [teamResults, setTeamResults] = useState([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [allComps, setAllComps]       = useState([])
  const [followed, setFollowed]       = useState([])
  const debounceRef = useRef(null)
  const wrapperRef  = useRef(null)
  const inputRef    = useRef(null)

  useEffect(() => {
    api.get('/competitions/sofascore/all').then(({ data }) => setAllComps(data)).catch(() => {})
    api.get('/teams/followed').then(({ data }) => setFollowed(data)).catch(() => {})
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (localQuery.trim().length < 2) { setTeamResults([]); setTeamLoading(false); return }
    setTeamLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/teams/search', { params: { q: localQuery.trim() } })
        setTeamResults(data)
      } catch { setTeamResults([]) }
      finally { setTeamLoading(false) }
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [localQuery])

  const compResults = useMemo(() => {
    const q = localQuery.toLowerCase().trim()
    if (q.length < 2) return []
    return allComps
      .filter(c => (c.name || '').toLowerCase().includes(q) || (c.country || '').toLowerCase().includes(q))
      .sort((a, b) => (b.user_count ?? 0) - (a.user_count ?? 0))
      .slice(0, 15)
  }, [allComps, localQuery])

  const isFollowed = team =>
    team.already_followed ||
    followed.some(f =>
      (team.sofascore_id && f.sofascore_id === team.sofascore_id) ||
      (team.espn_id && f.espn_id === team.espn_id) ||
      (team.football_data_id && f.football_data_id === team.football_data_id) ||
      f.name === team.name
    )

  const followTeam = async team => {
    try {
      const { data } = await api.post('/teams/follow', {
        name: team.name, short_name: team.short_name, country: team.country, crest_url: team.crest_url,
        team_type: team.team_type, football_data_id: team.football_data_id,
        api_football_id: team.api_football_id, espn_id: team.espn_id, sofascore_id: team.sofascore_id,
      })
      const comps = data.linked_competitions ?? []
      const msg = comps.length ? `Following ${team.name} · added to ${comps.join(', ')}` : `Following ${team.name}`
      toast.success(msg, { duration: 6000 })
      localStorage.setItem('getafix:pending_toast', JSON.stringify({ message: msg, type: 'success', expires: Date.now() + 5 * 60 * 1000 }))
      const { data: updated } = await api.get('/teams/followed')
      setFollowed(updated)
      setTeamResults(prev => prev.map(r => r.name === team.name ? { ...r, already_followed: true } : r))
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to follow team.') }
  }

  const unfollowTeam = async team => {
    const id = team.id || team.internal_id
    if (!id) { toast.error('Cannot unfollow: missing ID.'); return }
    try {
      await api.delete(`/teams/${id}/unfollow`)
      toast.success(`Unfollowed ${team.name}`)
      const { data: updated } = await api.get('/teams/followed')
      setFollowed(updated)
      setTeamResults(prev => prev.map(r => r.name === team.name ? { ...r, already_followed: false } : r))
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to unfollow.') }
  }

  const showDropdown = focused && localQuery.trim().length >= 2

  const closeDropdown = () => {
    setFocused(false)
    setLocalQuery('')
    setTeamResults([])
    inputRef.current?.blur()
  }

  useEffect(() => {
    if (!showDropdown) return
    const handler = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) closeDropdown()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape' && focused) closeDropdown() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [focused])

  const handleCompClick = (path, state) => {
    closeDropdown()
    navigate(path, { state })
  }

  return (
    <div
      className="sticky top-14 lg:top-0 z-20 flex items-center gap-2 px-4 py-2 border-b flex-shrink-0"
      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
    >
      {/* Back */}
      {!hideBack && (
        <button
          onClick={() => navigate(-1)}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
      )}

      {/* Search */}
      <div className="flex-1 relative" ref={wrapperRef}>
        <div
          className="flex items-center gap-2 px-3 h-10 rounded-lg border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <Search size={14} className="text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={localQuery}
            onChange={e => setLocalQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Search teams or leagues…"
            autoFocus={autoFocus}
            className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 outline-none text-sm"
          />
          {localQuery && (
            <button
              onClick={e => { e.stopPropagation(); closeDropdown() }}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Overlay dropdown */}
        {showDropdown && (
          <div
            className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border shadow-2xl overflow-hidden z-30"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="max-h-[calc(100vh-208px)] lg:max-h-[calc(100vh-152px)] overflow-y-auto">
              {teamLoading && (
                <div className="flex justify-center py-6">
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!teamLoading && teamResults.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 px-3 pt-3 pb-1">
                    <Users size={11} className="text-slate-600" />
                    <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Teams</span>
                  </div>
                  {teamResults.slice(0, 8).map((team, i) => (
                    <TeamResult
                      key={i}
                      team={team}
                      followed={isFollowed(team)}
                      onFollow={followTeam}
                      onUnfollow={unfollowTeam}
                    />
                  ))}
                </>
              )}
              {!teamLoading && compResults.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 px-3 pt-3 pb-1">
                    <Trophy size={11} className="text-slate-600" />
                    <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Leagues</span>
                  </div>
                  {compResults.map((comp, i) => (
                    <button
                      key={i}
                      onClick={() => handleCompClick(`/browse/league/${comp.id}`, {
                        name: comp.name, emblem_url: comp.emblem_url, country: comp.country, tournament_id: comp.id,
                      })}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                    >
                      {comp.emblem_url
                        ? <img src={imgUrl(comp.emblem_url)} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                        : <Trophy size={16} className="text-slate-500 flex-shrink-0" />
                      }
                      <div className="min-w-0">
                        <p className="text-sm text-slate-200 truncate">{comp.name}</p>
                        <p className="text-xs text-slate-500">{comp.country}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {!teamLoading && teamResults.length === 0 && compResults.length === 0 && (
                <p className="text-center text-slate-500 text-xs py-6">No results for "{localQuery}"</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reveal */}
      <button
        onClick={canReveal ? onToggleReveal : undefined}
        className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
          !canReveal
            ? 'text-slate-700 cursor-default'
            : revealed
              ? 'text-green-400 bg-green-500/20 hover:bg-green-500/30'
              : 'text-red-400 bg-red-500/20 hover:bg-red-500/30'
        }`}
      >
        {canReveal && !revealed ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}
