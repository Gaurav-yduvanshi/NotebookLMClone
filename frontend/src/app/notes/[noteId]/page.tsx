'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { getNoteById, updateNoteTitle } from '@/lib/api'
import { useInsight } from '@/lib/hooks/useInsight'
import type { InsightType, Note } from '@/lib/types'
import { useCurrentUser } from '@/providers/UserProvider'
import { InsightPanel } from '@/components/insights/InsightPanel'
import { MarkdownContent } from '@/components/insights/MarkdownContent'
import { MindMapViewer } from '@/components/insights/MindMapViewer'
import { FAQAccordion } from '@/components/insights/FAQAccordion'
import { Badge } from '@/components/ui/Badge'

type TabId = 'summary' | 'studyGuide' | 'mindMap' | 'faq' | 'briefing-doc' | 'chat'

const TABS: { id: TabId; label: string; insightType?: InsightType }[] = [
  { id: 'summary',      label: 'Summary',      insightType: 'summary'       },
  { id: 'studyGuide',   label: 'Study guide',  insightType: 'studyGuide'    },
  { id: 'mindMap',      label: 'Mind map',     insightType: 'mindMap'       },
  { id: 'faq',          label: 'FAQ',          insightType: 'faq'           },
  { id: 'briefing-doc', label: 'Briefing doc', insightType: 'briefing-doc'  },
  { id: 'chat',         label: 'Chat with doc' },
]

