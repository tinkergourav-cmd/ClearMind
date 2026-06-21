import React from 'react';
import ReactMarkdown from 'react-markdown';



// Extracted to module scope so react-markdown receives a stable reference
const markdownComponents = {
  h1: ({ children }) => <h1 className="text-sm font-bold text-slate-800 mt-2 mb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xs font-bold text-slate-800 mt-2 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xs font-semibold text-slate-700 mt-1.5 mb-0.5">{children}</h3>,
  h4: ({ children }) => <h4 className="text-xs font-semibold text-slate-700 mt-1 mb-0.5">{children}</h4>,
  h5: ({ children }) => <h5 className="text-xs font-medium text-slate-700 mt-1 mb-0.5">{children}</h5>,
  h6: ({ children }) => <h6 className="text-xs font-medium text-slate-600 mt-1 mb-0.5">{children}</h6>,
  p: ({ children }) => <p className="mb-1">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
  li: ({ children, node }) => {
    // Check if this is a checklist item
    const firstChild = node?.children?.[0];
    if (firstChild?.tagName === 'input' || (firstChild?.type === 'element' && firstChild?.tagName === 'input')) {
      return <li className="list-none -ml-4 flex items-start gap-1">{children}</li>;
    }
    return <li>{children}</li>;
  },
  input: ({ checked, ...props }) => (
    <input
      type="checkbox"
      checked={checked}
      readOnly
      className="mt-0.5 rounded border-slate-300"
      {...props}
    />
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-1">
      <table className="w-full border-collapse border border-slate-300 text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children, ...props }) => (
    <tr className="even:bg-slate-50" {...props}>{children}</tr>
  ),
  th: ({ children }) => <th className="border border-slate-300 px-1.5 py-0.5 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-slate-300 px-1.5 py-0.5">{children}</td>,
  code: ({ node, className, children }) => {
    const hasLanguage = /language-(\w+)/.test(className || '');
    const isMultiline = typeof children === 'string' && children.includes('\n');
    const isBlock = hasLanguage || isMultiline;
    if (!isBlock) {
      return <code className="bg-slate-100 px-1 rounded text-xs font-mono text-slate-700">{children}</code>;
    }
    return (
      <pre className="bg-slate-100 rounded p-2 my-1 overflow-x-auto">
        <code className="text-xs font-mono text-slate-700">{children}</code>
      </pre>
    );
  },
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-slate-300 pl-2 my-1 text-slate-500 italic">{children}</blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 hover:underline cursor-pointer"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-bold text-slate-800">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
};

const MarkdownRenderer = React.memo(({ content, isZoomedIn }) => {
  if (!content) return null;

  if (!isZoomedIn) {
    // Plain text preview — full content without markdown formatting, same card size
    return (
      <div className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap break-words">
        {content}
      </div>
    );
  }

  // Full markdown rendering when zoomed in
  return (
    <div className="markdown-content text-slate-600 text-xs leading-relaxed">
      <ReactMarkdown components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;
