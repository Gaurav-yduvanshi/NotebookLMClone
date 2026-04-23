import React, { useEffect, useRef } from 'react'

interface ChatInputProps {
  input: string
  setInput: (val: string) => void
  handleSend: () => void
  streaming: boolean
  stopStream: () => void
}

export function ChatInput({ input, setInput, handleSend, streaming, stopStream }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus input on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <div className="w-full">
      <div className="flex gap-3 items-end">
        <div className="flex-1 bg-surface border border-border rounded-xl
                        focus-within:border-amber/50 focus-within:ring-1 focus-within:ring-amber/20
                        transition-all overflow-hidden">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              // Auto-resize
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask anything about this document…"
            disabled={streaming}
            rows={1}
            className="w-full bg-transparent px-4 py-3 font-mono text-[13px] text-cream
                       placeholder:text-[#3a3835] resize-none outline-none leading-[1.6]
                       disabled:opacity-50"
            style={{ minHeight: '44px', maxHeight: '140px' }}
          />
        </div>

        {/* Send / Stop button */}
        <button
          onClick={streaming ? stopStream : handleSend}
          disabled={!streaming && !input.trim()}
          aria-busy={streaming ? "true" : "false"}
          className={`w-[44px] h-[44px] rounded-xl flex items-center justify-center flex-shrink-0
                      transition-all duration-150
                      ${streaming
                        ? 'bg-error/20 border border-error/30 hover:bg-error/30'
                        : 'bg-amber hover:bg-amber/90 disabled:opacity-30 disabled:cursor-not-allowed'}`}
        >
          {streaming ? (
            /* Stop square icon */
            <div className="w-3 h-3 rounded-sm bg-error" />
          ) : (
            /* Send arrow SVG */
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 2L2 8l4 2 2 4 6-12z" fill="#0c0b0a" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      <div className="flex justify-between mt-2 px-1">
        <span className="font-mono text-[10px] text-[#2a2825]">
          Enter to send · Shift+Enter for newline
        </span>
        {streaming && (
          <span className="font-mono text-[10px] text-amber animate-pulse">
            Generating…
          </span>
        )}
      </div>
    </div>
  )
}
