import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (localStorage.getItem('getafix:settings:disable_sofascore') === 'true') {
    config.headers['X-Disable-Sofascore'] = 'true'
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = !!localStorage.getItem('token')
      localStorage.removeItem('token')
      if (hadToken && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/setup')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

export function streamCompFixtures(params, { onBatch, onDone, onError, signal } = {}) {
  const token = localStorage.getItem('token')
  const qs = new URLSearchParams({
    name: params.name,
    days_back: params.days_back ?? 90,
    days_ahead: params.days_ahead ?? 365,
    ...(params.sofascore_id != null ? { sofascore_id: params.sofascore_id } : {}),
  })

  fetch(`/api/fixtures/by-competition/stream?${qs}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  }).then(async (response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let pendingEventType = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line === '') {
          pendingEventType = null
          continue
        }
        if (line.startsWith('event: ')) {
          pendingEventType = line.slice(7).trim()
          if (pendingEventType === 'done') { onDone?.(); return }
          continue
        }
        if (line.startsWith('data: ')) {
          if (pendingEventType === 'done') { onDone?.(); return }
          try {
            const fixtures = JSON.parse(line.slice(6))
            if (Array.isArray(fixtures) && fixtures.length > 0) onBatch?.(fixtures)
          } catch {}
        }
      }
    }
    onDone?.()
  }).catch((err) => {
    if (err.name !== 'AbortError') onError?.(err)
  })
}
