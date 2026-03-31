'use client'

/**
 * components/SupportChatWidget.tsx
 *
 * Help & Support Chat Widget — ChooseTounsi
 *
 * Architecture:
 *  - Opens via window event 'open-support-chat' (fired from Navbar util-link)
 *  - Fully client-side, no backend calls needed
 *  - Reusable: drop into layout.tsx next to CartDrawer
 *  - Extensible: swap static responses for API calls later
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'

/* ─────────────────────────────────────────────────────────────
   THEME
───────────────────────────────────────────────────────────── */
const RED   = '#db142e'
const GREEN = '#198f41'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type MsgRole = 'bot' | 'user'

interface ChatMessage {
  id: string
  role: MsgRole
  text: string
  /** If role=bot, optional action nodes rendered below text */
  actions?: Action[]
  /** Show typing animation before revealing text */
  typing?: boolean
}

interface Action {
  label: string
  href?: string           // navigate to a Next.js route
  onClick?: () => void    // trigger another Q/A turn
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
        actions: [
          { label: '📦 View My Orders', href: '/orders' },
        ],
      },
      {
        id: 'track-order',
        label: 'I want to track my order',
        response:
          "Head to your orders page — each order shows its current status and delivery progress. If you don't see an update within 48 hours of placing your order, please reach out to us.",
        actions: [
          { label: '🔍 Track Now', href: '/orders' },
        ],
      },
      {
        id: 'delayed-order',
        label: 'My order is delayed',
        response:
          "We're sorry to hear that! Delays can happen due to high demand or logistics. Please check your order status first — if the estimated date has passed by more than 3 days, file a complaint so we can investigate.",
        actions: [
          { label: '📋 Check Order Status', href: '/orders' },
          { label: '🚨 File a Complaint',    href: '/complaints/new' },
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
        actions: [
          { label: '🚨 File a Complaint', href: '/complaints/new' },
        ],
      },
      {
        id: 'missing-damaged',
        label: 'Order missing / damaged / incorrect',
        response:
          "We sincerely apologise. Please file a complaint — attach a photo if possible so the seller can review it quickly. We aim to resolve all product issues within 3 business days.",
        actions: [
          { label: '📸 Report Issue', href: '/complaints/new' },
          { label: '📦 My Orders',    href: '/orders' },
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
        actions: [
          { label: '🔄 Start a Return', href: '/orders' },
        ],
      },
      {
        id: 'return-status',
        label: 'Check the status of my return',
        response:
          "Return status is visible under My Complaints. Once the seller approves your return, we'll update the status and initiate the refund process.",
        actions: [
          { label: '🚨 My Complaints', href: '/complaints' },
        ],
      },
      {
        id: 'refund',
        label: 'When will I receive my refund?',
        response:
          "After your return is approved, refunds typically process within 5–7 business days depending on your payment method. COD refunds are issued as store credit or via bank transfer.",
        actions: [
          { label: '🚨 Check Complaint Status', href: '/complaints' },
        ],
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
        actions: [
          { label: '✉️ Contact Support', href: 'mailto:support@choosetounsi.tn' },
        ],
      },
      {
        id: 'update-account',
        label: 'Update my account information',
        response:
          "You can update your name, email, phone and password from your profile page at any time.",
        actions: [
          { label: '👤 My Profile', href: '/profile' },
        ],
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
        actions: [
          { label: '✉️ Email Support', href: 'mailto:support@choosetounsi.tn' },
        ],
      },
      {
        id: 'other',
        label: 'Something else',
        response:
          "No problem! Please email us at support@choosetounsi.tn and describe your issue in detail. We typically respond within 4 business hours.",
        actions: [
          { label: '✉️ Email Us', href: 'mailto:support@choosetounsi.tn' },
        ],
      },
    ],
  },
]

