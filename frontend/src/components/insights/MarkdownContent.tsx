'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownContentProps {
  content: string
  allowCopyAndDownload?: boolean
}

export function MarkdownContent({ content, allowCopyAndDownload = false }: MarkdownContentProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'briefing-doc.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relative">
      {allowCopyAndDownload && (
        <div className="flex items-center gap-2 absolute -top-14 right-0 z-10">
          <button
            onClick={handleCopy}
            className="border border-border text-muted font-mono text-xs px-3 h-[28px] rounded hover:text-prose hover:border-[#3a3835] transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="border border-border text-muted font-mono text-xs px-3 h-[28px] rounded hover:text-prose hover:border-[#3a3835] transition-colors flex items-center gap-1"
          >
            Download .md
          </button>
        </div>
      )}

      <div className="font-inter text-[15px] text-prose leading-[1.85] space-y-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="font-fraunces text-xl text-cream mt-6 mb-3">{children}</h1>,
            h2: ({ children }) => <h2 className="font-fraunces text-lg text-cream mt-5 mb-2 border-l-2 border-amber pl-3">{children}</h2>,
            h3: ({ children }) => <h3 className="font-mono text-sm text-amber mt-4 mb-1">{children}</h3>,
            strong: ({ children }) => <strong className="text-cream font-medium">{children}</strong>,
            code: ({ children }) => <code className="bg-surface text-amber font-mono text-sm px-1.5 py-0.5 rounded">{children}</code>,
            ul: ({ children }) => <ul className="list-disc pl-5 space-y-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2">{children}</ol>,
            li: ({ children }) => <li className="pl-1">{children}</li>,
            blockquote: ({ children }) => <blockquote className="border-l-4 border-[#3a3835] pl-4 italic opacity-80">{children}</blockquote>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
