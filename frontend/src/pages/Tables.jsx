import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Trophy, ChevronDown, Calendar, Search, X } from 'lucide-react'
import api from '../api/client'
import { imgUrl } from '../utils/img'
import toast from 'react-hot-toast'
import { useSidebarResize } from '../utils/useSidebarResize'

const STORAGE_KEY    = 'getafix:tables:competition'
const ALL_TAB_KEY    = 'getafix:tables:tab'
const ALL_SEL_KEY    = 'getafix:tables:all_selected'

function CompLogo({ url, size = 'sm' }) {
  const [errored, setErrored] = useState(false)
  const imgDim  = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-6 h-6'
  const wrapDim = size === 'lg' ? 'w-7 h-7' : size === 'md' ? 'w-6 h-6' : 'w-6 h-6'
  const iconSize = size === 'lg' ? 16 : size === 'md' ? 14 : 18
  if (!url || errored) {
    return (
      <div className={`${wrapDim} flex items-center justify-center flex-shrink-0`}>
        <Trophy size={iconSize} className="text-slate-500" />
      </div>
    )
  }
  return (
    <div className={`${wrapDim} flex items-center justify-center flex-shrink-0`}>
      <img src={imgUrl(url)} alt="" className={`${imgDim} object-contain`} onError={() => setErrored(true)} />
    </div>
  )
}

function RoundStatus({ startDate, endDate }) {
  if (!startDate && !endDate) return null
  const now = new Date()
  const start = startDate ? new Date(startDate) : null
  const end = endDate ? new Date(endDate) : null
  const fmt = (d) => d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
  if (end && end < now) return <span className="text-xs text-slate-400 font-normal normal-case ml-2">Ended {fmt(end)}</span>
  if (start && start > now) return <span className="text-xs text-blue-500 font-normal normal-case ml-2">Starts {fmt(start)}</span>
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-500 font-normal normal-case ml-2">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
      Active
    </span>
  )
}

