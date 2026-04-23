'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { streamChat } from '@/lib/streamChat'
import type { ChatMessage } from '@/lib/types'

const MAX_CLIENT_MESSAGES = 60
const MAX_HISTORY_FOR_REQUEST = 12
const TOKEN_FLUSH_INTERVAL_MS = 40

const capMessages = (items: ChatMessage[]) =>
  items.length > MAX_CLIENT_MESSAGES ? items.slice(-MAX_CLIENT_MESSAGES) : items

export function useChat(userId: string, noteId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesRef = useRef<ChatMessage[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const activeAssistantIdRef = useRef<string | null>(null)
  const pendingTokenRef = useRef('')
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const flushPendingTokens = useCallback(() => {
    const assistantId = activeAssistantIdRef.current
    if (!assistantId) return

    const pending = pendingTokenRef.current
    if (!pending) return

    pendingTokenRef.current = ''

    setMessages(prev => capMessages(prev.map(m =>
      m.id === assistantId ? { ...m, content: m.content + pending } : m
    )))
  }, [])

  const stopStream = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }

    flushPendingTokens()
    abortRef.current?.abort()
    abortRef.current = null
    activeAssistantIdRef.current = null
    setStreaming(false)
  }, [flushPendingTokens])

  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [stopStream])

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || streaming) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText,
      createdAt: new Date(),
    }

    const assistantId = crypto.randomUUID()
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      sources: [],
      createdAt: new Date(),
    }

    const priorHistory = messagesRef.current
      .slice(-MAX_HISTORY_FOR_REQUEST)
      .map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => capMessages([...prev, userMsg, assistantMsg]))
    setStreaming(true)
    setError(null)

    activeAssistantIdRef.current = assistantId
    pendingTokenRef.current = ''
    const controller = new AbortController()
    abortRef.current = controller

    await streamChat({
      body: { userId, noteId, message: userText, history: priorHistory },
      signal: controller.signal,
      onToken: (token) => {
        pendingTokenRef.current += token

        if (flushTimerRef.current) return

        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null
          flushPendingTokens()
        }, TOKEN_FLUSH_INTERVAL_MS)
      },
      onSources: (sources) => {
        setMessages(prev => capMessages(prev.map(m =>
          m.id === assistantId ? { ...m, sources } : m
        )))
      },
      onDone: () => {
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current)
          flushTimerRef.current = null
        }
        flushPendingTokens()
        abortRef.current = null
        activeAssistantIdRef.current = null
        setStreaming(false)
      },
      onError: (err) => {
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current)
          flushTimerRef.current = null
        }
        pendingTokenRef.current = ''
        setError(err)
        setStreaming(false)
        abortRef.current = null
        activeAssistantIdRef.current = null
        setMessages(prev => prev.filter(m => m.id !== assistantId))
      },
    })
  }, [flushPendingTokens, streaming, userId, noteId])

  const clearHistory = useCallback(() => {
    stopStream()
    pendingTokenRef.current = ''
    setMessages([])
  }, [stopStream])

  return { messages, streaming, error, sendMessage, clearHistory, stopStream }
}
