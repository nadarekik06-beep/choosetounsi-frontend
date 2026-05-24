'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const RED   = '#db142e'
const GREEN = '#198f41'
const DARK  = '#9b0f1f'

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api')
  .replace(/\/api\/?$/, '') + '/api'

/* ─────────────────────────────────────────────────────────────
   TYPES  (unchanged)
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
   SESSION ID  (unchanged)
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
   API  (unchanged)
───────────────────────────────────────────────────────────── */
async function aiChatApi(
  userMessage: string,
  history: ConversationTurn[],
  sessionId: string,
  langHint: string = 'en',
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
      locale:     typeof window !== 'undefined' ? document.documentElement.lang || 'en' : 'en',
      lang_hint:  langHint,
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
   INTENT → ACTION BUTTONS  (unchanged)
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
   QUESTION TREE  (unchanged)
───────────────────────────────────────────────────────────── */
const QUESTION_GROUPS: QuestionGroup[] = [
  {
    title: 'Orders & Tracking',
    questions: [
      {
        id: 'where-order',
        label: 'Where is my order?',
        response: "You can track your order in real time from your orders page. If your order is still processing, it may take 24–48 hours before a tracking update appears. Need more details?",
        actions: [{ label: '📦 View My Orders', href: '/orders' }],
      },
      {
        id: 'track-order',
        label: 'I want to track my order',
        response: "Head to your orders page — each order shows its current status and delivery progress. If you don't see an update within 48 hours of placing your order, please reach out to us.",
        actions: [{ label: '🔍 Track Now', href: '/orders' }],
      },
      {
        id: 'delayed-order',
        label: 'My order is delayed',
        response: "We're sorry to hear that! Delays can happen due to high demand or logistics. Please check your order status first — if the estimated date has passed by more than 3 days, file a complaint so we can investigate.",
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
        response: "That shouldn't happen! Please file a complaint immediately with your order number and a description of the situation. Our team reviews all delivery disputes within 24 hours.",
        actions: [{ label: '🚨 File a Complaint', href: '/complaints/new' }],
      },
      {
        id: 'missing-damaged',
        label: 'Order missing / damaged / incorrect',
        response: "We sincerely apologise. Please file a complaint — attach a photo if possible so the seller can review it quickly. We aim to resolve all product issues within 3 business days.",
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
        response: "You can request a return within 14 days of delivery. Go to your orders, select the delivered order, and click 'Report Issue'. Our team will guide you through the return steps.",
        actions: [{ label: '🔄 Start a Return', href: '/orders' }],
      },
      {
        id: 'return-status',
        label: 'Check the status of my return',
        response: "Return status is visible under My Complaints. Once the seller approves your return, we'll update the status and initiate the refund process.",
        actions: [{ label: '🚨 My Complaints', href: '/complaints' }],
      },
      {
        id: 'refund',
        label: 'When will I receive my refund?',
        response: "After your return is approved, refunds typically process within 5–7 business days depending on your payment method. COD refunds are issued as store credit or via bank transfer.",
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
        response: "Payment issues can occur due to bank restrictions or incorrect card details. ChooseTounsi currently supports Cash on Delivery (COD). If you encountered an unexpected charge, please contact us directly.",
        actions: [{ label: '✉️ Contact Support', href: 'mailto:support@choosetounsi.tn' }],
      },
      {
        id: 'update-account',
        label: 'Update my account information',
        response: "You can update your name, email, phone and password from your profile page at any time.",
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
        response: "Our support team is available Saturday–Thursday, 9 AM – 6 PM (Tunisia time). You can reach us at support@choosetounsi.tn or via the form below.",
        actions: [{ label: '✉️ Email Support', href: 'mailto:support@choosetounsi.tn' }],
      },
      {
        id: 'other',
        label: 'Something else',
        response: "No problem! Please email us at support@choosetounsi.tn and describe your issue in detail. We typically respond within 4 business hours.",
        actions: [{ label: '✉️ Email Us', href: 'mailto:support@choosetounsi.tn' }],
      },
    ],
  },
]

/* ─────────────────────────────────────────────────────────────
   WELCOME MESSAGES  (unchanged)
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
   PEPPER FAB BUTTON  (NEW)
   Uses /images/logo-chili.png from public/images/
───────────────────────────────────────────────────────────── */
function PepperFAB({
  onClick,
  showBadge,
  hasNewMessage,
}: {
  onClick: () => void
  showBadge: boolean
  hasNewMessage: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const [pulse,   setPulse]   = useState(false)

  // Pulse every 6 seconds when closed to draw attention
  useEffect(() => {
    const id = setInterval(() => {
      setPulse(true)
      setTimeout(() => setPulse(false), 1000)
    }, 6000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      {/* Pulse ring */}
      {pulse && (
        <div style={{
          position: 'absolute',
          inset: -6,
          borderRadius: '50%',
          border: `2px solid ${RED}`,
          animation: 'ct-pulse-ring 0.9s ease-out forwards',
          pointerEvents: 'none',
        }} />
      )}

      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute',
          bottom: '110%',
          right: 0,
          background: '#1a1a2e',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          padding: '6px 12px',
          borderRadius: 8,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          animation: 'ct-fadein 0.15s ease both',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}>
          🛍️ Ask AI Assistant
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 18,
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid #1a1a2e',
          }} />
        </div>
      )}

      {/* Notification badge */}
      {showBadge && (
        <div style={{
          position: 'absolute',
          top: -3,
          right: -3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: GREEN,
          border: '2px solid #fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          fontWeight: 900,
          color: '#fff',
          zIndex: 2,
          animation: hasNewMessage ? 'ct-badge-bounce 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
        }}>
          1
        </div>
      )}

      {/* Main FAB button */}
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Open AI Shopping Assistant"
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${RED} 0%, ${DARK} 100%)`,
          border: `3px solid ${GREEN}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: hovered
            ? `0 8px 30px ${RED}60, 0 0 0 4px ${RED}20`
            : `0 6px 24px ${RED}50`,
          transform: hovered ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
          transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          overflow: 'hidden',
          position: 'relative',
          padding: 0,
        }}
      >
        {/* Chili image — uses logo-chili.png from public/images/ */}
        <Image
          src="/images/logo-chili.png"
          alt="AI Assistant"
          width={36}
          height={36}
          style={{
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            transform: hovered ? 'rotate(-12deg) scale(1.08)' : 'rotate(0deg) scale(1)',
            transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        />
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   TYPING BUBBLE  (unchanged)
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
   PRODUCT CARD  (unchanged logic, minor style polish)
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
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#e5e7eb'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'none'
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
   MESSAGE BUBBLE  (unchanged logic, avatar now uses chili)
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
          width: 28, height: 28, borderRadius: '50%',
          background: `linear-gradient(135deg, ${RED}, ${DARK})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 2, overflow: 'hidden',
          border: `1.5px solid ${GREEN}`,
          flexShrink: 0,
        }}>
          <Image
            src="/images/logo-chili.png"
            alt="Assistant"
            width={18}
            height={18}
            style={{ objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
          />
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
            background: isBot ? '#f4f4f5' : `linear-gradient(135deg, ${RED}, ${DARK})`,
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
   QUESTION MENU  (unchanged)
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
   ROTATING HINTS  (unchanged)
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
   AI TEXT INPUT BAR  (unchanged)
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
            : `linear-gradient(135deg, ${RED}, ${DARK})`,
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
   CHAT PANEL HEADER  (new sub-component, cleaner separation)
───────────────────────────────────────────────────────────── */
function PanelHeader({
  activeTab,
  onReset,
  onClose,
}: {
  activeTab: ActiveTab
  onReset: () => void
  onClose: () => void
}) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${RED} 0%, ${DARK} 100%)`,
      padding: '14px 16px 12px',
      display: 'flex', alignItems: 'center', gap: 11,
      flexShrink: 0,
    }}>
      {/* Chili avatar */}
      <div style={{
        width: 42, height: 42, borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)',
        border: '2px solid rgba(255,255,255,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, overflow: 'hidden',
      }}>
        <Image
          src="/images/logo-chili.png"
          alt="Assistant"
          width={28}
          height={28}
          style={{ objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
          ChooseTounsi Assistant
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
          {/* Live green dot */}
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#4ade80',
            boxShadow: '0 0 0 2px rgba(74,222,128,0.35)',
            display: 'inline-block',
          }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.82)', fontWeight: 600 }}>
            {activeTab === 'ai' ? 'AI Shopping Assistant · Online' : 'Support · Replies instantly'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 5 }}>
        <button onClick={onReset} title="New conversation"
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)',
            cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        <button onClick={onClose} title="Close"
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)',
            cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}>
          ✕
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN WIDGET  (all original logic unchanged, new FAB added)
───────────────────────────────────────────────────────────── */
export default function SupportChatWidget() {
  const [open,      setOpen]      = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('ai')

  const [faqMessages, setFaqMessages] = useState<ChatMessage[]>([FAQ_WELCOME])
  const [aiMessages,  setAiMessages]  = useState<ChatMessage[]>([AI_WELCOME])

  const [showMenu,     setShowMenu]     = useState(true)
  const [aiLoading,    setAiLoading]    = useState(false)
  const [showFAB,      setShowFAB]      = useState(false)
  const [showBadge,    setShowBadge]    = useState(false)
  const [hasNewMsg,    setHasNewMsg]    = useState(false)

  const sessionId      = useRef<string>(getOrCreateSessionId())
  const aiMessagesRef  = useRef<ChatMessage[]>(aiMessages)
  const bottomRef      = useRef<HTMLDivElement>(null)

  useEffect(() => { aiMessagesRef.current = aiMessages }, [aiMessages])

  // Show FAB after 1.5s on mount, badge after 4s
  useEffect(() => {
    const t1 = setTimeout(() => setShowFAB(true),  1500)
    const t2 = setTimeout(() => { setShowBadge(true); setHasNewMsg(true) }, 4000)
    const t3 = setTimeout(() => setHasNewMsg(false), 4800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  // Remove badge once opened
  const handleOpen = () => {
    setOpen(true)
    setShowBadge(false)
  }

  useEffect(() => {
    const handler = () => handleOpen()
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

  /* ── FAQ tab (unchanged) ──────────────────────────────────────────────── */
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

  /* ── AI tab (unchanged) ───────────────────────────────────────────────── */
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

      const langHint = /[\u0600-\u06FF]/.test(text)
        ? 'ar'
        : /\b(bahi|3andna|nheb|warini|barcha|mafamach|hedha|hedhy)\b/i.test(text)
        ? 'tz'
        : /\b(je|tu|veux|cherche|bonjour|merci|besoin|nous|vous)\b/i.test(text)
        ? 'fr'
        : 'en'

      const result = await aiChatApi(text, history, sessionId.current, langHint)

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

  /* ── Reset (unchanged) ────────────────────────────────────────────────── */
  const handleReset = () => {
    if (activeTab === 'faq') {
      setFaqMessages([FAQ_WELCOME])
      setShowMenu(true)
    } else {
      setAiMessages([AI_WELCOME])
      sessionId.current = createFreshSessionId()
    }
  }

  const currentMessages = activeTab === 'faq' ? faqMessages : aiMessages

  return (
    <>
      {/* ── All animations ──────────────────────────────────────────────── */}
      <style>{`
        @keyframes ct-fadein      { from{opacity:0;transform:translateY(8px)}   to{opacity:1;transform:none} }
        @keyframes ct-slidein     { from{opacity:0;transform:translateY(24px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes ct-bounce      { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes ct-fab-in      { from{opacity:0;transform:scale(0.4) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes ct-pulse-ring  { from{opacity:0.8;transform:scale(1)} to{opacity:0;transform:scale(1.7)} }
        @keyframes ct-badge-bounce{ 0%{transform:scale(0)} 60%{transform:scale(1.3)} 100%{transform:scale(1)} }
        @media (max-width: 480px) {
          .ct-panel {
            bottom: 0 !important;
            right: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 20px 20px 0 0 !important;
            max-height: 92vh !important;
          }
        }
      `}</style>

      {/* ── Floating Action Button ───────────────────────────────────────── */}
      {showFAB && !open && (
        <div style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          zIndex: 10002,
          animation: 'ct-fab-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <PepperFAB
            onClick={handleOpen}
            showBadge={showBadge}
            hasNewMessage={hasNewMsg}
          />
        </div>
      )}

      {/* ── Open state ───────────────────────────────────────────────────── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 10000,
              background: 'rgba(0,0,0,0.22)',
              backdropFilter: 'blur(2px)',
              animation: 'ct-fadein 0.2s ease both',
            }}
          />

          {/* Panel */}
          <div
            className="ct-panel"
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              width: 385,
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100vh - 48px)',
              background: '#fff',
              borderRadius: 20,
              boxShadow: `0 28px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05), 0 0 0 3px ${RED}18`,
              zIndex: 10001,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'ct-slidein 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
            }}>

            {/* Header */}
            <PanelHeader
              activeTab={activeTab}
              onReset={handleReset}
              onClose={() => setOpen(false)}
            />

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
      )}
    </>
  )
}