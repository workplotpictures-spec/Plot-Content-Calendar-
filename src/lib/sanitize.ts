/**
 * Notes and monthly goals are rich text written by one member and rendered
 * into every other member's browser, so they are sanitised on the way in
 * (before the Firestore write) and again on the way out (before render).
 *
 * The reference file stripped tags with regexes. That is not enough once the
 * HTML is shared between accounts, so this walks the parsed DOM and keeps only
 * an allowlist of tags and attributes. The regex path is kept purely as an
 * SSR fallback for when DOMParser is not available.
 */

const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
  'P', 'DIV', 'SPAN', 'BR',
  'UL', 'OL', 'LI',
  'H1', 'H2', 'H3', 'H4',
  'BLOCKQUOTE', 'CODE', 'PRE',
  'A',
]);

/** Only <a href> survives, and only for safe schemes. */
const SAFE_SCHEME = /^(https?:|mailto:)/i;

function regexClean(html: string) {
  return String(html ?? '')
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '#');
}

export function clean(html: string | null | undefined): string {
  const input = String(html ?? '');
  if (!input) return '';
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return regexClean(input);
  }

  const doc = new DOMParser().parseFromString(`<body>${input}</body>`, 'text/html');

  const walk = (node: Element) => {
    // Snapshot children first — the loop mutates the live child list.
    for (const child of Array.from(node.children)) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        // Keep the readable text, drop the element itself.
        const text = doc.createTextNode(child.textContent ?? '');
        child.replaceWith(text);
        continue;
      }

      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        const keep =
          child.tagName === 'A' && name === 'href' && SAFE_SCHEME.test(attr.value.trim());
        if (!keep) child.removeAttribute(attr.name);
      }

      if (child.tagName === 'A') {
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer');
      }

      walk(child);
    }
  };

  walk(doc.body);
  return doc.body.innerHTML;
}

/** Plain text of some HTML, used for search matching. */
export const strip = (h: string | null | undefined) =>
  String(h ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Escapes plain text that is being turned into HTML (the create-modal notes). */
export const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
