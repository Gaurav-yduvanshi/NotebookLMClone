// Utility to call the Next.js API route (which proxies to the backend)
// and read the SSE stream token-by-token.

export interface StreamChatOptions {
  body: {
    userId: string
    noteId: string
    message: string
    history: { role: 'user' | 'assistant'; content: string }[]
  }
  signal?: AbortSignal
  onToken: (token: string) => void
  onSources: (sources: { chunkIndex: number; excerpt: string; score?: number }[]) => void
  onDone: () => void
  onError: (err: string) => void
}

export async function streamChat(opts: StreamChatOptions) {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  let doneCalled = false

  try {
    const res = await fetch('/api/notes/chat', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts.body),
      signal: opts.signal,
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      opts.onError(json.message ?? 'Chat request failed')
      return
    }

    if (!res.body) {
      opts.onError('Chat stream is unavailable')
      return
    }

    reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') {
          opts.onDone()
          doneCalled = true
          return
        }

        try {
          const event = JSON.parse(raw) as
            | { type: 'token'; value: string }
            | { type: 'sources'; value: { chunkIndex: number; excerpt: string; score?: number }[] }
            | { type: 'error'; message: string }

          if (event.type === 'token') opts.onToken(event.value)
          if (event.type === 'sources') opts.onSources(event.value)
          if (event.type === 'error') opts.onError(event.message)
        } catch {
          // non-JSON line, ignore
        }
      }
    }

    opts.onDone()
    doneCalled = true
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return
    }
    const message = err instanceof Error ? err.message : 'Chat stream failed'
    opts.onError(message)
  } finally {
    try {
      await reader?.cancel()
    } catch {
      // Ignore cleanup failures
    }

    if (!doneCalled && opts.signal?.aborted) {
      // Intentionally aborted by user; avoid surfacing as error.
      return
    }
  }
}
