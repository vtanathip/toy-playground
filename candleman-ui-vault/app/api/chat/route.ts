import { NextRequest } from 'next/server';
import { assembleQueryContext, formatContextForPrompt } from '@/lib/wiki';
import { createAnthropicClient, WIKI_SYSTEM_PROMPT } from '@/lib/anthropic';

export const runtime = 'nodejs';

interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const { message, history = [] }: { message: string; history: HistoryMessage[] } =
    await req.json();

  const ctx = await assembleQueryContext(message);
  const contextBlock = formatContextForPrompt(ctx);

  const client = createAnthropicClient();

  const stream = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    stream: true,
    system: WIKI_SYSTEM_PROMPT + '\n\n## Current Vault Context\n\n' + contextBlock,
    messages: [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: message },
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
