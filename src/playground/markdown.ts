import { Renderer, marked, type Tokens } from 'marked';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

const SAFE_HREF = /^(https?:\/\/|mailto:|\/|#)/i;

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);

const safeHref = (href: string): string => (SAFE_HREF.test(href) ? href : '#');

class ChatRenderer extends Renderer {
  override html({ text }: Tokens.HTML | Tokens.Tag): string {
    return escapeHtml(text);
  }

  override link({ href, tokens }: Tokens.Link): string {
    const label = this.parser.parseInline(tokens);
    return `<a href="${escapeHtml(safeHref(href))}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }

  override image({ href, text }: Tokens.Image): string {
    return `<a href="${escapeHtml(safeHref(href))}" target="_blank" rel="noopener noreferrer">${escapeHtml(text || href)}</a>`;
  }
}

const renderer = new ChatRenderer();

export function renderChatMarkdown(source: string): string {
  return marked.parse(source, { renderer, gfm: true, breaks: true, async: false });
}