export default function NoteWorkspace() {
  const { noteId } = useParams<{ noteId: string }>()
  const router = useRouter()

  // Note Metadata State
  const [note, setNote] = useState<Note | null>(null)
  const [titleInput, setTitleInput] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  // Insights State
  const auth = useCurrentUser()
  const user = auth?.user
  const userId = user?._id ?? ''

  const insightsRecords = {
    summary: useInsight('summary', userId, noteId),
    studyGuide: useInsight('studyGuide', userId, noteId),
    mindMap: useInsight('mindMap', userId, noteId),
    faq: useInsight('faq', userId, noteId),
    'briefing-doc': useInsight('briefing-doc', userId, noteId),
  }

  const [activeTab, setActiveTab] = useState<TabId>('summary')

  useEffect(() => {
    getNoteById(noteId).then(n => {
      setNote(n)
      setTitleInput(n.title)
    }).catch(console.error)
  }, [noteId])

  // Global Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault()
        const tab = TABS.find(t => t.id === activeTab)
        if (tab?.insightType) {
          insightsRecords[tab.insightType].generate()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTab, insightsRecords])

  const handleTitleSubmit = async () => {
    setIsEditingTitle(false)
    if (titleInput.trim() && note && titleInput !== note.title) {
      const prevTitle = note.title
      setNote({ ...note, title: titleInput })
      try {
        await updateNoteTitle(noteId, titleInput)
      } catch (err) {
        setNote({ ...note, title: prevTitle })
        setTitleInput(prevTitle)
      }
    } else if (note) {
      setTitleInput(note.title)
    }
  }

  const handleTabClick = (tabId: TabId) => {
    if (tabId === 'chat') {
      router.push(`/notes/${noteId}/chat`)
      return
    }
    setActiveTab(tabId)
  }

  const StatusDot = ({ status }: { status: string }) => {
    if (status === 'cached') return <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
    if (status === 'generating') {
      return (
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-2 h-2 rounded-full bg-amber flex-shrink-0"
        />
      )
    }
    if (status === 'error') return <div className="w-2 h-2 rounded-full bg-error flex-shrink-0" />
    return <div className="w-2 h-2 rounded-full border border-border flex-shrink-0" />
  }

  const renderPanel = (tabId: TabId) => {
    const tabMeta = TABS.find(t => t.id === tabId)
    if (!tabMeta || !tabMeta.insightType) return null
    const insight = insightsRecords[tabMeta.insightType]
    const isMindMapTab = tabId === 'mindMap'

    if (isMindMapTab) {
      const isLocked = insightsRecords.studyGuide.status !== 'cached'
      const statusText = insight.status === 'cached'
        ? 'AI-generated · Cached'
        : insight.status === 'generating'
          ? 'Generating…'
          : insight.status === 'error'
            ? 'Generation failed'
            : 'Not yet generated'

      return (
        <div className="flex h-full min-h-0 flex-col">
          <div className="mb-2">
            <h2 className="font-fraunces font-semibold text-2xl text-cream">{tabMeta.label}</h2>
            <p className="font-mono text-[11px] text-muted mt-1">{statusText}</p>
          </div>

          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <Badge status={insight.status} />

            {insight.status === 'idle' || insight.status === 'error' ? (
              <button
                onClick={insight.generate}
                className="bg-amber text-[#0c0b0a] font-inter font-medium text-sm px-4 h-[36px] rounded-lg hover:bg-amber/90 transition-colors"
              >
                Generate
              </button>
            ) : insight.status === 'cached' ? (
              <button
                onClick={insight.generate}
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

          <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border bg-surface">
            {isLocked ? (
              <div className="flex h-full min-h-[420px] items-center justify-center px-6 py-10">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  <div className="text-amber text-[48px]">🔒</div>
                  <h3 className="font-fraunces text-xl text-cream">Mind map locked</h3>
                  <p className="font-inter text-sm text-muted text-center max-w-[280px]">
                    Generate a Study Guide first to unlock the Mind Map.
                  </p>
                  <button
                    onClick={() => setActiveTab('studyGuide')}
                    className="bg-amber text-[#0c0b0a] font-inter font-medium text-sm px-4 h-[36px] rounded-lg"
                  >
                    Go to Study Guide
                  </button>
                </div>
              </div>
            ) : insight.content ? (
              <div className="h-full min-h-0 p-0">
                <MindMapViewer data={insight.content} />
              </div>
            ) : (
              <div className="flex h-full min-h-[420px] items-center justify-center text-muted font-mono text-sm px-6 text-center">
                Generate the mind map to begin.
              </div>
            )}
          </div>
        </div>
      )
    }

    // Empty state (idle)
    if (insight.status === 'idle') {
      return (
        <InsightPanel title={tabMeta.label} status={insight.status} onGenerate={insight.generate}>
          <div className="flex flex-col items-center justify-center h-[360px] gap-4">
            <p className="font-fraunces text-xl text-cream">No {tabMeta.label} yet</p>
            <p className="font-mono text-[12px] text-muted">Generate to get started</p>
            <button
              onClick={insight.generate}
              className="bg-amber text-[#0c0b0a] font-inter font-medium text-sm px-6 h-[40px] rounded-lg mt-2"
            >
              Generate
            </button>
          </div>
        </InsightPanel>
      )
    }

    return (
      <InsightPanel title={tabMeta.label} status={insight.status} onGenerate={insight.generate}>
        {insight.content && (
          <div className="animate-in fade-in duration-500 pb-12">
            {tabId === 'studyGuide' && (
              <div className="flex items-center gap-2 bg-amber/5 border border-amber/20 rounded-lg px-4 py-2 mb-4">
                <span className="text-amber text-[11px] font-mono">⚠ Required before generating Mind Map</span>
              </div>
            )}
            
            {(tabId === 'summary' || tabId === 'studyGuide' || tabId === 'briefing-doc') && (
              <MarkdownContent 
                content={insight.content} 
                allowCopyAndDownload={tabId === 'briefing-doc'} 
              />
            )}
            
            {tabId === 'faq' && <FAQAccordion data={insight.content} />}
          </div>
        )}
      </InsightPanel>
    )
  }

  return (
    <>
      {/* Sidebar */}
      <div className="w-[280px] bg-[#0c0b0a] border-r border-border flex flex-col pt-6 pb-4">
        <div className="px-5 mb-4 shrink-0">
          <button 
            onClick={() => router.push('/dashboard')}
            className="font-mono text-[11px] text-muted hover:text-cream flex items-center gap-1.5 transition-colors"
          >
            <span>←</span> Back
          </button>
        </div>

        <div className="px-5 mb-4 shrink-0">
          <div className="relative w-full h-[140px] rounded-lg overflow-hidden mt-3 bg-surface border border-border shrink-0">
            {note?.image && !imageFailed ? (
              <Image 
                src={note.image} 
                alt={note.title || 'Cover'} 
                fill 
                unoptimized  
                className="object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber/20 to-surface">
                <div className="w-full h-full opacity-30 shimmer" />
              </div>
            )}
          </div>

          <div className="mt-3 min-h-[72px]">
            {isEditingTitle ? (
              <textarea
                autoFocus
                className="w-full bg-transparent border-b border-amber focus:outline-none font-fraunces text-cream text-[16px] resize-none overflow-hidden"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleTitleSubmit()
                  }
                }}
                rows={3}
              />
            ) : (
              <h2 
                onDoubleClick={() => setIsEditingTitle(true)}
                className="font-fraunces font-semibold text-[16px] text-cream line-clamp-3 leading-snug cursor-text"
              >
                {note?.title || 'Loading...'}
              </h2>
            )}
            {note && (
              <p className="font-mono text-[10px] text-[#4a4845] mt-1.5">
                Created {new Date(note.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="h-px bg-border my-4 shrink-0 mx-5" />

        {/* Tab list */}
        <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-1 pb-4">
          {TABS.map(tab => {
            const insightMeta = tab.insightType ? insightsRecords[tab.insightType] : null
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full h-[44px] flex items-center gap-3 px-3 shrink-0 text-left
                            font-mono text-[12px] rounded-lg transition-colors duration-150 relative
                            ${activeTab === tab.id
                              ? 'bg-amber/10 text-amber'
                              : 'text-[#4a4845] hover:bg-surface hover:text-[#8a8580]'}`}
              >
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full transition-colors ${
                  activeTab === tab.id ? 'bg-amber' : 'bg-transparent'
                }`} />

                <span className="flex-1 ml-2">{tab.label}</span>

                {insightMeta && <StatusDot status={insightMeta.status} />}

                {tab.id === 'mindMap' && insightsRecords.studyGuide.status !== 'cached' && (
                  <span title="Generate Study Guide first" className="text-[10px] opacity-70">🔒</span>
                )}

                {tab.id === 'chat' && <span className="text-[10px]">→</span>}
              </button>
            )
          })}
        </div>

        <div className="px-5 shrink-0 mt-auto pt-4 border-t border-border">
          <div className="flex flex-col gap-2">
            <button className="font-mono text-[11px] text-amber hover:underline text-left">
              Import from Drive
            </button>
            <button
              onClick={async () => {
                if (auth?.logout) {
                  await auth.logout()
                }
                router.push('/')
              }}
              className="font-mono text-[11px] text-muted hover:text-error text-left transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#0c0b0a] overflow-hidden relative border-l border-border/30 shadow-[inset_1px_0_10px_rgba(0,0,0,0.5)]">
        <div className={`w-full h-full ${activeTab === 'mindMap' ? 'max-w-none px-8 lg:px-12 py-8' : 'max-w-[760px] mx-auto p-8 lg:p-12'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderPanel(activeTab)}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}
