import { ChatOpenAI } from "@langchain/openai";
import { CohereEmbeddings } from "@langchain/cohere";
import { Pinecone } from "@pinecone-database/pinecone";
import { Request, Response } from "express";

const HISTORY_LIMIT = 8;
const MAX_HISTORY_ITEM_CHARS = 3000;
const MAX_CONTEXT_CHUNK_CHARS = 1600;

const embeddings = new CohereEmbeddings({ model: "embed-english-v3.0" });
const pinecone = new Pinecone();
const index = pinecone.index(process.env.PINECONE_INDEX!);
const llm = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0,
  streaming: true,
});

export async function handleChat(req: Request, res: Response) {
  const { userId, noteId, message, history = [] } = req.body;

  if (!userId || !noteId || !message) {
    res.status(400).json({ message: 'userId, noteId, and message are required' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // 1. Embed the user's question
    const queryVector = await embeddings.embedQuery(message);

    // 2. Query Pinecone for top-K relevant chunks from THIS note only
    const queryResult = await index.query({
      vector: queryVector,
      topK: 6,
      filter: { noteId },    // IMPORTANT: scope to this note only
      includeMetadata: true,
    });

    // 3. Build context from retrieved chunks
    const sources = queryResult.matches.map((m, i) => ({
      chunkIndex: i,
      excerpt: String(m.metadata?.text ?? '').slice(0, 200),
      score: m.score,
    }));
    const context = queryResult.matches
      .map(m => String(m.metadata?.text ?? '').slice(0, MAX_CONTEXT_CHUNK_CHARS))
      .filter(Boolean)
      .join('\n\n---\n\n');

    const normalizedHistory = Array.isArray(history)
      ? history
          .slice(-HISTORY_LIMIT)
          .filter(
            (item): item is { role: "user" | "assistant"; content: string } =>
              Boolean(item) &&
              (item.role === "user" || item.role === "assistant") &&
              typeof item.content === "string"
          )
          .map(item => ({
            role: item.role,
            content: item.content.slice(0, MAX_HISTORY_ITEM_CHARS),
          }))
      : [];

    // 4. Build the prompt with history + context
    const systemPrompt = `You are a helpful research assistant. Answer questions ONLY based on the provided document context. If the answer is not in the context, say so clearly. Be concise and cite which part of the document supports your answer.

Document context:
${context}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...normalizedHistory,
      { role: 'user', content: message },
    ];

    // 5. Stream OpenAI response
    const stream = await llm.stream(messages);

    for await (const chunk of stream) {
      const token = chunk.content as string;
      if (token) sendEvent({ type: 'token', value: token });
    }

    // 6. Send sources after streaming completes
    sendEvent({ type: 'sources', value: sources });
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err: any) {
    console.error("Chat error:", err);
    sendEvent({ type: 'error', message: err.message ?? 'Chat failed' });
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
