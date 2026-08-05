import { Fragment } from 'react';

function inlineNodes(text, keyPrefix = 'line') {
  const source = String(text ?? '');
  const token = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;
  const parts = source.split(token).filter((part) => part !== '');
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={key}>{part.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(part)) return <code key={key}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (link) return <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
    return <Fragment key={key}>{part}</Fragment>;
  });
}

export default function MarkdownPreview({ value }) {
  const lines = String(value ?? '').split('\n');
  const blocks = [];
  let list = [];
  let listType = '';
  let code = [];
  let inCode = false;

  const flushList = () => {
    if (!list.length) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    blocks.push(<Tag key={`list-${blocks.length}`}>{list.map((line, index) => <li key={`${line}-${index}`}>{inlineNodes(line, `list-${blocks.length}-${index}`)}</li>)}</Tag>);
    list = [];
    listType = '';
  };
  const flushCode = () => {
    if (!code.length) return;
    blocks.push(<pre key={`code-${blocks.length}`}><code>{code.join('\n')}</code></pre>);
    code = [];
  };

  lines.forEach((raw, index) => {
    const line = raw.replace(/\s+$/, '');
    if (line.trim().startsWith('```')) {
      flushList();
      if (inCode) flushCode();
      inCode = !inCode;
      return;
    }
    if (inCode) { code.push(line); return; }
    const checklist = line.match(/^\s*- \[([ xX])\]\s+(.+)/);
    if (checklist) {
      flushList();
      const done = checklist[1].toLowerCase() === 'x';
      blocks.push(<label className="markdownCheck" key={`check-${index}`}><input type="checkbox" checked={done} readOnly /><span>{inlineNodes(checklist[2], `check-${index}`)}</span></label>);
      return;
    }
    const unordered = line.match(/^\s*[-*]\s+(.+)/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)/);
    if (unordered || ordered) {
      const nextType = ordered ? 'ol' : 'ul';
      if (list.length && listType !== nextType) flushList();
      listType = nextType;
      list.push((ordered || unordered)[1]);
      return;
    }
    flushList();
    if (!line.trim()) { blocks.push(<div className="markdownGap" key={`gap-${index}`} />); return; }
    if (line.startsWith('### ')) blocks.push(<h4 key={`h3-${index}`}>{inlineNodes(line.slice(4), `h3-${index}`)}</h4>);
    else if (line.startsWith('## ')) blocks.push(<h3 key={`h2-${index}`}>{inlineNodes(line.slice(3), `h2-${index}`)}</h3>);
    else if (line.startsWith('# ')) blocks.push(<h2 key={`h1-${index}`}>{inlineNodes(line.slice(2), `h1-${index}`)}</h2>);
    else if (line.startsWith('> ')) blocks.push(<blockquote key={`quote-${index}`}>{inlineNodes(line.slice(2), `quote-${index}`)}</blockquote>);
    else blocks.push(<p key={`p-${index}`}>{inlineNodes(line, `p-${index}`)}</p>);
  });
  flushList();
  flushCode();
  return <div className="markdownPreview">{blocks.length ? blocks : <p className="metadata">Nothing to preview yet.</p>}</div>;
}
