'use client'

import Link from 'next/link'

const GREEN = '#198f41'
const RED   = '#db142e'

/** Button returned by POST /api/ai/chat. */
export type ChatAction =
  | { type: 'link'; label: string; url: string }
  | { type: 'quick_reply'; label: string; message: string }

/**
 * Defence in depth: the backend already allowlists URLs; the widget still
 * refuses anything that isn't a root-relative internal path (or "#cart").
 */
export function isSafeInternalUrl(url: unknown): url is string {
  return typeof url === 'string'
    && url.length <= 200
    && (url === '#cart' || (/^\/(?!\/)/.test(url) && !/[\\\s<>"']/.test(url) && !/^\/[^/]*:/.test(url)))
}

/** Keep only well-formed actions with safe URLs. */
export function sanitizeActions(raw: unknown): ChatAction[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((a): a is ChatAction =>
    a && typeof a.label === 'string' && a.label.length > 0 && (
      (a.type === 'link' && isSafeInternalUrl(a.url)) ||
      (a.type === 'quick_reply' && typeof a.message === 'string' && a.message.length > 0)
    )
  )
}

export default function ChatActions({
  actions, dir, disabled, onQuickReply, onNavigate, onOpenCart,
}: {
  actions: ChatAction[]
  dir: 'rtl' | 'ltr' | 'auto'
  disabled?: boolean
  onQuickReply: (message: string) => void
  onNavigate: () => void
  onOpenCart: () => void
}) {
  if (actions.length === 0) return null

  return (
    <div dir={dir} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, width: '100%' }}>
      {actions.map((action, i) => {
        if (action.type === 'quick_reply') {
          return (
            <button
              key={i}
              type="button"
              className="ct-chip ct-chip-reply"
              disabled={disabled}
              onClick={() => onQuickReply(action.message)}
            >
              {action.label}
            </button>
          )
        }

        if (action.url === '#cart') {
          return (
            <button key={i} type="button" className="ct-chip ct-chip-link" onClick={onOpenCart}>
              🛒 {action.label}
            </button>
          )
        }

        return (
          <Link key={i} href={action.url} className="ct-chip ct-chip-link" onClick={onNavigate}>
            {action.label} <span aria-hidden>{dir === 'rtl' ? '←' : '→'}</span>
          </Link>
        )
      })}
    </div>
  )
}

/** Styles for .ct-chip — render once, in the chat widget. */
export const CHAT_ACTIONS_CSS = `
  .ct-chip {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 12.5px; font-weight: 700; line-height: 1.2;
    padding: 7px 12px; border-radius: 999px; cursor: pointer;
    font-family: inherit; text-decoration: none; white-space: nowrap;
    max-width: 100%; overflow: hidden; text-overflow: ellipsis;
    transition: background .15s, border-color .15s, color .15s;
    min-height: 32px;
  }
  .ct-chip-link  { color: ${GREEN}; border: 1.5px solid ${GREEN}; background: ${GREEN}0d; }
  .ct-chip-link:hover, .ct-chip-link:focus-visible { background: ${GREEN}1f; outline: none; }
  .ct-chip-reply { color: ${RED}; border: 1.5px solid ${RED}55; background: #fff; }
  .ct-chip-reply:hover, .ct-chip-reply:focus-visible { background: ${RED}0a; border-color: ${RED}; outline: none; }
  .ct-chip:disabled { opacity: .5; cursor: not-allowed; }
`
