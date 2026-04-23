# NotebookLM Clone — API Specification

**Base URL:** `http://localhost:8000/api/v1`  
**Auth:** Session cookie (`connect.sid`) required on all routes except the OAuth flow.  
**Content-Type:** `application/json` unless noted as `multipart/form-data`.

---

## Table of Contents
1. [Authentication](#1-authentication)
2. [Notes (CRUD)](#2-notes-crud)
3. [AI Insights](#3-ai-insights)
   - 3.1 Summary
   - 3.2 Study Guide
   - 3.3 FAQ
   - 3.4 Briefing Doc
   - 3.5 Mind Map
4. [RAG Chat (Streaming SSE)](#4-rag-chat-streaming-sse)
5. [Google Drive](#5-google-drive)
6. [Data Models](#6-data-models)
7. [Error Responses](#7-error-responses)
8. [SSE Event Reference](#8-sse-event-reference)

---

## 1. Authentication

### `GET /auth/google`
Initiates Google OAuth 2.0 flow. Redirects the browser to Google's consent screen.

**Scopes requested:** `profile`, `email`, `https://www.googleapis.com/auth/drive.readonly`

---

### `GET /auth/google/callback`
OAuth callback handled by Passport.js. Creates or upserts the user in MongoDB, establishes a session, and redirects to the frontend dashboard.

> This route is internal — the redirect URI must match `CALLBACK_URL` in `.env`.

---

### `GET /auth/me`
Returns the currently authenticated user from the session.

**Response `200`**
```json
{
  "_id": "664abc123...",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "image": "https://lh3.googleusercontent.com/..."
}
```

**Response `401`** — not authenticated
```json
{ "message": "Unauthorized" }
```

---

### `POST /auth/logout`
Destroys the current session.

**Response `200`**
```json
{ "message": "Logged out" }
```

---

## 2. Notes (CRUD)

### `POST /notes`
Upload a PDF and create a new note workspace. Triggers:
- LangChain PDF parsing & AI title generation (GPT-4o-mini)
- Background Agenda.js job to generate and save a DALL-E cover image
- MongoDB `Note` + `Doc` document creation

**Content-Type:** `multipart/form-data`

**Request Body**
| Field | Type | Required | Description |
|---|---|---|---|
| `doc` | `File` (PDF) | ✅ | The PDF file to upload |
| `userId` | `string` | ✅ | Authenticated user's MongoDB `_id` |

**Response `201`**
```json
{
  "message": "Note created successfully",
  "note": {
    "_id": "664abc123...",
    "title": "Introduction to Machine Learning",
    "image": "http://localhost:8000/uploads/1714123456789-123456789.png",
    "userId": "664user789...",
    "createdAt": "2026-04-21T06:00:00.000Z",
    "updatedAt": "2026-04-21T06:00:00.000Z"
  }
}
```

> **Note:** The `image` URL will initially be a pre-calculated placeholder URL. The actual DALL-E generated image is written to disk asynchronously by the background job.

**Response `400`**
```json
{ "message": "No file uploaded" }
{ "message": "User ID is required" }
```

---

### `GET /notes`
Returns a paginated, searchable list of all notes.

**Query Parameters**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | `number` | `10` | Page number (1-indexed) |
| `search` | `string` | `""` | Case-insensitive title search |

**Response `200`**
```json
{
  "notes": [
    {
      "_id": "664abc123...",
      "title": "Introduction to Machine Learning",
      "image": "http://localhost:8000/uploads/cover.png",
      "userId": "664user789...",
      "createdAt": "2026-04-21T06:00:00.000Z",
      "updatedAt": "2026-04-21T06:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

### `GET /notes/:id`
Fetch a single note's metadata by its MongoDB `_id`.

**Path Parameters**
| Parameter | Description |
|---|---|
| `id` | MongoDB ObjectId of the note |

**Response `200`**
```json
{
  "_id": "664abc123...",
  "title": "Introduction to Machine Learning",
  "image": "http://localhost:8000/uploads/cover.png",
  "userId": "664user789...",
  "createdAt": "2026-04-21T06:00:00.000Z",
  "updatedAt": "2026-04-21T06:00:00.000Z"
}
```

**Response `404`**
```json
{ "message": "Note not found" }
```

---

### `PUT /notes`
Update a note's title.

**Request Body**
```json
{
  "id": "664abc123...",
  "title": "Updated Title"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | ✅ | MongoDB `_id` of the note |
| `title` | `string` | ✅ | New title |

**Response `200`**
```json
{
  "message": "Note updated successfully",
  "updatedNote": {
    "_id": "664abc123...",
    "title": "Updated Title",
    "image": "...",
    "userId": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

## 3. AI Insights

All insight endpoints follow the same pattern:

| Method | Endpoint | Action |
|---|---|---|
| `GET` | `/notes/<insight>` | Fetch cached insight from DB |
| `PUT` | `/notes/<insight>` | Generate (or regenerate) and persist the insight |

> The `PUT` endpoints are **idempotent** — they always overwrite the previously stored value.

---

### 3.1 Summary

#### `GET /notes/summary`
Retrieve a cached document summary.

**Query Parameters**
| Parameter | Type | Required |
|---|---|---|
| `userId` | `string` | ✅ |
| `noteId` | `string` | ✅ |

**Response `200`**
```json
{ "summary": "This document covers the fundamentals of..." }
```

**Response `200` (not yet generated)**
```json
{ "summary": null }
```

---

#### `PUT /notes/summary`
Generate a summary from the uploaded PDF using LangChain + GPT-4o-mini and persist it.

**Request Body**
```json
{
  "userId": "664user789...",
  "noteId": "664abc123..."
}
```

| Field | Type | Required |
|---|---|---|
| `userId` | `string` | Optional (falls back to doc's stored userId) |
| `noteId` | `string` | ✅ |

**Response `200`**
```json
{
  "message": "summary generated successfully",
  "summary": "This document covers..."
}
```

---

### 3.2 Study Guide

#### `GET /notes/studyGuide`
**Query:** `userId`, `noteId`

**Response `200`**
```json
{ "studyGuide": "## Key Concepts\n\n..." }
```

---

#### `PUT /notes/studyGuide`
**Body:** `{ userId, noteId }`

**Response `200`**
```json
{
  "message": "Study Guide generated successfully",
  "studyGuide": "## Key Concepts\n\n..."
}
```

> ⚠️ **The Mind Map depends on this.** Generate the Study Guide before generating the Mind Map.

---

### 3.3 FAQ

#### `GET /notes/faq`
**Query:** `userId`, `noteId`

**Response `200`**
```json
{ "faq": "**Q: What is supervised learning?**\n\nA: ..." }
```

---

#### `PUT /notes/faq`
**Body:** `{ userId, noteId }`

**Response `200`**
```json
{
  "message": "FAQ generated successfully",
  "faq": "**Q: What is supervised learning?**\n\nA: ..."
}
```

---

### 3.4 Briefing Doc

#### `GET /notes/briefing-doc`
**Query:** `userId`, `noteId`

**Response `200`**
```json
{ "briefingDoc": "# Executive Briefing\n\n..." }
```

---

#### `PUT /notes/briefing-doc`
**Body:** `{ userId, noteId }`

**Response `200`**
```json
{
  "message": "briefing document generated successfully",
  "briefingDoc": "# Executive Briefing\n\n..."
}
```

---

### 3.5 Mind Map

**🔒 Prerequisite:** `studyGuide` (or `briefingDoc`) must be generated first. The backend reads `doc.studyGuide || doc.briefingDoc` as source text.

#### `GET /notes/mindMap`
**Query:** `userId`, `noteId`

**Response `200`**
```json
{ "mindMap": "{\"root\":{\"id\":\"root\",\"label\":\"ML\",\"children\":[...]}}" }
```

The value is a JSON string. Parse it to get the mind map tree.

---

#### `PUT /notes/mindMap`
**Body:** `{ userId, noteId }`

**Response `200`**
```json
{
  "mindMap": "{\"root\":{\"id\":\"root\",\"label\":\"ML\",\"children\":[...]}}"
}
```

**Response `500`** if Study Guide / Briefing Doc not yet generated:
```json
{ "message": "Study Guide or Briefing Doc not found" }
```

---

## 4. RAG Chat (Streaming SSE)

### `POST /notes/chat`
Starts a streaming RAG chat session scoped to a specific note's Pinecone vectors.

**Pipeline:**
1. Embed `message` with Cohere `embed-english-v3.0`
2. Query Pinecone `topK=6`, filtered by `noteId`
3. Build prompt from retrieved chunks + conversation history
4. Stream GPT-4o response as Server-Sent Events
5. Send source citations after stream completes

**Request Body**
```json
{
  "userId": "664user789...",
  "noteId": "664abc123...",
  "message": "What are the main types of neural networks?",
  "history": [
    { "role": "user", "content": "What is machine learning?" },
    { "role": "assistant", "content": "Machine learning is..." }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | ✅ | Authenticated user ID |
| `noteId` | `string` | ✅ | Pinecone filter key |
| `message` | `string` | ✅ | Current user message |
| `history` | `array` | ❌ | Up to last 8 turns (older turns dropped, truncated to 3 000 chars each) |

**Response Headers**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**SSE Event Stream**

The response is a stream of `data:` lines. See [Section 8](#8-sse-event-reference) for full event shapes.

```
data: {"type":"token","value":"Neural"}

data: {"type":"token","value":" networks"}

data: {"type":"token","value":" are..."}

data: {"type":"sources","value":[{"chunkIndex":0,"excerpt":"Neural networks consist of...","score":0.92}]}

data: [DONE]
```

**Response `400`**
```json
{ "message": "userId, noteId, and message are required" }
```

---

> **Frontend proxy:** The Next.js frontend calls `/api/notes/chat` (a Next.js API route) which proxies the SSE stream to the backend. The `streamChat()` utility in `src/lib/streamChat.ts` handles all SSE parsing.

---

## 5. Google Drive

### `GET /users/files`
Lists the authenticated user's Google Drive files (up to 10).

**Auth requirement:** User must have connected Google account with Drive scope.

**Response `200`**
```json
[
  {
    "id": "1BxiMVs0XRA...",
    "name": "Research Paper.pdf",
    "mimeType": "application/pdf",
    "webViewLink": "https://drive.google.com/file/d/..."
  }
]
```

**Response `401`**
```json
{ "message": "No google access token found" }
```

**Response `403`** — missing Drive scope
```json
{
  "message": "Google Drive permission missing. Reconnect your Google account to grant Drive access.",
  "code": "GOOGLE_DRIVE_SCOPE_MISSING"
}
```

---

## 6. Data Models

### User
```typescript
{
  _id:                ObjectId
  name:               string          // required
  email:              string          // required, unique
  image?:             string          // Google profile picture URL
  googleId:           string          // required
  googleAccessToken?: string
  googleRefreshToken?: string
  createdAt:          Date
  updatedAt:          Date
}
```

### Note
```typescript
{
  _id:       ObjectId
  title:     string    // required — AI-generated from first PDF chunk
  image?:    string    // DALL-E generated cover URL (written async)
  userId:    ObjectId  // ref: User
  createdAt: Date
  updatedAt: Date
}
```

### Doc
```typescript
{
  _id:          ObjectId
  title:        string    // required — mirrors Note.title
  fileName:     string    // required — stored filename in public/uploads/
  description?: string
  summary?:     string    // AI-generated, stored after PUT /notes/summary
  studyGuide?:  string    // AI-generated, stored after PUT /notes/studyGuide
  briefingDoc?: string    // AI-generated, stored after PUT /notes/briefing-doc
  FAQ?:         string    // AI-generated, stored after PUT /notes/faq
  mindMap?:     string    // JSON string, stored after PUT /notes/mindMap
  noteId:       ObjectId  // ref: Note
  userId:       ObjectId  // ref: User
  createdAt:    Date
  updatedAt:    Date
}
```

---

## 7. Error Responses

All error responses follow a consistent shape:

```json
{ "message": "Human-readable error description" }
```

| Status | Meaning |
|---|---|
| `400` | Bad request — missing or invalid fields |
| `401` | Unauthenticated — no valid session |
| `403` | Forbidden — insufficient OAuth scopes |
| `404` | Resource not found |
| `500` | Internal server error |

---

## 8. SSE Event Reference

The `/notes/chat` endpoint streams events in the [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) format.

Each line starts with `data: ` followed by a JSON payload.

### Token Event
Emitted for every streamed GPT-4o output token.
```json
{ "type": "token", "value": "the next token string" }
```

### Sources Event
Emitted **once** after the full response is streamed, containing Pinecone chunk citations.
```json
{
  "type": "sources",
  "value": [
    {
      "chunkIndex": 0,
      "excerpt": "First 200 characters of the matched chunk...",
      "score": 0.9234
    }
  ]
}
```

### Error Event
Emitted if something goes wrong mid-stream.
```json
{ "type": "error", "message": "Description of the error" }
```

### Done Signal
The literal string `[DONE]` marks the end of the stream.
```
data: [DONE]
```

---

## Frontend API Client Reference

The frontend `src/lib/api.ts` wraps all backend calls:

```typescript
// Notes
getNotes(page, search)          // GET /notes
getNoteById(id)                 // GET /notes/:id
createNote(file, userId)        // POST /notes (multipart)
updateNoteTitle(id, title)      // PUT /notes

// Insights (type: 'summary' | 'studyGuide' | 'mindMap' | 'faq' | 'briefing-doc')
getInsight(type, userId, noteId)      // GET /notes/<type>
generateInsight(type, userId, noteId) // PUT /notes/<type>

// Drive
getDriveFiles()                 // GET /users/files

// Auth
logoutUser()                    // POST /auth/logout (via authApi)
```

Streaming chat is handled separately via `src/lib/streamChat.ts` using the Fetch API (not Axios) to support readable streams.
