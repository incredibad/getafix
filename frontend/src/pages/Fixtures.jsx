import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Users, Circle } from 'lucide-react'
import api from '../api/client'
import { groupByDate, formatMatchTime, isToday, isTomorrow } from '../utils/date'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  LIVE:      'text-red-400',
  SCHEDULED: 'text-slate-400',
  FINISHED:  'text-slate-500',
  POSTPONED: 'text-yellow-500',
  CANCELLED: 'text-red-600',
}

function StatusBadge({ fixture }) {
  const { status, minute, score_home, score_away } = fixture
  if (status === 'LIVE') {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-red-400">
        <Circle size={7} fill="currentColor" className="animate-pulse" />
        {minute ? `${minute}'` : 'LIVE'}
      </span>
    )
  }
  if (status === 'FINISHED') {
    return <span className="text-xs text-slate-500 font-medium">FT</span>
  }
  if (status === 'POSTPONED') return <span className="text-xs text-yellow-500">PST</span>
  if (status === 'CANCELLED') return <span className="text-xs text-red-600">CANC</span>
  return null
}

function Score({ fixture }) {
  const { status, score_home, score_away } = fixture
  if (status === 'SCHEDULED') return null
  if (score_home == null && score_away == null) return null
  return (
    <div className="text-lg font-bold text-white tabular-nums">
      {score_home ?? 0} – {score_away ?? 0}
    </div>
  )
}

function TeamCrest({ url, name, size = 20 }) {
  if (!url) return <span className="text-slate-600 text-xs">{name?.[0] ?? '?'}</span>
  return <img src={url} alt={name} style={{ width: size, height: size }} className="object-contain" />
}

function FixtureCard({ fixture, onClick }) {
  const { home_team, away_team, competition, utc_date, status } = fixture
  const isLive = status === 'LIVE'

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 sm:p-4 rounded-xl transition-colors hover:bg-white/5 border"
      style={{
        background: 'var(--surface)',
        borderColor: isLive ? 'rgba(248,113,113,0.3)' : 'var(--border)',
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {competition.emblem_url && (
            <img src={competition.emblem_url} alt="" className="w-4 h-4 object-contain opacity-70 flex-shrink-0" />
          )}
          <span className="text-xs text-slate-500 truncate">{competition.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge fixture={fixture} />
          {status === 'SCHEDULED' && (
            <span className="text-xs text-slate-400">{formatMatchTime(utc_date)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-medium text-slate-200 truncate text-right">
            {home_team.short_name || home_team.name}
          </span>
          <TeamCrest url={home_team.crest_url} name={home_team.name} />
        </div>

        {/* Score / vs */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-16">
          {status !== 'SCHEDULED' ? (
            <Score fixture={fixture} />
          ) : (
            <span className="text-slate-500 text-sm font-medium">vs</span>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamCrest url={away_team.crest_url} name={away_team.name} />
          <span className="text-sm font-medium text-slate-200 truncate">
            {away_team.short_name || away_team.name}
          </span>
        </div>
      </div>
    </button>
  )
}

function DateGroupHeader({ label }) {
  const isT = label.toLowerCase().includes('today') || isToday(label)
  return (
    <div className="flex items-center gap-3 py-3">
      <span className={`text-sm font-semibold ${isT ? 'text-green-400' : 'text-slate-400'}`}>{label}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  )
}

export default function Fixtures() {
  const [fixtures, setFixtures] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(async (showToast = false) => {
    try {
      const { data } = await api.get('/fixtures', { params: { days_back: 365, days_ahead: 90 } })
      setFixtures(data)
      if (showToast) toast.success('Fixtures refreshed.')
    } catch {
      toast.error('Failed to load fixtures.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRefresh = async () => {
    setRefreshing(true)
    await load(true)
  }

  const grouped = groupByDate(fixtures)
  const dateKeys = Object.keys(grouped)

  return (
    <div className="p-4 sm:p-6 pt-16 lg:pt-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Fixtures</h1>
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
        ) : fixtures.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-4 text-center">
            <Users size={40} className="text-slate-600" />
            <div>
              <p className="text-slate-300 font-medium">No fixtures yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Follow some teams to see their fixtures here.
              </p>
            </div>
            <button
              onClick={() => navigate('/teams')}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
            >
              Browse Teams
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {dateKeys.map(date => (
              <div key={date}>
                <DateGroupHeader label={date} />
                <div className="space-y-2">
                  {grouped[date].map(f => (
                    <FixtureCard
                      key={`${f.source}:${f.external_id}`}
                      fixture={f}
                      onClick={() => navigate(`/fixtures/${f.source}/${f.external_id}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
