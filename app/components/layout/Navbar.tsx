"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout, isAuthenticated, getUser, AuthUser } from "@/lib/auth";
import { useCart } from "@/context/CartContext";
import { Heart, ShoppingBag, ClipboardList, AlertCircle } from "lucide-react";
import Image from 'next/image'
import { sponsorshipApi, SponsoredProduct } from "@/lib/sponsorshipApi";

interface ApiCategory {
  id: number; name: string; name_ar: string; slug: string;
  icon: string | null; image: string | null;
}
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ─── Mega menu data ─────────────────────────────────────────── */
type SubGroup = { title: string; items: { label: string; slug: string }[] }
type MegaData = Record<string, SubGroup[]>
const MEGA: MegaData = {
  "fashion-clothing": [
    { title:"Clothing", items:[{label:"Dress",slug:"dress"},{label:"T-shirt",slug:"t-shirt"},{label:"Shirt",slug:"shirt"},{label:"Jeans",slug:"jeans"},{label:"Denim Jacket",slug:"denim-jacket"},{label:"Shorts",slug:"shorts"},{label:"Sweatshirt",slug:"sweatshirt"}]},
    { title:"Shoes",    items:[{label:"High Heels",slug:"high-heels"},{label:"Sneakers",slug:"sneakers"},{label:"Sandals",slug:"sandals"}]},
    { title:"Bags",     items:[{label:"Handbag",slug:"handbag"},{label:"Backpack",slug:"backpack"}]},
    { title:"Accessories & Bags", items:[{label:"Watch",slug:"watch"},{label:"Scarf",slug:"scarf"}]},
    { title:"Underwear & Nightwear", items:[{label:"Pyjama Set",slug:"pyjama-set"}]},
    { title:"Cosmetics", items:[{label:"Perfume",slug:"eau-de-parfum"}]},
    { title:"Sports & Leisure", items:[{label:"Sweat-shirt",slug:"sweatshirt"},{label:"Sports T-shirt",slug:"sportswear"},{label:"Tracksuit",slug:"tracksuit"}]},
  ],
  "electronics-tech": [
    { title:"Phones",    items:[{label:"Smartphones",slug:"smartphone"},{label:"Phone Accessories",slug:"phone-case"},{label:"Chargers",slug:"charger"}]},
    { title:"Computing", items:[{label:"Laptops",slug:"laptop"},{label:"Tablets",slug:"tablet"},{label:"USB Drives",slug:"usb-drive"}]},
    { title:"Audio & Video", items:[{label:"Earphones",slug:"earphones"},{label:"Speakers",slug:"bluetooth-speaker"},{label:"Headphones",slug:"headphones"},{label:"TV",slug:"tv"}]},
    { title:"Smartwatches", items:[{label:"Smartwatch",slug:"smartwatch"}]},
    { title:"Video Games",  items:[{label:"Consoles",slug:"gaming-console"}]},
  ],
  "home-living": [
    { title:"Furniture",      items:[{label:"Sofa",slug:"sofa"},{label:"Bed Frame",slug:"bed-frame"},{label:"Dining Table",slug:"dining-table"}]},
    { title:"Decoration",     items:[{label:"Candles",slug:"candle"},{label:"Rugs",slug:"rug"},{label:"Wall Art",slug:"wall-art"}]},
    { title:"Kitchen & Dining",items:[{label:"Crockery",slug:"crockery-set"},{label:"Storage Boxes",slug:"storage-box"}]},
    { title:"Bedding",        items:[{label:"Bed Sheets",slug:"bed-sheets"},{label:"Curtains",slug:"curtains"}]},
  ],
  "food-grocery": [
    { title:"Grocery",        items:[{label:"Olive Oil",slug:"olive-oil"},{label:"Dates",slug:"dates"},{label:"Honey",slug:"honey"},{label:"Canned Goods",slug:"canned-goods"},{label:"Harissa",slug:"harissa"}]},
    { title:"Beverages",      items:[{label:"Tea",slug:"tea"},{label:"Coffee",slug:"coffee"}]},
    { title:"Organic & Natural",items:[{label:"Spices",slug:"spices"},{label:"Organic Products",slug:"organic-products"}]},
  ],
  "beauty-personal-care": [
    { title:"Face Care", items:[{label:"Moisturiser",slug:"moisturiser"},{label:"Serum",slug:"serum"},{label:"Face Mask",slug:"face-mask"}]},
    { title:"Makeup",    items:[{label:"Foundation",slug:"foundation"},{label:"Lipstick",slug:"lipstick"},{label:"Mascara",slug:"mascara"}]},
    { title:"Perfumes",  items:[{label:"Eau de Parfum",slug:"eau-de-parfum"}]},
    { title:"Hair Care", items:[{label:"Shampoo",slug:"shampoo"},{label:"Hair Mask",slug:"hair-mask"},{label:"Argan Oil",slug:"argan-oil"}]},
  ],
  "sports-outdoors": [
    { title:"Sportswear",  items:[{label:"Sports T-Shirt",slug:"sports-t-shirt"},{label:"Tracksuit",slug:"tracksuit"}]},
    { title:"Sports Shoes",items:[{label:"Running Shoes",slug:"running-shoes"},{label:"Football Kit",slug:"football-kit"}]},
    { title:"Equipment",   items:[{label:"Yoga Mat",slug:"yoga-mat"},{label:"Weights",slug:"weights"},{label:"Bicycle",slug:"bicycle"},{label:"Swimming Gear",slug:"swimming-gear"}]},
  ],
  "arts-crafts": [
    { title:"Painting", items:[{label:"Acrylic",slug:"acrylic-paint"},{label:"Canvas",slug:"canvas"}]},
    { title:"Crafts",   items:[{label:"Pottery",slug:"pottery"},{label:"Jewellery",slug:"handmade-jewelry"},{label:"Embroidery",slug:"embroidery-kit"}]},
    { title:"Creative Hobbies", items:[{label:"Knitting Yarn",slug:"knitting-yarn"}]},
  ],
  "books-stationery": [
    { title:"Books",     items:[{label:"Novels",slug:"novel"},{label:"Comics & Manga",slug:"comic-manga"},{label:"School Books",slug:"school-textbook"}]},
    { title:"Stationery",items:[{label:"Notebooks",slug:"notebook"},{label:"Pens",slug:"pen-set"},{label:"Planners",slug:"planner"}]},
  ],
  "kids-baby": [
    { title:"Toys", items:[{label:"Plush Toys",slug:"plush-toy"},{label:"Educational Games",slug:"educational-game"},{label:"Toy Cars",slug:"toy-car"}]},
    { title:"Baby", items:[{label:"Baby Clothes",slug:"baby-clothes"},{label:"Strollers",slug:"stroller"},{label:"Baby Bottle",slug:"baby-bottle"}]},
  ],
  "automotive": [
    { title:"Accessories", items:[{label:"Car Accessory",slug:"car-accessory"},{label:"Car Seat Cover",slug:"car-seat-cover"},{label:"Car Perfume",slug:"car-perfume"}]},
    { title:"Motorcycle",  items:[{label:"Motorcycle Gear",slug:"motorcycle-gear"}]},
  ],
  "health-wellness": [
    { title:"Nutrition", items:[{label:"Vitamins",slug:"vitamins"},{label:"Protein Powder",slug:"protein-powder"}]},
    { title:"Wellness",  items:[{label:"Essential Oil",slug:"essential-oil"},{label:"Herbal Tea",slug:"herbal-tea"},{label:"Medical Device",slug:"medical-device"}]},
  ],
};

