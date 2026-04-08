"use client";

import { useMemo, type ComponentPropsWithoutRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

type MarkdownContentProps = {
  content: string;
};

const components: ComponentPropsWithoutRef<typeof Markdown>["components"] = {
  h1: ({ children }) => (
    <h1 className="text-lg font-semibold leading-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold leading-tight">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold leading-tight">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold leading-tight">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-sm font-semibold leading-tight">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-sm font-semibold leading-tight">{children}</h6>
  ),
  p: ({ children }) => <p>{children}</p>,
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  del: ({ children }) => <span className="line-through">{children}</span>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline-offset-4 hover:underline"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/40 pl-3 italic text-sm text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <code>{children}</code>;
    }
    return (
      <code className="bg-muted/60 rounded px-1 py-0.5 text-xs font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-muted/60 text-xs md:text-sm rounded-lg p-3 overflow-auto">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/40 border-b border-border">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border last:border-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2">{children}</td>
  ),
  hr: () => <hr className="border-border" />,
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  const rendered = useMemo(
    () => (
      <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {content}
      </Markdown>
    ),
    [content]
  );

  return <div className="text-sm leading-relaxed space-y-3">{rendered}</div>;
}
