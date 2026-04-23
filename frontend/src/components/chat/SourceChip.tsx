import React from 'react'
import type { ChunkSource } from '@/lib/types'

interface SourceChipProps {
  source: ChunkSource
}

export function SourceChip({ source }: SourceChipProps) {
  return (
    <div className="relative group" title={source.excerpt}>
      <span className="inline-flex items-center gap-1 bg-amber/5 border border-amber/20
                       rounded-full px-2 py-0.5 font-mono text-[10px] text-amber/80
                       cursor-help hover:bg-amber/10 transition-colors">
        <span className="w-1.5 h-1.5 rounded-full bg-amber/60" />
        chunk {source.chunkIndex + 1}
        {source.score !== undefined && (
          <span className="text-amber/40">· {(source.score * 100).toFixed(0)}%</span>
        )}
      </span>
      {/* Tooltip */}
      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10
                      bg-surface border border-border rounded-lg px-3 py-2
                      font-mono text-[10px] text-prose w-[260px] leading-[1.5] shadow-xl">
        "{source.excerpt}{source.excerpt.length >= 200 ? '…' : ''}"
      </div>
    </div>
  )
}