function StandingsTable({ table, group, stage, startDate, endDate, followed = [] }) {
  const [hoveredRow, setHoveredRow] = useState(null)
  const navigate = useNavigate()
  const label = group || stage || null

  const findFollowedTeam = (rowTeamName) => {
    const rn = rowTeamName.toLowerCase()
    return followed.find(t => {
      const tn = (t.name || '').toLowerCase()
      const sn = (t.short_name || '').toLowerCase()
      return tn === rn || sn === rn || rn.includes(tn) || tn.includes(rn)
    })
  }

  const rowSofascoreId = (row) =>
    row.sofascore_id ?? ((row.team_crest || '').match(/\/team\/(\d+)\/image/)?.[1] ?? null)

  const goToBrowseTeam = (row) => {
    const sid = rowSofascoreId(row)
    if (!sid) return
    navigate(`/browse/team/${sid}`, { state: { name: row.team_name, crest_url: row.team_crest } })
  }

  const cellBg = (rowIdx, colIdx, isFollowedRow = false) => {
    if (hoveredRow === rowIdx) return isFollowedRow ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)'
    if (isFollowedRow) return `rgba(34,197,94,${0.06 + (colIdx % 2 === 0 ? 0.02 : 0)})`
    const row = rowIdx % 2 === 1 ? 0.015 : 0
    const col = colIdx % 2 === 0 ? 0.02 : 0
    const v = row + col
    return v > 0 ? `rgba(255,255,255,${v})` : 'transparent'
  }
  const headColBg = (colIdx) => colIdx % 2 === 0 ? { background: 'rgba(255,255,255,0.03)' } : {}

  return (
    <div className="mb-4">
      {label && (
        <div className="flex items-center mb-2 px-1">
          <p className="text-xs text-slate-500 uppercase tracking-wide flex items-center">
            {label.replace(/_/g, ' ')}
            <RoundStatus startDate={startDate} endDate={endDate} />
          </p>
        </div>
      )}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <th className="text-left px-3 py-2 w-8" style={headColBg(0)}>#</th>
              <th className="text-left px-2 py-2" style={headColBg(1)}>Team</th>
              <th className="text-center px-2 py-2 w-8" style={headColBg(2)}>P</th>
              <th className="text-center px-2 py-2 w-8" style={headColBg(3)}>W</th>
              <th className="text-center px-2 py-2 w-8" style={headColBg(4)}>D</th>
              <th className="text-center px-2 py-2 w-8" style={headColBg(5)}>L</th>
              <th className="text-center px-2 py-2 w-10 hidden sm:table-cell" style={headColBg(6)}>GD</th>
              <th className="text-center px-3 py-2 w-10 font-bold text-slate-300" style={headColBg(7)}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => {
              const ft = findFollowedTeam(row.team_name)
              const isFollowed = !!ft
              return (
                <tr
                  key={i}
                  className="border-b last:border-0 transition-colors"
                  style={{ borderColor: 'var(--border)', cursor: rowSofascoreId(row) ? 'pointer' : 'default' }}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={rowSofascoreId(row) ? () => goToBrowseTeam(row) : undefined}
                >
                  <td className="px-3 py-2.5 text-xs tabular-nums" style={{ background: cellBg(i, 0, isFollowed), color: isFollowed ? 'rgba(134,239,172,0.8)' : 'rgb(100,116,139)' }}>{row.position}</td>
                  <td className="px-2 py-2.5" style={{ background: cellBg(i, 1, isFollowed) }}>
                    <div className="flex items-center gap-2 min-w-0">
                      {row.team_crest && <img src={imgUrl(row.team_crest)} alt="" className="w-4 h-4 object-contain flex-shrink-0" />}
                      <span className={`truncate ${isFollowed ? 'text-green-300 font-medium' : 'text-slate-200'}`}>{row.team_name}</span>
                    </div>
                  </td>
                  <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums" style={{ background: cellBg(i, 2, isFollowed) }}>{row.played}</td>
                  <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums" style={{ background: cellBg(i, 3, isFollowed) }}>{row.won}</td>
                  <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums" style={{ background: cellBg(i, 4, isFollowed) }}>{row.draw}</td>
                  <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums" style={{ background: cellBg(i, 5, isFollowed) }}>{row.lost}</td>
                  <td className="text-center px-2 py-2.5 text-slate-400 tabular-nums hidden sm:table-cell" style={{ background: cellBg(i, 6, isFollowed) }}>
                    {row.goal_difference > 0 ? '+' : ''}{row.goal_difference}
                  </td>
                  <td className="text-center px-3 py-2.5 font-bold text-white tabular-nums" style={{ background: cellBg(i, 7, isFollowed) }}>{row.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }) {
  return (
    <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
      {['my', 'all'].map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
            active === tab
              ? 'text-white border-b-2 border-green-500 -mb-px'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {tab === 'my' ? 'My Tables' : 'All Tables'}
        </button>
      ))}
    </div>
  )
}

// ── My Tables sidebar ─────────────────────────────────────────────────────────

