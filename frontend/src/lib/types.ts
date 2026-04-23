export interface Note {
  _id: string
  title: string
  image: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink: string
}

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export type InsightType = 'summary' | 'studyGuide' | 'mindMap' | 'faq' | 'briefing-doc'
export type InsightStatus = 'idle' | 'generating' | 'cached' | 'error'

export interface InsightState {
  content: string | null
  status: InsightStatus
  error: string | null
}

// Chat types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: ChunkSource[]
  createdAt: Date
}

export interface ChunkSource {
  chunkIndex: number
  excerpt: string   // short snippet from the matching chunk
  score?: number    // cosine similarity score from Pinecone
}

export interface ChatRequest {
  userId: string
  noteId: string
  message: string
  history: { role: 'user' | 'assistant'; content: string }[]
}
