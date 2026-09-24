'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'
import ChatProductCard, { CHAT_PRODUCT_CARD_CSS, type ChatLang, type ChatProduct } from './chat/ChatProductCard'
import ChatStepsCard, { type ChatStep } from './chat/ChatStepsCard'
import ChatActions, { CHAT_ACTIONS_CSS, sanitizeActions, type ChatAction } from './chat/ChatActions'

const RED   = '#db142e'
const GREEN = '#198f41'
const DARK  = '#9b0f1f'

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api')
  .replace(/\/api\/?$/, '') + '/api'

const AI_TIMEOUT_MS = 30_000

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type MsgRole   = 'bot' | 'user'
type ActiveTab = 'ai' | 'faq'

/** POST /api/ai/chat response. The backend decides the language and the buttons. */
interface AiChatApiResult {
  reply: string
  products: ChatProduct[]
  steps: ChatStep[]
  actions: ChatAction[]
  language: ChatLang
  intent: string
}

interface ChatMessage {
  id: string
  role: MsgRole
  text: string
  lang?: ChatLang
  products?: ChatProduct[]
  steps?: ChatStep[]
  /** AI tab: link / quick-reply buttons from the backend (or the starter buttons). */
  chatActions?: ChatAction[]
  /** FAQ tab: static buttons. */
  actions?: Action[]
  typing?: boolean
  /** Set on a failed AI request: the user text to resend with "Retry". */
  retryText?: string
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
   SESSION ID + CONVERSATION PERSISTENCE
   session id  → localStorage (server-side memory key)
   AI messages → sessionStorage (survives page navigation / reload in this tab)
───────────────────────────────────────────────────────────── */
const SESSION_STORAGE_KEY  = 'ct_chat_session_v1'
const MESSAGES_STORAGE_KEY = 'ct_chat_ai_messages_v2'
const MAX_STORED_MESSAGES  = 40

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

function loadStoredMessages(): ChatMessage[] | null {
  try {
    const raw = sessionStorage.getItem(MESSAGES_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed
      .filter((m): m is ChatMessage => m && typeof m.id === 'string' && typeof m.text === 'string' && !m.typing)
      .map(m => ({ ...m, chatActions: sanitizeActions(m.chatActions) }))
  } catch {
    return null
  }
}

function storeMessages(messages: ChatMessage[]): void {
  try {
    const clean = messages.filter(m => !m.typing).slice(-MAX_STORED_MESSAGES)
    sessionStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(clean))
  } catch { /* storage full or blocked — conversation just won't persist */ }
}

function clearStoredMessages(): void {
  try { sessionStorage.removeItem(MESSAGES_STORAGE_KEY) } catch { /* ignore */ }
}

/* ─────────────────────────────────────────────────────────────
   API — the conversation history lives on the server (per session_id)
───────────────────────────────────────────────────────────── */
class ChatRequestError extends Error {
  constructor(public kind: 'network' | 'timeout' | 'rate_limited' | 'server') {
    super(kind)
  }
}

async function aiChatApi(userMessage: string, sessionId: string): Promise<AiChatApiResult> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ct_auth_token') : null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Optional: lets the assistant show *your* orders. Never required.
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message: userMessage, session_id: sessionId }),
    })
  } catch (e) {
    throw new ChatRequestError(e instanceof DOMException && e.name === 'AbortError' ? 'timeout' : 'network')
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 429) throw new ChatRequestError('rate_limited')

  const json = await res.json().catch(() => null)
  if (!res.ok || !json || typeof json.reply !== 'string') throw new ChatRequestError('server')

  const steps: ChatStep[] = Array.isArray(json.steps)
    ? json.steps.filter((s: ChatStep) => s && typeof s.title === 'string' && typeof s.description === 'string')
    : []

  return {
    reply:    json.reply,
    products: Array.isArray(json.products) ? json.products : [],
    steps,
    actions:  sanitizeActions(json.actions),
    language: json.language === 'ar' || json.language === 'en' ? json.language : 'fr',
    intent:   json.intent ?? 'search',
  }
}

