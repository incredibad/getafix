import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Fixtures from './pages/Fixtures'
import Tables from './pages/Tables'
import Teams from './pages/Teams'
import MatchDetail from './pages/MatchDetail'
import Settings from './pages/Settings'
import api from './api/client'

function AppRoutes() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [needsSetup, setNeedsSetup] = useState(null)

  useEffect(() => {
    api.get('/auth/setup-status').then(({ data }) => setNeedsSetup(data.needs_setup))
  }, [])

  if (loading || needsSetup === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
          <span className="text-slate-400 text-sm">Loading Footrack…</span>
        </div>
      </div>
    )
  }

  if (needsSetup) {
    return (
      <Routes>
        <Route path="/setup" element={<Setup onSetupComplete={() => setNeedsSetup(false)} />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" state={{ from: location }} replace />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/fixtures" replace />} />
        <Route path="/fixtures" element={<Fixtures />} />
        <Route path="/fixtures/:source/:id" element={<MatchDetail />} />
        <Route path="/tables" element={<Tables />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/fixtures" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
