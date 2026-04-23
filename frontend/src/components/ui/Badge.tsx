import React from 'react'

export type BadgeStatus = 'cached' | 'generating' | 'idle' | 'error'

export function Badge({ status }: { status: BadgeStatus }) {
  if (status === 'cached') {
    return (
      <span className="flex items-center gap-1.5 bg-success/10 text-success border border-success/30 font-mono text-[11px] rounded-full px-3 py-1">
        ✓ Cached
      </span>
    )
  }

  if (status === 'generating') {
    return (
      <span className="flex items-center gap-1.5 bg-amber/10 text-amber border border-amber/30 font-mono text-[11px] rounded-full px-3 py-1">
        <span className="animate-pulse">●</span> Generating…
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5 bg-error/10 text-error border border-error/30 font-mono text-[11px] rounded-full px-3 py-1">
        ✕ Error
      </span>
    )
  }

  // idle
  return (
    <span className="flex items-center gap-1.5 bg-surface text-[#4a4845] border border-border font-mono text-[11px] rounded-full px-3 py-1">
      ○ Not generated
    </span>
  )
}