const ERROR_TEXT: Record<ChatLang, Record<ChatRequestError['kind'], string>> = {
  en: {
    network:      'Connection problem. Check your internet and try again.',
    timeout:      'The assistant is taking too long to answer. Please try again.',
    rate_limited: "You're sending messages too quickly. Wait a few seconds and try again.",
    server:       'Something went wrong on our side. Please try again.',
  },
  fr: {
    network:      'Problème de connexion. Vérifiez votre réseau et réessayez.',
    timeout:      "L'assistant met trop de temps à répondre. Réessayez.",
    rate_limited: 'Vous envoyez des messages trop vite. Patientez quelques secondes.',
    server:       'Un problème est survenu de notre côté. Réessayez.',
  },
  ar: {
    network:      'مشكلة في الاتصال. تثبّت من الإنترنت وعاود جرّب.',
    timeout:      'المساعد طوّل برشة في الرد. عاود جرّب.',
    rate_limited: 'تبعث في رسائل بالزربة. استنى شوية ثواني وعاود.',
    server:       'صارت مشكلة من عندنا. عاود جرّب.',
  },
}

const RETRY_LABEL: Record<ChatLang, string> = { en: '↻ Retry', fr: '↻ Réessayer', ar: '↻ عاود جرّب' }

/* ─────────────────────────────────────────────────────────────
   STARTER BUTTONS  (client-side, no API call until tapped)
   Messages match config/chatbot_kb.php quick replies so they hit the
   free rule-based path on the backend.
───────────────────────────────────────────────────────────── */
const STARTERS: Record<ChatLang, ChatAction[]> = {
  en: [
    { type: 'quick_reply', label: '🛍️ Find a product',  message: 'Help me find a product' },
    { type: 'quick_reply', label: '🛒 How to order',    message: 'How do I place an order?' },
    { type: 'quick_reply', label: '🏪 Become a seller', message: 'How do I become a seller?' },
    { type: 'quick_reply', label: '📦 Track my order',  message: 'Track my order' },
  ],
  fr: [
    { type: 'quick_reply', label: '🛍️ Trouver un produit', message: 'Aide-moi à trouver un produit' },
    { type: 'quick_reply', label: '🛒 Comment commander',  message: 'Comment passer une commande ?' },
    { type: 'quick_reply', label: '🏪 Devenir vendeur',    message: 'Comment devenir vendeur ?' },
    { type: 'quick_reply', label: '📦 Suivre ma commande', message: 'Où est ma commande ?' },
  ],
  ar: [
    { type: 'quick_reply', label: '🛍️ لوّج على منتج',   message: 'عاوني نلقى منتج' },
    { type: 'quick_reply', label: '🛒 كيفاش نكوموندي',  message: 'كيفاش نعمل طلبية؟' },
    { type: 'quick_reply', label: '🏪 نحب نولّي بائع',  message: 'كيفاش نحل بوتيك؟' },
    { type: 'quick_reply', label: '📦 وين طلبيتي',      message: 'وين الطلبية متاعي؟' },
  ],
}

const WELCOME_TEXT: Record<ChatLang, string> = {
  en: '🛍️ Hi! I\'m the Choose\'Tounsi assistant.\n\nI can find real products for you, explain how to order, track your orders, or help you open your store. For example:\n• "shoes between 50 and 100 DT"\n• "how do I pay?"',
  fr: '🛍️ Bonjour ! Je suis l\'assistant Choose\'Tounsi.\n\nJe peux vous trouver de vrais produits, expliquer comment commander, suivre vos commandes ou vous aider à ouvrir votre boutique. Par exemple :\n• « robe rouge moins de 80 dinars »\n• « comment payer ? »',
  ar: '🛍️ أهلا! أنا مساعد Choose\'Tounsi.\n\nنلقالك منتجات حقيقية، نفسّرلك كيفاش تكوموندي، نتبّع طلبياتك، ولا نعاونك تحل بوتيك. مثلاً:\n• «نحب عسل بأقل من 40 دينار»\n• «كيفاش نخلص؟»',
}

