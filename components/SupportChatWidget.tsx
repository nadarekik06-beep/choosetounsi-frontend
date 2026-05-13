'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'

const RED   = '#db142e'
const GREEN = '#198f41'

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api')
  .replace(/\/api\/?$/, '') + '/api'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type MsgRole   = 'bot' | 'user'
type ActiveTab = 'ai' | 'faq'

interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

interface AiChatApiResult {
  message: string
  products: AiProduct[]
  intent: string
}

interface AiProduct {
  id: number
  name: string
  slug: string
  price: number
  stock: number
  short_description: string
  category: string
  category_slug: string
  primary_image_url: string | null
  is_pack?: boolean
  original_price?: number
  savings?: number
}

interface ChatMessage {
  id: string
  role: MsgRole
  text: string
  products?: AiProduct[]
  actions?: Action[]
  typing?: boolean
}

interface Action {
  label: string
  href?: string
  onClick?: () => void
}

interface Question {
  id: string
  label: string
  response: string
  actions?: Action[]
}

interface QuestionGroup {
  title: string
  questions: Question[]
}

/* ─────────────────────────────────────────────────────────────
   SESSION ID
───────────────────────────────────────────────────────────── */
const SESSION_STORAGE_KEY = 'ct_chat_session_v1'

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return `ct_ssr_${Math.random().toString(36).slice(2, 9)}`
  }
  let id = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!id) {
    id = `ct_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem(SESSION_STORAGE_KEY, id)
  }
  return id
}

function createFreshSessionId(): string {
  const id = `ct_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_STORAGE_KEY, id)
  }
  return id
}

