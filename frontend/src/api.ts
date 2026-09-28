const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>
}

interface DeadlineListParams {
  status?: string
  category?: string
  archived?: boolean
  search?: string
}

interface ReminderListParams {
  due?: boolean
  deadline_id?: number
}

async function request(path: string, options: RequestOptions = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = body.detail || JSON.stringify(body)
    } catch (_) { /* noop */ }
    throw new Error(detail)
  }
  if (res.status === 204) return null
  return res.json()
}

export interface ChatMessage {
  id: number
  session_id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export interface ChatSession {
  id: number
  user_id?: number
  title: string
  created_at: string
  updated_at: string
  last_message_excerpt?: string
  message_count: number
  messages?: ChatMessage[]
}

// ── Sources ───────────────────────────────────────────────────────
export const api = {
  sources: {
    list:    ()                          => request('/api/sources'),
    get:     (id: number)                => request(`/api/sources/${id}`),
    create:  (data: unknown)             => request('/api/sources', { method: 'POST', body: JSON.stringify(data) }),
    update:  (id: number, data: unknown) => request(`/api/sources/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete:  (id: number)                => request(`/api/sources/${id}`, { method: 'DELETE' }),
    fetch:   (id: number)                => request(`/api/sources/${id}/fetch`, { method: 'POST' }),
    history: (id: number, limit?: number) => request(`/api/sources/${id}/history${limit ? `?limit=${limit}` : ''}`),
  },

  // ── Deadlines ──────────────────────────────────────────────────
  deadlines: {
    list: (params: DeadlineListParams = {}) => {
      const q = new URLSearchParams()
      if (params.status)   q.set('status',   params.status)
      if (params.category) q.set('category', params.category)
      if (params.archived) q.set('archived', 'true')
      if (params.search)   q.set('search',   params.search)
      return request(`/api/deadlines${q.toString() ? '?' + q : ''}`)
    },
    get:     (id: number)                => request(`/api/deadlines/${id}`),
    create:  (data: unknown)             => request('/api/deadlines', { method: 'POST', body: JSON.stringify(data) }),
    update:  (id: number, data: unknown) => request(`/api/deadlines/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    confirm: (id: number)                => request(`/api/deadlines/${id}/confirm`, { method: 'POST' }),
    dismiss: (id: number)                => request(`/api/deadlines/${id}/dismiss`, { method: 'POST' }),
    delete:  (id: number)                => request(`/api/deadlines/${id}`, { method: 'DELETE' }),
  },

  // ── Reminders ─────────────────────────────────────────────────
  reminders: {
    list: (params: ReminderListParams = {}) => {
      const q = new URLSearchParams()
      if (params.due)         q.set('due',         'true')
      if (params.deadline_id) q.set('deadline_id', String(params.deadline_id))
      return request(`/api/reminders${q.toString() ? '?' + q : ''}`)
    },
    create:   (data: unknown)             => request('/api/reminders', { method: 'POST', body: JSON.stringify(data) }),
    update:   (id: number, data: unknown) => request(`/api/reminders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    markSent: (id: number)                => request(`/api/reminders/${id}/mark-sent`, { method: 'POST' }),
    delete:   (id: number)                => request(`/api/reminders/${id}`, { method: 'DELETE' }),
  },

  // ── Settings ──────────────────────────────────────────────────
  settings: {
    get:    ()               => request('/api/settings'),
    update: (data: unknown)  => request('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // ── Chat ──────────────────────────────────────────────────────
  chat: {
    listSessions:  ()                           => request('/api/chat/sessions'),
    createSession: (title?: string)            => request('/api/chat/sessions', { method: 'POST', body: JSON.stringify({ title: title || 'New Chat' }) }),
    getSession:    (id: number)                 => request(`/api/chat/sessions/${id}`),
    updateSession: (id: number, title: string)  => request(`/api/chat/sessions/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
    deleteSession: (id: number)                 => request(`/api/chat/sessions/${id}`, { method: 'DELETE' }),
    sendMessage:   (sessionId: number, text: string) => request(`/api/chat/sessions/${sessionId}/messages`, { method: 'POST', body: JSON.stringify({ content: text }) }),
  },

  // ── Health ────────────────────────────────────────────────────
  health: () => request('/api/health'),
}
