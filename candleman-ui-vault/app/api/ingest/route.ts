import { NextRequest, NextResponse } from 'next/server';
import { createAnthropicClient, WIKI_SYSTEM_PROMPT } from '@/lib/anthropic';
import { writeVaultPath, readVaultPath } from '@/lib/drive';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const {
    content,
    filename,
    type,
  }: { content: string; filename: string; type: string } = await req.json();

  const client = createAnthropicClient();
  const today = new Date().toISOString().split('T')[0];

  const ingestPrompt = `Ingest the following source document into the wiki.

Source filename: ${filename}
Source type: ${type}
Today: ${today}

For each wiki page you create, output it using this exact format:
## wiki/<folder>/<Title>.md
\`\`\`markdown
---
type: <type>
title: "<Title>"
created: ${today}
updated: ${today}
tags:
  - <relevant-tag>
status: seed
related: []
sources: []
---

<page body>
\`\`\`

Create one primary source/paper page, plus any concept or entity pages needed.

---

${content.slice(0, 12000)}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8096,
    system: WIKI_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: ingestPrompt }],
  });

  const text = (response.content[0] as { type: string; text: string }).text;

  // Parse ## wiki/path/to/file.md followed by fenced code block
  const pagePattern = /^## (wiki\/[^\n]+\.md)\s*\n```(?:markdown|md)?\n([\s\S]*?)```/gm;
  const pages: Array<{ path: string; content: string }> = [];
  let match;
  while ((match = pagePattern.exec(text)) !== null) {
    pages.push({ path: match[1].trim(), content: match[2].trim() });
  }

  for (const page of pages) {
    await writeVaultPath(page.path, page.content);
  }

  const pageLinks = pages
    .map((p) => `[[${p.path.split('/').pop()?.replace('.md', '')}]]`)
    .join(', ');
  const logEntry = `## [${today}] ingest | ${filename}\n- Type: ${type}\n- Pages created: ${pageLinks || 'none'}\n\n`;
  const existingLog = (await readVaultPath('wiki/log.md')) ?? '';
  await writeVaultPath('wiki/log.md', logEntry + existingLog);

  return NextResponse.json({ pages: pages.map((p) => p.path), raw: text });
}
