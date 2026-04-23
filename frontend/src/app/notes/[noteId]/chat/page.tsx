'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/providers/UserProvider'
import { useChat } from '@/lib/hooks/useChat'
import { getNoteById } from '@/lib/api'
import type { Note } from '@/lib/types'
import { SuggestedQuestions } from '@/components/chat/SuggestedQuestions'
import { ChatMessage } from '@/components/chat/ChatMessage'
import { ChatInput } from '@/components/chat/ChatInput'

export default function ChatPage() {
  const router = useRouter()
  const { noteId } = useParams<{ noteId: string }>()
  const auth = useCurrentUser()
  const user = auth?.user
  
  const [note, setNote] = useState<Note | null>(null)

  const { messages, streaming, error, sendMessage, clearHistory, stopStream } = useChat(
    user?._id ?? '',
    noteId
  )

  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (noteId) {
      getNoteById(noteId).then(setNote).catch(console.error)
    }
  }, [noteId])

  const handleSend = () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    sendMessage(text)
  }

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex h-screen bg-base overflow-hidden">
      {/* Left sidebar */}
      <div className="w-[260px] bg-deep border-r border-border flex flex-col p-4 flex-shrink-0">
        <div>
          <button
            onClick={() => router.push(`/notes/${noteId}`)}
            className="font-mono text-[11px] text-muted hover:text-prose transition-colors flex items-center gap-2"
          >
            ← Back to workspace
          </button>
          <h2 className="font-fraunces font-semibold text-[15px] text-cream mt-3 line-clamp-2 leading-snug">
            {note?.title || 'Loading Note...'}
          </h2>
        </div>

        <div className="h-px bg-border my-4" />

        <div className="font-mono text-[10px] text-[#4a4845] space-y-1">
          <div className="flex justify-between">
            <span>Vector store</span>
            <span className="text-amber">Pinecone</span>
          </div>
          <div className="flex justify-between">
            <span>Embeddings</span>
            <span className="text-amber">Cohere</span>
          </div>
          <div className="flex justify-between">
            <span>LLM</span>
            <span className="text-amber">OpenAI</span>
          </div>
          <div className="flex justify-between">
            <span>Top-K chunks</span>
            <span className="text-[#6b6560]">6</span>
          </div>
        </div>

        <div className="h-px bg-border my-4" />

        <div className="flex-1 overflow-y-auto pr-2">
           <SuggestedQuestions 
             onSelect={(q) => sendMessage(q)} 
             disabled={streaming} 
           />
        </div>

        {messages.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={clearHistory}
              className="font-mono text-[10px] text-muted hover:text-error transition-colors"
            >
              Clear history
            </button>
          </div>
        )}

        <div className="mt-3">
          <button
            onClick={async () => {
              if (auth?.logout) {
                await auth.logout()
              }
              router.push('/')
            }}
            className="font-mono text-[10px] text-muted hover:text-error transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-base min-w-0">
        {/* Header */}
        <div className="border-b border-border px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-baseline gap-2">
            <h1 className="font-fraunces font-semibold text-[20px] text-cream">Chat</h1>
            <span className="font-mono text-[11px] text-muted">with doc</span>
          </div>
          <span className="font-mono text-[10px] bg-amber/10 text-amber border border-amber/20 rounded-full px-3 py-1">
            RAG · {streaming ? 'streaming' : 'ready'}
          </span>
        </div>

        {/* Message list */}
        <div 
          className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6"
          ref={undefined}
          aria-label="Chat message list"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-amber/50">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 5h18A2 2 0 0123 7v10a2 2 0 01-2 2h-4l-5 5-5-5H3a2 2 0 01-2-2V7a2 2 0 012-2zM9 10h.01M15 10h.01M12 10h.01" />
              </svg>
              <h2 className="font-fraunces text-2xl text-cream">Ask anything</h2>
              <p className="font-mono text-[12px] text-muted max-w-[320px] leading-[1.6]">
                Your questions are answered using only this document's content,
                grounded by vector search across all embedded chunks.
              </p>
            </div>
          ) : (
            messages.map((m, i) => {
              const isLast = i === messages.length - 1
              const streamingThisMsg = streaming && m.role === 'assistant' && isLast
              return (
                <ChatMessage key={m.id} message={m} isStreaming={streamingThisMsg} />
              )
            })
          )}
          
          {error && (
            <div className="flex items-center gap-3 bg-error/5 border border-error/20 rounded-xl px-4 py-3 mx-auto w-full max-w-[78%]">
              <span className="text-error font-mono text-[12px]">✕ {error}</span>
            </div>
          )}
          <div ref={bottomRef} className="h-px shrink-0" />
        </div>

        {/* Chat input */}
        <div className="border-t border-border px-8 py-5 flex-shrink-0">
          <ChatInput
            input={input}
            setInput={setInput}
            handleSend={handleSend}
            streaming={streaming}
            stopStream={stopStream}
          />
        </div>
      </div>
    </div>
  )
}