/* ─── Category icon ──────────────────────────────────────────── */
function CatIcon({ slug, name }: { slug: string; name: string }) {
  const s = (slug + " " + name).toLowerCase();
  if (/fashion|clothing|wear|tenue/.test(s)) return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg>;
  if (/electronic|tech|phone|computer/.test(s)) return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>;
  if (/home|living|maison|meuble/.test(s)) return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
  if (/food|grocery|alimentation/.test(s)) return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>;
  if (/beauty|cosmetic|soin|makeup|parfum/.test(s)) return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
  if (/sport|outdoor|fitness|gym/.test(s)) return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/><path d="M3.6 9h16.8"/></svg>;
  if (/art|craft|handmade/.test(s)) return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 20v-8.5c0-1.1.9-2 2-2"/><path d="M12 20c-3.3 0-6-2.7-6-6v-1.5"/></svg>;
  if (/book|livre|stationery/.test(s)) return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
  if (/kid|baby|toy/.test(s)) return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46L5.5 8H4a1 1 0 0 1 0-2h1.09A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46L18.5 8H20a1 1 0 0 0 0-2h-1.09A2.5 2.5 0 0 0 14.5 2z"/></svg>;
  if (/auto|car|moto/.test(s)) return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
  if (/health|wellness|medical/.test(s)) return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
  return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
}

