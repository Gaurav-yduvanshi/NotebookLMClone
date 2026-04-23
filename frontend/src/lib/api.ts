import axios from 'axios'
import type { Note, DriveFile, Pagination, InsightType } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_URL?.replace('/api/v1', '') || 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,      // session cookie MUST be sent on every request
  headers: { 'Content-Type': 'application/json' },
})

export const authApi = axios.create({
  baseURL: AUTH_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

export const logoutUser = () => authApi.post('/auth/logout')

// ── Notes ───────────────────────────────────────────────────────────────
export const getNotes = (page: number, search: string) =>
  api.get<{ notes: Note[]; pagination: Pagination }>('/notes', { params: { page, search } })

export const getNoteById = (id: string) =>
  api.get<Note>(`/notes/${id}`).then(res => res.data)

export const createNote = (file: File, userId: string) => {
  const fd = new FormData()
  fd.append('doc', file)
  fd.append('userId', userId)
  return api.post<{ note: Note }>('/notes', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const updateNoteTitle = (id: string, title: string) =>
  api.put<{ updatedNote: Note }>('/notes', { id, title })

// ── Insights ─────────────────────────────────────────────────────────────
const ENDPOINT: Record<InsightType, string> = {
  summary:       '/notes/summary',
  studyGuide:    '/notes/studyGuide',
  mindMap:       '/notes/mindMap',
  faq:           '/notes/faq',
  'briefing-doc':'/notes/briefing-doc',
}

const RESPONSE_KEY: Record<InsightType, string> = {
  summary:       'summary',
  studyGuide:    'studyGuide',
  mindMap:       'mindMap',
  faq:           'faq',
  'briefing-doc':'briefingDoc',
}

export const getInsight = async (type: InsightType, userId: string, noteId: string) => {
  console.log(`Fetching ${type} for note ${noteId} and user ${userId}`)
  const res = await api.get<Record<string, string>>(ENDPOINT[type], {
    params: { userId, noteId },
  })
  return res.data[RESPONSE_KEY[type]] ?? null
}

export const generateInsight = async (type: InsightType, userId: string, noteId: string) => {
  const res = await api.put<Record<string, string>>(ENDPOINT[type], { userId, noteId })
  return res.data[RESPONSE_KEY[type]] ?? null
}

// ── Drive ────────────────────────────────────────────────────────────────
export const getDriveFiles = () => api.get<DriveFile[]>('/users/files')
