'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';
import type { Components } from 'react-markdown';

interface Props {
  content: string;
}

export default function MarkdownRenderer({ content }: Props) {
  const router = useRouter();

  // Convert Obsidian [[wikilinks]] to internal browse links
  const processed = content.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, (_, name) => {
    return `[${name}](/browse?page=${encodeURIComponent(name)})`;
  });

  const components: Components = {
    a({ href, children }) {
      if (href?.startsWith('/browse')) {
        return (
          <button
            onClick={() => router.push(href!)}
            className="text-blue-400 hover:text-blue-300 underline cursor-pointer bg-transparent border-0 p-0 font-inherit text-inherit"
          >
            {children}
          </button>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
          {children}
        </a>
      );
    },
    h1({ children }) {
      return <h1 className="text-xl font-bold mt-4 mb-2 text-white">{children}</h1>;
    },
    h2({ children }) {
      return <h2 className="text-lg font-semibold mt-3 mb-2 text-white">{children}</h2>;
    },
    h3({ children }) {
      return <h3 className="text-base font-semibold mt-2 mb-1 text-gray-200">{children}</h3>;
    },
    p({ children }) {
      return <p className="mb-2 leading-relaxed text-gray-200">{children}</p>;
    },
    ul({ children }) {
      return <ul className="list-disc list-inside mb-2 space-y-1 text-gray-200">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-200">{children}</ol>;
    },
    li({ children }) {
      return <li className="text-gray-200">{children}</li>;
    },
    blockquote({ children }) {
      return (
        <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-400 my-2">
          {children}
        </blockquote>
      );
    },
    code({ children, className }) {
      const isBlock = Boolean(className);
      if (isBlock) {
        return (
          <pre className="bg-gray-800 p-4 rounded overflow-x-auto my-2">
            <code className={`${className ?? ''} text-sm text-gray-200`}>{children}</code>
          </pre>
        );
      }
      return (
        <code className="bg-gray-800 px-1.5 py-0.5 rounded text-sm text-gray-200">{children}</code>
      );
    },
    hr() {
      return <hr className="border-gray-700 my-4" />;
    },
    table({ children }) {
      return (
        <div className="overflow-x-auto my-2">
          <table className="text-sm border-collapse w-full">{children}</table>
        </div>
      );
    },
    th({ children }) {
      return <th className="border border-gray-600 px-3 py-1 bg-gray-800 text-left font-semibold text-gray-200">{children}</th>;
    },
    td({ children }) {
      return <td className="border border-gray-700 px-3 py-1 text-gray-300">{children}</td>;
    },
  };

  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processed}
      </ReactMarkdown>
    </div>
  );
}
