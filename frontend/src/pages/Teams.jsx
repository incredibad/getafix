import { useState, useEffect, useRef } from 'react'
import { Search, UserMinus, UserPlus, Loader2, Globe, Building2 } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

function TeamCard({ team, onFollow, onUnfollow, followed }) {
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    setLoading(true)
    try {
      if (followed) {
        await onUnfollow(team)
      } else {
        await onFollow(team)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border transition-colors"
      style={{ background: 'var(--surface)', borderColor: followed ? 'rgba(34,197,94,0.3)' : 'var(--border)' }}
    >
      <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
        {team.crest_url ? (
          <img src={team.crest_url} alt={team.name} className="w-8 h-8 object-contain" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm font-bold">
            {team.name?.[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">{team.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {team.team_type === 'national' ? (
            <Globe size={11} className="text-slate-500 flex-shrink-0" />
          ) : (
            <Building2 size={11} className="text-slate-500 flex-shrink-0" />
          )}
          <span className="text-xs text-slate-500 truncate">{team.country || (team.team_type === 'national' ? 'National' : 'Club')}</span>
          {(team.source || team.football_data_id || team.api_football_id) && (
            <span className="text-xs text-slate-600 ml-1">
              {team.football_data_id ? '· FD' : '· APF'}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={handle}
        disabled={loading}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
          followed
            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
            : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
        }`}
      >
        {loading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : followed ? (
          <><UserMinus size={13} /> Unfollow</>
        ) : (
          <><UserPlus size={13} /> Follow</>
        )}
      </button>
    </div>
  )
}

export default function Teams() {
  const [followed, setFollowed] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [loadingFollowed, setLoadingFollowed] = useState(true)
  const debounceRef = useRef(null)

  const loadFollowed = async () => {
    try {
      const { data } = await api.get('/teams/followed')
      setFollowed(data)
    } catch {
      toast.error('Failed to load followed teams.')
    } finally {
      setLoadingFollowed(false)
    }
  }

  useEffect(() => { loadFollowed() }, [])

  const handleSearch = (q) => {
    setSearchQuery(q)
    clearTimeout(debounceRef.current)
    if (q.length < 2) { setSearchResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await api.get('/teams/search', { params: { q } })
        setSearchResults(data)
      } catch {
        toast.error('Search failed.')
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  const followTeam = async (team) => {
    try {
      await api.post('/teams/follow', {
        name: team.name,
        short_name: team.short_name,
        country: team.country,
        crest_url: team.crest_url,
        team_type: team.team_type,
        football_data_id: team.football_data_id,
        api_football_id: team.api_football_id,
      })
      toast.success(`Following ${team.name}`)
      await loadFollowed()
      setSearchResults(prev => prev.map(r =>
        r.name === team.name ? { ...r, already_followed: true } : r
      ))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to follow team.')
    }
  }

  const unfollowTeam = async (team) => {
    const id = team.id || team.internal_id
    if (!id) { toast.error('Cannot unfollow: missing ID.'); return }
    try {
      await api.delete(`/teams/${id}/unfollow`)
      toast.success(`Unfollowed ${team.name}`)
      await loadFollowed()
      setSearchResults(prev => prev.map(r =>
        r.name === team.name ? { ...r, already_followed: false } : r
      ))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to unfollow.')
    }
  }

  const isFollowed = (team) =>
    team.already_followed ||
    followed.some(f =>
      (team.football_data_id && f.football_data_id === team.football_data_id) ||
      (team.api_football_id && f.api_football_id === team.api_football_id) ||
      f.name === team.name
    )

  return (
    <div className="p-4 sm:p-6 pt-16 lg:pt-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-white mb-6">Teams</h1>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search for a team…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-green-500 transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          />
          {searching && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 animate-spin" />
          )}
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Search Results</h2>
            <div className="space-y-2">
              {searchResults.map((team, i) => (
                <TeamCard
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

        {/* Followed teams */}
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Following ({followed.length})
          </h2>
          {loadingFollowed ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : followed.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              Search for teams above and click Follow to add them.
            </p>
          ) : (
            <div className="space-y-2">
              {followed.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  followed
                  onFollow={followTeam}
                  onUnfollow={unfollowTeam}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
