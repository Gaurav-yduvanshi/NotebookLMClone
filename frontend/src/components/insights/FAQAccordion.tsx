'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function parseFAQ(raw: string): { q: string; a: string }[] {
  const text = raw.replace(/\r\n/g, '\n').trim()
  const items: { q: string; a: string }[] = []

  // Format 1: Q1 / A1
  let pattern = /(?:^|\n)\s*(?:\*\*)?Q\d*:\s*(.*?)\s*(?:\*\*)?\s*\n\s*(?:\*\*)?A\d*:\s*(.*?)(?=\n\s*(?:\*\*)?Q\d*:\s*|\s*$)/gms
  for (const match of text.matchAll(pattern)) {
    const q = match[1].replace(/\*\*/g, '').trim()
    const a = match[2].replace(/\*\*/g, '').trim()
    if (q && a) items.push({ q, a })
  }
  if (items.length > 0) return items

  // Format 2: current markdown output
  // 1. **What are roll numbers?**
  //    Roll numbers are ...
  pattern = /(?:^|\n)\s*\d+\.\s*\*\*(.*?)\*\*\s*(?:\n+)(.*?)(?=\n\s*\d+\.\s*\*\*|\s*$)/gms
  for (const match of text.matchAll(pattern)) {
    const q = match[1].replace(/\*\*/g, '').trim()
    const a = match[2].replace(/\*\*/g, '').trim()
    if (q && a) items.push({ q, a })
  }
  if (items.length > 0) return items

  // Format 3: fallback for bullet-style or plain blocks
  const blocks = text.split(/\n(?=\s*\d+\.\s*\*\*)/g).filter(Boolean)
  return blocks
    .map(block => {
      const lines = block.split('\n').map(line => line.trim()).filter(Boolean)
      const qLine = lines[0] ?? ''
      const q = qLine.replace(/^\d+\.\s*\*\*/,'').replace(/\*\*$/,'').trim()
      const a = lines.slice(1).join(' ').replace(/\*\*/g, '').trim()
      return { q, a }
    })
    .filter(item => item.q && item.a)
}

interface FAQAccordionProps {
  data: string
}

export function FAQAccordion({ data }: FAQAccordionProps) {
  const items = parseFAQ(data)
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  if (items.length === 0) {
    return (
      <div className="text-muted font-mono text-xs">
        No valid FAQs found in content.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div key={i} className="border border-border rounded-xl overflow-hidden bg-[#0a0908]">
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center justify-between px-5 py-4 font-mono text-[13px] text-cream hover:bg-surface/60 transition-colors text-left"
            >
              <span className="pr-4">{item.q}</span>
              <motion.span 
                animate={{ rotate: isOpen ? 180 : 0 }}
                className="text-amber flex-shrink-0"
              >
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                  <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.span>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-0 font-inter text-[14px] text-prose leading-[1.8] bg-[#0a0908]">
                    {item.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
