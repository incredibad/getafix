import { useNavigate } from 'react-router-dom'
import { Lock, Circle, ChevronRight, Trophy } from 'lucide-react'
import { formatMatchTime } from '../utils/date'
import { imgUrl } from '../utils/img'

export const DATE_CAT_STYLE = {
  past:   { background: 'rgba(239,68,68,0.13)',  borderColor: 'rgba(239,68,68,0.32)' },
  today:  { background: 'rgba(34,197,94,0.13)',  borderColor: 'rgb(74,222,128)' },
  future: { background: 'rgba(59,130,246,0.13)', borderColor: 'rgba(59,130,246,0.32)' },
}

export function TeamCrest({ url, name, country, league, national, size = 28, sofascoreId = null }) {
  const navigate = useNavigate()

  const inner = url
    ? <img src={imgUrl(url)} alt={name} style={{ width: size, height: size }} className="object-contain" />
    : <span style={{ fontSize: size * 0.85, lineHeight: 1 }}>⚽</span>

  const tooltip = (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      <div className="px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap text-xs" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)' }}>
        <p className="font-semibold text-white leading-tight">{name}</p>
        {!national && country && <p className="text-slate-400 leading-tight mt-0.5">{country}</p>}
        {league && <p className="text-slate-500 leading-tight mt-0.5">{league}</p>}
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1e293b' }} />
    </div>
  )

  const Tag = sofascoreId ? 'button' : 'div'
  return (
    <Tag
      className={`relative group flex-shrink-0 flex items-center justify-center${sofascoreId ? ' cursor-pointer' : ''}`}
      style={{ width: size, height: size }}
      onClick={sofascoreId ? (e) => { e.stopPropagation(); navigate(`/browse/team/${sofascoreId}`, { state: { name, crest_url: url, country } }) } : undefined}
    >
      {inner}
      {tooltip}
    </Tag>
  )
}

export function RoundSeparator({ label }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex-shrink-0">{label}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  )
}

export function FixtureCard({ fixture, revealed, onRevealScore, onViewDetail, dateCategory }) {
  const { home_team, away_team, competition, utc_date, status, score_home, score_away } = fixture
  const isLive = status === 'LIVE'
  const hasScore = status !== 'SCHEDULED' && (score_home != null || score_away != null)
  const hasDetail = status === 'FINISHED' || status === 'LIVE'
  const catStyle = DATE_CAT_STYLE[dateCategory] ?? DATE_CAT_STYLE.future
  const cardStyle = isLive ? { ...catStyle, borderColor: 'rgba(248,113,113,0.35)' } : catStyle
  const sep = { borderColor: 'rgba(255,255,255,0.06)' }

  return (
    <div className="fixture-card w-full rounded-xl border" style={cardStyle}>

      {/* Cell 1 — competition */}
      <div className="flex items-center justify-center lg:flex-col lg:items-start lg:justify-center gap-1 px-2 lg:px-3 py-3 border-r rounded-l-xl" style={sep}>
        <div
          className={`flex items-center gap-1.5 lg:w-full min-w-0${competition.id ? ' cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
          onClick={competition.id ? (e) => { e.stopPropagation(); navigate(`/browse/league/${competition.id}`, { state: { name: competition.name, emblem_url: competition.emblem_url } }) } : undefined}
        >
          {competition.emblem_url
            ? <img src={imgUrl(competition.emblem_url)} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
            : <Trophy size={14} className="text-slate-500 flex-shrink-0" />
          }
          <span className="hidden lg:inline text-xs text-slate-400 truncate">{competition.name}</span>
        </div>
      </div>

      {/* Cell 2 — home team */}
      <div className="flex items-center gap-1.5 lg:gap-2 justify-end min-w-0 pl-3 lg:pl-4 pr-3 py-3">
        <span className="text-base lg:text-xl font-semibold text-slate-200 truncate text-right leading-tight">
          {home_team.short_name || home_team.name}
        </span>
        <TeamCrest
          url={home_team.crest_url}
          name={home_team.name}
          country={home_team.country}
          league={home_team.home_league !== competition.name ? home_team.home_league : undefined}
          national={home_team.national}
          sofascoreId={home_team.id}
        />
      </div>

      {/* Cell 3 — score/time */}
      <div className="flex flex-col items-center justify-center gap-0.5 px-3 lg:px-4 py-3">
        {hasScore ? (
          !revealed ? (
            <div
              className="cursor-pointer text-slate-500 hover:text-slate-300 transition-colors"
              onClick={e => { e.stopPropagation(); onRevealScore() }}
              title="Click to reveal score"
            >
              <Lock size={18} />
            </div>
          ) : (
            <span className="text-xl lg:text-[26px] font-bold text-white tabular-nums leading-none">
              {score_home ?? 0} – {score_away ?? 0}
            </span>
          )
        ) : status === 'POSTPONED' ? (
          <span className="text-xs lg:text-sm font-bold text-yellow-500">PST</span>
        ) : status === 'CANCELLED' ? (
          <span className="text-xs lg:text-sm font-bold text-red-500">CANC</span>
        ) : (
          <span className="text-base lg:text-xl font-medium text-slate-400 tabular-nums">
            {formatMatchTime(utc_date)}
          </span>
        )}
        {isLive && (
          <span className="flex items-center gap-1 text-xs font-bold text-red-400">
            <Circle size={6} fill="currentColor" className="animate-pulse" />
            {fixture.minute ? `${fixture.minute}'` : 'LIVE'}
          </span>
        )}
      </div>

      {/* Cell 4 — away team */}
      <div className="flex items-center gap-1.5 lg:gap-2 min-w-0 pr-3 lg:pr-4 pl-3 py-3">
        <TeamCrest
          url={away_team.crest_url}
          name={away_team.name}
          country={away_team.country}
          league={away_team.home_league !== competition.name ? away_team.home_league : undefined}
          national={away_team.national}
          sofascoreId={away_team.id}
        />
        <span className="text-base lg:text-xl font-semibold text-slate-200 truncate leading-tight">
          {away_team.short_name || away_team.name}
        </span>
      </div>

      {/* Cell 5 — chevron */}
      {hasDetail ? (
        <button
          onClick={onViewDetail}
          className="flex items-center justify-center border-l rounded-r-xl text-slate-500 hover:text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          style={sep}
          title="View match details"
        >
          <ChevronRight size={13} />
        </button>
      ) : (
        <div className="border-l rounded-r-xl" style={sep} />
      )}

    </div>
  )
}
