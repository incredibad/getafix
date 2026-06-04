import { useState, useRef, useCallback } from 'react'

const STORAGE_KEY = 'footrack:sidebar:filter_width'
const MIN_W = 200
const MAX_W = 500
const DEFAULT_W = 250
const EDGE_PX = 6  // px from right border that activates resize cursor

export function useSidebarResize() {
  const [width, setWidth] = useState(() => {
    const stored = parseInt(localStorage.getItem(STORAGE_KEY), 10)
    return isNaN(stored) ? DEFAULT_W : Math.min(Math.max(stored, MIN_W), MAX_W)
  })

  const [nearEdge, setNearEdge] = useState(false)
  const currentWidth = useRef(width)

  const onMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setNearEdge(e.clientX >= rect.right - EDGE_PX)
  }, [])

  const onMouseLeave = useCallback(() => setNearEdge(false), [])

  const onMouseDown = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (e.clientX < rect.right - EDGE_PX) return
    const startX = e.clientX
    const startW = currentWidth.current

    const onMove = (e) => {
      const next = Math.min(Math.max(startW + e.clientX - startX, MIN_W), MAX_W)
      currentWidth.current = next
      setWidth(next)
    }

    const onUp = () => {
      localStorage.setItem(STORAGE_KEY, String(currentWidth.current))
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  return { width, nearEdge, onMouseMove, onMouseLeave, onMouseDown }
}
