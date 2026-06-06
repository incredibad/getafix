import { useState, useEffect, useRef } from 'react'
import { Search, UserMinus, UserPlus, Loader2, Globe, Building2, X, LayoutGrid, List } from 'lucide-react'
import api from '../api/client'
import { imgUrl } from '../utils/img'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const VIEW_MODE_KEY = 'getafix:teams:view_mode'

function GridCard({ team, followed, onFollow, onUnfollow }) {
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
      className="aspect-square flex flex-col p-4 rounded-xl border transition-colors"
      style={{ background: 'var(--surface)', borderColor: followed ? 'rgba(34,197,94,0.3)' : 'var(--border)' }}
    >
      {/* Crest */}
      <div
        onClick={() => team.sofascore_id && navigate(`/browse/team/${team.sofascore_id}`, {
          state: { name: team.name, short_name: team.short_name, crest_url: team.crest_url, country: team.country, team_type: team.team_type }
        })}
        className={`flex-1 flex items-center justify-center ${team.sofascore_id ? 'cursor-pointer' : ''}`}
      >
        {team.crest_url
          ? <img src={imgUrl(team.crest_url)} alt={team.name} className="w-20 h-20 object-contain" />
          : <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-3xl font-bold">{team.name?.[0]}</div>
        }
      </div>

      {/* Name */}
      <p
        onClick={() => team.sofascore_id && navigate(`/browse/team/${team.sofascore_id}`, {
          state: { name: team.name, short_name: team.short_name, crest_url: team.crest_url, country: team.country, team_type: team.team_type }
        })}
        className={`text-sm font-medium text-slate-200 text-center leading-tight line-clamp-2 mt-2 mb-2 ${team.sofascore_id ? 'cursor-pointer' : ''}`}
      >
        {team.name}
      </p>

      {/* Unfollow button */}
      <button
        onClick={handleFollow}
        disabled={loading}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : <><UserMinus size={11} /> Unfollow</>}
      </button>
    </div>
  )
}

function ListRow({ team, followed, onFollow, onUnfollow }) {
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
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors ${team.sofascore_id ? 'cursor-pointer hover:bg-white/5' : ''}`}
      style={{ background: 'var(--surface)', borderColor: followed ? 'rgba(34,197,94,0.3)' : 'var(--border)' }}
    >
      {team.crest_url
        ? <img src={imgUrl(team.crest_url)} alt={team.name} className="w-5 h-5 object-contain flex-shrink-0" />
        : <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-500 text-[10px] font-bold flex-shrink-0">{team.name?.[0]}</div>
      }
      <span className="flex-1 text-sm text-slate-200 truncate min-w-0">
        {team.name}
        {team.country && <span className="text-slate-500 text-xs ml-1.5">· {team.country}</span>}
      </span>
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

// Compact row used inside the search dropdown
function DropdownRow({ team, followed, onFollow, onUnfollow }) {
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
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${team.sofascore_id ? 'cursor-pointer hover:bg-white/5' : ''}`}
    >
      {team.crest_url
        ? <img src={imgUrl(team.crest_url)} alt={team.name} className="w-6 h-6 object-contain flex-shrink-0" />
        : <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold flex-shrink-0">{team.name?.[0]}</div>
      }
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 truncate">{team.name}</p>
        {team.country && (
          <div className="flex items-center gap-1">
            {team.team_type === 'national' ? <Globe size={10} className="text-slate-500" /> : <Building2 size={10} className="text-slate-500" />}
            <span className="text-xs text-slate-500">{team.country}</span>
          </div>
        )}
      </div>
      <button
        onClick={handleFollow}
        disabled={loading}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
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

export default function Teams() {
  const [followed, setFollowed]           = useState([])
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]         = useState(false)
  const [focused, setFocused]             = useState(false)
  const [loadingFollowed, setLoadingFollowed] = useState(true)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_MODE_KEY) ?? 'grid')
  const debounceRef = useRef(null)
  const wrapperRef  = useRef(null)
  const inputRef    = useRef(null)

  const showDropdown = focused && searchQuery.trim().length >= 2

  const setView = mode => { setViewMode(mode); localStorage.setItem(VIEW_MODE_KEY, mode) }

  const loadFollowed = async () => {
    try {
      const { data } = await api.get('/teams/followed')
      setFollowed(data)
    } catch { toast.error('Failed to load followed teams.') }
    finally { setLoadingFollowed(false) }
  }

  useEffect(() => { loadFollowed() }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (searchQuery.trim().length < 2) { setSearchResults([]); setSearching(false); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/teams/search', { params: { q: searchQuery.trim() } })
        setSearchResults(data)
      } catch { toast.error('Search failed.') }
      finally { setSearching(false) }
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery])

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

  const closeDropdown = () => {
    setFocused(false)
    setSearchQuery('')
    setSearchResults([])
    inputRef.current?.blur()
  }

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
      await loadFollowed()
      setSearchResults(prev => prev.map(r => r.name === team.name ? { ...r, already_followed: true } : r))
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to follow team.') }
  }

  const unfollowTeam = async team => {
    const id = team.id || team.internal_id
    if (!id) { toast.error('Cannot unfollow: missing ID.'); return }
    try {
      await api.delete(`/teams/${id}/unfollow`)
      toast.success(`Unfollowed ${team.name}`)
      await loadFollowed()
      setSearchResults(prev => prev.map(r => r.name === team.name ? { ...r, already_followed: false } : r))
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to unfollow.') }
  }

  const isFollowed = team =>
    team.already_followed ||
    followed.some(f =>
      (team.sofascore_id && f.sofascore_id === team.sofascore_id) ||
      (team.espn_id && f.espn_id === team.espn_id) ||
      (team.football_data_id && f.football_data_id === team.football_data_id) ||
      f.name === team.name
    )

  return (
    <>
      {/* Header */}
      <div
        className="sticky top-14 lg:top-0 z-20 flex items-center gap-2 px-4 py-2 border-b flex-shrink-0"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex-1 relative" ref={wrapperRef}>
          <div
            className="flex items-center gap-2 px-3 h-10 rounded-lg border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <Search size={14} className="text-slate-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Search to follow a team…"
              className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 outline-none text-sm"
            />
            {searching && <Loader2 size={13} className="text-slate-500 animate-spin flex-shrink-0" />}
            {searchQuery && !searching && (
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
              <div className="max-h-[calc(100vh-208px)] lg:max-h-[calc(100vh-152px)] overflow-y-auto py-1">
                {searching && (
                  <div className="flex justify-center py-6">
                    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!searching && searchResults.length === 0 && (
                  <p className="text-center text-slate-500 text-xs py-6">No results for "{searchQuery}"</p>
                )}
                {!searching && searchResults.map((team, i) => (
                  <DropdownRow
                    key={i}
                    team={team}
                    followed={isFollowed(team)}
                    onFollow={followTeam}
                    onUnfollow={unfollowTeam}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => setView('grid')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
              viewMode === 'grid' ? 'text-white bg-white/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView('list')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
              viewMode === 'list' ? 'text-white bg-white/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Following ({followed.length})
        </p>
        {loadingFollowed ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : followed.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Search for teams above and click Follow to add them.</p>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {followed.map(team => (
              <GridCard key={team.id} team={team} followed onFollow={followTeam} onUnfollow={unfollowTeam} />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {followed.map(team => (
              <ListRow key={team.id} team={team} followed onFollow={followTeam} onUnfollow={unfollowTeam} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
