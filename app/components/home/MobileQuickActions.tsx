"use client";

// Phone-only Shop + Deals shortcuts on the homepage, right under the category strip.
// On desktop/tablet these pages are in the header links; on phones they were only in the
// hamburger menu. Compact menu pills; hidden from 768px up (same breakpoint as MobileCategoryStrip).

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, Flame, ShoppingBag } from "lucide-react";

export default function MobileQuickActions() {
  const t = useTranslations("home.quickActions");

  return (
    <nav className="mqa" aria-label={t("label")}>
      <style>{CSS}</style>
      <Link href="/shop" className="mqa-pill mqa-shop" aria-label={t("shopAria")}>
        <span className="mqa-fx" aria-hidden="true" />
        <span className="mqa-ico" aria-hidden="true">
          <ShoppingBag size={16} strokeWidth={2.3} />
        </span>
        <span className="mqa-label">{t("shop")}</span>
        <span className="mqa-chev" aria-hidden="true">
          <ChevronRight size={16} strokeWidth={2.6} />
        </span>
      </Link>
      <Link href="/deals" className="mqa-pill mqa-deals" aria-label={t("dealsAria")}>
        <span className="mqa-fx" aria-hidden="true" />
        <span className="mqa-ico" aria-hidden="true">
          <Flame size={16} strokeWidth={2.3} />
        </span>
        <span className="mqa-label">{t("deals")}</span>
        <span className="mqa-chev" aria-hidden="true">
          <ChevronRight size={16} strokeWidth={2.6} />
        </span>
        <span className="mqa-hot" aria-hidden="true">{t("hot")}</span>
      </Link>
    </nav>
  );
}

// Plain CSS (not Tailwind utilities) so page-level resets can't override it.
// Only transform and opacity are animated; the row height is fixed from the first render.
// Shop text is a shade darker than #198f41: the flag green on white is only ~4.2:1.
const CSS = `
.mqa{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 16px 4px}
@media(min-width:768px){.mqa{display:none}}
.mqa-pill{position:relative;display:flex;align-items:center;gap:6px;height:42px;min-width:0;
  padding-inline:4px 8px;border-radius:9999px;border:1.5px solid;text-decoration:none;
  box-shadow:0 2px 8px rgba(0,0,0,.06);-webkit-tap-highlight-color:transparent;
  transition:transform .15s ease,background-color .15s ease;
  animation:mqaIn .2s ease-out backwards}
.mqa-pill:active{transform:scale(.95)}
.mqa-shop{background:#fff;border-color:#198f41;color:#157a37}
.mqa-shop:hover,.mqa-shop:active{background:#e8f4ec}
.mqa-shop:focus-visible{outline:2px solid #198f41;outline-offset:2px}
.mqa-deals{background:#fdf1f2;border-color:#db142e;color:#db142e;animation-delay:60ms}
.mqa-deals:hover,.mqa-deals:active{background:#fbe3e6;color:#b00e24}
.mqa-deals:focus-visible{outline:2px solid #db142e;outline-offset:2px}
.mqa-fx{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none}
.mqa-fx::after{content:"";position:absolute;top:-30%;bottom:-30%;left:0;width:18%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent);
  transform:translateX(-200%) skewX(-20deg);animation:mqaShine 5s ease-in-out 1s infinite}
.mqa-deals .mqa-fx::after{animation-delay:3.5s}
[dir="rtl"] .mqa-fx{transform:scaleX(-1)}
.mqa-ico{position:relative;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  width:26px;height:26px;border-radius:50%;color:#fff}
.mqa-shop .mqa-ico{background:#198f41}
.mqa-deals .mqa-ico{background:#db142e}
.mqa-deals .mqa-ico svg{transform-origin:50% 90%;animation:mqaFlicker 1.6s ease-in-out infinite}
.mqa-label{position:relative;flex:1;min-width:0;font-size:13px;font-weight:700;line-height:18px;white-space:nowrap}
.mqa-chev{position:relative;flex-shrink:0;display:flex}
[dir="rtl"] .mqa-chev{transform:scaleX(-1)}
.mqa-chev svg{animation:mqaNudge 3s ease-in-out infinite}
.mqa-deals .mqa-chev svg{animation-delay:1.5s}
.mqa-hot{position:absolute;top:-8px;inset-inline-end:16px;padding:1px 5px;border-radius:999px;
  background:#db142e;color:#fff;font-size:9px;font-weight:800;line-height:12px;letter-spacing:.05em}
.mqa-hot::before{content:"";position:absolute;inset:-2px;border-radius:inherit;
  box-shadow:0 0 6px 2px rgba(219,20,46,.5);opacity:0;animation:mqaGlow 1.8s ease-in-out infinite}
[dir="rtl"] .mqa-hot{letter-spacing:0}
@media(min-width:360px){.mqa-label{font-size:14px}}
@keyframes mqaIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes mqaShine{0%{transform:translateX(-200%) skewX(-20deg)}25%,100%{transform:translateX(650%) skewX(-20deg)}}
@keyframes mqaNudge{0%,30%,100%{transform:translateX(0)}15%{transform:translateX(3px)}}
@keyframes mqaFlicker{0%,100%{transform:scale(1) rotate(0)}30%{transform:scale(1.08) rotate(-4deg)}60%{transform:scale(.96) rotate(3deg)}}
@keyframes mqaGlow{0%,100%{opacity:0}50%{opacity:1}}
@media(prefers-reduced-motion:reduce){
  .mqa-pill,.mqa-fx::after,.mqa-ico svg,.mqa-chev svg,.mqa-hot::before{animation:none!important}
  .mqa-fx::after{display:none}
  .mqa-pill{transition:none}
}
`;
