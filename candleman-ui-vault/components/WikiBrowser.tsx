'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MarkdownRenderer from './MarkdownRenderer';

interface TreeNode {
  dir: string;
  files: string[];
  open: boolean;
}

export default function WikiBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageParam = searchParams.get('page');

  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingTree, setLoadingTree] = useState(true);

  useEffect(() => {
    fetch('/api/files')
      .then((r) => r.json())
      .then((data: { files: string[] }) => {
        const grouped: Record<string, string[]> = {};
        for (const f of data.files) {
          const parts = f.split('/');
          const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
          if (!grouped[dir]) grouped[dir] = [];
          grouped[dir].push(f);
        }
        setTree(
          Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dir, files]) => ({ dir, files, open: true }))
        );
        setLoadingTree(false);
      })
      .catch(() => setLoadingTree(false));
  }, []);

  const loadFile = useCallback(async (filePath: string) => {
    setLoading(true);
    setSelectedPath(filePath);
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
      const data = (await res.json()) as { content: string };
      setContent(data.content);
    } catch {
      setContent('Failed to load file.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle page param: find matching file path by page name or full path
  useEffect(() => {
    if (!pageParam || tree.length === 0) return;
    const allFiles = tree.flatMap((n) => n.files);
    const match = allFiles.find(
      (f) =>
        f === pageParam ||
        f.replace(/\\/g, '/').endsWith('/' + pageParam + '.md') ||
        f.replace(/\\/g, '/').toLowerCase().includes(pageParam.toLowerCase())
    );
    if (match) loadFile(match);
  }, [pageParam, tree, loadFile]);

  function toggleDir(dir: string) {
    setTree((prev) =>
      prev.map((n) => (n.dir === dir ? { ...n, open: !n.open } : n))
    );
  }

  function basename(filePath: string): string {
    return filePath.split('/').pop()?.replace(/\.md$/, '') ?? filePath;
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-60 flex-shrink-0 border-r border-gray-700 overflow-y-auto bg-gray-900">
        {loadingTree && (
          <div className="text-gray-600 text-xs px-3 py-4">Loading files…</div>
        )}
        {tree.map(({ dir, files, open }) => (
          <div key={dir}>
            <button
              onClick={() => toggleDir(dir)}
              className="w-full text-left px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 flex items-center gap-1"
            >
              <span className="text-gray-700">{open ? '▾' : '▸'}</span>
              {dir}
            </button>
            {open &&
              files.map((f) => (
                <button
                  key={f}
                  onClick={() => loadFile(f)}
                  className={`w-full text-left px-4 py-1 text-sm truncate hover:bg-gray-800 transition-colors ${
                    selectedPath === f
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title={f}
                >
                  {basename(f)}
                </button>
              ))}
          </div>
        ))}
      </div>

      {/* Content pane */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && <div className="text-gray-600 text-sm">Loading…</div>}
        {!loading && content && (
          <>
            <div className="text-xs text-gray-600 mb-4 font-mono">{selectedPath}</div>
            <MarkdownRenderer content={content} />
          </>
        )}
        {!loading && !content && (
          <div className="text-gray-600 text-sm mt-20 text-center">
            Select a file from the sidebar
            <br />
            <button
              onClick={() => router.push('/')}
              className="mt-3 text-blue-500 hover:text-blue-400 text-xs"
            >
              ← Back to chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
