import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Circle, Shirt, BarChart2, Zap, Eye, EyeOff, Lock } from 'lucide-react'
import api from '../api/client'
import { formatMatchDateTime } from '../utils/date'
import toast from 'react-hot-toast'

function Spoiler({ revealed, onReveal, children }) {
  if (revealed) return <>{children}</>
  return (
    <div
      className="flex items-center justify-center cursor-pointer text-slate-500 hover:text-slate-300 transition-colors py-1"
      onClick={onReveal}
      title="Click to reveal"
    >
      <Lock size={18} />
    </div>
  )
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl border p-4 mb-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-green-400" />
        <h2 className="text-sm font-semibold text-slate-300">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function EventRow({ event }) {
  const isHome = event._is_home
  const icons = { goal: '⚽', yellow_card: '🟨', red_card: '🟥', substitution: '🔄', var: '📺' }
  const icon = icons[event.type] || '•'
  const detail = event.detail && event.detail !== event.type ? event.detail : null

  return (
    <div className={`flex items-start gap-2 py-1.5 text-sm ${isHome ? 'flex-row-reverse text-right' : ''}`}>
      <span className="text-slate-500 tabular-nums text-xs w-8 flex-shrink-0 pt-0.5">
        {event.minute ? `${event.minute}'` : ''}
        {event.extra_time ? `+${event.extra_time}` : ''}
      </span>
      <span className="text-base flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-slate-200 font-medium truncate">{event.player}</p>
        {event.type === 'substitution' && event.assist && (
          <p className="text-xs text-slate-500">↓ {event.assist}</p>
        )}
        {event.type === 'goal' && event.assist && (
          <p className="text-xs text-slate-500">Assist: {event.assist}</p>
        )}
        {detail && <p className="text-xs text-slate-500">{detail}</p>}
      </div>
    </div>
  )
}

function StatBar({ label, home, away }) {
  const homeNum = parseFloat(home) || 0
  const awayNum = parseFloat(away) || 0
  const total = homeNum + awayNum
  const homePct = total > 0 ? (homeNum / total) * 100 : 50
  const awayPct = total > 0 ? (awayNum / total) * 100 : 50

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span className="font-medium text-slate-200">{home ?? '—'}</span>
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-slate-200">{away ?? '—'}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
        <div className="bg-green-500 rounded-l-full transition-all" style={{ width: `${homePct}%` }} />
        <div className="bg-blue-500 rounded-r-full transition-all" style={{ width: `${awayPct}%` }} />
      </div>
    </div>
  )
}

