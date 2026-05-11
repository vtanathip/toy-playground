'use client';

import { useState, useRef, useEffect } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput('');

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setStreaming(true);

    let assistantText = '';
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const { text } = JSON.parse(data) as { text: string };
            assistantText += text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: assistantText };
              return updated;
            });
          } catch {
            // skip malformed chunk
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${msg}` };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  async function handleFileIngest(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIngestStatus(`Ingesting ${file.name}…`);
    const content = await file.text();
    const type = file.name.includes('transcript')
      ? 'transcript'
      : file.name.endsWith('.pdf')
      ? 'paper'
      : 'article';
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filename: file.name, type }),
      });
      const data = (await res.json()) as { pages?: string[] };
      setIngestStatus(`Ingested: ${data.pages?.join(', ') ?? 'done'}`);
    } catch {
      setIngestStatus('Ingest failed');
    }
    setTimeout(() => setIngestStatus(null), 6000);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-20">
            <div className="text-2xl font-bold text-white mb-1">Candleman</div>
            <div className="text-sm text-gray-500 mb-6">
              Your trading algorithms & AI research wiki
            </div>
            <div className="space-y-1 text-xs text-gray-600">
              <div>&ldquo;What are the active domains in the wiki?&rdquo;</div>
              <div>&ldquo;Explain deflated Sharpe ratio&rdquo;</div>
              <div>&ldquo;What papers have I ingested on backtesting?&rdquo;</div>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-2xl rounded-lg px-4 py-3 ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white text-sm'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              {m.role === 'assistant' ? (
                <>
                  <MarkdownRenderer content={m.content} />
                  {streaming && i === messages.length - 1 && (
                    <span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />
                  )}
                </>
              ) : (
                <p>{m.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Ingest status bar */}
      {ingestStatus && (
        <div className="px-4 py-2 bg-green-900/30 border-t border-green-700/40 text-green-400 text-xs">
          {ingestStatus}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileRef}
            accept=".md,.txt,.pdf"
            onChange={handleFileIngest}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors whitespace-nowrap"
            title="Ingest a file into the wiki"
          >
            + Ingest
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask about your wiki…"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            disabled={streaming}
          />
          <button
            onClick={sendMessage}
            disabled={streaming || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
