// This Next.js Route Handler proxies the chat request to the Express backend
// and forwards the SSE stream through to the browser.
// This avoids CORS issues and keeps the backend URL server-side.

import { NextRequest } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Forward the session cookie from the browser to the backend
  const cookie = req.headers.get('cookie') ?? ''

  const upstream = await fetch(`${BACKEND}/notes/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  })

  if (!upstream.ok) {
    const text = await upstream.text()
    return new Response(text, { status: upstream.status })
  }

  // Stream the SSE response straight through
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
