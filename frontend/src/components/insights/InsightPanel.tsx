import React from 'react'
import { Badge } from '@/components/ui/Badge'
import type { InsightStatus } from '@/lib/types'

interface InsightPanelProps {
  title: string
  status: InsightStatus
  onGenerate: () => void
  children: React.ReactNode
}

export function InsightPanel({ title, status, onGenerate, children }: InsightPanelProps) {
  let subtext = ''
  if (status === 'cached') subtext = 'AI-generated · Cached'
  else if (status === 'generating') subtext = 'Generating…'
  else if (status === 'error') subtext = 'Generation failed'
  else subtext = 'Not yet generated'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-2">
        <h2 className="font-fraunces font-semibold text-2xl text-cream">{title}</h2>
        <p className="font-mono text-[11px] text-muted mt-1">{subtext}</p>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <Badge status={status} />

        {status === 'idle' || status === 'error' ? (
          <button
            onClick={onGenerate}
            className="bg-amber text-[#0c0b0a] font-inter font-medium text-sm px-4 h-[36px] rounded-lg hover:bg-amber/90 transition-colors"
          >
            Generate
          </button>
        ) : status === 'cached' ? (
          <button
            onClick={onGenerate}
            className="border border-border text-muted font-mono text-xs px-4 h-[36px] rounded-lg hover:text-prose hover:border-[#3a3835] transition-colors"
          >
            Regenerate
          </button>
        ) : (
          <button disabled className="bg-amber/50 text-[#0c0b0a]/50 font-inter font-medium text-sm px-4 h-[36px] rounded-lg flex items-center gap-2 cursor-not-allowed">
            <span className="w-3 h-3 border-2 border-[#0c0b0a]/50 border-t-transparent rounded-full animate-spin" />
            Generating
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-2 pb-8">
        {children}
      </div>
    </div>
  )
}
