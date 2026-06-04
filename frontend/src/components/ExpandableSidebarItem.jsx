import { useState, useRef, useCallback, forwardRef } from 'react'

const ExpandableSidebarItem = forwardRef(function ExpandableSidebarItem(
  { onClick, icon, label, isActive },
  ref
) {
  const [rect, setRect] = useState(null)
  const btnRef = useRef(null)
  const hideTimer = useRef(null)

  const setRefs = useCallback((node) => {
    btnRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }, [ref])

  const show = () => {
    clearTimeout(hideTimer.current)
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
  }

  const hide = () => {
    hideTimer.current = setTimeout(() => setRect(null), 60)
  }

  const cancelHide = () => clearTimeout(hideTimer.current)

  const activeClass = 'bg-white/10 text-white'
  const inactiveClass = 'text-slate-400 hover:text-slate-200 hover:bg-white/5'

  return (
    <>
      <button
        ref={setRefs}
        onClick={onClick}
        onMouseEnter={show}
        onMouseLeave={hide}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${isActive ? activeClass : inactiveClass}`}
      >
        <span className="flex-shrink-0">{icon}</span>
        <span className="text-sm truncate">{label}</span>
      </button>

      {rect && (
        <div
          onMouseEnter={cancelHide}
          onMouseLeave={hide}
          onClick={onClick}
          style={{
            position: 'fixed',
            top: rect.top,
            left: rect.left,
            height: rect.height,
            minWidth: rect.width,
            zIndex: 9999,
            background: 'var(--surface)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '0 16px',
            cursor: 'pointer',
          }}
          className={isActive ? activeClass : 'text-slate-200 bg-white/5'}
        >
          <span className="flex-shrink-0">{icon}</span>
          <span className="text-sm whitespace-nowrap">{label}</span>
        </div>
      )}
    </>
  )
})

export default ExpandableSidebarItem
