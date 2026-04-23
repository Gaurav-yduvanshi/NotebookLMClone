import React from 'react'

const SUGGESTED = [
  'What is the main topic of this document?',
  'What are the key takeaways?',
  'Explain the most important concept in simple terms.',
  'What questions does this document answer?',
  'Summarise this in 3 bullet points.',
]

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void
  disabled?: boolean
}

export function SuggestedQuestions({ onSelect, disabled }: SuggestedQuestionsProps) {
  return (
    <div className="space-y-2 mt-4">
      {SUGGESTED.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect(q)}
          disabled={disabled}
          className="w-full text-left font-mono text-[11px] text-[#6b6560]
                     bg-surface hover:bg-[#1f1e1c] border border-border hover:border-[#3a3835]
                     rounded-lg px-3 py-2 transition-colors duration-150 leading-[1.4]
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {q}
        </button>
      ))}
    </div>
  )
}
