import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { Note } from '@/lib/types'

const GRADIENTS = [
  'from-amber/20 to-surface', 'from-green-900/30 to-surface',
  'from-blue-900/30 to-surface', 'from-red-900/20 to-surface',
  'from-purple-900/20 to-surface', 'from-teal-900/20 to-surface'
]

export function NoteCard({ note, onRename }: { note: Note; onRename: (id: string, title: string) => void }) {
  const router = useRouter()
  const [imageFailed, setImageFailed] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [titleInput, setTitleInput] = useState(note.title)
  const [kebabOpen, setKebabOpen] = useState(false)

  const hash = note._id ? note._id.charCodeAt(note._id.length - 1) % GRADIENTS.length : 0
  const gradientClass = GRADIENTS[hash]
  const formattedDate = new Date(note.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  const handleCardClick = () => {
    if (!isEditing && !kebabOpen) router.push(`/notes/${note._id}`)
  }

  const handleRenameSubmit = () => {
    setIsEditing(false)
    if (titleInput.trim() && titleInput !== note.title) {
      onRename(note._id, titleInput)
    } else {
      setTitleInput(note.title)
    }
  }

  return (
    <div 
      onClick={handleCardClick}
      className="bg-surface border border-border rounded-xl overflow-hidden cursor-pointer group hover:border-[#3a3835] hover:scale-[1.01] transition-all duration-200 relative flex flex-col h-full min-h-[160px]"
    >
      <div className="relative h-[96px] w-full shrink-0">
        {note.image && !imageFailed ? (
          <Image 
            src={note.image} 
            alt={note.title} 
            fill 
            className="object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradientClass}`}>
            <div className="w-full h-full opacity-30 shimmer" />
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col relative">
        <div 
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseEnter={() => setKebabOpen(true)}
          onMouseLeave={() => setKebabOpen(false)}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="text-muted hover:text-cream px-1">···</button>
          {kebabOpen && (
            <div className="absolute right-0 mt-1 w-24 bg-[#0a0908] border border-border rounded-md shadow-lg py-1 z-10">
              <button 
                className="w-full text-left px-3 py-1 font-inter text-xs text-cream hover:bg-surface"
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); setKebabOpen(false) }}
              >
                Rename
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <input 
            autoFocus
            className="bg-transparent border-b border-amber focus:outline-none font-fraunces text-cream text-[14px] w-[85%] mb-auto"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="font-fraunces text-[14px] text-cream line-clamp-2 mb-auto pr-6">
            {note.title}
          </p>
        )}
        <p className="font-mono text-[10px] text-[#4a4845] mt-2">{formattedDate}</p>
      </div>
    </div>
  )
}
