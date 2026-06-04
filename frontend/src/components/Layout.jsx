import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
