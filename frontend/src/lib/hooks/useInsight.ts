'use client'
import { useState, useEffect, useCallback } from 'react'
import { getInsight, generateInsight } from '@/lib/api'
import type { InsightType, InsightStatus } from '@/lib/types'

export function useInsight(type: InsightType, userId: string, noteId: string) {
  const [content, setContent] = useState<string | null>(null)
  const [status, setStatus] = useState<InsightStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  // Fetch cached value on mount
  useEffect(() => {
    if (!userId || !noteId) return
    getInsight(type, userId, noteId)
      .then(c => { if (c) { setContent(c); setStatus('cached') } })
      .catch(() => { }) // 404 = not generated yet, stay idle
  }, [type, userId, noteId])

  // Generate (PUT) — synchronous, may take several seconds
  const generate = useCallback(async () => {
    setStatus('generating')
    setError(null)

    if (!userId || !noteId) {
      setError('Missing user or note context')
      setStatus('error')
      return
    }

    try {
      const c = await generateInsight(type, userId, noteId)
      setContent(c)
      setStatus('cached')
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Generation failed'
      setError(msg)
      setStatus('error')
    }
  }, [type, userId, noteId])

  return { content, status, error, generate }
}
