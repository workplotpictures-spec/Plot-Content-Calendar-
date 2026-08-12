'use client';

import { useEffect, useRef } from 'react';
import { clean } from '@/lib/sanitize';

interface Props {
  /** Contents are re-seeded whenever this changes (month switch, item switch). */
  docKey: string;
  html: string;
  placeholder: string;
  onChange: (html: string) => void;
  withLink?: boolean;
  readOnly?: boolean;
}

/**
 * contenteditable editor with the reference toolbar. execCommand is deprecated
 * but is what the reference used and still the least intrusive way to get
 * bold / italic / lists without pulling in an editor framework.
 */
export default function RichTextEditor({
  docKey,
  html,
  placeholder,
  onChange,
  withLink,
  readOnly,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const seeded = useRef<string | null>(null);

  // Only write into the DOM when we switch documents, never on every keystroke
  // — re-seeding mid-edit would move the caret to the start.
  useEffect(() => {
    if (!ref.current) return;
    if (seeded.current === docKey) return;
    ref.current.innerHTML = clean(html);
    seeded.current = docKey;
  }, [docKey, html]);

  // A change that arrives from another member while this editor is idle.
  useEffect(() => {
    const el = ref.current;
    if (!el || seeded.current !== docKey) return;
    if (document.activeElement === el) return;
    const next = clean(html);
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [html, docKey]);

  const exec = (cmd: string) => {
    if (readOnly) return;
    if (cmd === 'createLink') {
      const u = window.prompt('Link URL', 'https://');
      if (!u || !/^https?:\/\//i.test(u)) return;
      document.execCommand('createLink', false, u);
    } else {
      document.execCommand(cmd, false, undefined);
    }
    ref.current?.focus();
    onChange(clean(ref.current?.innerHTML ?? ''));
  };

  const tools: [string, React.ReactNode, string][] = [
    ['bold', <b key="b">B</b>, 'Bold'],
    ['italic', <i key="i">I</i>, 'Italic'],
    ['underline', <u key="u">U</u>, 'Underline'],
    ['insertUnorderedList', '••', 'Bulleted list'],
    ['insertOrderedList', '1.', 'Numbered list'],
  ];
  if (withLink) tools.push(['createLink', '🔗', 'Link']);

  return (
    <>
      {!readOnly && (
        <div className="etools">
          {tools.map(([cmd, label, title]) => (
            <button
              key={cmd}
              type="button"
              title={title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec(cmd)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div
        ref={ref}
        className="rt"
        contentEditable={!readOnly}
        suppressContentEditableWarning
        data-ph={placeholder}
        onInput={() => onChange(clean(ref.current?.innerHTML ?? ''))}
        onBlur={() => onChange(clean(ref.current?.innerHTML ?? ''))}
      />
    </>
  );
}
