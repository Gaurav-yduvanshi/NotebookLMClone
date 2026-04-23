'use client'

import React from 'react'
import {
  Background,
  Controls,
  Edge,
  Handle,
  Node,
  Position,
  ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// Normalize mixed backend formats to react-d3-tree shape.
// Supports:
// - { "node data": { topic, children } } (MindElixir style)
// - { root, children } / { label, children }
// - string leaves inside children arrays
function transform(node: any): any {
  if (typeof node === 'string') {
    return { name: node, children: [] }
  }

  if (!node || typeof node !== 'object') {
    return { name: 'Node', children: [] }
  }

  const source = node['node data'] ?? node
  const name = source.topic ?? source.label ?? source.root ?? source.name ?? source.id ?? 'Node'
  const rawChildren = Array.isArray(source.children) ? source.children : []

  return {
    name,
    children: rawChildren.map(transform),
  }
}

interface MindMapViewerProps {
  data: string
}

const X_GAP = 250

function FullscreenIcon({ expanded }: { expanded: boolean }) {
  if (expanded) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
        <path d="M8 3H3v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 3h5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 16v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 16v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 15l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 9l6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M8 3H3v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3h5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 16v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 16v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MindNode({ data }: any) {
  return (
    <div className="rounded-lg border border-[#3a3835] bg-[#12110f] px-3 py-2 shadow-sm max-w-[220px]">
      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 6, height: 6 }} />
      <p className="font-mono text-[11px] leading-snug text-[#f5f0e8] break-words">{data?.label}</p>
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 6, height: 6 }} />
    </div>
  )
}

function countLeaves(node: any): number {
  const children = Array.isArray(node?.children) ? node.children : []
  if (children.length === 0) return 1
  return children.reduce((sum: number, child: any) => sum + countLeaves(child), 0)
}

function buildFlowGraph(root: any): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const leafCount = countLeaves(root)
  const yGap = Math.max(28, Math.min(70, Math.floor(2200 / Math.max(leafCount, 1))))

  const visit = (node: any, depth: number, topY: number, path: string, parentId?: string) => {
    const children = Array.isArray(node?.children) ? node.children : []
    const leafSpan = countLeaves(node) * yGap
    const centerY = topY + leafSpan / 2
    const nodeId = `${path}-${depth}`

    nodes.push({
      id: nodeId,
      data: { label: String(node?.name ?? 'Node') },
      position: { x: depth * X_GAP, y: centerY },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      type: 'mindNode',
    })

    if (parentId) {
      edges.push({
        id: `${parentId}->${nodeId}`,
        source: parentId,
        target: nodeId,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#b8832040', strokeWidth: 1.5 },
      })
    }

    let cursorY = topY
    children.forEach((child: any, idx: number) => {
      const childSpan = countLeaves(child) * yGap
      visit(child, depth + 1, cursorY, `${path}.${idx + 1}`, nodeId)
      cursorY += childSpan
    })
  }

  visit(root, 0, 0, 'root')

  return { nodes, edges }
}

export function MindMapViewer({ data }: MindMapViewerProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  React.useEffect(() => {
    if (!isFullscreen) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isFullscreen])

  let parsed
  try {
    parsed = JSON.parse(data)
  } catch (e) {
    return <div className="text-error font-mono text-xs">Failed to parse mind map JSON</div>
  }

  const treeData = transform(parsed)
  const { nodes, edges } = buildFlowGraph(treeData)
  const nodeTypes = React.useMemo(() => ({ mindNode: MindNode }), [])

  const containerClass = isFullscreen
    ? 'fixed inset-4 z-50 bg-surface rounded-xl border border-border shadow-2xl overflow-hidden'
    : 'relative bg-surface rounded-xl border border-border overflow-hidden w-full h-full min-h-[520px]'

  return (
    <div className={containerClass}>
      <button
        type="button"
        onClick={() => setIsFullscreen((v) => !v)}
        aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
        title={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
        className="group absolute top-3 right-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-[#12110f] text-cream transition-colors hover:border-[#4a4845] hover:bg-[#181614]"
      >
        <FullscreenIcon expanded={isFullscreen} />
        <span className="pointer-events-none absolute right-0 top-full mt-2 rounded-md border border-border bg-[#12110f] px-2 py-1 font-mono text-[10px] text-cream opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {isFullscreen ? 'Exit full screen' : 'Full screen'}
        </span>
      </button>

      <div className="w-full h-full min-h-0">
        <ReactFlow
          key={isFullscreen ? 'mindmap-fullscreen' : 'mindmap-theater'}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: isFullscreen ? 0.2 : 0.3 }}
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          style={{ background: '#161513' }}
          defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#b8832040', strokeWidth: 1.5 } }}
        >
          <Controls showInteractive={false} />
          <Background color="#2a2825" gap={20} size={1} />
        </ReactFlow>
      </div>
    </div>
  )
}
