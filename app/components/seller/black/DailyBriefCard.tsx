"use client";

/**
 * components/seller/black/DailyBriefCard.tsx
 *
 * The new hero card at the top of /seller/black/.
 * Compact, scannable, one action. Never overwhelming.
 * Place it ABOVE EliteBanner -- it is the first thing sellers see.
 */

import { useState, useEffect, useCallback } from "react";
import { Crown, TrendingUp, AlertTriangle, Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import { blackPepperApi, type DailyBriefData } from "@/lib/blackPepperApi";
import SmartActionButton from "@/app/components/seller/black/SmartActionButton";

const GOLD = "#f59e0b";

const ACTION_CFG: Record<string, { color: "gold"|"red"|"green"|"blue"|"purple"; icon: any }> = {
  restock:    { color: "red",  icon: AlertTriangle },
  promote:    { color: "gold", icon: TrendingUp    },
  flash_sale: { color: "blue", icon: Sparkles      },
  default_:   { color: "gold", icon: ArrowRight    },
};

function Skeleton({ dark }: { dark: boolean }) {
  const bg = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[100, 75, 160, 55].map((w, i) => (
        <div key={i} style={{
          height: 12, width: w, maxWidth: "100%", borderRadius: 6, background: bg,
          animation: "db-shimmer 1.4s ease infinite", animationDelay: i * 0.1 + "s",
        }} />
      ))}
      <style>{"@keyframes db-shimmer{0%,100%{opacity:.5}50%{opacity:1}}"}</style>
    </div>
  );
}

export default function DailyBriefCard({ dark }: { dark: boolean }) {
  const [data,    setData]    = useState<DailyBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await blackPepperApi.dailyBrief();
      setData(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const textMain  = dark ? "#fff" : "#111";
  const textMuted = dark ? "rgba(255,255,255,0.45)" : "#888";
  const action    = data?.top_action;
  const cfg       = ACTION_CFG[action?.type ?? "default_"] ?? ACTION_CFG.default_;

  return (
    <div style={{
      background: dark
        ? "linear-gradient(135deg,#1a1206 0%,#2d1f08 50%,#1a1206 100%)"
        : "linear-gradient(135deg,#fffbeb 0%,#fef3c7 50%,#fffbeb 100%)",
      borderRadius: 20, border: "1px solid rgba(245,158,11,0.35)",
      padding: "22px 24px", position: "relative", overflow: "hidden",
      boxShadow: "0 8px 40px rgba(245,158,11,0.1)",
    }}>
      <div style={{
        position:"absolute", top:-60, right:-60, width:220, height:220,
        borderRadius:"50%", background:"rgba(245,158,11,0.07)",
        filter:"blur(50px)", pointerEvents:"none",
      }}/>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:36, height:36, borderRadius:10, flexShrink:0,
            background:"linear-gradient(135deg,rgba(245,158,11,0.25),rgba(251,191,36,0.15))",
            border:"1px solid rgba(245,158,11,0.5)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <Crown size={18} color={GOLD}/>
          </div>
          <div>
            <p style={{ fontSize:10, fontWeight:800, color:GOLD, margin:0, textTransform:"uppercase", letterSpacing:"0.08em" }}>
              Today&apos;s Brief
            </p>
            <p style={{ fontSize:13, fontWeight:900, color:textMain, margin:0 }}>
              {loading ? "Loading..." : (data?.greeting ?? "Good morning!")}
            </p>
          </div>
        </div>
        <button onClick={load} disabled={loading} style={{
          background:"transparent", border:"none", cursor:"pointer",
          color:textMuted, padding:4, borderRadius:6, opacity:loading ? 0.5 : 1,
        }} title="Refresh">
          <RefreshCw size={13} style={{ animation:loading ? "sab-spin 0.8s linear infinite" : "none" }}/>
        </button>
      </div>

      {loading && <Skeleton dark={dark}/>}

      {!loading && error && (
        <div style={{ textAlign:"center", padding:"12px 0" }}>
          <p style={{ fontSize:12, color:"#ef4444", margin:"0 0 8px" }}>Could not load your brief.</p>
          <button onClick={load} style={{
            fontSize:11, fontWeight:700, color:GOLD,
            background:"rgba(245,158,11,0.12)", border:"1px solid rgba(245,158,11,0.3)",
            borderRadius:7, padding:"5px 12px", cursor:"pointer",
          }}>Try again</button>
        </div>
      )}

      {!loading && !error && data && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {[
              { label:"Revenue",  value: data.revenue_delta,
                color: data.revenue_positive ? "#10b981" : "#ef4444" },
              { label:"Trending", value: data.trending_count + " product" + (data.trending_count !== 1 ? "s" : ""),
                color: data.trending_count > 0 ? "#10b981" : textMain },
              { label:"At risk",  value: data.risk_count + " product" + (data.risk_count !== 1 ? "s" : ""),
                color: data.risk_count === 0 ? "#10b981" : "#ef4444" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                borderRadius:10, padding:"9px 12px",
                border:"1px solid rgba(245,158,11,0.12)",
              }}>
                <p style={{ fontSize:10, color:textMuted, margin:"0 0 3px", fontWeight:700 }}>{label}</p>
                <p style={{ fontSize:13, fontWeight:900, margin:0, color }}>{value}</p>
              </div>
            ))}
          </div>

          {data.ai_message && (
            <div style={{
              display:"flex", alignItems:"flex-start", gap:8,
              padding:"10px 12px", borderRadius:10,
              background:GOLD + "12", border:"1px solid " + GOLD + "22",
            }}>
              <Sparkles size={13} color={GOLD} style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:12, color:textMain, margin:0, lineHeight:1.55, fontWeight:500 }}>
                {data.ai_message}
              </p>
            </div>
          )}

          {action && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
              <p style={{ fontSize:11, color:textMuted, margin:0, fontWeight:600, flex:1, minWidth:0,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                Priority: <span style={{ color:textMain, fontWeight:700 }}>{action.label}</span>
              </p>
              <SmartActionButton label="Do it now" icon={cfg.icon} href={action.href}
                color={cfg.color} dark={dark} size="sm"/>
            </div>
          )}
        </div>
      )}
      <style>{"@keyframes sab-spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}