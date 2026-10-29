import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * Renders a small, safe subset of Markdown (## headings, ### subheadings, - lists,
 * paragraphs, **bold**) as React elements. No raw HTML is ever injected.
 */
export function SimpleMarkdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return (
    <div className="prose-lvf">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('### ')) return <h3 key={i}>{inline(trimmed.slice(4))}</h3>;
        if (trimmed.startsWith('## ')) return <h2 key={i} id={headingId(trimmed.slice(3))}>{inline(trimmed.slice(3))}</h2>;
        const lines = trimmed.split('\n');
        if (lines.every((l) => l.trim().startsWith('- '))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{inline(lines.join(' '))}</p>;
      })}
    </div>
  );
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\]|\[[^\]]+\]\((?:\/|https?:\/\/|mailto:)[^)\s]+\))/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) return link[2]!.startsWith('/') ? <Link key={i} to={link[2]!}>{link[1]}</Link> : <a key={i} href={link[2]}>{link[1]}</a>;
    // [[...]] marks text the foundation still needs to supply.
    if (part.startsWith('[[') && part.endsWith(']]'))
      return (
        <mark key={i} className="rounded bg-sun-100 px-1 text-heading">
          {part.slice(2, -2)}
        </mark>
      );
    return part;
  });
}

export const headingId = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
