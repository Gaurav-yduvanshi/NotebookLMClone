import React from 'react'
import type { ChatMessage as ChatMessageType } from '@/lib/types'
import { MarkdownContent } from '@/components/insights/MarkdownContent'
import { SourceChip } from './SourceChip'
import { motion } from 'framer-motion'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[65%] bg-amber/10 border border-amber/20 rounded-xl rounded-tr-sm
                        px-4 py-3 font-mono text-[13px] text-[#c8a855] leading-[1.6]">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 max-w-[78%]">
      {/* AI avatar dot */}
      <div className="w-6 h-6 rounded-full bg-amber/20 border border-amber/30 flex items-center
                      justify-center flex-shrink-0 mt-1">
        <div className="w-2 h-2 rounded-full bg-amber" />
      </div>

      <div className="flex flex-col gap-2 flex-1">
        <div className="bg-surface border border-border rounded-xl rounded-tl-sm
                        px-4 py-3 font-inter text-[14px] text-prose leading-[1.75]">
          
          {isStreaming && message.content === '' ? (
            <div className="flex gap-1.5 items-center">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-amber/60"
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                />
              ))}
            </div>
          ) : (
            <>
              <MarkdownContent content={message.content} />
              {isStreaming && (
                <span className="inline-block w-[2px] h-[14px] bg-amber ml-0.5 align-middle cursor-blink" />
              )}
            </>
          )}

        </div>

        {/* Source chips — shown after streaming completes */}
        {!isStreaming && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="font-mono text-[10px] text-[#4a4845] pt-0.5">Sources:</span>
            {message.sources.map((src, i) => (
              <SourceChip key={i} source={src} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
