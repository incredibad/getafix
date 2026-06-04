import { useState, useRef, useCallback } from 'react'

const STORAGE_KEY = 'footrack:sidebar:filter_width'
const MIN_W = 200
const MAX_W = 500
const DEFAULT_W = 250

export function useSidebarResize() {
  const [width, setWidth] = useState(() => {
    const stored = parseInt(localStorage.getItem(STORAGE_KEY), 10)
    return isNaN(stored) ? DEFAULT_W : Math.min(Math.max(stored, MIN_W), MAX_W)
  })

  const currentWidth = useRef(width)

  const onResizeStart = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = currentWidth.current

    const onMouseMove = (e) => {
      const next = Math.min(Math.max(startW + e.clientX - startX, MIN_W), MAX_W)
      currentWidth.current = next
      setWidth(next)
    }

    const onMouseUp = () => {
      localStorage.setItem(STORAGE_KEY, String(currentWidth.current))
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  return { width, onResizeStart }
}