function LineupGrid({ lineup }) {
  return (
    <div className="mb-4">
      <p className="text-xs text-slate-400 font-semibold mb-2">
        {lineup.team}
        {lineup.formation && <span className="text-slate-600 ml-2">{lineup.formation}</span>}
      </p>
      <div className="grid grid-cols-2 gap-1">
        {lineup.starting_xi.map((p, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <span className="text-xs text-slate-500 w-5 text-right tabular-nums">{p.number ?? i + 1}</span>
            <span className="text-xs text-slate-200 truncate">{p.name}</span>
          </div>
        ))}
      </div>
      {lineup.substitutes.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
            Substitutes ({lineup.substitutes.length})
          </summary>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {lineup.substitutes.map((p, i) => (
              <div key={i} className="flex items-center gap-2 py-1 opacity-70">
                <span className="text-xs text-slate-500 w-5 text-right tabular-nums">{p.number ?? ''}</span>
                <span className="text-xs text-slate-300 truncate">{p.name}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

export default function MatchDetail() {
  const { source, id } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/matches/${id}`, { params: { source } })
        setDetail(data)
      } catch {
        toast.error('Failed to load match details.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, source])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="p-6 pt-16 lg:pt-6 text-center">
        <p className="text-slate-400">Match not found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-green-400 hover:underline text-sm">Go back</button>
      </div>
    )
  }

  const { fixture, events, stats, lineups } = detail
  const isLive = fixture.status === 'LIVE'
  const hasScore = fixture.status !== 'SCHEDULED'

  const homeEvents = events.map(e => ({ ...e, _is_home: e.team === fixture.home_team.name }))

  return (
    <div className="p-4 sm:p-6 pt-16 lg:pt-6 max-w-2xl mx-auto">
      {/* Nav row */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Back to fixtures
        </button>
        {hasScore && (
          <button
            onClick={() => setRevealed(r => !r)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
            {revealed ? 'Hide' : 'Reveal'}
          </button>
        )}
      </div>

      {/* Match header */}
      <div
        className="rounded-xl border p-5 mb-4 text-center"
        style={{ background: 'var(--surface)', borderColor: isLive ? 'rgba(248,113,113,0.3)' : 'var(--border)' }}
      >
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {fixture.competition.emblem_url && (
            <img src={fixture.competition.emblem_url} alt="" className="w-4 h-4 object-contain opacity-70" />
          )}
          <span className="text-xs text-slate-500">{fixture.competition.name}</span>
          {fixture.matchday && <span className="text-xs text-slate-600"> · {fixture.matchday}</span>}
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-2">
            {fixture.home_team.crest_url && (
              <img src={fixture.home_team.crest_url} alt="" className="w-12 h-12 object-contain" />
            )}
            <span className="text-sm font-semibold text-white text-center leading-tight">
              {fixture.home_team.name}
            </span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1 px-2">
            {hasScore ? (
              <Spoiler revealed={revealed} onReveal={() => setRevealed(true)}>
                <div className="text-3xl font-bold text-white tabular-nums">
                  {fixture.score_home ?? 0} – {fixture.score_away ?? 0}
                </div>
                {fixture.score_ht_home != null && (
                  <span className="text-xs text-slate-500">
                    HT: {fixture.score_ht_home}–{fixture.score_ht_away}
                  </span>
                )}
              </Spoiler>
            ) : (
              <span className="text-slate-400 text-sm">{formatMatchDateTime(fixture.utc_date)} AEST</span>
            )}
            {isLive && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-400 mt-1">
                <Circle size={7} fill="currentColor" className="animate-pulse" />
                {fixture.minute ? `${fixture.minute}'` : 'LIVE'}
              </span>
            )}
            {fixture.status === 'FINISHED' && (
              <span className="text-xs text-slate-500 mt-1">Full Time</span>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-2">
            {fixture.away_team.crest_url && (
              <img src={fixture.away_team.crest_url} alt="" className="w-12 h-12 object-contain" />
            )}
            <span className="text-sm font-semibold text-white text-center leading-tight">
              {fixture.away_team.name}
            </span>
          </div>
        </div>

        {fixture.venue && <p className="text-xs text-slate-500 mt-3">{fixture.venue}</p>}
        {fixture.status === 'SCHEDULED' && (
          <p className="text-xs text-slate-500 mt-2">{formatMatchDateTime(fixture.utc_date)} AEST</p>
        )}
      </div>

      {/* Events — blurred since goals reveal the score */}
      {events.length > 0 && (
        <Section title="Match Events" icon={Zap}>
          <Spoiler revealed={revealed} onReveal={() => setRevealed(true)}>
            <div className="space-y-0.5">
              {homeEvents.map((e, i) => <EventRow key={i} event={e} />)}
            </div>
          </Spoiler>
        </Section>
      )}

      {/* Stats — not blurred, these don't reveal the result */}
      {stats.length >= 2 && (
        <Section title="Statistics" icon={BarChart2}>
          <div className="flex justify-between text-xs text-slate-400 mb-3">
            <span className="font-medium text-slate-200">{stats[0]?.team}</span>
            <span className="font-medium text-slate-200">{stats[1]?.team}</span>
          </div>
          {[
            ['Possession', stats[0]?.possession, stats[1]?.possession],
            ['Shots', stats[0]?.shots, stats[1]?.shots],
            ['Shots on Target', stats[0]?.shots_on_target, stats[1]?.shots_on_target],
            ['Corners', stats[0]?.corners, stats[1]?.corners],
            ['Fouls', stats[0]?.fouls, stats[1]?.fouls],
            ['Yellow Cards', stats[0]?.yellow_cards, stats[1]?.yellow_cards],
            ['Red Cards', stats[0]?.red_cards, stats[1]?.red_cards],
            ['Offsides', stats[0]?.offsides, stats[1]?.offsides],
            ['Saves', stats[0]?.saves, stats[1]?.saves],
          ].filter(([, h, a]) => h != null || a != null).map(([label, h, a]) => (
            <StatBar key={label} label={label} home={h} away={a} />
          ))}
        </Section>
      )}

      {/* Lineups — not blurred */}
      {lineups.length > 0 && (
        <Section title="Lineups" icon={Shirt}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {lineups.map((l, i) => <LineupGrid key={i} lineup={l} />)}
          </div>
        </Section>
      )}

      {events.length === 0 && stats.length < 2 && lineups.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-4">
          {fixture.status === 'SCHEDULED'
            ? 'Detailed stats and lineups will appear once the match starts.'
            : 'No detailed data available for this match.'}
        </p>
      )}
    </div>
  )
}
