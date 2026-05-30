import { useState, useEffect } from 'react'
import { Eye, EyeOff, Trash2, Activity } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import toast from 'react-hot-toast'

function Card({ title, children }) {
  return (
    <div className="rounded-xl border p-5 mb-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <h2 className="text-sm font-semibold text-slate-300 mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [usage, setUsage] = useState(null)
  const [clearingCache, setClearingCache] = useState(false)

  useEffect(() => {
    api.get('/admin/usage').then(({ data }) => setUsage(data)).catch(() => {})
  }, [])

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

  const apiFootballToday = usage?.today?.find(u => u.source === 'api_football')?.request_count ?? 0
  const fdToday = usage?.today?.find(u => u.source === 'football_data')?.request_count ?? 0

  return (
    <div className="p-4 sm:p-6 pt-16 lg:pt-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-white mb-6">Settings</h1>

        {/* Account info */}
        <Card title="Account">
          <p className="text-sm text-slate-400">
            Signed in as <span className="text-slate-200 font-medium">{user?.username}</span>
          </p>
          <button onClick={handleLogout}
            className="mt-3 text-sm text-red-400 hover:text-red-300 transition-colors">
            Sign out
          </button>
        </Card>

        {/* Change password */}
        <Card title="Change Password">
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
        </Card>

        {/* API Usage */}
        <Card title="API Usage">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-slate-500" />
            <span className="text-xs text-slate-500">Today's usage</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">football-data.org</span>
              <span className="text-slate-200 tabular-nums">{fdToday} reqs</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">API-Football</span>
              <div className="flex items-center gap-2">
                <span className={`tabular-nums font-medium ${apiFootballToday >= 90 ? 'text-red-400' : apiFootballToday >= 70 ? 'text-yellow-400' : 'text-slate-200'}`}>
                  {apiFootballToday} / 100
                </span>
              </div>
            </div>
            {apiFootballToday >= 90 && (
              <p className="text-xs text-red-400 mt-1">Warning: approaching daily API-Football limit.</p>
            )}
          </div>
          {usage?.recent && usage.recent.length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">Recent history (7 days)</summary>
              <div className="mt-2 space-y-1">
                {usage.recent.map((u, i) => (
                  <div key={i} className="flex justify-between text-xs text-slate-500">
                    <span>{u.date} · {u.source === 'api_football' ? 'APF' : 'FD'}</span>
                    <span>{u.request_count}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </Card>

        {/* Cache */}
        <Card title="Cache">
          <p className="text-xs text-slate-500 mb-3">
            Clear cached fixture and standings data. Finished match details are kept permanently.
          </p>
          <button onClick={clearCache} disabled={clearingCache}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors disabled:opacity-60">
            <Trash2 size={14} />
            {clearingCache ? 'Clearing…' : 'Clear Cache'}
          </button>
        </Card>
      </div>
    </div>
  )
}
