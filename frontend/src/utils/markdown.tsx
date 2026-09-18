import { createElement, Fragment, ReactNode } from 'react'
import { openExternal } from '../api/bridge'

/** Modrinth project pages are Markdown with HTML mixed in (Create's is
 *  mostly <p> and <img> tags, Sodium's is Markdown). They are rendered
 *  without ever handing HTML to the DOM: the Markdown is turned into HTML
 *  text, DOMParser parses the whole thing into an inert document (nothing
 *  runs there), and only the tags below come back out as React elements —
 *  links and images only with http(s) URLs, links opening in the system
 *  browser. Everything else (script, iframe, style, event attributes) is
 *  dropped by construction. */
const ALLOWED = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'a', 'img', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'details', 'summary', 'center', 'div', 'span', 'sup', 'sub'])
const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'video', 'audio', 'form', 'input', 'button', 'svg', 'template', 'noscript'])
const http = (u: string) => /^https?:\/\//i.test(u)

/** Markdown → HTML text, the common subset: headings, lists, quotes, fenced
 *  code, rules, paragraphs; bold, italic, code, links and images inline.
 *  Lines that already are HTML pass through untouched. */
export function markdownToHtml(md: string): string {
  const inline = (s: string) => s
    .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<strong>${a ?? b}</strong>`)
    .replace(/(^|[^\w*])\*([^*\n]+)\*(?!\w)|(^|[^\w_])_([^_\n]+)_(?!\w)/g, (_, p1, a, p2, b) => `${p1 ?? p2 ?? ''}<em>${a ?? b}</em>`)
  const out: string[] = []
  let para: string[] = []
  let list: 'ul' | 'ol' | null = null
  let fence = false
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = [] } if (list) { out.push(`</${list}>`); list = null } }
  for (const raw of md.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd()
    if (/^```/.test(line)) { flush(); out.push(fence ? '</code></pre>' : '<pre><code>'); fence = !fence; continue }
    if (fence) { out.push(line.replace(/</g, '&lt;')); continue }
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    const li = /^\s*(?:[-*+]|\d+\.)\s+(.*)$/.exec(line)
    if (!line.trim()) flush()
    else if (h) { flush(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`) }
    else if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flush(); out.push('<hr>') }
    else if (li) {
      const kind = /^\s*\d+\./.test(line) ? 'ol' : 'ul'
      if (list !== kind) { flush(); list = kind; out.push(`<${kind}>`) }
      out.push(`<li>${inline(li[1])}</li>`)
    }
    else if (/^>\s?/.test(line)) { flush(); out.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`) }
    else if (/^\s*<\/?[a-z][\s\S]*>?\s*$/i.test(line) && !/^\s*<(a|img|strong|em|b|i|code|span|br)\b/i.test(line)) { flush(); out.push(line) }
    else para.push(line)
  }
  flush()
  if (fence) out.push('</code></pre>')
  return out.join('\n')
}

/** DOM → React through the whitelist. */
function toReact(node: Node, key: number): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent
  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  if (DROP.has(tag)) return null
  const children = Array.from(el.childNodes).map(toReact)
  if (!ALLOWED.has(tag)) return createElement(Fragment, { key }, ...children)
  const props: Record<string, unknown> = { key }
  if (tag === 'a') {
    const href = el.getAttribute('href') ?? ''
    if (!http(href)) return createElement(Fragment, { key }, ...children)
    props.href = href
    props.onClick = (e: MouseEvent) => { e.preventDefault(); openExternal(href) }
  }
  if (tag === 'img') {
    const src = el.getAttribute('src') ?? ''
    if (!http(src)) return null
    return createElement('img', { key, src, alt: el.getAttribute('alt') ?? '', loading: 'lazy', decoding: 'async' })
  }
  if (tag === 'br' || tag === 'hr') return createElement(tag, { key })
  return createElement(tag, props, ...children)
}

/** Renders a Modrinth body. Block spacing and list bullets come from the
 *  wrapper's arbitrary variants; headings are scaled down from the page's own. */
export default function Markdown({ text, className = '' }: { text: string; className?: string }) {
  const doc = new DOMParser().parseFromString(markdownToHtml(text), 'text/html')
  return (
    <div className={`text-sm leading-relaxed break-words [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h4]:text-base [&_h1]:mt-6 [&_h2]:mt-6 [&_h3]:mt-4 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:mb-1 [&_blockquote]:border-l-3 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:text-muted [&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:rounded-md [&_pre]:bg-panel [&_code]:text-[13px] [&_img]:inline-block [&_img]:rounded-md [&_img]:my-2 [&_hr]:my-4 [&_hr]:border-glass-border [&_table]:block [&_table]:overflow-x-auto [&_th]:text-left [&_th]:pr-4 [&_td]:pr-4 [&_td]:py-1 [&_summary]:cursor-pointer ${className}`}>
      {Array.from(doc.body.childNodes).map(toReact)}
    </div>
  )
}
