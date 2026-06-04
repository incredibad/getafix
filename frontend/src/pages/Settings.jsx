import { useState } from 'react'
import { Eye, EyeOff, Trash2, ExternalLink } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import toast from 'react-hot-toast'
import { version } from '../../package.json'

const DAYS_BACK_KEY        = 'footrack:settings:days_back'
const SPOILERS_KEY         = 'footrack:settings:spoilers_mode'
const REVEAL_PERSIST_KEY   = 'footrack:settings:reveal_persist'
export const REVEALED_IDS_KEY = 'footrack:revealed_fixtures'

export function getSpoilersMode() {
  const v = localStorage.getItem(SPOILERS_KEY)
  return v === null ? true : v === 'true'
}

export function getRevealPersist() {
  return localStorage.getItem(REVEAL_PERSIST_KEY) ?? 'forever'
}

const DAYS_BACK_OPTIONS = [
  { label: '7 days',    value: '7' },
  { label: '14 days',   value: '14' },
  { label: '30 days',   value: '30' },
  { label: '60 days',   value: '60' },
  { label: '3 months',  value: '90' },
  { label: '6 months',  value: '180' },
  { label: '1 year',    value: '365' },
  { label: 'Cal. year', value: 'calendar' },
]

function daysFromJanFirst() {
  const now = new Date()
  const jan1 = new Date(now.getFullYear(), 0, 1)
  return Math.ceil((now - jan1) / 86400000)
}

export function getDaysBack() {
  const stored = localStorage.getItem(DAYS_BACK_KEY) ?? '90'
  if (stored === 'calendar') return daysFromJanFirst()
  return parseInt(stored, 10)
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none ${checked ? 'bg-green-600' : 'bg-slate-700'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

function SettingRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      {title && <h2 className="text-sm font-semibold text-slate-300 mb-4">{title}</h2>}
      {children}
    </div>
  )
}

function Col({ children }) {
  return <div className="break-inside-avoid mb-4">{children}</div>
}