/* ─── Avatar ─────────────────────────────────────────────────── */
const ACOLORS=[["#fde68a","#92400e"],["#bfdbfe","#1e40af"],["#bbf7d0","#14532d"],["#fecaca","#991b1b"],["#e9d5ff","#4c1d95"],["#fed7aa","#7c2d12"]];
function avatarMeta(name:string){
  const p=name.trim().split(/\s+/);
  const initials=p.length>=2?(p[0][0]+p[1][0]).toUpperCase():name.slice(0,2).toUpperCase();
  let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h);
  const[bg,fg]=ACOLORS[Math.abs(h)%ACOLORS.length];
  return{initials,bg,fg};
}
function fixGoog(url:string){return url.replace(/=s\d+-?c?$/,"=s200-c");}
function Avatar({user,size=36}:{user:AuthUser;size?:number}){
  const[err,setErr]=useState(false);
  const{initials,bg,fg}=avatarMeta(user.name);
  const src=user.avatar&&!err?fixGoog(user.avatar):null;
  if(src) return <img src={src} alt={user.name} referrerPolicy="no-referrer" onError={()=>setErr(true)} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:"2px solid rgba(0,0,0,0.08)"}}/>;
  return <span style={{width:size,height:size,background:bg,color:fg,fontSize:size*0.38,borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",fontWeight:800,flexShrink:0,letterSpacing:"-0.02em"}}>{initials}</span>;
}
function RoleBadge({role}:{role:AuthUser["role"]}){
  const m:Record<string,string>={seller:"bg-amber-100 text-amber-700",client:"bg-blue-100 text-blue-700",admin:"bg-red-100 text-red-700"};
  return <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${m[role]??m.client}`}>{role}</span>;
}
function AskAIPill({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Ask AI Shopping Assistant"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px 6px 8px', borderRadius: 999,
        background: 'linear-gradient(135deg, #db142e 0%, #9b0f1f 100%)',
        border: '1.5px solid #198f41', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
        color: '#fff', whiteSpace: 'nowrap', flexShrink: 0,
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 2px 10px rgba(219,20,46,0.25)',
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform='scale(1.05) translateY(-1px)'; el.style.boxShadow='0 6px 20px rgba(219,20,46,0.4)'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform='scale(1) translateY(0)'; el.style.boxShadow='0 2px 10px rgba(219,20,46,0.25)'; }}
    >
      <Image src="/images/logo-chili.png" alt="AI" width={18} height={18} style={{ objectFit:'contain', filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' }}/>
      Ask AI
    </button>
  );
}

/* ─── Mega Menu ──────────────────────────────────────────────── */
function MegaMenu({categories,visible,onClose}:{categories:ApiCategory[];visible:boolean;onClose:()=>void}){
  const[activeSlug,setSlug]=useState("");
  useEffect(()=>{ if(visible&&categories.length>0&&!activeSlug) setSlug(categories[0].slug); },[visible,categories,activeSlug]);
  if(!visible) return null;
  const subs=MEGA[activeSlug]??[];
  const activeCat=categories.find(c=>c.slug===activeSlug);
  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,top:132,background:"rgba(0,0,0,0.45)",zIndex:9997}}/>
      <div style={{position:"fixed",top:132,left:0,right:0,background:"#fff",boxShadow:"0 16px 48px rgba(0,0,0,0.18)",borderTop:"3px solid #dc2626",zIndex:9998,display:"flex",maxHeight:"80vh",overflow:"hidden"}}>
        <style>{`@keyframes megaIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}.mcat:hover{background:#fff5f5!important;color:#dc2626!important}.mcat.on{background:#fef2f2!important;color:#dc2626!important;border-left:3px solid #dc2626!important}.msub:hover{color:#dc2626!important}.mmore:hover{color:#dc2626!important}`}</style>
        <div style={{width:220,flexShrink:0,background:"#fafafa",borderRight:"1px solid #f3f4f6",overflowY:"auto",padding:"8px 0"}}>
          {categories.map(cat=>(
            <button key={cat.slug} onMouseEnter={()=>setSlug(cat.slug)} onClick={()=>setSlug(cat.slug)}
              className={`mcat ${activeSlug===cat.slug?"on":""}`}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 16px",textAlign:"left",background:"transparent",border:"none",borderLeft:"3px solid transparent",cursor:"pointer",fontSize:13,fontWeight:activeSlug===cat.slug?700:500,color:activeSlug===cat.slug?"#dc2626":"#374151"}}>
              <span style={{width:32,height:32,borderRadius:8,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(220,38,38,0.08)",color:"#dc2626"}}>
                <CatIcon slug={cat.slug} name={cat.name}/>
              </span>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{cat.name}</span>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{flexShrink:0,opacity:0.35}}><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"24px 32px 32px"}}>
          {subs.length===0?(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:14,color:"#9ca3af",minHeight:200}}>
              <p style={{fontSize:14,fontWeight:600}}>Explore {activeCat?.name}</p>
              <Link href={`/category/${activeSlug}`} onClick={onClose} style={{fontSize:13,fontWeight:700,color:"#dc2626",textDecoration:"none",padding:"8px 20px",border:"1.5px solid #dc2626",borderRadius:999}}>View all products →</Link>
            </div>
          ):(
            <>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:"24px 20px"}}>
                {subs.map(g=>(
                  <div key={g.title}>
                    <Link href={`/category/${activeSlug}`} onClick={onClose} style={{display:"block",fontSize:11,fontWeight:800,color:"#dc2626",textDecoration:"none",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10,paddingBottom:6,borderBottom:"1.5px solid #fee2e2"}}>{g.title}</Link>
                    <ul style={{listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:5}}>
                      {g.items.map(item=>(
                        <li key={item.slug}><Link href={`/category/${activeSlug}?sub=${item.slug}`} onClick={onClose} className="msub" style={{fontSize:13,color:"#4b5563",textDecoration:"none",fontWeight:400,display:"block",lineHeight:1.5,transition:"color 0.12s"}}>{item.label}</Link></li>
                      ))}
                    </ul>
                    <Link href={`/category/${activeSlug}`} onClick={onClose} className="mmore" style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:11,fontWeight:700,color:"#9ca3af",textDecoration:"none",marginTop:8,textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px dashed #d1d5db",paddingBottom:1,transition:"color 0.12s"}}>
                      View more <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                    </Link>
                  </div>
                ))}
              </div>
              <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid #f3f4f6"}}>
                <Link href={`/category/${activeSlug}`} onClick={onClose} style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,fontWeight:700,color:"#dc2626",textDecoration:"none",padding:"7px 16px",background:"#fff5f5",borderRadius:999,border:"1.5px solid #fecaca"}}>
                  View all in {activeCat?.name} →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   SEARCH DROPDOWN — Trendyol-style
   Shows when the search input is focused and query is empty.
   Two sections:
     1. Trending Searches  — category pills
     2. Popular Products   — mini product cards from sponsored feed
