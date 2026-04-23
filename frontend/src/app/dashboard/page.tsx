'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getNotes, createNote, updateNoteTitle } from '@/lib/api'
import { useCurrentUser } from '@/providers/UserProvider'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { NoteCard } from '@/components/notes/NoteCard'
import { DrivePicker } from '@/components/DrivePicker'
import { useToast, Toaster } from '@/components/ui/Toast'
import type { Note } from '@/lib/types'

export default function DashboardPage() {
  const router = useRouter()
  const auth = useCurrentUser()
  const user = auth?.user
  const { toast } = useToast()
  
  const [notes, setNotes]             = useState<Note[]>([])
  const [pagination, setPagination]   = useState({ page: 1, totalPages: 1, total: 0, limit: 10 })
  const [page, setPage]               = useState(1)
  const [search, setSearch]           = useState('')
  const debouncedSearch               = useDebounce(search, 300)
  const [loading, setLoading]         = useState(true)
  
  const fileInputRef                  = useRef<HTMLInputElement>(null)
  const [uploadFile, setUploadFile]   = useState<File | null>(null)
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [driveOpen, setDriveOpen]     = useState(false)

  // Reset page when search term changes
  useEffect(() => { setPage(1) }, [debouncedSearch])

  // Automatically fetch Notes upon page load, search, or pagination update
  const fetchNotes = () => {
    setLoading(true)
    getNotes(page, debouncedSearch)
      .then(r => { 
        setNotes(r.data.notes)
        setPagination(r.data.pagination) 
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchNotes()
  }, [page, debouncedSearch])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0])
      setUploadError(null)
    }
  }

  const handleCreateNote = async () => {
    if (!uploadFile || !user?._id) return
    setUploading(true)
    setUploadError(null)
    try {
      const { data } = await createNote(uploadFile, user._id)
      setUploadFile(null)
      toast('success', 'Document uploaded successfully')
      router.push('/notes/' + data.note._id)
    } catch (e: any) {
      setUploadError(e.response?.data?.message || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleRename = async (id: string, title: string) => {
    try {
      const { data } = await updateNoteTitle(id, title)
      setNotes(notes.map(n => n._id === id ? data.updatedNote : n))
      toast('success', `Renamed to "${title}"`)
    } catch (e: any) {
      toast('error', e.response?.data?.message || 'Failed to rename')
      fetchNotes()
    }
  }

  const firstLetter = user?.name ? user.name[0].toUpperCase() : '?'

  return (
    <div className="flex w-full h-screen bg-[#0c0b0a] overflow-hidden">
      {/* Sidebar */}
      <div className="w-[64px] h-full flex flex-col items-center py-6 bg-[#0a0908] border-r border-border shrink-0 z-20 relative">
        <div className="font-fraunces font-semibold text-amber text-base mb-10">NL</div>
        
        <div className="flex flex-col gap-6 w-full items-center">
          <button className="text-amber hover:opacity-80 transition-opacity">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4h4v4H4V4zm6 0h6v4h-6V4zM4 12h6v4H4v-4zm8 0h4v4h-4v-4z"/>
            </svg>
          </button>
          
          <button onClick={() => setDriveOpen(true)} className="hover:opacity-80 transition-opacity" title="Import from Drive">
            <svg width="20" height="20" viewBox="0 0 18 18">
              <path d="M7.5 0L1 11h5.5L13 0H7.5z" fill="#FFC107"/>
              <path d="M12.5 0L6.5 11l-1 2 6 0 6-11h-5z" fill="#4CAF50"/>
              <path d="M11.5 11l-5.5 0L0.5 18h11l5-7-5 0z" fill="#2196F3"/>
            </svg>
          </button>
        </div>

        <div className="mt-auto">
          <div 
            className="flex flex-col items-center gap-2"
          >
            <div
              className="w-[36px] h-[36px] bg-surface border border-amber rounded-full flex items-center justify-center cursor-pointer pointer-events-auto"
              title={user?.name || 'Loading'}
            >
              <span className="font-fraunces font-semibold text-amber text-[14px]">{firstLetter}</span>
            </div>
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
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        {/* Topbar */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="font-fraunces font-semibold text-[22px] text-cream">Notes</h1>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="w-[240px] h-[36px] bg-surface border border-border rounded-lg pl-9 pr-3 font-mono text-[12px] text-cream placeholder-muted focus:outline-none focus:ring-1 focus:ring-amber"
              />
            </div>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="h-[36px] px-4 bg-amber text-[#0c0b0a] font-inter font-medium text-sm rounded-lg hover:opacity-90 active:scale-[0.98] transition-all whitespace-nowrap"
            >
              + Upload Doc
            </button>
            <input 
              type="file" 
              accept=".txt,.pdf" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileSelect} 
            />
          </div>
        </div>

        {/* Upload panel collapsible */}
        <AnimatePresence>
          {uploadFile && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b88320" strokeWidth="2" className="shrink-0">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <div className="flex flex-col truncate">
                    <span className="font-mono text-[12px] text-cream truncate max-w-[200px]">{uploadFile.name}</span>
                    <span className="font-mono text-[10px] text-muted">{(uploadFile.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
                
                <div className="sm:ml-auto flex items-center gap-3 self-end sm:self-auto">
                  {uploadError && <span className="font-mono text-[10px] text-error hidden md:inline">{uploadError}</span>}
                  
                  <button 
                    onClick={() => { setUploadFile(null); setUploadError(null); if (fileInputRef.current) fileInputRef.current.value = '' }} 
                    disabled={uploading}
                    className="font-mono text-[11px] text-muted hover:underline disabled:opacity-50"
                  >
                    ✕ Cancel
                  </button>
                  
                  <button 
                    onClick={handleCreateNote}
                    disabled={uploading}
                    className="h-[36px] px-5 bg-amber text-[#0c0b0a] font-inter font-medium text-sm rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                  >
                    {uploading ? (
                      <svg className="animate-spin h-4 w-4 text-[#0c0b0a]" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      "Create Note"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic States */}
        {loading && notes.length === 0 ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-border">
                <div className="h-[96px] shimmer" />
                <div className="p-3 bg-surface min-h-[64px]">
                  <div className="h-3 w-3/4 shimmer rounded mb-2" />
                  <div className="h-2 w-1/2 shimmer rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : !loading && notes.length === 0 ? (
          <div className="w-full mt-20 flex flex-col items-center justify-center">
            {search ? (
               <div className="text-center">
                <p className="font-fraunces text-cream text-[16px] mb-1">No notes matching "{search}"</p>
                <p className="font-mono text-muted text-[11px]">Try a different search</p>
               </div>
            ) : (
              <div className="text-center flex flex-col items-center">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#b88320" strokeWidth="1" className="mb-6 opacity-80">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <h2 className="font-fraunces text-[20px] text-cream mb-2">No notes yet</h2>
                <p className="font-mono text-[12px] text-muted mb-6">Upload a document to get started</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="h-[36px] px-6 bg-amber text-[#0c0b0a] font-inter font-medium text-sm rounded-lg hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Upload Doc
                </button>
              </div>
            )}
          </div>
        ) : (
          <motion.div 
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
            initial="hidden" animate="visible"
            className="grid gap-4" 
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            {notes.map(note => (
              <motion.div key={note._id} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <NoteCard note={note} onRename={handleRename} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Pagination Strip */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-12 pb-8 font-mono text-[12px]">
            <button 
              disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="text-amber disabled:text-muted disabled:cursor-not-allowed hover:underline"
            >
              ← Prev
            </button>
            <span className="text-[#4a4845]">Page {page} of {pagination.totalPages}</span>
            <button 
              disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}
              className="text-amber disabled:text-muted disabled:cursor-not-allowed hover:underline"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Global Modals/Toasts */}
      <AnimatePresence>
        {driveOpen && (
          <DrivePicker
            isOpen
            onClose={() => setDriveOpen(false)}
            userId={user?._id ?? ''}
            onNoteCreated={(note: Note) => {
              setNotes(prev => [note, ...prev])
              router.push(`/notes/${note._id}`)
            }}
          />
        )}
      </AnimatePresence>
      <Toaster />
    </div>
  )
}