/* ─────────────────────────────────────────────────────────────
   API
───────────────────────────────────────────────────────────── */
async function aiChatApi(
  userMessage: string,
  history: ConversationTurn[],
  sessionId: string,
): Promise<AiChatApiResult> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('ct_auth_token') : null

  const res = await fetch(`${API_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message:    userMessage,
      session_id: sessionId,
      history:    history.slice(-6),
    }),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? 'AI request failed')

  return {
    message:  json.message  ?? '',
    products: json.products ?? [],
    intent:   json.intent   ?? 'general',
  }
}

/* ─────────────────────────────────────────────────────────────
   INTENT → ACTION BUTTONS
   Single source of truth. Driven by backend intent only.
   No keyword guessing anywhere in the codebase.
───────────────────────────────────────────────────────────── */
function resolveIntentActions(intent: string): Action[] {
  switch (intent) {
    case 'seller_onboarding':
      return [
        { label: '🏪 Become a Seller', href: '/become-a-vendor' },
        { label: '💼 View Plans',       href: '/become-a-vendor#plans' },
      ]
    case 'checkout_guidance':
      return [
        { label: '🛒 Go to Cart', href: '/cart' },
      ]
    default:
      return []
  }
}

/* ─────────────────────────────────────────────────────────────
   QUESTION TREE
───────────────────────────────────────────────────────────── */
const QUESTION_GROUPS: QuestionGroup[] = [
  {
    title: 'Orders & Tracking',
    questions: [
      {
        id: 'where-order',
        label: 'Where is my order?',
        response:
          "You can track your order in real time from your orders page. If your order is still processing, it may take 24–48 hours before a tracking update appears. Need more details?",
        actions: [{ label: '📦 View My Orders', href: '/orders' }],
      },
      {
        id: 'track-order',
        label: 'I want to track my order',
        response:
          "Head to your orders page — each order shows its current status and delivery progress. If you don't see an update within 48 hours of placing your order, please reach out to us.",
        actions: [{ label: '🔍 Track Now', href: '/orders' }],
      },
      {
        id: 'delayed-order',
        label: 'My order is delayed',
        response:
          "We're sorry to hear that! Delays can happen due to high demand or logistics. Please check your order status first — if the estimated date has passed by more than 3 days, file a complaint so we can investigate.",
        actions: [
          { label: '📋 Check Order Status', href: '/orders' },
          { label: '🚨 File a Complaint',   href: '/complaints/new' },
        ],
      },
    ],
  },
  {
    title: 'Delivery Issues',
    questions: [
      {
        id: 'wrong-person',
        label: 'Delivered to the wrong person',
        response:
          "That shouldn't happen! Please file a complaint immediately with your order number and a description of the situation. Our team reviews all delivery disputes within 24 hours.",
        actions: [{ label: '🚨 File a Complaint', href: '/complaints/new' }],
      },
      {
        id: 'missing-damaged',
        label: 'Order missing / damaged / incorrect',
        response:
          "We sincerely apologise. Please file a complaint — attach a photo if possible so the seller can review it quickly. We aim to resolve all product issues within 3 business days.",
        actions: [
          { label: '📸 Report Issue', href: '/complaints/new' },
          { label: '📦 My Orders',   href: '/orders' },
        ],
      },
    ],
  },
  {
    title: 'Returns & Refunds',
    questions: [
      {
        id: 'return-order',
        label: 'How can I return my order?',
        response:
          "You can request a return within 14 days of delivery. Go to your orders, select the delivered order, and click 'Report Issue'. Our team will guide you through the return steps.",
        actions: [{ label: '🔄 Start a Return', href: '/orders' }],
      },
      {
        id: 'return-status',
        label: 'Check the status of my return',
        response:
          "Return status is visible under My Complaints. Once the seller approves your return, we'll update the status and initiate the refund process.",
        actions: [{ label: '🚨 My Complaints', href: '/complaints' }],
      },
      {
        id: 'refund',
        label: 'When will I receive my refund?',
        response:
          "After your return is approved, refunds typically process within 5–7 business days depending on your payment method. COD refunds are issued as store credit or via bank transfer.",
        actions: [{ label: '🚨 Check Complaint Status', href: '/complaints' }],
      },
    ],
  },
  {
    title: 'Account & Payment',
    questions: [
      {
        id: 'payment-issue',
        label: 'Problem with my payment',
        response:
          "Payment issues can occur due to bank restrictions or incorrect card details. ChooseTounsi currently supports Cash on Delivery (COD). If you encountered an unexpected charge, please contact us directly.",
        actions: [{ label: '✉️ Contact Support', href: 'mailto:support@choosetounsi.tn' }],
      },
      {
        id: 'update-account',
        label: 'Update my account information',
        response:
          "You can update your name, email, phone and password from your profile page at any time.",
        actions: [{ label: '👤 My Profile', href: '/profile' }],
      },
    ],
  },
  {
    title: 'General',
    questions: [
      {
        id: 'contact',
        label: 'Contact support',
        response:
          "Our support team is available Saturday–Thursday, 9 AM – 6 PM (Tunisia time). You can reach us at support@choosetounsi.tn or via the form below.",
        actions: [{ label: '✉️ Email Support', href: 'mailto:support@choosetounsi.tn' }],
      },
      {
        id: 'other',
        label: 'Something else',
        response:
          "No problem! Please email us at support@choosetounsi.tn and describe your issue in detail. We typically respond within 4 business hours.",
        actions: [{ label: '✉️ Email Us', href: 'mailto:support@choosetounsi.tn' }],
      },
    ],
  },
]

/* ─────────────────────────────────────────────────────────────
   WELCOME MESSAGES
───────────────────────────────────────────────────────────── */
const FAQ_WELCOME: ChatMessage = {
  id: 'faq-welcome',
  role: 'bot',
  text: 'Hello! 👋 Welcome to ChooseTounsi Support.\n\nHow can I assist you today? Please choose a topic below, or pick a specific question.',
}

const AI_WELCOME: ChatMessage = {
  id: 'ai-welcome',
  role: 'bot',
  text: '🛍️ Hi! I\'m your AI shopping assistant.\n\nTell me what you\'re looking for and I\'ll find real products for you. For example:\n• "I need a laptop under 1500 TND"\n• "Show me popular shoes"\n• "أبحث عن هاتف رخيص"',
}

function uid(): string {
  return Math.random().toString(36).slice(2)
}

/* ─────────────────────────────────────────────────────────────
   TYPING BUBBLE
───────────────────────────────────────────────────────────── */
function TypingBubble() {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '10px 14px', background: '#f4f4f5',
      borderRadius: '16px 16px 16px 4px',
    }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#94a3b8',
          animation: 'ct-bounce 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
          display: 'inline-block',
        }} />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PRODUCT CARD
───────────────────────────────────────────────────────────── */
function ProductCard({ product }: { product: AiProduct }) {
  const href = product.is_pack
    ? `/deals/${product.slug}`
    : `/products/${product.slug}`

  const imgSrc = product.primary_image_url
    ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=f4f4f5&color=374151&size=80`

  return (
    <Link
      href={href}
      style={{
        display: 'flex', gap: 10, alignItems: 'center',
        padding: '8px 10px',
        background: '#fff',
        border: '1.5px solid #e5e7eb',
        borderRadius: 10,
        textDecoration: 'none',
        transition: 'all 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = RED
        e.currentTarget.style.boxShadow = `0 2px 12px ${RED}20`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#e5e7eb'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 8, overflow: 'hidden',
        flexShrink: 0, background: '#f4f4f5',
      }}>
        <img
          src={imgSrc}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => {
            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=f4f4f5&color=374151&size=80`
          }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 12, fontWeight: 700,
          color: '#1a1a2e', lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {product.name}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>
          {product.is_pack ? '📦 Bundle Deal' : product.category}
        </p>
      </div>

      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <p style={{
          margin: 0, fontSize: 12, fontWeight: 900,
          color: RED, letterSpacing: '-0.02em',
        }}>
          {product.price.toFixed(3)} TND
        </p>
        {product.is_pack && product.savings && product.savings > 0 && (
          <span style={{
            fontSize: 9, fontWeight: 700, color: '#10b981',
            background: '#f0fdf4', padding: '1px 5px',
            borderRadius: 4, marginTop: 2, display: 'inline-block',
          }}>
            Save {product.savings.toFixed(3)}
          </span>
        )}
        {product.stock <= 0 && !product.is_pack && (
          <span style={{
            fontSize: 9, fontWeight: 700, color: '#ef4444',
            background: '#fef2f2', padding: '1px 5px',
            borderRadius: 4, marginTop: 2, display: 'inline-block',
          }}>
            Out of stock
          </span>
        )}
      </div>
    </Link>
  )
}

/* ─────────────────────────────────────────────────────────────
   MESSAGE BUBBLE
───────────────────────────────────────────────────────────── */
function Bubble({ msg }: { msg: ChatMessage }) {
  const isBot = msg.role === 'bot'

  return (
    <div style={{
      display: 'flex',
      flexDirection: isBot ? 'row' : 'row-reverse',
      gap: 8,
      alignItems: 'flex-end',
      animation: 'ct-fadein 0.22s ease both',
    }}>
      {isBot && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${RED}, #9b0f1f)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, marginBottom: 2,
        }}>
          🤝
        </div>
      )}

      <div style={{
        maxWidth: '80%', display: 'flex', flexDirection: 'column',
        gap: 6, alignItems: isBot ? 'flex-start' : 'flex-end',
      }}>
        {msg.typing ? (
          <TypingBubble />
        ) : (
          <div style={{
            padding: '10px 14px',
            background: isBot ? '#f4f4f5' : `linear-gradient(135deg, ${RED}, #9b0f1f)`,
            color: isBot ? '#1a1a2e' : '#fff',
            borderRadius: isBot ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
            fontSize: 13, lineHeight: 1.6, fontWeight: 500,
            whiteSpace: 'pre-line',
            boxShadow: isBot ? 'none' : `0 4px 12px ${RED}40`,
          }}>
            {msg.text}
          </div>
        )}

        {!msg.typing && msg.products && msg.products.length > 0 && (
          <div style={{
            width: '100%', display: 'flex', flexDirection: 'column', gap: 6,
            animation: 'ct-fadein 0.3s ease 0.1s both',
          }}>
            {msg.products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {!msg.typing && msg.actions && msg.actions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 2 }}>
            {msg.actions.map((action, i) => (
              action.href ? (
                <Link key={i} href={action.href} style={{
                  fontSize: 12, fontWeight: 700, color: GREEN,
                  border: `1.5px solid ${GREEN}`,
                  borderRadius: 8, padding: '5px 12px',
                  textDecoration: 'none', background: `${GREEN}0d`,
                  transition: 'all 0.15s', display: 'inline-block',
                  whiteSpace: 'nowrap',
                }}>
                  {action.label}
                </Link>
              ) : (
                <button key={i} onClick={action.onClick} style={{
                  fontSize: 12, fontWeight: 700, color: GREEN,
                  border: `1.5px solid ${GREEN}`,
                  borderRadius: 8, padding: '5px 12px',
                  background: `${GREEN}0d`,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}>
                  {action.label}
                </button>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   QUESTION MENU
───────────────────────────────────────────────────────────── */
function QuestionMenu({ onSelect }: { onSelect: (q: Question) => void }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {QUESTION_GROUPS.map(group => (
        <div key={group.title} style={{
          border: `1px solid ${openGroup === group.title ? RED + '40' : '#e5e7eb'}`,
          borderRadius: 12, overflow: 'hidden',
          transition: 'border-color 0.2s',
        }}>
          <button
            onClick={() => setOpenGroup(o => o === group.title ? null : group.title)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: openGroup === group.title ? `${RED}06` : '#fafafa',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 800,
              color: openGroup === group.title ? RED : '#374151',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              transition: 'all 0.15s',
            }}>
            {group.title}
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"
              viewBox="0 0 24 24"
              style={{ transition: 'transform 0.2s', transform: openGroup === group.title ? 'rotate(180deg)' : 'none' }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {openGroup === group.title && (
            <div style={{
              padding: '6px 10px 10px', display: 'flex', flexDirection: 'column',
              gap: 4, animation: 'ct-fadein 0.15s ease both',
            }}>
              {group.questions.map(q => (
                <button key={q.id} onClick={() => onSelect(q)}
                  style={{
                    textAlign: 'left', padding: '8px 12px',
                    background: '#fff', border: '1.5px solid #e5e7eb',
                    borderRadius: 8, cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: '#374151',
                    fontFamily: 'inherit', transition: 'all 0.15s', lineHeight: 1.4,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = RED
                    e.currentTarget.style.color = RED
                    e.currentTarget.style.background = `${RED}06`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                    e.currentTarget.style.color = '#374151'
                    e.currentTarget.style.background = '#fff'
                  }}>
                  {q.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ROTATING HINTS
───────────────────────────────────────────────────────────── */
const HINTS = [
  'Search for a product…',
  'e.g. "laptop under 1500 TND"',
  'e.g. "show me popular shoes"',
  'e.g. "أبحث عن هاتف رخيص"',
  'e.g. "show me cheaper ones"',
  'e.g. "comment devenir vendeur?"',
]

/* ─────────────────────────────────────────────────────────────
   AI TEXT INPUT BAR
───────────────────────────────────────────────────────────── */
function AiInputBar({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void
  disabled: boolean
}) {
  const [value,   setValue]   = useState('')
  const [hintIdx, setHintIdx] = useState(0)

  useEffect(() => {
    if (value !== '') return
    const id = setInterval(() => {
      setHintIdx(i => (i + 1) % HINTS.length)
    }, 3000)
    return () => clearInterval(id)
  }, [value])

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit()
  }

  return (
    <div style={{
      display: 'flex', gap: 8, padding: '10px 14px 12px',
      borderTop: '1px solid #f1f5f9', flexShrink: 0,
      background: '#fff',
    }}>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder={HINTS[hintIdx]}
        style={{
          flex: 1, padding: '9px 12px',
          border: `1.5px solid ${disabled ? '#e5e7eb' : '#d1d5db'}`,
          borderRadius: 10, fontSize: 13, fontFamily: 'inherit',
          outline: 'none', background: disabled ? '#f9fafb' : '#fff',
          color: '#1a1a2e', transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = RED }}
        onBlur={e  => { e.currentTarget.style.borderColor = '#d1d5db' }}
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: disabled || !value.trim()
            ? '#f4f4f5'
            : `linear-gradient(135deg, ${RED}, #9b0f1f)`,
          border: 'none', cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', boxShadow: disabled || !value.trim()
            ? 'none'
            : `0 4px 12px ${RED}40`,
        }}
      >
        <svg width="16" height="16" fill="none"
          stroke={disabled || !value.trim() ? '#94a3b8' : '#fff'}
          strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M22 2L11 13" />
          <path d="M22 2L15 22 11 13 2 9l20-7z" />
        </svg>
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN WIDGET
───────────────────────────────────────────────────────────── */
export default function SupportChatWidget() {
  const [open,      setOpen]      = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('ai')

  const [faqMessages, setFaqMessages] = useState<ChatMessage[]>([FAQ_WELCOME])
  const [aiMessages,  setAiMessages]  = useState<ChatMessage[]>([AI_WELCOME])

  const [showMenu,  setShowMenu]  = useState(true)
  const [aiLoading, setAiLoading] = useState(false)

  // Session ID — sync from localStorage, never empty on first call
  const sessionId = useRef<string>(getOrCreateSessionId())

  // Messages ref — avoids stale closure in handleAiSend
  const aiMessagesRef = useRef<ChatMessage[]>(aiMessages)
  useEffect(() => { aiMessagesRef.current = aiMessages }, [aiMessages])

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-support-chat', handler)
    return () => window.removeEventListener('open-support-chat', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 80)
    }
  }, [faqMessages, aiMessages, open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  /* ── FAQ tab ────────────────────────────────────────────────────────── */
  const handleFaqQuestion = useCallback((q: Question) => {
    setShowMenu(false)

    const userMsg: ChatMessage   = { id: uid(), role: 'user', text: q.label }
    const typingId               = uid()
    const typingMsg: ChatMessage = { id: typingId, role: 'bot', text: '', typing: true }

    setFaqMessages(prev => [...prev, userMsg, typingMsg])

    setTimeout(() => {
      setFaqMessages(prev =>
        prev.map(m =>
          m.id === typingId
            ? { id: typingId, role: 'bot', text: q.response, actions: q.actions }
            : m
        )
      )
      setTimeout(() => {
        const askMore: ChatMessage = {
          id: uid(),
          role: 'bot',
          text: 'Is there anything else I can help you with?',
          actions: [{ label: '← Back to topics', onClick: () => setShowMenu(true) }],
        }
        setFaqMessages(prev => [...prev, askMore])
      }, 400)
    }, 900)
  }, [])

  /* ── AI tab ─────────────────────────────────────────────────────────── */
  const handleAiSend = useCallback(async (text: string) => {
    if (aiLoading) return

    const userMsg: ChatMessage   = { id: uid(), role: 'user', text }
    const typingId               = uid()
    const typingMsg: ChatMessage = { id: typingId, role: 'bot', text: '', typing: true }

    setAiMessages(prev => [...prev, userMsg, typingMsg])
    setAiLoading(true)

    try {
      const history: ConversationTurn[] = aiMessagesRef.current
        .filter(m => m.id !== 'ai-welcome' && !m.typing)
        .map(m => ({
          role:    m.role === 'user' ? 'user' : 'assistant',
          content: m.text,
        }))

      const result = await aiChatApi(text, history, sessionId.current)
      console.log('INTENT:', result.intent) // ← add this
console.log('ACTIONS:', resolveIntentActions(result.intent)) // ← and this
      // ── ONE setAiMessages call. resolveIntentActions is the only
      //    source of action buttons — no duplicate logic anywhere.
      const actions = resolveIntentActions(result.intent)

      setAiMessages(prev =>
        prev.map(m =>
          m.id === typingId
            ? {
                id:       typingId,
                role:     'bot' as MsgRole,
                text:     result.message,
                products: result.products,
                actions:  actions.length > 0 ? actions : undefined,
              }
            : m
        )
      )

    } catch {
      setAiMessages(prev =>
        prev.map(m =>
          m.id === typingId
            ? {
                id:   typingId,
                role: 'bot' as MsgRole,
                text: "Connexion interrompue. Vérifiez votre réseau et réessayez. 🙏",
              }
            : m
        )
      )
    } finally {
      setAiLoading(false)
    }
  }, [aiLoading])

  /* ── Reset ──────────────────────────────────────────────────────────── */
  const handleReset = () => {
    if (activeTab === 'faq') {
      setFaqMessages([FAQ_WELCOME])
      setShowMenu(true)
    } else {
      setAiMessages([AI_WELCOME])
      sessionId.current = createFreshSessionId()
    }
  }

  if (!open) return null

  const currentMessages = activeTab === 'faq' ? faqMessages : aiMessages

  return (
    <>
      <style>{`
        @keyframes ct-fadein  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes ct-slidein { from{opacity:0;transform:translateY(20px) scale(0.96)} to{opacity:1;transform:none scale(1)} }
        @keyframes ct-bounce  { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)',
          animation: 'ct-fadein 0.2s ease both',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        bottom: 24, right: 24,
        width: 380, maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 48px)',
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 24px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
        zIndex: 10001,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'ct-slidein 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>

        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${RED} 0%, #9b0f1f 100%)`,
          padding: '16px 18px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>🤝</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 900, color: '#fff', margin: 0 }}>
              ChooseTounsi Assistant
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: '#4ade80',
                boxShadow: '0 0 0 2px rgba(74,222,128,0.3)',
              }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                {activeTab === 'ai' ? 'AI Shopping Assistant' : 'Support · Replies instantly'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleReset} title="Restart"
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                border: 'none', cursor: 'pointer', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
            <button onClick={() => setOpen(false)} title="Close"
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                border: 'none', cursor: 'pointer', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>
              ✕
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', flexShrink: 0,
          borderBottom: '1px solid #f1f5f9',
          background: '#fafafa',
        }}>
          {(['ai', 'faq'] as ActiveTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '10px 0',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 800,
                letterSpacing: '0.03em', textTransform: 'uppercase',
                color: activeTab === tab ? RED : '#94a3b8',
                borderBottom: activeTab === tab ? `2.5px solid ${RED}` : '2.5px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {tab === 'ai' ? '🛍️ Shop with AI' : '❓ Support FAQ'}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
          display: 'flex', flexDirection: 'column', gap: 12,
          scrollbarWidth: 'thin', scrollbarColor: '#f1f5f9 transparent',
        }}>
          {currentMessages.map(msg => (
            <Bubble key={msg.id} msg={msg} />
          ))}

          {activeTab === 'faq' && showMenu && (
            <div style={{ animation: 'ct-fadein 0.2s ease 0.1s both', opacity: 0 }}>
              <p style={{
                fontSize: 11, fontWeight: 800, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.07em',
                marginBottom: 8, paddingLeft: 2,
              }}>
                Choose a topic
              </p>
              <QuestionMenu onSelect={handleFaqQuestion} />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Bottom area */}
        {activeTab === 'ai' ? (
          <AiInputBar onSend={handleAiSend} disabled={aiLoading} />
        ) : (
          <div style={{
            padding: '10px 16px 12px',
            borderTop: '1px solid #f1f5f9', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <p style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600, margin: 0 }}>
              Powered by ChooseTounsi
            </p>
            <Link href="/complaints/new" style={{
              fontSize: 11, fontWeight: 700, color: RED,
              textDecoration: 'none', padding: '4px 10px',
              borderRadius: 6, border: `1px solid ${RED}30`,
              background: `${RED}06`, whiteSpace: 'nowrap',
            }}>
              🚨 File a Complaint
            </Link>
          </div>
        )}
      </div>
    </>
  )
}