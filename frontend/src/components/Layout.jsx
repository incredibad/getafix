import Sidebar from './Sidebar'
import ScrollToTop from './ScrollToTop'

export default function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        <ScrollToTop />
        {children}
      </main>
    </div>
  )
}
