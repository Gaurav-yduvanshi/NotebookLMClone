'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createNote, getDriveFiles } from '@/lib/api'
import type { DriveFile, Note } from '@/lib/types'

interface DrivePickerProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onNoteCreated: (note: Note) => void
}

type PickerView = 'files' | 'import' | 'success' | 'authError' | 'fetchError' | 'empty'

export function DrivePicker({ isOpen, onClose, userId, onNoteCreated }: DrivePickerProps) {
  const router = useRouter()
  const dropInputRef = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<PickerView>('files')
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DriveFile | null>(null)
  const [dropFile, setDropFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [createdNote, setCreatedNote] = useState<Note | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    getDriveFiles()
      .then(r => {
        setFiles(r.data)
        setView(r.data.length === 0 ? 'empty' : 'files')
      })
      .catch((e: any) => {
        const status = e.response?.status
        setView(status === 401 || status === 403 ? 'authError' : 'fetchError')
      })
      .finally(() => setLoading(false))
  }, [])

  const fetchFiles = () => {
    setLoading(true)
    getDriveFiles()
      .then(r => {
        setFiles(r.data)
        setView(r.data.length === 0 ? 'empty' : 'files')
      })
      .catch((e: any) => {
        const status = e.response?.status
        setView(status === 401 || status === 403 ? 'authError' : 'fetchError')
      })
      .finally(() => setLoading(false))
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleDropFile(file)
  }

  const handleDropFile = async (file: File) => {
    setDropFile(file)
    setUploading(true)
    setUploadError(null)

    try {
      const res = await createNote(file, userId)
      setCreatedNote(res.data.note)
      setView('success')
      onNoteCreated(res.data.note)
    } catch (e: any) {
      setUploadError(e.response?.data?.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleReconnect = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
    const authOrigin = (() => {
      try {
        return new URL(apiUrl).origin
      } catch {
        return 'http://localhost:8000'
      }
    })()

    window.location.href = `${authOrigin}/auth/google`
  }

  const handleBrowse = () => {
    dropInputRef.current?.click()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-base/85 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 4 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl w-[480px] max-w-[95vw] flex flex-col overflow-hidden max-h-[85vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M6.5 14.5L2 7.5 6.5 0h7L18 7.5 13.5 14.5z" fill="#4285F4" opacity=".4" />
              <path d="M2 7.5L6.5 14.5H18L13.5 7.5z" fill="#34A853" opacity=".6" />
              <path d="M6.5 0L2 7.5 6.5 14.5 13.5 7.5z" fill="#FBBC05" opacity=".8" />
            </svg>
            <span className="font-fraunces font-semibold text-[16px] text-cream">Google Drive</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-cream font-mono text-[18px] leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-10 shimmer rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 shimmer rounded" />
                  <div className="h-2 w-1/3 shimmer rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : view === 'authError' ? (
          <div className="flex flex-col items-center justify-center py-12 px-8 gap-4 text-center">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path
                d="M42 24.5c0-1.4-.1-2.6-.4-3.8H24v7.2h10.3c-.5 2.7-2 5-4.2 6.6v5.5h6.8c4-3.7 6.3-9.1 6.3-15.5Z"
                fill="#9a9a9a"
              />
              <path
                d="M24 44c5.4 0 9.9-1.8 13.2-4.9l-6.8-5.5c-1.8 1.2-4 1.9-6.4 1.9-4.9 0-9.1-3.3-10.6-7.7H6.3v5.7C9.7 39.6 16.3 44 24 44Z"
                fill="#9a9a9a"
              />
              <path
                d="M13.4 27.8a13.2 13.2 0 0 1 0-8.8v-5.7H6.3a22 22 0 0 0 0 20.2l7.1-5.7Z"
                fill="#9a9a9a"
              />
              <path
                d="M24 11.4c2.9 0 5.4 1 7.4 2.9l5.5-5.5C33.8 5.5 29.3 3.7 24 3.7 16.3 3.7 9.7 8.1 6.3 14.7l7.1 5.7C14.9 14.7 19.1 11.4 24 11.4Z"
                fill="#9a9a9a"
              />
            </svg>
            <h3 className="font-fraunces text-lg text-cream">Drive access required</h3>
            <p className="font-mono text-[12px] text-muted leading-[1.6]">Re-authenticate with Google to access your Drive files.</p>
            <button
              onClick={handleReconnect}
              className="bg-amber text-base font-inter font-medium text-sm px-5 h-[36px] flex items-center rounded-lg hover:bg-amber/90 transition-colors"
            >
              Reconnect Google
            </button>
          </div>
        ) : view === 'fetchError' ? (
          <div className="flex flex-col items-center py-12 px-8 gap-4 text-center">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <circle cx="24" cy="24" r="20" stroke="#d94b4b" strokeWidth="2" />
              <path d="M24 14v14" stroke="#d94b4b" strokeWidth="3" strokeLinecap="round" />
              <circle cx="24" cy="32.5" r="1.8" fill="#d94b4b" />
            </svg>
            <h3 className="font-fraunces text-lg text-cream">Couldn't load files</h3>
            <p className="font-mono text-[12px] text-muted">Something went wrong fetching your Drive.</p>
            <button
              onClick={fetchFiles}
              className="border border-border text-muted font-mono text-[12px] px-5 h-[36px] rounded-lg hover:text-prose hover:border-[#3a3835] transition-colors"
            >
              Try again
            </button>
          </div>
        ) : view === 'empty' ? (
          <div className="flex flex-col items-center py-12 px-8 gap-3 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 8.5A2.5 2.5 0 0 1 5.5 6h3l2 2h8A2.5 2.5 0 0 1 21 10.5v7A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z"
                stroke="#7a726a"
                strokeWidth="1.5"
              />
            </svg>
            <h3 className="font-fraunces text-lg text-cream">No files found</h3>
            <p className="font-mono text-[11px] text-muted">No files found in your Google Drive.</p>
          </div>
        ) : view === 'import' && selected ? (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3 bg-base rounded-xl px-4 py-3 border border-border">
              <FileIcon mimeType={selected.mimeType} />
              <div className="min-w-0">
                <p className="font-mono text-[12px] text-cream truncate">{selected.name}</p>
                <p className="font-mono text-[10px] text-muted">Open this file in Drive, download it, then drop it below</p>
              </div>
              <a
                href={selected.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto font-mono text-[11px] text-amber hover:underline flex-shrink-0"
              >
                Open ↗
              </a>
            </div>

            <div
              onDragOver={e => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={handleBrowse}
              className={`border-2 border-dashed rounded-xl h-[100px] flex flex-col items-center justify-center cursor-pointer transition-all gap-2 ${
                dragging ? 'border-amber bg-amber/5' : 'border-border hover:border-[#3a3835] bg-base'
              }`}
            >
              <p className="font-mono text-[12px] text-muted">Drop the file here</p>
              <p className="font-mono text-[10px] text-[#4a4845]">or click to browse</p>
              <input
                ref={dropInputRef}
                type="file"
                accept=".txt,.pdf"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleDropFile(file)
                }}
              />
            </div>

            {dropFile && !uploading && view === 'import' && (
              <p className="font-mono text-[11px] text-muted text-center">Ready to upload {dropFile.name}</p>
            )}

            {uploadError && <p className="font-mono text-[11px] text-error text-center">{uploadError}</p>}

            {uploading && (
              <div className="space-y-2">
                <div className="h-1 bg-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-amber rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '85%' }}
                    transition={{ duration: 2, ease: 'easeOut' }}
                  />
                </div>
                <p className="font-mono text-[11px] text-muted text-center">Processing document…</p>
              </div>
            )}

            <button
              onClick={() => {
                setSelected(null)
                setDropFile(null)
                setUploadError(null)
                setDragging(false)
                setView('files')
              }}
              className="font-mono text-[11px] text-muted hover:text-cream underline text-center"
            >
              ← Back to file list
            </button>
          </div>
        ) : view === 'success' ? (
          <div className="flex flex-col items-center py-10 px-8 gap-4 text-center">
            <motion.svg width="56" height="56" viewBox="0 0 56 56" fill="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <circle cx="28" cy="28" r="26" stroke="#34a853" strokeWidth="1" strokeOpacity=".4" fill="#34a85310" />
              <motion.path
                d="M16 28l8 8 16-16"
                stroke="#34a853"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </motion.svg>
            <h3 className="font-fraunces text-xl text-cream">Note created!</h3>
            <p className="font-mono text-[12px] text-amber">{createdNote?.title}</p>
            <button
              onClick={() => {
                if (createdNote) {
                  onClose()
                  router.push('/notes/' + createdNote._id)
                }
              }}
              className="bg-amber text-base font-inter font-medium text-sm px-6 h-[40px] rounded-lg hover:bg-amber/90 transition-colors"
            >
              Open Note →
            </button>
            <button onClick={onClose} className="font-mono text-[11px] text-muted hover:text-prose underline">
              Stay on dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto flex-1">
              {files.map((file, i) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-3 px-5 py-3 border-b border-border/50 hover:bg-base/60 transition-colors cursor-default ${
                    i === files.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <FileIcon mimeType={file.mimeType} />

                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[12px] text-cream truncate">{file.name}</p>
                    <p className="font-mono text-[10px] text-muted">{mimeLabel(file.mimeType)}</p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-[#4a4845] hover:text-muted transition-colors"
                      title="Open in Google Drive"
                    >
                      ↗
                    </a>
                    <button
                      onClick={() => {
                        setSelected(file)
                        setDropFile(null)
                        setUploadError(null)
                        setView('import')
                      }}
                      className="font-mono text-[11px] text-amber hover:underline transition-colors"
                    >
                      Import →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-border flex-shrink-0">
              <p className="font-mono text-[10px] text-[#2a2825] text-center">Showing up to 10 files · Pagination not supported</p>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const color = mimeType === 'application/pdf' ? '#ea4335' : mimeType === 'text/plain' ? '#6b6560' : '#b88320'

  return (
    <svg width="24" height="28" viewBox="0 0 24 28" aria-hidden="true">
      <rect width="24" height="28" rx="3" fill={color} fillOpacity=".15" stroke={color} strokeOpacity=".4" strokeWidth=".5" />
      <rect x="5" y="10" width="14" height="2" rx="1" fill={color} fillOpacity=".6" />
      <rect x="5" y="14" width="10" height="2" rx="1" fill={color} fillOpacity=".4" />
    </svg>
  )
}

function mimeLabel(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType === 'text/plain') return 'Text'
  return 'File'
}