/* ─────────────────────────────────────────────────────────────
   WELCOME
───────────────────────────────────────────────────────────── */
const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'bot',
  text: 'Hello! 👋 Welcome to ChooseTounsi Support.\n\nHow can I assist you today? Please choose a topic below, or pick a specific question.',
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
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
      padding: '10px 14px', background: '#f4f4f5', borderRadius: '16px 16px 16px 4px',
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
      {/* Avatar */}
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

      <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 6, alignItems: isBot ? 'flex-start' : 'flex-end' }}>
        {/* Text bubble */}
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

        {/* Action buttons */}
        {!msg.typing && msg.actions && msg.actions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 2 }}>
            {msg.actions.map((action, i) => (
              action.href ? (
                <Link key={i} href={action.href}
                  style={{
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
                <button key={i} onClick={action.onClick}
                  style={{
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
        <div key={group.title}
          style={{
            border: `1px solid ${openGroup === group.title ? RED + '40' : '#e5e7eb'}`,
            borderRadius: 12, overflow: 'hidden',
            transition: 'border-color 0.2s',
          }}>
          {/* Group header */}
          <button
            onClick={() => setOpenGroup(o => o === group.title ? null : group.title)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px', background: openGroup === group.title ? `${RED}06` : '#fafafa',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 800, color: openGroup === group.title ? RED : '#374151',
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

          {/* Questions */}
          {openGroup === group.title && (
            <div style={{ padding: '6px 10px 10px', display: 'flex', flexDirection: 'column', gap: 4, animation: 'ct-fadein 0.15s ease both' }}>
              {group.questions.map(q => (
                <button key={q.id} onClick={() => onSelect(q)}
                  style={{
                    textAlign: 'left', padding: '8px 12px',
                    background: '#fff', border: `1.5px solid #e5e7eb`,
                    borderRadius: 8, cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: '#374151',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                    lineHeight: 1.4,
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
   MAIN WIDGET
───────────────────────────────────────────────────────────── */
export default function SupportChatWidget() {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG])
  const [showMenu, setShowMenu] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  /* Listen for the global open event fired by the Navbar button */
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-support-chat', handler)
    return () => window.removeEventListener('open-support-chat', handler)
  }, [])

  /* Scroll to bottom on new message */
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 80)
    }
  }, [messages, open])

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  /* Handle question selection */
  const handleQuestion = useCallback((q: Question) => {
    setShowMenu(false)

    // Add user bubble
    const userMsg: ChatMessage = { id: uid(), role: 'user', text: q.label }
    // Typing placeholder
    const typingId = uid()
    const typingMsg: ChatMessage = { id: typingId, role: 'bot', text: '', typing: true }

    setMessages(prev => [...prev, userMsg, typingMsg])

    // After typing delay → replace with real response
    setTimeout(() => {
      setMessages(prev =>
        prev.map(m =>
          m.id === typingId
            ? { id: typingId, role: 'bot', text: q.response, actions: q.actions }
            : m
        )
      )

      // After response → show "ask another?" prompt
      setTimeout(() => {
        const askMore: ChatMessage = {
          id: uid(),
          role: 'bot',
          text: 'Is there anything else I can help you with?',
          actions: [
            {
              label: '← Back to topics',
              onClick: () => setShowMenu(true),
            },
          ],
        }
        setMessages(prev => [...prev, askMore])
      }, 400)
    }, 900)
  }, [])

  const handleReset = () => {
    setMessages([WELCOME_MSG])
    setShowMenu(true)
  }

  if (!open) return null

  return (
    <>
      <style>{`
        @keyframes ct-fadein    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes ct-slidein   { from{opacity:0;transform:translateY(20px) scale(0.96)} to{opacity:1;transform:none scale(1)} }
        @keyframes ct-bounce    { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        .ct-action-btn:hover    { background:${GREEN}20!important; }
        .ct-q-btn:hover         { border-color:${RED}!important; color:${RED}!important; background:${RED}06!important; }
        .ct-group-hdr:hover     { color:${RED}!important; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(2px)',
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
        display: 'flex',
        flexDirection: 'column',
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
            <p style={{ fontSize: 14, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
              ChooseTounsi Support
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 0 2px rgba(74,222,128,0.3)',
              }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                Online · Replies instantly
              </span>
            </div>
          </div>

          {/* Reset + Close */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleReset} title="Restart"
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                border: 'none', cursor: 'pointer', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
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
                fontSize: 16, transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
              ✕
            </button>
          </div>
        </div>

        {/* Green accent strip */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${GREEN}, ${GREEN}80, transparent)`, flexShrink: 0 }} />

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
          display: 'flex', flexDirection: 'column', gap: 12,
          scrollbarWidth: 'thin', scrollbarColor: '#f1f5f9 transparent',
        }}>
          {messages.map(msg => (
            <Bubble key={msg.id} msg={msg} />
          ))}

          {/* Question menu — shown after welcome or "back to topics" */}
          {showMenu && (
            <div style={{ animation: 'ct-fadein 0.2s ease 0.1s both', opacity: 0 }}>
              <p style={{
                fontSize: 11, fontWeight: 800, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.07em',
                marginBottom: 8, paddingLeft: 2,
              }}>
                Choose a topic
              </p>
              <QuestionMenu onSelect={handleQuestion} />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 16px 12px',
          borderTop: '1px solid #f1f5f9',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8,
        }}>
          <p style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600, margin: 0 }}>
            Powered by ChooseTounsi
          </p>
          <Link href="/complaints/new"
            style={{
              fontSize: 11, fontWeight: 700,
              color: RED, textDecoration: 'none',
              padding: '4px 10px', borderRadius: 6,
              border: `1px solid ${RED}30`,
              background: `${RED}06`,
              whiteSpace: 'nowrap',
            }}>
            🚨 File a Complaint
          </Link>
        </div>
      </div>
    </>
  )
}