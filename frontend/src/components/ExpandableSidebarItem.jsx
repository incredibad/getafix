import { useState, useRef, useCallback, useEffect, forwardRef } from 'react'
import { createPortal } from 'react-dom'

const ExpandableSidebarItem = forwardRef(function ExpandableSidebarItem(
  { onClick, icon, label, isActive },
  ref
) {
  const [rect, setRect] = useState(null)
  const btnRef = useRef(null)
  const overlayRef = useRef(null)
  const hideTimer = useRef(null)
  const suppressShow = useRef(false)
  const suppressTimer = useRef(null)

  const setRefs = useCallback((node) => {
    btnRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }, [ref])

  const show = () => {
    if (suppressShow.current) return
    clearTimeout(hideTimer.current)
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
  }

  const hide = () => {
    hideTimer.current = setTimeout(() => setRect(null), 60)
  }

  const cancelHide = () => clearTimeout(hideTimer.current)

  useEffect(() => () => {
    clearTimeout(hideTimer.current)
    clearTimeout(suppressTimer.current)
  }, [])

  // Wheel events on the portalled overlay bubble to document.body, not the scroll
  // container. Forward them manually and suppress re-show so the overlay doesn't
  // immediately reappear (onMouseEnter fires on the button once the overlay hides).
  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay || !rect) return

    let scrollEl = btnRef.current?.parentElement
    while (scrollEl) {
      const { overflowY } = window.getComputedStyle(scrollEl)
      if (overflowY === 'auto' || overflowY === 'scroll') break
      scrollEl = scrollEl.parentElement
    }
    if (!scrollEl) return

    const handler = (e) => {
      const multiplier = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? scrollEl.clientHeight : 1
      scrollEl.scrollTop += e.deltaY * multiplier
      e.preventDefault()
      // Suppress re-show for 300ms so onMouseEnter on the newly exposed button
      // doesn't immediately bring the overlay back
      suppressShow.current = true
      clearTimeout(suppressTimer.current)
      suppressTimer.current = setTimeout(() => { suppressShow.current = false }, 300)
      clearTimeout(hideTimer.current)
      setRect(null)
    }
    overlay.addEventListener('wheel', handler, { passive: false })
    return () => overlay.removeEventListener('wheel', handler)
  }, [rect])

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

      {rect && createPortal(
        <div
          ref={overlayRef}
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
        </div>,
        document.body
      )}
    </>
  )
})

export default ExpandableSidebarItem
