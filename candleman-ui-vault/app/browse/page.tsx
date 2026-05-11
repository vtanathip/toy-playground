import { Suspense } from 'react';
import Link from 'next/link';
import WikiBrowser from '@/components/WikiBrowser';

export default function BrowsePage() {
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">Candleman</span>
          <span className="text-xs text-gray-600 hidden sm:block">wiki assistant</span>
        </div>
        <nav className="flex gap-4 text-sm text-gray-400">
          <Link href="/" className="hover:text-white transition-colors">
            Chat
          </Link>
          <span className="text-white">Browse</span>
        </nav>
      </header>
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<div className="p-6 text-gray-600 text-sm">Loading…</div>}>
          <WikiBrowser />
        </Suspense>
      </div>
    </div>
  );
}
