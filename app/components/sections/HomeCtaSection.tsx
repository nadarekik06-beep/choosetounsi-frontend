'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'

export default function HomeCtaSection() {
  const router = useRouter()

  const handleSeller = () => {
    if (!isAuthenticated()) {
      router.push('/auth/login?redirect=/become-a-vendor')
      return
    }
    router.push('/become-a-vendor')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800;900&family=Barlow:wght@400;500;600;700;800&display=swap');

        @keyframes ctaFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes ctaShine {
          0%   { transform: translateX(-100%) rotate(25deg); }
          100% { transform: translateX(400%) rotate(25deg); }
        }
        @keyframes ctaPop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.06); }
          100% { transform: scale(1); }
        }

        /* ── Wrapper ── */
        .hcta-wrap {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          background: #f8f8f8;
        }
        @media (max-width: 768px) { .hcta-wrap { grid-template-columns: 1fr; } }

        /* ══════════════════════════════
           LEFT — Shop the Collection
        ══════════════════════════════ */
        .hcta-left {
          position: relative;
          overflow: hidden;
          padding: 56px 48px;
          background: #fff;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 18px;
          border-right: 1px solid #f0f0f0;
        }

        /* Decorative red circle top-right */
        .hcta-left__circle {
          position: absolute;
          top: -80px; right: -80px;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(219,20,46,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        /* Subtle dot pattern */
        .hcta-left__dots {
          position: absolute;
          inset: 0; pointer-events: none;
          background-image: radial-gradient(circle, #e5e5e5 1px, transparent 1px);
          background-size: 24px 24px;
          opacity: 0.5;
        }

        .hcta-left__tag {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: 'Barlow', sans-serif;
          font-size: 10px; font-weight: 800;
          letter-spacing: .14em; text-transform: uppercase;
          color: #db142e;
          position: relative; z-index: 1;
        }
        .hcta-left__tag-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #db142e;
        }

        .hcta-left__title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(2.2rem, 4vw, 3.2rem);
          font-weight: 900; color: #111;
          line-height: 1.0; letter-spacing: -.02em; margin: 0;
          position: relative; z-index: 1;
        }
        .hcta-left__title span {
          color: #db142e;
          position: relative;
          display: inline-block;
        }
        /* Underline accent */
        .hcta-left__title span::after {
          content: '';
          position: absolute;
          bottom: -4px; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #db142e, #ff6b6b);
          border-radius: 2px;
        }

        .hcta-left__sub {
          font-family: 'Barlow', sans-serif;
          font-size: .85rem; color: #666;
          font-weight: 500; line-height: 1.65; margin: 0;
          max-width: 300px; position: relative; z-index: 1;
        }

        /* Stats row */
        .hcta-left__stats {
          display: flex; gap: 24px; flex-wrap: wrap;
          position: relative; z-index: 1;
        }
        .hcta-left__stat {}
        .hcta-left__stat-num {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 1.5rem; font-weight: 900; color: #111;
          line-height: 1;
        }
        .hcta-left__stat-num span { color: #db142e; }
        .hcta-left__stat-label {
          font-family: 'Barlow', sans-serif;
          font-size: 10px; font-weight: 700;
          color: #999; text-transform: uppercase; letter-spacing: .06em;
          margin-top: 2px;
        }

        .hcta-left__btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: #db142e; color: #fff;
          font-family: 'Barlow', sans-serif;
          font-size: .75rem; font-weight: 800;
          letter-spacing: .09em; text-transform: uppercase;
          padding: 14px 28px; border-radius: 999px;
          text-decoration: none; width: fit-content;
          box-shadow: 0 6px 24px rgba(219,20,46,0.3);
          transition: transform .2s, box-shadow .2s, background .2s;
          position: relative; overflow: hidden; z-index: 1;
        }
        .hcta-left__btn::after {
          content: '';
          position: absolute;
          top: -50%; left: -60%;
          width: 30%; height: 200%;
          background: rgba(255,255,255,0.25);
          transform: rotate(25deg);
          animation: ctaShine 2.5s ease-in-out infinite;
        }
        .hcta-left__btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(219,20,46,0.4);
          background: #b91c1c;
        }
        .hcta-left__btn svg { flex-shrink: 0; }

        /* ══════════════════════════════
           RIGHT — Become a Seller
        ══════════════════════════════ */
        .hcta-right {
          position: relative;
          overflow: hidden;
          padding: 56px 48px;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 18px;
        }

        /* Decorative green circle */
        .hcta-right__circle {
          position: absolute;
          bottom: -60px; right: -60px;
          width: 240px; height: 240px; border-radius: 50%;
          background: radial-gradient(circle, rgba(25,143,65,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .hcta-right__circle2 {
          position: absolute;
          top: -40px; left: -40px;
          width: 160px; height: 160px; border-radius: 50%;
          background: radial-gradient(circle, rgba(25,143,65,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .hcta-right__tag {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: 'Barlow', sans-serif;
          font-size: 10px; font-weight: 800;
          letter-spacing: .14em; text-transform: uppercase;
          color: #15803d;
          position: relative; z-index: 1;
        }

        .hcta-right__title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(2.2rem, 4vw, 3.2rem);
          font-weight: 900; color: #111;
          line-height: 1.0; letter-spacing: -.02em; margin: 0;
          position: relative; z-index: 1;
        }
        .hcta-right__title span { color: #198f41; }

        .hcta-right__sub {
          font-family: 'Barlow', sans-serif;
          font-size: .85rem; color: #555;
          font-weight: 500; line-height: 1.65; margin: 0;
          max-width: 300px; position: relative; z-index: 1;
        }

        /* Perks */
        .hcta-right__perks {
          display: flex; flex-direction: column; gap: 8px;
          position: relative; z-index: 1;
        }
        .hcta-right__perk {
          display: flex; align-items: center; gap: 10px;
          font-family: 'Barlow', sans-serif;
          font-size: .82rem; color: #374151; font-weight: 600;
        }
        .hcta-right__perk-icon {
          width: 20px; height: 20px; border-radius: 50%;
          background: #198f41; color: #fff;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .hcta-right__btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: #198f41; color: #fff;
          font-family: 'Barlow', sans-serif;
          font-size: .75rem; font-weight: 800;
          letter-spacing: .09em; text-transform: uppercase;
          padding: 14px 28px; border-radius: 999px;
          width: fit-content; border: none; cursor: pointer;
          box-shadow: 0 6px 24px rgba(25,143,65,0.3);
          transition: transform .2s, box-shadow .2s, background .2s;
          position: relative; z-index: 1;
        }
        .hcta-right__btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(25,143,65,0.4);
          background: #15803d;
        }
        .hcta-icon { animation: ctaFloat 2.5s ease-in-out infinite; }

        /* Trust badges */
        .hcta-right__trust {
          display: flex; align-items: center; gap: 8px;
          font-family: 'Barlow', sans-serif;
          font-size: 10px; font-weight: 600; color: #6b7280;
          position: relative; z-index: 1;
        }
        .hcta-right__trust-dot {
          width: 3px; height: 3px; border-radius: 50%; background: #9ca3af;
        }

        @media (max-width: 640px) {
          .hcta-left, .hcta-right { padding: 40px 24px; }
          .hcta-left__stats { gap: 16px; }
        }
      `}</style>

      <div className="hcta-wrap">

        {/* ── LEFT — Shop the Collection ── */}
        <div className="hcta-left">
          <div className="hcta-left__dots" />
          <div className="hcta-left__circle" />

          <p className="hcta-left__tag">
            <span className="hcta-left__tag-dot" />
            Explore our brands
          </p>

          <h2 className="hcta-left__title">
            Shop the<br />
            <span>Collection</span>
          </h2>

          <p className="hcta-left__sub">
            Discover curated Tunisian fashion, handmade goods, and local brands — all in one place.
          </p>

          {/* Stats */}
          <div className="hcta-left__stats">
            <div className="hcta-left__stat">
              <div className="hcta-left__stat-num">500<span>+</span></div>
              <div className="hcta-left__stat-label">Products</div>
            </div>
            <div className="hcta-left__stat">
              <div className="hcta-left__stat-num">50<span>+</span></div>
              <div className="hcta-left__stat-label">Brands</div>
            </div>
            <div className="hcta-left__stat">
              <div className="hcta-left__stat-num">🇹🇳</div>
              <div className="hcta-left__stat-label">100% Local</div>
            </div>
          </div>

          <Link href="/brand" className="hcta-left__btn">
            Explore Now
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>

        {/* ── RIGHT — Become a Seller ── */}
        <div className="hcta-right">
          <div className="hcta-right__circle" />
          <div className="hcta-right__circle2" />

          <p className="hcta-right__tag">
            🏪 Join Tunisia&apos;s #1 marketplace
          </p>

          <h2 className="hcta-right__title">
            Start Selling<br />
            <span>Today</span>
          </h2>

          <p className="hcta-right__sub">
            Set up your store in minutes. Reach thousands of buyers across Tunisia.
          </p>

          <div className="hcta-right__perks">
            {[
              'Free to register — no setup fee',
              'Verified seller badge included',
              'Dedicated seller dashboard',
            ].map(perk => (
              <span key={perk} className="hcta-right__perk">
                <span className="hcta-right__perk-icon">
                  <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                {perk}
              </span>
            ))}
          </div>

          <button className="hcta-right__btn" onClick={handleSeller}>
            <span className="hcta-icon">🏪</span>
            Open Your Store
          </button>

          <div className="hcta-right__trust">
            <span>Free forever</span>
            <span className="hcta-right__trust-dot" />
            <span>No credit card</span>
            <span className="hcta-right__trust-dot" />
            <span>Start in 2 minutes</span>
          </div>
        </div>

      </div>
    </>
  )
}