══════════════════════════════════════════════════════════════ */
function SearchDropdown({
  visible,
  categories,
  onCategoryClick,
  onProductClick,
}: {
  visible:         boolean;
  categories:      ApiCategory[];
  onCategoryClick: (slug: string) => void;
  onProductClick:  () => void;
}) {
  const [products, setProducts]     = useState<SponsoredProduct[]>([]);
  const [loadingP, setLoadingP]     = useState(true);
  const [imgErrors, setImgErrors]   = useState<Record<number, boolean>>({});

  // Load sponsored products once on mount — cached by sponsorshipApi
  useEffect(() => {
    sponsorshipApi.publicFeed({ limit: 4 })
      .then(res => setProducts(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingP(false));
  }, []);

  if (!visible) return null;

  // Show max 8 category pills
  const trendingCats = categories.slice(0, 8);

  return (
    <>
      {/* Backdrop — transparent, just closes on click outside */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9994 }}
        onClick={onProductClick} // reuse close handler
      />

      <div style={{
        position:     "absolute",
        top:          "calc(100% + 8px)",
        left:         0,
        right:        0,
        background:   "#fff",
        borderRadius: 16,
        boxShadow:    "0 20px 60px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06)",
        border:       "1.5px solid #f1f5f9",
        zIndex:       9995,
        overflow:     "hidden",
        animation:    "sdropIn 0.2s cubic-bezier(0.34,1.2,0.64,1) both",
      }}>

        {/* ── Section 1: Trending Searches ── */}
        <div style={{ padding: "18px 20px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <svg width="14" height="14" fill="none" stroke="#db142e" strokeWidth="2.2" viewBox="0 0 24 24">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Trending Searches
            </span>
          </div>

          {/* Category pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {trendingCats.map((cat) => (
              <button
                key={cat.slug}
                onMouseDown={(e) => { e.preventDefault(); onCategoryClick(cat.slug); }}
                style={{
                  display:      "inline-flex",
                  alignItems:   "center",
                  gap:          6,
                  padding:      "6px 13px 6px 9px",
                  borderRadius: 999,
                  border:       "1.5px solid #f1f5f9",
                  background:   "#f8fafc",
                  cursor:       "pointer",
                  fontFamily:   "inherit",
                  fontSize:     12,
                  fontWeight:   600,
                  color:        "#374151",
                  transition:   "all 0.15s",
                  whiteSpace:   "nowrap",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.background    = "#fef2f2";
                  el.style.borderColor   = "#fecaca";
                  el.style.color         = "#dc2626";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.background    = "#f8fafc";
                  el.style.borderColor   = "#f1f5f9";
                  el.style.color         = "#374151";
                }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: 7,
                  background: "rgba(219,20,46,0.08)",
                  color: "#dc2626",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <CatIcon slug={cat.slug} name={cat.name}/>
                </span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#f8fafc", margin: "0 20px" }}/>

        {/* ── Section 2: Popular Products ── */}
        <div style={{ padding: "14px 20px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" fill="none" stroke="#db142e" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Popular Products
              </span>
            </div>
            <Link
              href="/shop"
              onMouseDown={e => e.preventDefault()}
              onClick={onProductClick}
              style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}
            >
              View all
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>

          {/* Product mini-cards */}
          {loadingP ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #f1f5f9" }}>
                  <div style={{ aspectRatio: "1/1", background: "linear-gradient(90deg,#f1f5f9 25%,#e8edf5 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "sdShimmer 1.4s infinite" }}/>
                  <div style={{ padding: "8px 10px 10px" }}>
                    <div style={{ height: 8, width: "55%", background: "#f1f5f9", borderRadius: 4, marginBottom: 5, animation: "sdShimmer 1.4s infinite" }}/>
                    <div style={{ height: 11, background: "#f1f5f9", borderRadius: 4, marginBottom: 5, animation: "sdShimmer 1.4s infinite" }}/>
                    <div style={{ height: 13, width: "45%", background: "#f1f5f9", borderRadius: 4, animation: "sdShimmer 1.4s infinite" }}/>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>No trending products right now.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {products.slice(0, 4).map((product, i) => {
                const imgUrl = imgErrors[product.id] ? null : product.primary_image_url;
                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    onMouseDown={e => e.preventDefault()}
                    onClick={onProductClick}
                    style={{
                      textDecoration: "none",
                      color:          "inherit",
                      display:        "block",
                      borderRadius:   12,
                      overflow:       "hidden",
                      border:         "1.5px solid #f1f5f9",
                      transition:     "all 0.18s",
                      animation:      `sdFadeUp 0.25s ease ${i * 0.05}s both`,
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "#fecaca";
                      el.style.boxShadow   = "0 8px 24px rgba(219,20,46,0.10)";
                      el.style.transform   = "translateY(-2px)";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "#f1f5f9";
                      el.style.boxShadow   = "none";
                      el.style.transform   = "none";
                    }}
                  >
                    {/* Image */}
                    <div style={{ aspectRatio: "1/1", background: "#f8fafc", overflow: "hidden", position: "relative" }}>
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={product.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          onError={() => setImgErrors(prev => ({ ...prev, [product.id]: true }))}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🔥</div>
                      )}
                      {/* HOT badge */}
                      <span style={{
                        position:     "absolute", top: 6, left: 6,
                        background:   "linear-gradient(135deg,#db142e,#ff4757)",
                        color:        "#fff", fontSize: 7, fontWeight: 800,
                        padding:      "2px 6px", borderRadius: 999,
                        letterSpacing:"0.06em", textTransform: "uppercase",
                      }}>
                        🔥 HOT
                      </span>
                    </div>

                    {/* Info */}
                    <div style={{ padding: "8px 10px 10px", background: "#fff" }}>
                      {product.category?.name && (
                        <p style={{ fontSize: 8, fontWeight: 800, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 3px" }}>
                          {product.category.name}
                        </p>
                      )}
                      <p style={{
                        fontSize: 11, fontWeight: 700, color: "#111",
                        margin: "0 0 5px", lineHeight: 1.3,
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {/* Bold the matching prefix like Trendyol does */}
                        {product.name}
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 900, color: "#db142e", margin: 0, letterSpacing: "-0.01em" }}>
                        {Number(product.price).toFixed(2)} <span style={{ fontSize: 10, fontWeight: 700 }}>DT</span>
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes sdropIn  { from { opacity:0; transform:translateY(-6px) scale(0.98); } to { opacity:1; transform:none; } }
        @keyframes sdShimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes sdFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      `}</style>
    </>
  );
}

/* ── SEARCH WITH SUGGESTIONS (Trendyol-style) ────────────────────────────── */

type SuggestionItem =
  | { type: "query";    text: string }
  | { type: "category"; text: string; slug: string }
  | { type: "seller";   text: string; initial: string };

function SearchSuggestionsDropdown({
  visible,
  query,
  items,
  onSelectQuery,
  onSelectCategory,
}: {
  visible:          boolean;
  query:            string;
  items:            SuggestionItem[];
  onSelectQuery:    (s: string) => void;
  onSelectCategory: (slug: string) => void;
}) {
  if (!visible || items.length === 0) return null;

  // Bold the matched prefix inside the suggestion text
  function HighlightMatch({ text }: { text: string }) {
    const lower     = text.toLowerCase();
    const qLower    = query.toLowerCase();
    const matchIdx  = lower.indexOf(qLower);
    if (matchIdx === -1 || query.length === 0) {
      return <span style={{ fontSize: 13, color: "#374151" }}>{text}</span>;
    }
    return (
      <span style={{ fontSize: 13, color: "#374151" }}>
        {text.slice(0, matchIdx)}
        <strong style={{ color: "#0f172a", fontWeight: 700 }}>{text.slice(matchIdx, matchIdx + query.length)}</strong>
        {text.slice(matchIdx + query.length)}
      </span>
    );
  }

  return (
    <div style={{
      position:   "absolute",
      top:        "calc(100% + 0px)",
      left:       0,
      right:      0,
      background: "#fff",
      borderRadius: "0 0 14px 14px",
      boxShadow:  "0 16px 40px rgba(0,0,0,0.13)",
      border:     "2px solid #dc2626",
      borderTop:  "1px solid #f1f5f9",
      zIndex:     9995,
      overflow:   "hidden",
      animation:  "sdropIn 0.15s ease both",
    }}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;

        if (item.type === "category") {
          return (
            <button
              key={`cat-${item.slug}`}
              onMouseDown={e => { e.preventDefault(); onSelectCategory(item.slug); }}
              style={{
                display:      "flex",
                alignItems:   "center",
                justifyContent:"space-between",
                gap:          10,
                width:        "100%",
                background:   "none",
                border:       "none",
                borderBottom: isLast ? "none" : "1px solid #f8fafc",
                padding:      "11px 18px",
                cursor:       "pointer",
                textAlign:    "left",
                fontFamily:   "inherit",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                {/* Category icon box */}
                <span style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: "rgba(219,20,46,0.07)", color: "#dc2626",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  </svg>
                </span>
                <HighlightMatch text={item.text}/>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", flexShrink: 0 }}>Category</span>
            </button>
          );
        }

        if (item.type === "seller") {
          return (
            <button
              key={`seller-${i}`}
              onMouseDown={e => { e.preventDefault(); onSelectQuery(item.text); }}
              style={{
                display:      "flex",
                alignItems:   "center",
                justifyContent:"space-between",
                gap:          10,
                width:        "100%",
                background:   "none",
                border:       "none",
                borderBottom: isLast ? "none" : "1px solid #f8fafc",
                padding:      "11px 18px",
                cursor:       "pointer",
                textAlign:    "left",
                fontFamily:   "inherit",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                {/* Seller avatar circle */}
                <span style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: "#0f172a", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800,
                }}>
                  {item.initial}
                </span>
                <HighlightMatch text={item.text}/>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", flexShrink: 0 }}>Seller</span>
            </button>
          );
        }

        // Default: query suggestion
        return (
          <button
            key={`q-${i}`}
            onMouseDown={e => { e.preventDefault(); onSelectQuery(item.text); }}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          12,
              width:        "100%",
              background:   "none",
              border:       "none",
              borderBottom: isLast ? "none" : "1px solid #f8fafc",
              padding:      "11px 18px",
              cursor:       "pointer",
              textAlign:    "left",
              fontFamily:   "inherit",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <svg width="14" height="14" fill="none" stroke="#c4c4c4" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <HighlightMatch text={item.text}/>
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   NAVBAR
══════════════════════════════════════════════════════════════ */
const NAV_LINKS = [
  {label:"Shop",href:"/shop"},
  {label:"WearTounsi",href:"/brand"},
  {label:"Deals",href:"/deals"},
];

export default function Navbar() {
  const router = useRouter();
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [dropOpen,   setDropOpen]   = useState(false);
  const [user,       setUser]       = useState<AuthUser|null>(null);
  const [scrolled,   setScrolled]   = useState(false);
  const [megaOpen,   setMegaOpen]   = useState(false);
  const [categories, setCategories] = useState<ApiCategory[]>([]);

  // Search state
  const [searchQuery,    setSearchQuery]    = useState("");
  const [imageSearching, setImageSearching] = useState(false);
  const [searchFocused,  setSearchFocused]  = useState(false);
  const [suggItems,      setSuggItems]      = useState<SuggestionItem[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dropRef = useRef<HTMLDivElement>(null);
  const { count, favorites, openDrawer } = useCart();
  const favCount = favorites.length;
  const loggedIn = !!user;
  const isSeller = user?.role === "seller";

  // Show the Trendyol-style dropdown when focused AND query is empty
  const showTrendingDropdown = searchFocused && searchQuery.trim() === "";
  // Show suggestions dropdown when focused AND query has text AND suggestions exist
  const showSuggestionsDropdown = searchFocused && searchQuery.trim().length >= 2 && suggItems.length > 0;

  useEffect(()=>{ if(isAuthenticated()) setUser(getUser()); },[]);
  useEffect(()=>{
    fetch(`${API_URL}/api/categories`,{headers:{Accept:"application/json"}})
      .then(r=>r.json()).then(j=>setCategories(j.data??[])).catch(()=>{});
  },[]);
  useEffect(()=>{
    const h=()=>setScrolled(window.scrollY>4);
    window.addEventListener("scroll",h,{passive:true});
    return()=>window.removeEventListener("scroll",h);
  },[]);
  useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(dropRef.current&&!dropRef.current.contains(e.target as Node)) setDropOpen(false); };
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  // Close search dropdown when clicking outside the search wrapper
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Fetch autocomplete suggestions when query changes — builds rich SuggestionItem list
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setSuggItems([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/search/suggestions?q=${encodeURIComponent(q)}&limit=10`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) return;
        const data  = await res.json();
        const words: string[] = data.suggestions ?? [];
        const qLow  = q.toLowerCase();

        // Build items list — Trendyol style: categories first, then queries
        const items: SuggestionItem[] = [];

        // 1. Matching categories (from already-loaded categories state)
        const matchingCats = categories.filter(c =>
          c.name.toLowerCase().includes(qLow)
        ).slice(0, 2);

        matchingCats.forEach(cat => {
          items.push({ type: "category", text: cat.name, slug: cat.slug });
        });

        // 2. Query suggestions from vocabulary (plain text rows)
        // Filter out any that already appeared as category names
        const catNames = new Set(matchingCats.map(c => c.name.toLowerCase()));
        words
          .filter(w => !catNames.has(w.toLowerCase()))
          .forEach(w => items.push({ type: "query", text: w }));

        setSuggItems(items.slice(0, 10));
      } catch { setSuggItems([]); }
    }, 280);
  }, [searchQuery, categories]);

  const closeAll = () => { setMegaOpen(false); setDropOpen(false); setMenuOpen(false); setSearchFocused(false); };
  const handleLogout = async () => { closeAll(); await logout(); setUser(null); router.push("/auth/login"); };
  const handleCart   = () => { closeAll(); openDrawer(); };
  const handleSupport = () => { closeAll(); window.dispatchEvent(new Event("open-support-chat")); };

  const handleTextSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchFocused(false);
    setSuggItems([]);
    closeAll();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }, [searchQuery, router]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleTextSearch();
    if (e.key === "Escape") setSearchFocused(false);
  }, [handleTextSearch]);

  const handleSelectSuggestion = useCallback((s: string) => {
    setSearchQuery(s);
    setSuggItems([]);
    setSearchFocused(false);
    router.push(`/search?q=${encodeURIComponent(s)}`);
  }, [router]);

  const handleSelectSuggestionCategory = useCallback((slug: string) => {
    setSuggItems([]);
    setSearchFocused(false);
    router.push(`/category/${slug}`);
  }, [router]);

  const handleCategoryClick = useCallback((slug: string) => {
    setSearchFocused(false);
    router.push(`/category/${slug}`);
  }, [router]);

  const handleCameraClick = useCallback(() => { imageInputRef.current?.click(); }, []);

  const handleImageSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageSearching(true);
    closeAll();
    try {
      const reader = new FileReader();
      reader.onload = () => { sessionStorage.setItem("searchImagePreview", reader.result as string); };
      reader.readAsDataURL(file);
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${API_URL}/api/search/image`, { method:"POST", headers:{ Accept:"application/json" }, body: formData });
      if (!res.ok) throw new Error("Image search failed");
      const data = await res.json();
      const ids = (data.products ?? []).map((p: { id: number }) => p.id).join(",");
      router.push(`/search?mode=image&ids=${ids}`);
    } catch {
      alert("Image search failed. Please try again.");
    } finally {
      setImageSearching(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }, [router]);

  return (
    <>
      <MegaMenu categories={categories} visible={megaOpen} onClose={()=>setMegaOpen(false)}/>

      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:"none" }} onChange={handleImageSelected}/>

      <header style={{
        position:"sticky", top:0, zIndex:50,
        width:"100%", background:"#fff",
        boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.10)" : "0 1px 0 #f1f5f9",
        transition:"box-shadow 0.2s ease",
      }}>

        {/* ── ROW 1: Announcement bar ── */}
        <div style={{background:"#09090b",color:"#fff",fontSize:11,padding:"7px 0",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:500}}>
          <div style={{maxWidth:1400,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span>🇹🇳 Free delivery on orders over 50 DT — Tunisia&apos;s #1 marketplace</span>
            <button onClick={handleSupport} style={{display:"flex",alignItems:"center",gap:5,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.8)",fontSize:11,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:"inherit",padding:0,transition:"color 0.15s"}}
              onMouseEnter={e=>(e.currentTarget.style.color="#fff")}
              onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.8)")}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" strokeLinecap="round"/></svg>
              Help &amp; Support
            </button>
          </div>
        </div>

        {/* ── ROW 2: Utility bar ── */}
        <div style={{borderBottom:"1px solid #f1f5f9",background:"#fff"}}>
          <div style={{maxWidth:1400,margin:"0 auto",padding:"0 24px",height:34,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:2}}>
            <style>{`
              .nu{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;color:#52525b;transition:color .14s,background .14s;white-space:nowrap;position:relative;border:none;background:transparent;cursor:pointer;font-family:inherit}
              .nu:hover{color:#dc2626;background:rgba(220,38,38,0.06)}
              .nu-bdg{position:absolute;top:-2px;right:1px;background:#dc2626;color:#fff;font-size:9px;font-weight:900;border-radius:999px;min-width:15px;height:15px;display:flex;align-items:center;justify-content:center;padding:0 3px;border:1.5px solid #fff}
              .nu-sep{width:1px;height:13px;background:#e5e7eb;flex-shrink:0;margin:0 2px}
              .dd-item{display:flex;align-items:center;gap:10px;padding:10px 16px;font-size:13px;font-weight:600;color:#374151;text-decoration:none;transition:background .12s,color .12s;border:none;background:transparent;cursor:pointer;width:100%;font-family:inherit}
              .dd-item:hover{background:#fafafa;color:#dc2626}
              .dd-item.danger{color:#dc2626}
              .dd-item.danger:hover{background:#fff5f5}
              .search-camera-btn:hover { background: rgba(220,38,38,0.08) !important; color: #dc2626 !important; }
              .search-camera-btn:active { transform: scale(0.92); }
            `}</style>
            <Link href="/orders"         onClick={closeAll} className="nu"><ClipboardList size={13}/>My Orders</Link>
            <span className="nu-sep"/>
            <Link href="/complaints"     onClick={closeAll} className="nu"><AlertCircle size={13}/>My Complaints</Link>
            <span className="nu-sep"/>
            <Link href="/complaints/new" onClick={closeAll} className="nu" style={{color:"#dc2626"}}><AlertCircle size={13}/>Help / Complaint</Link>
            <span className="nu-sep"/>
            <Link href="/favorites"      onClick={closeAll} className="nu" style={{position:"relative"}}>
              <Heart size={13}/>Favorites
              {favCount>0&&<span className="nu-bdg">{favCount>9?"9+":favCount}</span>}
            </Link>
            <span className="nu-sep"/>
            <button onClick={handleCart} className="nu" style={{position:"relative"}}>
              <ShoppingBag size={13}/>Cart
              {count>0&&<span className="nu-bdg">{count>99?"99+":count}</span>}
            </button>
            <span className="nu-sep"/>
            {!loggedIn?(
              <>
                <Link href="/auth/login"    onClick={closeAll} className="nu"><UserIcon/>Log In</Link>
                <Link href="/auth/register" onClick={closeAll} className="nu" style={{background:"#dc2626",color:"#fff",borderRadius:6,padding:"3px 12px"}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="#b91c1c"}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="#dc2626"}}>Register</Link>
              </>
            ):(
              <div style={{position:"relative"}} ref={dropRef}>
                <button onClick={()=>{setDropOpen(o=>!o);setMegaOpen(false);}} className="nu" style={{gap:7}}>
                  <Avatar user={user!} size={22}/>
                  <span style={{maxWidth:90,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user!.name}</span>
                  <RoleBadge role={user!.role}/>
                  <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{transform:dropOpen?"rotate(180deg)":"none",transition:"transform 0.2s",flexShrink:0}}><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {dropOpen&&(
                  <div style={{position:"fixed",top:100,right:24,width:220,background:"#fff",border:"1px solid #f1f5f9",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.14)",zIndex:9999,overflow:"hidden"}}>
                    <div style={{padding:"13px 16px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:10}}>
                      <Avatar user={user!} size={40}/>
                      <div style={{minWidth:0}}>
                        <p style={{fontSize:13,fontWeight:800,color:"#111",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user!.name}</p>
                        <p style={{fontSize:11,color:"#94a3b8",margin:"2px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user!.email}</p>
                      </div>
                    </div>
                    <Link href="/profile"    onClick={()=>setDropOpen(false)} className="dd-item"><UserIcon/>My Profile</Link>
                    <Link href="/orders"     onClick={()=>setDropOpen(false)} className="dd-item"><OrdersIcon/>My Orders</Link>
                    <Link href="/complaints" onClick={()=>setDropOpen(false)} className="dd-item"><AlertCircle size={15}/>My Complaints</Link>
                    <Link href="/favorites"  onClick={()=>setDropOpen(false)} className="dd-item"><HeartIcon/>Favorites</Link>
                    {isSeller&&<Link href="/seller" onClick={()=>setDropOpen(false)} className="dd-item"><DashboardIcon/>My Store</Link>}
                    <div style={{height:1,background:"#f1f5f9",margin:"4px 0"}}/>
                    <button onClick={handleLogout} className="dd-item danger"><LogoutIcon/>Log Out</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 3: Logo | Search | Nav ── */}
        <nav style={{background:"#fff"}}>
          <div style={{
            maxWidth:1400, margin:"0 auto", padding:"0 24px",
            height:66,
            display:"flex", alignItems:"center", gap:24,
          }}>

            {/* Logo */}
            <Link href="/" style={{display:"flex",alignItems:"center",gap:10,flexShrink:0,textDecoration:"none"}}>
              <div style={{
                width:55,height:55,borderRadius:11,background:"#fff",
                border:"2px solid #dc2626",
                boxShadow:"0 0 0 1.5px #198f41,0 0 10px 2px rgba(219,20,46,0.3)",
                display:"flex",alignItems:"center",justifyContent:"center",
                flexShrink:0,overflow:"hidden",
              }}>
                <img src="/images/logo.png" alt="ChooseTounsi" style={{width:46,height:46,objectFit:"contain",display:"block"}}/>
              </div>
              <span style={{fontSize:20,fontWeight:900,letterSpacing:"-0.02em",color:"#0c0c0d",whiteSpace:"nowrap"}}>
                Choose<span style={{color:"#198f41"}}>Tounsi</span>
              </span>
            </Link>

            {/* ── SEARCH BAR WRAPPER (relative — dropdown anchors here) ── */}
            <div style={{flex:1,minWidth:0,display:"flex",justifyContent:"center"}}>
              <div ref={searchWrapRef} style={{ position:"relative", width:"100%", maxWidth:640 }}>

                {/* Search input row */}
                <div
                  style={{
                    display:"flex",
                    width:"100%",
                    height:42,
                    border:`2px solid ${searchFocused ? "#dc2626" : "#e5e7eb"}`,
                    borderRadius: (showTrendingDropdown || showSuggestionsDropdown) ? "8px 8px 0 0" : 8,
                    overflow:"hidden",
                    transition:"border-color 0.18s, box-shadow 0.18s",
                    boxShadow: searchFocused ? "0 0 0 3px rgba(219,20,46,0.08)" : "none",
                    background:"#fff",
                    zIndex: 9996,
                    position:"relative",
                  }}
                >
                  {/* Text input */}
                  <input
                    type="text"
                    placeholder="Search products, brands, vendors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() => { setSearchFocused(true); setMegaOpen(false); setDropOpen(false); }}
                    style={{flex:1,padding:"0 12px",fontSize:14,border:"none",outline:"none",background:"transparent",color:"#111",fontFamily:"inherit",minWidth:0}}
                  />

                  {/* Camera button */}
                  <button
                    onClick={handleCameraClick}
                    disabled={imageSearching}
                    title="Search by image"
                    className="search-camera-btn"
                    style={{
                      background:"transparent", border:"none", borderRight:"1px solid #e5e7eb",
                      padding:"0 11px", cursor: imageSearching ? "wait" : "pointer",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      flexShrink:0, color:"#9ca3af",
                      transition:"background 0.15s, color 0.15s, transform 0.1s",
                    }}
                  >
                    {imageSearching ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{animation:"spin 0.8s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    )}
                  </button>

                  {/* Search button */}
                  <button
                    onClick={handleTextSearch}
                    style={{background:"#dc2626",border:"none",padding:"0 20px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background 0.15s"}}
                    onMouseEnter={e=>(e.currentTarget.style.background="#b91c1c")}
                    onMouseLeave={e=>(e.currentTarget.style.background="#dc2626")}
                  >
                    <SearchIcon/>
                  </button>
                </div>

                {/* ── Trending dropdown (empty query, focused) ── */}
                <SearchDropdown
                  visible={showTrendingDropdown}
                  categories={categories}
                  onCategoryClick={handleCategoryClick}
                  onProductClick={() => setSearchFocused(false)}
                />

                {/* ── Suggestions dropdown (has query, focused) ── */}
                <SearchSuggestionsDropdown
                  visible={showSuggestionsDropdown}
                  query={searchQuery.trim()}
                  items={suggItems}
                  onSelectQuery={handleSelectSuggestion}
                  onSelectCategory={handleSelectSuggestionCategory}
                />

              </div>
            </div>

            {/* Nav links */}
            <div style={{display:"flex",alignItems:"center",gap:2,flexShrink:0}}>
              <button onClick={()=>{setMegaOpen(o=>!o);setDropOpen(false);setSearchFocused(false);}}
                style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:500,background:megaOpen?"#fef2f2":"transparent",color:megaOpen?"#dc2626":"#52525b",transition:"all 0.14s",whiteSpace:"nowrap"}}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                Categories
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{transform:megaOpen?"rotate(180deg)":"none",transition:"transform 0.2s"}}><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {NAV_LINKS.map(l=>(
                <Link key={l.href} href={l.href}
                  style={{padding:"8px 12px",borderRadius:8,fontSize:14,fontWeight:500,color:"#52525b",textDecoration:"none",transition:"all 0.14s",whiteSpace:"nowrap"}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="#111";(e.currentTarget as HTMLElement).style.background="#f4f4f5";}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color="#52525b";(e.currentTarget as HTMLElement).style.background="transparent";}}>
                  {l.label}
                </Link>
              ))}
              <AskAIPill onClick={handleSupport}/>
              {loggedIn&&isSeller&&(
                <Link href="/seller"
                  style={{padding:"8px 12px",borderRadius:8,fontSize:14,fontWeight:500,color:"#52525b",textDecoration:"none",transition:"all 0.14s",whiteSpace:"nowrap"}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="#111";(e.currentTarget as HTMLElement).style.background="#f4f4f5";}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color="#52525b";(e.currentTarget as HTMLElement).style.background="transparent";}}>
                  My Store
                </Link>
              )}
            </div>

            {/* Mobile burger */}
            <button style={{display:"none",background:"transparent",border:"none",cursor:"pointer",color:"#374151",padding:4,marginLeft:"auto",flexShrink:0}} className="nb-burger" onClick={()=>setMenuOpen(!menuOpen)}>
              {menuOpen?<CloseIcon/>:<MenuIcon/>}
            </button>
          </div>

          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @media(max-width:960px){ .nb-burger{display:flex!important} }
          `}</style>
        </nav>

        {/* ── Mobile drawer ── */}
        {menuOpen&&(
          <div style={{background:"#fff",borderTop:"1px solid #f1f5f9",padding:"16px 24px",display:"flex",flexDirection:"column",gap:10}}>
            {loggedIn&&user&&(
              <div style={{display:"flex",alignItems:"center",gap:12,padding:12,background:"#f9fafb",borderRadius:12,border:"1px solid #f1f5f9"}}>
                <Avatar user={user} size={42}/>
                <div style={{minWidth:0}}>
                  <p style={{fontSize:14,fontWeight:700,color:"#111",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</p>
                  <p style={{fontSize:12,color:"#94a3b8",margin:"1px 0 4px"}}>{user.email}</p>
                  <RoleBadge role={user.role}/>
                </div>
              </div>
            )}
            {/* Mobile search */}
            <div style={{display:"flex",border:"1.5px solid #e5e7eb",borderRadius:8,overflow:"hidden",height:42}}>
              <input type="text" placeholder="Search..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                style={{flex:1,padding:"0 14px",fontSize:14,border:"none",outline:"none",background:"#fff",color:"#111"}}
              />
              <button onClick={handleCameraClick} style={{background:"transparent",border:"none",borderRight:"1px solid #e5e7eb",padding:"0 10px",cursor:"pointer",color:"#9ca3af"}}>
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </button>
              <button onClick={handleTextSearch} style={{background:"#dc2626",border:"none",padding:"0 16px",cursor:"pointer",color:"#fff"}}><SearchIcon/></button>
            </div>
            {[{label:"Shop",href:"/shop"},{label:"WearTounsi",href:"/brand"},{label:"Deals",href:"/deals"},{label:"My Orders",href:"/orders"},{label:"My Complaints",href:"/complaints"},{label:"Favorites",href:"/favorites"}].map(l=>(
              <Link key={l.href} href={l.href} onClick={()=>setMenuOpen(false)} style={{fontSize:14,fontWeight:600,color:"#374151",textDecoration:"none",padding:"8px 0",borderBottom:"1px solid #f5f5f5"}}>{l.label}</Link>
            ))}
            <button onClick={handleCart} style={{fontSize:14,fontWeight:600,color:"#374151",background:"none",border:"none",cursor:"pointer",textAlign:"left",padding:"8px 0",borderBottom:"1px solid #f5f5f5",display:"flex",alignItems:"center",gap:8,fontFamily:"inherit"}}>
              <ShoppingBag size={16}/>Cart{count>0&&<span style={{background:"#dc2626",color:"#fff",fontSize:10,fontWeight:900,borderRadius:999,padding:"1px 6px"}}>{count}</span>}
            </button>
            {loggedIn&&isSeller&&<Link href="/seller" onClick={()=>setMenuOpen(false)} style={{fontSize:14,fontWeight:600,color:"#374151",textDecoration:"none",padding:"8px 0",borderBottom:"1px solid #f5f5f5"}}>My Store</Link>}
            {!loggedIn?(
              <>
                <Link href="/auth/login"    onClick={()=>setMenuOpen(false)} style={{fontSize:14,fontWeight:600,color:"#374151",textDecoration:"none",padding:"8px 0",borderBottom:"1px solid #f5f5f5"}}>Log In</Link>
                <Link href="/auth/register" onClick={()=>setMenuOpen(false)} style={{fontSize:14,fontWeight:600,color:"#374151",textDecoration:"none",padding:"8px 0",borderBottom:"1px solid #f5f5f5"}}>Register</Link>
              </>
            ):(
              <button onClick={handleLogout} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"#dc2626",color:"#fff",fontWeight:700,fontSize:14,padding:"12px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",marginTop:4}}>
                <LogoutIcon/>Log Out
              </button>
            )}
          </div>
        )}
      </header>
    </>
  );
}

/* ─── Icon helpers ─── */
function SearchIcon(){return <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;}
function UserIcon(){return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;}
function DashboardIcon(){return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;}
function MenuIcon(){return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>;}
function CloseIcon(){return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>;}
function LogoutIcon(){return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;}
function OrdersIcon(){return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>;}
function HeartIcon(){return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;}