function MyTablesSidebar({ competitions, selectedName, onSelect, loading }) {
  const selectedRef = useRef(null)
  useEffect(() => {
    if (!loading && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'instant', block: 'center' })
    }
  }, [loading])

  return (
    <div className="flex-1 relative">
      <div className="absolute inset-0 overflow-y-auto py-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : competitions.map(comp => (
          <button
            key={comp.name}
            ref={comp.name === selectedName ? selectedRef : null}
            onClick={() => onSelect(comp.name)}
            title={comp.name}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
              comp.name === selectedName ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <CompLogo url={comp.emblem_url} size="sm" />
            <span className="text-sm truncate">{comp.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── All Tables sidebar ────────────────────────────────────────────────────────

function AllTablesSidebar({ selectedId, onSelect }) {
  const [allComps, setAllComps] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [openGroups, setOpenGroups] = useState(new Set())
  const inputRef = useRef(null)
  const selectedRef = useRef(null)

  useEffect(() => {
    api.get('/competitions/sofascore/all')
      .then(({ data }) => {
        setAllComps(data)
        if (selectedId) {
          const sel = data.find(c => c.id === selectedId)
          if (sel) setOpenGroups(new Set([sel.country]))
        }
      })
      .catch(() => toast.error('Failed to load competitions.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'instant', block: 'center' })
    }
  }, [loading])

  const toggleGroup = (country) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(country) ? next.delete(country) : next.add(country)
      return next
    })
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return allComps
    return allComps.filter(c =>
      c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    )
  }, [allComps, query])

  const grouped = useMemo(() => {
    const map = {}
    for (const c of filtered) {
      if (!map[c.country]) map[c.country] = []
      map[c.country].push(c)
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([country, comps]) => [country, [...comps].sort((a, b) => (b.user_count ?? 0) - (a.user_count ?? 0))])
  }, [filtered])

  const searching = query.trim().length > 0

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search box */}
      <div className="px-3 py-2 flex-shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: '#0d0d14', border: '1px solid var(--border)' }}>
          <Search size={13} className="text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="League or country…"
            className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-500 hover:text-slate-300">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 relative">
      <div className="absolute inset-0 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading all competitions…</span>
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No competitions found.</p>
        ) : grouped.map(([country, comps]) => {
          const isOpen = searching || openGroups.has(country)
          return (
            <div key={country}>
              <button
                onClick={() => toggleGroup(country)}
                className="w-full flex items-center gap-1.5 px-3 pt-3 pb-1 text-left hover:text-slate-300 transition-colors"
              >
                <ChevronDown size={11} className={`text-slate-600 flex-shrink-0 transition-transform duration-150 ${isOpen ? '' : '-rotate-90'}`} />
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{country}</span>
              </button>
              {isOpen && comps.map(comp => (
                <button
                  key={comp.id}
                  ref={selectedId === comp.id ? selectedRef : null}
                  onClick={() => onSelect(comp)}
                  title={comp.name}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                    selectedId === comp.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <CompLogo url={comp.emblem_url} size="sm" />
                  <span className="text-sm truncate">{comp.name}</span>
                </button>
              ))}
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}

// ── Mobile: My Tables picker ──────────────────────────────────────────────────

function MobileMyPicker({ competitions, selectedName, onSelect, onFixtures }) {
  const [open, setOpen] = useState(false)
  const selected = competitions.find(c => c.name === selectedName)

  return (
    <div className="lg:hidden sticky top-14 z-20 border-b" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-left z-20 relative"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CompLogo url={selected?.emblem_url} size="md" />
            <span className="text-sm font-medium text-white truncate">{selected?.name ?? 'Select competition'}</span>
            {selected?.season && <span className="text-xs text-slate-500 flex-shrink-0">{selected.season}</span>}
          </div>
          <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
        {selected && (
          <button onClick={onFixtures} className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors" title="View fixtures">
            <Calendar size={20} />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-20 top-full left-4 right-4 rounded-xl border shadow-xl overflow-hidden max-h-72 overflow-y-auto" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {competitions.map(comp => (
            <button
              key={comp.name}
              onClick={() => { onSelect(comp.name); setOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b last:border-0 ${comp.name === selectedName ? 'text-green-400' : 'text-slate-200'}`}
              style={{ borderColor: 'var(--border)' }}
            >
              <CompLogo url={comp.emblem_url} size="sm" />
              <span className="text-sm truncate">{comp.name}</span>
              {comp.season && <span className="text-xs text-slate-500 ml-auto flex-shrink-0">{comp.season}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Mobile: All Tables picker ─────────────────────────────────────────────────

function MobileAllPicker({ allComps, loadingAll, selectedComp, onSelect }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return allComps
    return allComps.filter(c =>
      c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    )
  }, [allComps, query])

  const grouped = useMemo(() => {
    const map = {}
    for (const c of filtered) {
      if (!map[c.country]) map[c.country] = []
      map[c.country].push(c)
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([country, comps]) => [country, [...comps].sort((a, b) => (b.user_count ?? 0) - (a.user_count ?? 0))])
  }, [filtered])

  const close = () => { setOpen(false); setQuery('') }

  return (
    <div className="lg:hidden sticky top-14 z-20 border-b" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
      <div className="px-4 py-2">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-left"
          style={{ background: 'var(--surface)', borderColor: selectedComp ? 'rgba(34,197,94,0.4)' : 'var(--border)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CompLogo url={selectedComp?.emblem_url} size="md" />
            <span className={`text-sm font-medium truncate ${selectedComp ? 'text-white' : 'text-slate-400'}`}>
              {selectedComp?.name ?? 'Select competition'}
            </span>
            {selectedComp && <span className="text-xs text-slate-500 flex-shrink-0">{selectedComp.country}</span>}
          </div>
          <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <Search size={16} className="text-slate-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="League or country…"
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
            />
            <button onClick={close} className="text-slate-400 hover:text-white p-1"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto pb-24">
            {loadingAll ? (
              <div className="flex flex-col items-center gap-2 py-12 text-slate-500">
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading all competitions…</span>
              </div>
            ) : grouped.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">No competitions found.</p>
            ) : grouped.map(([country, comps]) => (
              <div key={country}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 pt-4 pb-1">{country}</p>
                {comps.map(comp => (
                  <button
                    key={comp.id}
                    onClick={() => { onSelect(comp); close() }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selectedComp?.id === comp.id ? 'text-green-400 bg-green-600/10' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <CompLogo url={comp.emblem_url} size="sm" />
                    <span className="text-sm truncate">{comp.name}</span>
                    <span className="text-xs text-slate-500 ml-auto flex-shrink-0">{comp.country}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Tables() {
  const navigate = useNavigate()
  const location = useLocation()
  const { width: sidebarWidth, nearEdge: sidebarNearEdge, onMouseMove: sidebarMouseMove, onMouseLeave: sidebarMouseLeave, onMouseDown: sidebarMouseDown } = useSidebarResize()

  // Tab state — seeded from route state when navigating from a team page
  const [activeTab, setActiveTab] = useState(() => location.state?.tab ?? localStorage.getItem(ALL_TAB_KEY) ?? 'my')

  // My Tables state
  const [standings, setStandings] = useState([])
  const [followed, setFollowed] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedName, setSelectedName] = useState(() => localStorage.getItem(STORAGE_KEY))

  // All Tables state
  const [allComps, setAllComps] = useState([])
  const [loadingAll, setLoadingAll] = useState(false)
  const [allFetched, setAllFetched] = useState(false)
  const [allSelected, setAllSelected] = useState(() => {
    if (location.state?.competition) return location.state.competition
    try { return JSON.parse(localStorage.getItem(ALL_SEL_KEY)) ?? null } catch { return null }
  })
  const [allStandings, setAllStandings] = useState([])
  const [loadingAllStandings, setLoadingAllStandings] = useState(false)
  const [allStandingsError, setAllStandingsError] = useState(false)

  // Load My Tables data
  const load = async () => {
    try {
      const [standingsRes, followedRes] = await Promise.all([
        api.get('/standings/followed'),
        api.get('/teams/followed'),
      ])
      setStandings(standingsRes.data)
      setFollowed(followedRes.data)
    } catch {
      toast.error('Failed to load standings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Sync route-state overrides to localStorage once on mount
  useEffect(() => {
    if (location.state?.tab) localStorage.setItem(ALL_TAB_KEY, location.state.tab)
    if (location.state?.competition) localStorage.setItem(ALL_SEL_KEY, JSON.stringify(location.state.competition))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch all competitions when All Tables tab is first opened
  useEffect(() => {
    if (activeTab !== 'all' || allFetched) return
    setLoadingAll(true)
    api.get('/competitions/sofascore/all')
      .then(({ data }) => { setAllComps(data); setAllFetched(true) })
      .catch(() => toast.error('Failed to load competitions.'))
      .finally(() => setLoadingAll(false))
  }, [activeTab, allFetched])

  // Fetch standings when All Tables selection changes
  useEffect(() => {
    if (!allSelected) { setAllStandings([]); return }
    setLoadingAllStandings(true)
    setAllStandingsError(false)
    setAllStandings([])
    api.get(`/standings/sofascore/${allSelected.id}`)
      .then(({ data }) => setAllStandings(data))
      .catch(() => setAllStandingsError(true))
      .finally(() => setLoadingAllStandings(false))
  }, [allSelected])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    localStorage.setItem(ALL_TAB_KEY, tab)
  }

  // My Tables helpers
  const myCompetitions = useMemo(() => {
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

  useEffect(() => {
    if (myCompetitions.length === 0) return
    const valid = myCompetitions.find(c => c.name === selectedName)
    if (!valid) {
      setSelectedName(myCompetitions[0].name)
      localStorage.setItem(STORAGE_KEY, myCompetitions[0].name)
    }
  }, [myCompetitions])

  const handleMySelect = (name) => {
    setSelectedName(name)
    localStorage.setItem(STORAGE_KEY, name)
  }

  const handleAllSelect = (comp) => {
    setAllSelected(comp)
    localStorage.setItem(ALL_SEL_KEY, JSON.stringify(comp))
  }

  const selectedMyComp = myCompetitions.find(c => c.name === selectedName)

  const goToFixtures = () => {
    if (!selectedMyComp) return
    navigate('/fixtures', { state: { initialFilter: { type: 'comp', value: selectedMyComp.name } } })
  }

  const goToFixturesAll = () => {
    if (!allSelected) return
    navigate('/fixtures', { state: { initialFilter: { type: 'comp', value: allSelected.name, sofascore_id: allSelected.id } } })
  }

  // All Tables standings grouped
  const allStandingsGroups = useMemo(() => {
    if (!allStandings.length) return []
    const map = {}
    for (const s of allStandings) {
      const key = s.competition?.name ?? allSelected?.name ?? ''
      if (!map[key]) map[key] = { name: key, emblem_url: s.competition?.emblem_url ?? allSelected?.emblem_url, season: s.season, groups: [] }
      const groups = s.tables?.length > 0
        ? s.tables.map(t => ({ ...t, start_date: t.start_date ?? s.start_date, end_date: t.end_date ?? s.end_date }))
        : [{ table: s.table || [], group: s.group, stage: s.stage, start_date: s.start_date, end_date: s.end_date }]
      map[key].groups.push(...groups.filter(g => g.table?.length > 0))
    }
    return Object.values(map)
  }, [allStandings, allSelected])

  return (
    <div className="lg:flex lg:h-full">

      {/* ── Desktop left column ── */}
      <div
        className={`hidden lg:flex flex-col flex-shrink-0 border-r overflow-clip h-screen${sidebarNearEdge ? ' [&_*]:!cursor-col-resize' : ''}`}
        style={{ borderColor: 'var(--border)', width: sidebarWidth, cursor: sidebarNearEdge ? 'col-resize' : '' }}
        onMouseMove={sidebarMouseMove}
        onMouseLeave={sidebarMouseLeave}
        onMouseDown={sidebarMouseDown}
      >
        <TabBar active={activeTab} onChange={handleTabChange} />

        {activeTab === 'my' ? (
          <MyTablesSidebar
            competitions={myCompetitions}
            selectedName={selectedName}
            onSelect={handleMySelect}
            loading={loading}
          />
        ) : (
          <AllTablesSidebar
            selectedId={allSelected?.id}
            onSelect={handleAllSelect}
          />
        )}
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 min-w-0 lg:overflow-y-auto">

        {/* Spacer for fixed mobile top bar */}
        <div className="h-14 lg:hidden" />

        {/* Mobile tab bar */}
        <div className="lg:hidden sticky top-14 z-30 border-b" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <TabBar active={activeTab} onChange={handleTabChange} />
        </div>

        {/* Mobile competition pickers */}
        {activeTab === 'my' && !loading && myCompetitions.length > 0 && (
          <MobileMyPicker
            competitions={myCompetitions}
            selectedName={selectedName}
            onSelect={handleMySelect}
            onFixtures={goToFixtures}
          />
        )}
        {activeTab === 'all' && (
          <MobileAllPicker
            allComps={allComps}
            loadingAll={loadingAll}
            selectedComp={allSelected}
            onSelect={handleAllSelect}
          />
        )}

        <div className="p-4 sm:p-6 lg:p-6">

          {/* ── My Tables content ── */}
          {activeTab === 'my' && (
            loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : myCompetitions.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3 text-center">
                <Trophy size={40} className="text-slate-600" />
                <p className="text-slate-300 font-medium">No standings available</p>
                <p className="text-slate-500 text-sm">Follow teams and load their fixtures to see tables.</p>
              </div>
            ) : selectedMyComp ? (
              <>
                <div className="hidden lg:flex items-center gap-2 mb-4">
                  <CompLogo url={selectedMyComp.emblem_url} size="lg" />
                  <h2 className="text-base font-semibold text-white">{selectedMyComp.name}</h2>
                  {selectedMyComp.season && <span className="text-xs text-slate-500 ml-1">Season {selectedMyComp.season}</span>}
                  <button onClick={goToFixtures} className="ml-auto p-1 text-slate-500 hover:text-slate-300 transition-colors" title="View fixtures">
                    <Calendar size={20} />
                  </button>
                </div>
                {selectedMyComp.groups.map((g, i) => (
                  <StandingsTable key={i} table={g.table} group={g.group} stage={g.stage} startDate={g.start_date} endDate={g.end_date} followed={followed} />
                ))}
              </>
            ) : null
          )}

          {/* ── All Tables content ── */}
          {activeTab === 'all' && (
            !allSelected ? (
              <div className="flex flex-col items-center py-16 gap-3 text-center">
                <Search size={40} className="text-slate-600" />
                <p className="text-slate-300 font-medium">Select a competition</p>
                <p className="text-slate-500 text-sm">Search by league or country name in the sidebar.</p>
              </div>
            ) : loadingAllStandings ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : allStandingsError ? (
              <div className="flex flex-col items-center py-16 gap-3 text-center">
                <Trophy size={40} className="text-slate-600" />
                <p className="text-slate-300 font-medium">No standings available</p>
                <p className="text-slate-500 text-sm">{allSelected.name} may not have a league table.</p>
                <button
                  onClick={goToFixturesAll}
                  className="mt-1 flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm font-medium transition-colors"
                >
                  <Calendar size={14} />
                  View Fixtures Instead
                </button>
              </div>
            ) : allStandingsGroups.length > 0 ? (
              <>
                <div className="hidden lg:flex items-center gap-2 mb-4">
                  <CompLogo url={allSelected.emblem_url} size="lg" />
                  <h2 className="text-base font-semibold text-white">{allSelected.name}</h2>
                  <span className="text-xs text-slate-500 ml-1">{allSelected.country}</span>
                  <button onClick={goToFixturesAll} className="ml-auto p-1 text-slate-500 hover:text-slate-300 transition-colors" title="View fixtures">
                    <Calendar size={20} />
                  </button>
                </div>
                {allStandingsGroups.map(comp =>
                  comp.groups.map((g, i) => (
                    <StandingsTable key={i} table={g.table} group={g.group} stage={g.stage} startDate={g.start_date} endDate={g.end_date} followed={followed} />
                  ))
                )}
              </>
            ) : null
          )}

        </div>
      </div>

    </div>
  )
}