/** Starter language from the page / browser (the backend decides after the first message). */
function guessUiLang(): ChatLang {
  if (typeof window === 'undefined') return 'en'
  const lang = (document.documentElement.lang || navigator.language || 'en').toLowerCase()
  if (lang.startsWith('ar')) return 'ar'
  if (lang.startsWith('fr')) return 'fr'
  return 'en'
}

function aiWelcome(lang: ChatLang): ChatMessage {
  return { id: 'ai-welcome', role: 'bot', text: WELCOME_TEXT[lang], lang, chatActions: STARTERS[lang] }
}

/* ─────────────────────────────────────────────────────────────
   FAQ QUESTION TREE
   Texts checked against the backend rules (complaint window =
   Complaint::COMPLAINT_WINDOW_HOURS, payment methods = checkout).
───────────────────────────────────────────────────────────── */
const QUESTION_GROUPS: QuestionGroup[] = [
  {
    title: 'Orders & Tracking',
    questions: [
      {
        id: 'where-order',
        label: 'Where is my order?',
        response: "You can follow your order from your orders page — each order shows its current status (Pending, Processing, Out for Delivery, Delivered…). You can also ask the AI assistant \"Track my order\" while logged in.",
        actions: [{ label: '📦 View My Orders', href: '/orders' }],
      },
      {
        id: 'track-order',
        label: 'I want to track my order',
        response: "Head to your orders page — each order shows its current status and delivery progress. D17 orders stay Pending until our team confirms your transfer.",
        actions: [{ label: '🔍 Track Now', href: '/orders' }],
      },
      {
        id: 'delayed-order',
        label: 'My order is delayed',
        response: "We're sorry! Please check your order status first. Complaints can only be filed once an order is delivered, so if your order is taking too long, contact our support team with your order number.",
        actions: [
          { label: '📋 Check Order Status', href: '/orders' },
          { label: '✉️ Contact Support',   href: 'mailto:support@choosetounsi.tn' },
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
        response: "That shouldn't happen! If your order shows as Delivered, file a complaint within 48 hours of delivery with a description of the situation. Otherwise, contact our support team with your order number.",
        actions: [
          { label: '🚨 File a Complaint', href: '/complaints/new' },
          { label: '✉️ Contact Support',  href: 'mailto:support@choosetounsi.tn' },
        ],
      },
      {
        id: 'missing-damaged',
        label: 'Order missing / damaged / incorrect',
        response: "We sincerely apologise. File a complaint within 48 hours of delivery: choose the reason (wrong product, size, color, damaged…), describe the problem, attach a photo if possible, and ask for an exchange or a return & refund.",
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
        response: "You can request a return within 48 hours of delivery, one complaint per order. Go to Complaints → New complaint, select the order and items, describe the problem and choose \"Return & refund\" or \"Exchange\".",
        actions: [{ label: '🔄 Start a Return', href: '/complaints/new' }],
      },
      {
        id: 'return-status',
        label: 'Check the status of my return',
        response: "Return status is visible under My Complaints: Pending → Reviewing → Approved or Rejected. If the seller rejects it, our admin team reviews it.",
        actions: [{ label: '🚨 My Complaints', href: '/complaints' }],
      },
      {
        id: 'refund',
        label: 'When will I receive my refund?',
        response: "Once your return is approved, a courier picks up the item and your refund is processed. You can follow each step under My Complaints.",
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
        response: "At checkout you can pay by Cash on Delivery, Wallet, D17 or Bank Card (Visa / Mastercard via Stripe). If you encountered an unexpected charge, please contact us directly.",
        actions: [{ label: '✉️ Contact Support', href: 'mailto:support@choosetounsi.tn' }],
      },
      {
        id: 'update-account',
        label: 'Update my account information',
        response: "You can see your account details on your profile page and manage your delivery addresses in Account → Addresses. Forgot your password? Use \"Forgot Password?\" on the login page.",
        actions: [
          { label: '👤 My Profile',   href: '/profile' },
          { label: '🔑 Reset Password', href: '/auth/forgot-password' },
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
   WELCOME MESSAGES
───────────────────────────────────────────────────────────── */
const FAQ_WELCOME: ChatMessage = {
  id: 'faq-welcome',
  role: 'bot',
  text: 'Hello! 👋 Welcome to ChooseTounsi Support.\n\nHow can I assist you today? Please choose a topic below, or pick a specific question.',
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
   MESSAGE BUBBLE
   Bot replies carry the language chosen by the backend; Arabic is
   laid out right-to-left (text, steps, product cards and buttons).
───────────────────────────────────────────────────────────── */
interface BubbleHandlers {
  onRetry?: (text: string) => void
  onQuickReply?: (message: string) => void
  onNavigate?: () => void
  onOpenCart?: () => void
  busy?: boolean
}

function Bubble({ msg, onRetry, onQuickReply, onNavigate, onOpenCart, busy }: { msg: ChatMessage } & BubbleHandlers) {
  const isBot   = msg.role === 'bot'
  const lang    = msg.lang ?? 'fr'
  const dir     = msg.lang === 'ar' ? 'rtl' : msg.lang ? 'ltr' : 'auto'
  const isError = Boolean(msg.retryText)
  const wide    = Boolean(msg.products?.length || msg.steps?.length || msg.chatActions?.length)

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
            alt=""
            width={18}
            height={18}
            style={{ objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
          />
        </div>
      )}

      <div style={{
        maxWidth: wide ? '88%' : '80%',
        width: wide ? '88%' : undefined,
        display: 'flex', flexDirection: 'column',
        gap: 6, alignItems: isBot ? 'flex-start' : 'flex-end',
      }}>
        {msg.typing ? (
          <TypingBubble />
        ) : (
          <div
            dir={isBot ? dir : 'auto'}
            role={isError ? 'alert' : undefined}
            style={{
              padding: '10px 14px',
              background: isError ? '#fef2f2' : isBot ? '#f4f4f5' : `linear-gradient(135deg, ${RED}, ${DARK})`,
              color: isError ? '#991b1b' : isBot ? '#1a1a2e' : '#fff',
              border: isError ? '1px solid #fecaca' : 'none',
              borderRadius: isBot ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
              fontSize: 14, lineHeight: 1.6, fontWeight: 500,
              whiteSpace: 'pre-line', overflowWrap: 'anywhere',
              textAlign: 'start',
              fontFamily: msg.lang === 'ar' ? "'Segoe UI', Tahoma, 'Noto Sans Arabic', sans-serif" : 'inherit',
              boxShadow: isBot ? 'none' : `0 4px 12px ${RED}40`,
            }}>
            {msg.text}
          </div>
        )}

        {!msg.typing && msg.steps && msg.steps.length > 0 && (
          <div style={{ width: '100%', animation: 'ct-fadein 0.3s ease 0.05s both' }}>
            <ChatStepsCard steps={msg.steps} dir={dir} />
          </div>
        )}

        {!msg.typing && msg.products && msg.products.length > 0 && (
          <div dir={dir} style={{
            width: '100%', display: 'flex', flexDirection: 'column', gap: 6,
            animation: 'ct-fadein 0.3s ease 0.1s both',
          }}>
            {msg.products.map(p => (
              <ChatProductCard key={p.id} product={p} lang={lang} />
            ))}
          </div>
        )}

        {!msg.typing && isError && onRetry && (
          <button onClick={() => onRetry(msg.retryText!)} disabled={busy} style={{
            fontSize: 12, fontWeight: 700, color: RED,
            border: `1.5px solid ${RED}`, borderRadius: 8, padding: '6px 12px',
            background: '#fff', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>
            {RETRY_LABEL[lang]}
          </button>
        )}

        {!msg.typing && msg.chatActions && msg.chatActions.length > 0 && onQuickReply && (
          <ChatActions
            actions={msg.chatActions}
            dir={dir}
            disabled={busy}
            onQuickReply={onQuickReply}
            onNavigate={onNavigate ?? (() => {})}
            onOpenCart={onOpenCart ?? (() => {})}
          />
        )}

        {!msg.typing && msg.actions && msg.actions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingInlineStart: 2 }}>
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
  'e.g. "shoes under 100 DT"',
  'e.g. "sac entre 30 et 60 dinars"',
  'e.g. "أبحث عن ساعة رخيصة"',
  'e.g. "show me cheaper ones"',
  'e.g. "n7eb sabbat rkhis"',
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
      display: 'flex', gap: 8, padding: '10px 14px calc(12px + env(safe-area-inset-bottom))',
      borderTop: '1px solid #f1f5f9', flexShrink: 0,
      background: '#fff',
    }}>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder={HINTS[hintIdx]}
        aria-label="Message the shopping assistant"
        dir="auto"
        maxLength={500}
        enterKeyHint="send"
        style={{
          flex: 1, minWidth: 0, padding: '9px 12px',
          border: `1.5px solid ${disabled ? '#e5e7eb' : '#d1d5db'}`,
          // 16px stops iOS Safari from zooming into the field
          borderRadius: 10, fontSize: 16, fontFamily: 'inherit',
          outline: 'none', background: disabled ? '#f9fafb' : '#fff',
          color: '#1a1a2e', transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = RED }}
        onBlur={e  => { e.currentTarget.style.borderColor = '#d1d5db' }}
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send"
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
            {activeTab === 'ai' ? 'AI Assistant · Online' : 'Support · Replies instantly'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 5 }}>
        <button onClick={onReset} title={activeTab === 'ai' ? 'Clear chat' : 'Back to topics'} aria-label={activeTab === 'ai' ? 'Clear chat' : 'Restart'}
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
          {activeTab === 'ai' ? (
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" />
            </svg>
          ) : (
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          )}
        </button>
        <button onClick={onClose} title="Close" aria-label="Close"
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
   MAIN WIDGET
───────────────────────────────────────────────────────────── */
export default function SupportChatWidget() {
  const [open,      setOpen]      = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('ai')

  const [faqMessages, setFaqMessages] = useState<ChatMessage[]>([FAQ_WELCOME])
  // Same initial state on server and client; the real welcome / stored chat is set after mount.
  const [aiMessages,  setAiMessages]  = useState<ChatMessage[]>(() => [aiWelcome('en')])
  const [restored,    setRestored]    = useState(false)

  const [showMenu,     setShowMenu]     = useState(true)
  const [aiLoading,    setAiLoading]    = useState(false)
  const [showFAB,      setShowFAB]      = useState(false)
  const [showBadge,    setShowBadge]    = useState(false)
  const [hasNewMsg,    setHasNewMsg]    = useState(false)

  const sessionId = useRef<string>(getOrCreateSessionId())
  const lastLang  = useRef<ChatLang>('fr')
  const bottomRef = useRef<HTMLDivElement>(null)
  const { openDrawer } = useCart()

  // Restore this tab's conversation (kept across page navigations / reloads).
  useEffect(() => {
    const stored = loadStoredMessages()
    const lang   = guessUiLang()
    lastLang.current = lang
    setAiMessages(stored && stored.length > 0 ? stored : [aiWelcome(lang)])
    setRestored(true)
  }, [])

  useEffect(() => {
    if (restored) storeMessages(aiMessages)
  }, [aiMessages, restored])

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
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
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

  /* ── AI tab ───────────────────────────────────────────────────────────── */
  // The backend owns the conversation history (per session_id) and decides the
  // reply language; the widget only sends the text and renders what comes back.
  const handleAiSend = useCallback(async (text: string, isRetry = false) => {
    if (aiLoading) return

    const typingId               = uid()
    const typingMsg: ChatMessage = { id: typingId, role: 'bot', text: '', typing: true }

    setAiMessages(prev => {
      // A retry replaces the error bubble instead of repeating the user message.
      const base = isRetry
        ? prev.filter(m => !m.retryText)
        : [...prev, { id: uid(), role: 'user' as MsgRole, text }]
      return [...base, typingMsg]
    })
    setAiLoading(true)

    try {
      const result = await aiChatApi(text, sessionId.current)
      lastLang.current = result.language

      setAiMessages(prev =>
        prev.map(m =>
          m.id === typingId
            ? {
                id:       typingId,
                role:     'bot' as MsgRole,
                text:        result.reply,
                lang:        result.language,
                products:    result.products,
                steps:       result.steps,
                chatActions: result.actions,
              }
            : m
        )
      )
    } catch (e) {
      const kind = e instanceof ChatRequestError ? e.kind : 'server'
      const lang = lastLang.current
      setAiMessages(prev =>
        prev.map(m =>
          m.id === typingId
            ? { id: typingId, role: 'bot' as MsgRole, text: ERROR_TEXT[lang][kind], lang, retryText: text }
            : m
        )
      )
    } finally {
      setAiLoading(false)
    }
  }, [aiLoading])

  const handleAiRetry  = useCallback((text: string) => { handleAiSend(text, true) }, [handleAiSend])
  const handleQuickReply = useCallback((message: string) => { handleAiSend(message) }, [handleAiSend])

  // Link buttons navigate inside the app; close the panel so the page is visible.
  // The conversation stays (component lives in the root layout + sessionStorage).
  const handleNavigate = useCallback(() => setOpen(false), [])
  const handleOpenCart = useCallback(() => { setOpen(false); openDrawer() }, [openDrawer])

  /* ── Reset ──────────────────────────────────────────────────────────── */
  const handleReset = () => {
    if (activeTab === 'faq') {
      setFaqMessages([FAQ_WELCOME])
      setShowMenu(true)
    } else {
      // Clear chat: new server-side session (fresh memory) + forget the stored conversation.
      clearStoredMessages()
      setAiMessages([aiWelcome(lastLang.current)])
      sessionId.current = createFreshSessionId()
      setAiLoading(false)
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
            top: 0 !important;
            bottom: 0 !important;
            right: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
          }
          .ct-fab { bottom: 16px !important; right: 16px !important; }
        }
        ${CHAT_PRODUCT_CARD_CSS}
        ${CHAT_ACTIONS_CSS}
      `}</style>

      {/* ── Floating Action Button ───────────────────────────────────────── */}
      {showFAB && !open && (
        <div className="ct-fab" style={{
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
            role="dialog"
            aria-label="ChooseTounsi Assistant"
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
            <div
              aria-live="polite"
              aria-busy={activeTab === 'ai' && aiLoading}
              style={{
                flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px 16px 8px',
                display: 'flex', flexDirection: 'column', gap: 12,
                scrollbarWidth: 'thin', scrollbarColor: '#f1f5f9 transparent',
              }}>
              {currentMessages.map(msg => (
                activeTab === 'ai' ? (
                  <Bubble
                    key={msg.id}
                    msg={msg}
                    busy={aiLoading}
                    onRetry={handleAiRetry}
                    onQuickReply={handleQuickReply}
                    onNavigate={handleNavigate}
                    onOpenCart={handleOpenCart}
                  />
                ) : (
                  <Bubble key={msg.id} msg={msg} />
                )
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