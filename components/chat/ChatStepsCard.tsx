'use client'

const GREEN = '#198f41'

export interface ChatStep {
  title: string
  description: string
}

/** Numbered how-to steps (or the user's recent orders) under a bot message. */
export default function ChatStepsCard({ steps, dir }: { steps: ChatStep[]; dir: 'rtl' | 'ltr' | 'auto' }) {
  return (
    <ol dir={dir} style={{
      listStyle: 'none', margin: 0, padding: 10, width: '100%',
      background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {steps.map((step, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span aria-hidden style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
            background: `${GREEN}14`, border: `1.5px solid ${GREEN}55`, color: GREEN,
            fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: 1,
          }}>
            {i + 1}
          </span>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.35 }}>
              {step.title}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#4b5563', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
              {step.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