const TABS = ['General', 'System', 'Account']

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('General')

  // Account state
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  // System state
  const [clearingCache, setClearingCache] = useState(false)

  // General state
  const [daysBack, setDaysBackState] = useState(() => localStorage.getItem(DAYS_BACK_KEY) ?? '90')
  const [spoilersMode, setSpoilersMode] = useState(getSpoilersMode)
  const [revealPersist, setRevealPersistState] = useState(getRevealPersist)

  const changePassword = async (e) => {
    e.preventDefault()
    if (newPw !== confirmPw) { toast.error('Passwords do not match.'); return }
    if (newPw.length < 6) { toast.error('Password must be at least 6 characters.'); return }
    setPwLoading(true)
    try {
      await api.post('/auth/change-password', { current_password: currentPw, new_password: newPw })
      toast.success('Password updated.')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update password.')
    } finally {
      setPwLoading(false)
    }
  }

  const clearCache = async () => {
    if (!window.confirm('Clear all non-permanent cached data? Finished match details will be kept.')) return
    setClearingCache(true)
    try {
      const { data } = await api.delete('/admin/cache')
      toast.success(`Cleared ${data.deleted} cache entries.`)
    } catch {
      toast.error('Failed to clear cache.')
    } finally {
      setClearingCache(false)
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const handleDaysBack = (val) => {
    localStorage.setItem(DAYS_BACK_KEY, val)
    setDaysBackState(val)
  }

  const handleSpoilersMode = (val) => {
    localStorage.setItem(SPOILERS_KEY, String(val))
    localStorage.removeItem(REVEALED_IDS_KEY)
    setSpoilersMode(val)
  }

  const handleKeepForever = (val) => {
    const persist = val ? 'forever' : 'session'
    localStorage.setItem(REVEAL_PERSIST_KEY, persist)
    setRevealPersistState(persist)
  }

  const handleRevealPersist = (val) => {
    localStorage.setItem(REVEAL_PERSIST_KEY, val)
    setRevealPersistState(val)
  }

  return (
    <div className="pt-16 lg:pt-0 flex flex-col h-full">

      {/* Tab bar */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-green-500 -mb-px'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 columns-1 sm:columns-2 gap-4">

          {/* ── General ── */}
          {activeTab === 'General' && (
            <>
              <Col><Card title="Fixture History">
                <p className="text-xs text-slate-500 mb-3">How far back to load past fixtures.</p>
                <div className="flex gap-2 flex-wrap">
                  {DAYS_BACK_OPTIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => handleDaysBack(value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        daysBack === value
                          ? 'bg-green-600/20 border-green-500/40 text-green-400'
                          : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Card></Col>

              <Col><Card title="Spoilers">
                <div className="space-y-4">
                  <SettingRow
                    label="Spoilers Mode"
                    description="Hide scores and match events by default. You choose when to reveal each result."
                    checked={spoilersMode}
                    onChange={handleSpoilersMode}
                  />
                  {spoilersMode && (
                    <div className="pl-4 border-l-2 border-slate-700 space-y-4">
                      <SettingRow
                        label="Keep revealed scores"
                        description="Once you reveal a score it stays visible permanently, even after closing the app."
                        checked={revealPersist === 'forever'}
                        onChange={handleKeepForever}
                      />
                      {revealPersist !== 'forever' && (
                        <div>
                          <p className="text-sm font-medium text-slate-200 mb-0.5">Hide again after</p>
                          <p className="text-xs text-slate-500 mb-2 leading-snug">
                            {revealPersist === 'session'
                              ? 'Revealed scores are forgotten as soon as you navigate away from the fixtures screen.'
                              : 'Revealed scores will be hidden again once this period has passed.'}
                          </p>
                          <select
                            value={revealPersist}
                            onChange={e => handleRevealPersist(e.target.value)}
                            className="px-3 py-1.5 rounded-lg text-sm text-slate-200 outline-none focus:ring-1 focus:ring-green-500"
                            style={{ background: '#0d0d14', border: '1px solid var(--border)' }}
                          >
                            <option value="session">Current view only</option>
                            <option value="7d">1 week</option>
                            <option value="30d">1 month</option>
                            <option value="180d">6 months</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card></Col>
            </>
          )}

          {/* ── System ── */}
          {activeTab === 'System' && (
            <>
              <Col><Card title="Cache">
                <p className="text-xs text-slate-500 mb-3">
                  Clear cached fixture and standings data. Finished match details are kept permanently.
                </p>
                <button onClick={clearCache} disabled={clearingCache}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors disabled:opacity-60">
                  <Trash2 size={14} />
                  {clearingCache ? 'Clearing…' : 'Clear Cache'}
                </button>
              </Card></Col>

              <Col><Card title="About">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Version</span>
                    <span className="text-xs font-mono text-slate-300">{version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Source</span>
                    <a
                      href="https://github.com/incredibad/getafix"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors"
                    >
                      github.com/incredibad/getafix
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              </Card></Col>
            </>
          )}

          {/* ── Account ── */}
          {activeTab === 'Account' && (
            <>
              <Col><Card title="Account">
                <p className="text-sm text-slate-400">
                  Signed in as <span className="text-slate-200 font-medium">{user?.username}</span>
                </p>
                <button onClick={handleLogout}
                  className="mt-3 text-sm text-red-400 hover:text-red-300 transition-colors">
                  Sign out
                </button>
              </Card></Col>

              <Col><Card title="Change Password">
                <form onSubmit={changePassword} className="space-y-3">
                  {[
                    ['Current password', currentPw, setCurrentPw, 'current-password'],
                    ['New password', newPw, setNewPw, 'new-password'],
                    ['Confirm new password', confirmPw, setConfirmPw, 'new-password'],
                  ].map(([label, val, setter, autoComplete]) => (
                    <div key={label}>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
                      <div className="relative">
                        <input
                          type={showPw ? 'text' : 'password'}
                          value={val}
                          onChange={e => setter(e.target.value)}
                          autoComplete={autoComplete}
                          required
                          className="w-full pl-3.5 pr-10 py-2 rounded-lg text-sm text-slate-200 outline-none focus:ring-1 focus:ring-green-500"
                          style={{ background: '#0d0d14', border: '1px solid var(--border)' }}
                        />
                        {label === 'Current password' && (
                          <button type="button" onClick={() => setShowPw(!showPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button type="submit" disabled={pwLoading}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors disabled:opacity-60">
                    {pwLoading ? 'Updating…' : 'Update Password'}
                  </button>
                </form>
              </Card></Col>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
