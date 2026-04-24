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
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800;900&family=Barlow:wght@500;600;700;800&display=swap');
        @keyframes ctaFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}

        .hcta-wrap{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:0;
        }
        @media(max-width:768px){.hcta-wrap{grid-template-columns:1fr}}

        /* LEFT — Shop the Collection */
        .hcta-left{
          background:#111;
          position:relative;
          overflow:hidden;
          padding:52px 40px;
          display:flex;
          flex-direction:column;
          justify-content:center;
          gap:16px;
        }
        .hcta-left__bg{
          position:absolute;inset:0;pointer-events:none;
          background-image:linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px);
          background-size:32px 32px;
        }
        .hcta-left__glow{
          position:absolute;top:-60px;right:-60px;
          width:260px;height:260px;border-radius:50%;
          background:radial-gradient(circle,rgba(220,38,38,0.22) 0%,transparent 70%);
          pointer-events:none;
        }
        .hcta-left__tag{
          font-family:'Barlow',sans-serif;
          font-size:10px;font-weight:800;
          letter-spacing:.12em;text-transform:uppercase;
          color:rgba(255,255,255,0.4);
        }
        .hcta-left__title{
          font-family:'Barlow Condensed',sans-serif;
          font-size:clamp(2rem,4vw,3rem);
          font-weight:900;color:#fff;
          line-height:1.0;letter-spacing:-.01em;
          margin:0;
        }
        .hcta-left__title span{color:#dc2626}
        .hcta-left__sub{
          font-family:'Barlow',sans-serif;
          font-size:.82rem;color:rgba(255,255,255,0.45);
          font-weight:500;line-height:1.6;margin:0;
          max-width:280px;
        }
        .hcta-left__btn{
          display:inline-flex;align-items:center;gap:8px;
          background:#dc2626;color:#fff;
          font-family:'Barlow',sans-serif;
          font-size:.75rem;font-weight:800;
          letter-spacing:.09em;text-transform:uppercase;
          padding:12px 26px;border-radius:999px;
          text-decoration:none;width:fit-content;
          box-shadow:0 6px 20px rgba(220,38,38,0.4);
          transition:background .2s,transform .2s,box-shadow .2s;
        }
        .hcta-left__btn:hover{background:#b91c1c;transform:translateY(-2px);box-shadow:0 10px 28px rgba(220,38,38,0.5)}

        /* RIGHT — Become a Seller */
        .hcta-right{
          background:#198f41;
          position:relative;
          overflow:hidden;
          padding:52px 40px;
          display:flex;
          flex-direction:column;
          justify-content:center;
          gap:16px;
        }
        .hcta-right__bg{
          position:absolute;inset:0;pointer-events:none;
          background-image:linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px);
          background-size:32px 32px;
        }
        .hcta-right__glow{
          position:absolute;bottom:-60px;left:-60px;
          width:240px;height:240px;border-radius:50%;
          background:radial-gradient(circle,rgba(255,255,255,0.12) 0%,transparent 70%);
          pointer-events:none;
        }
        .hcta-right__tag{
          font-family:'Barlow',sans-serif;
          font-size:10px;font-weight:800;
          letter-spacing:.12em;text-transform:uppercase;
          color:rgba(255,255,255,0.55);
        }
        .hcta-right__title{
          font-family:'Barlow Condensed',sans-serif;
          font-size:clamp(2rem,4vw,3rem);
          font-weight:900;color:#fff;
          line-height:1.0;letter-spacing:-.01em;
          margin:0;
        }
        .hcta-right__sub{
          font-family:'Barlow',sans-serif;
          font-size:.82rem;color:rgba(255,255,255,0.65);
          font-weight:500;line-height:1.6;margin:0;
          max-width:280px;
        }
        .hcta-right__perks{
          display:flex;flex-direction:column;gap:5px;
        }
        .hcta-right__perk{
          display:flex;align-items:center;gap:7px;
          font-family:'Barlow',sans-serif;
          font-size:.75rem;color:rgba(255,255,255,0.7);font-weight:600;
        }
        .hcta-right__perk-dot{
          width:5px;height:5px;border-radius:50%;
          background:rgba(255,255,255,0.7);flex-shrink:0;
        }
        .hcta-right__btn{
          display:inline-flex;align-items:center;gap:8px;
          background:#fff;color:#198f41;
          font-family:'Barlow',sans-serif;
          font-size:.75rem;font-weight:800;
          letter-spacing:.09em;text-transform:uppercase;
          padding:12px 26px;border-radius:999px;
          width:fit-content;border:none;cursor:pointer;
          box-shadow:0 6px 20px rgba(0,0,0,0.15);
          transition:background .2s,transform .2s,box-shadow .2s;
        }
        .hcta-right__btn:hover{background:#f0fdf4;transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,0.2)}
        .hcta-icon{animation:ctaFloat 2.5s ease-in-out infinite}
      `}</style>

      <div className="hcta-wrap">

        {/* LEFT — Shop the Collection */}
        <div className="hcta-left">
          <div className="hcta-left__bg" />
          <div className="hcta-left__glow" />
          <p className="hcta-left__tag">✦ Explore our brands</p>
          <h2 className="hcta-left__title">
            Shop the<br />
            <span>Collection</span>
          </h2>
          <p className="hcta-left__sub">
            Discover curated Tunisian fashion, handmade goods, and local brands.
          </p>
          <Link href="/brand" className="hcta-left__btn">
            Explore Now
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>

        {/* RIGHT — Become a Seller */}
        <div className="hcta-right">
          <div className="hcta-right__bg" />
          <div className="hcta-right__glow" />
          <p className="hcta-right__tag">🏪 Join Tunisia's #1 marketplace</p>
          <h2 className="hcta-right__title">
            Start Selling<br />
            Today
          </h2>
          <p className="hcta-right__sub">
            Set up your store in minutes. Reach thousands of buyers across Tunisia.
          </p>
          <div className="hcta-right__perks">
            {['Free to register', 'Verified seller badge', '0 DT setup fee'].map(p => (
              <span key={p} className="hcta-right__perk">
                <span className="hcta-right__perk-dot" />
                {p}
              </span>
            ))}
          </div>
          <button className="hcta-right__btn" onClick={handleSeller}>
            <span className="hcta-icon">🏪</span>
            Open Your Store
          </button>
        </div>

      </div>
    </>
  )
}