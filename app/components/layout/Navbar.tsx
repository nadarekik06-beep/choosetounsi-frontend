"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout, isAuthenticated, getUser, AuthUser } from "@/lib/auth";

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
interface ApiCategory {
  id: number;
  name: string;
  name_ar: string;
  slug: string;
  icon: string | null;
  image: string | null;
}

/* ─────────────────────────────────────────────────────────────
   MEGA MENU STATIC DATA
───────────────────────────────────────────────────────────── */
type SubGroup = { title: string; slug: string; items: { label: string; slug: string }[] };
type MegaData = Record<string, SubGroup[]>;

const MEGA: MegaData = {
  "fashion-clothing": [
    { title: "Vêtements", slug: "vetements",
      items: [{ label:"Robe",slug:"robe"},{ label:"T-shirt",slug:"t-shirt"},{ label:"Chemise",slug:"chemise"},{ label:"Jeans",slug:"jeans"},{ label:"Veste en jean",slug:"veste-en-jean"},{ label:"Shorts",slug:"shorts"}] },
    { title: "Chaussures", slug: "chaussures",
      items: [{ label:"Talons hauts",slug:"talons-hauts"},{ label:"Baskets",slug:"baskets"},{ label:"Chaussures décontractées",slug:"chaussures-decontractees"},{ label:"Ballerines",slug:"ballerines"},{ label:"Sandales",slug:"sandales"}] },
    { title: "Sac", slug: "sac-femme",
      items: [{ label:"Sac bandoulière",slug:"sac-bandouliere"},{ label:"Sac à dos",slug:"sac-a-dos"},{ label:"Bourse",slug:"bourse"}] },
    { title: "Accessoires & Sacs", slug: "accessoires-sacs",
      items: [{ label:"Sac",slug:"sac"},{ label:"Montre",slug:"montre"},{ label:"Cadeau de bijoux",slug:"cadeau-bijoux"},{ label:"Foulard",slug:"foulard"}] },
    { title: "Sous-vêtements", slug: "sous-vetements",
      items: [{ label:"Ensemble pyjama",slug:"pyjama"},{ label:"Soutien-gorge",slug:"soutien-gorge"},{ label:"Ensembles",slug:"ensembles"},{ label:"Vêtements fantastiques",slug:"vetements-fantastiques"}] },
    { title: "Cosmétique", slug: "cosmetique-femme",
      items: [{ label:"Parfum",slug:"parfum"},{ label:"Maquillage yeux",slug:"maquillage-yeux"},{ label:"Soins de la peau",slug:"soins-peau"},{ label:"Soins capillaires",slug:"soins-capillaires"},{ label:"Se maquiller",slug:"se-maquiller"}] },
    { title: "Sports & Loisirs", slug: "sports-femme",
      items: [{ label:"Sweat-shirt",slug:"sweat-shirt"},{ label:"T-shirt sport",slug:"t-shirt-sport"},{ label:"Soutien-gorge sport",slug:"soutien-gorge-sport"},{ label:"Guêtres",slug:"guetres"},{ label:"Survêtement",slug:"survetement"}] },
  ],
  "electronics-tech": [
    { title: "Téléphones", slug: "telephones",
      items: [{ label:"Smartphones",slug:"smartphones"},{ label:"Accessoires tél.",slug:"accessoires-tel"},{ label:"Coques",slug:"coques"},{ label:"Chargeurs",slug:"chargeurs"}] },
    { title: "Informatique", slug: "informatique",
      items: [{ label:"Ordinateurs portables",slug:"ordinateurs-portables"},{ label:"Tablettes",slug:"tablettes"},{ label:"Souris & Clavier",slug:"souris-clavier"},{ label:"Disques durs",slug:"disques-durs"},{ label:"Clé USB",slug:"cle-usb"}] },
    { title: "Audio & Vidéo", slug: "audio-video",
      items: [{ label:"Écouteurs",slug:"ecouteurs"},{ label:"Haut-parleurs",slug:"haut-parleurs"},{ label:"Casques",slug:"casques"},{ label:"TV",slug:"tv"}] },
    { title: "Montres connectées", slug: "montres-connectees",
      items: [{ label:"Smartwatch",slug:"smartwatch"},{ label:"Bracelet sport",slug:"bracelet-sport"},{ label:"Fitness tracker",slug:"fitness-tracker"}] },
    { title: "Jeux vidéo", slug: "jeux-video",
      items: [{ label:"Consoles",slug:"consoles"},{ label:"Jeux",slug:"jeux"},{ label:"Manettes",slug:"manettes"},{ label:"PC Gaming",slug:"pc-gaming"}] },
  ],
  "home-living": [
    { title: "Meubles", slug: "meubles",
      items: [{ label:"Salon",slug:"salon"},{ label:"Chambre",slug:"chambre"},{ label:"Bureau",slug:"bureau"},{ label:"Cuisine",slug:"cuisine"}] },
    { title: "Décoration", slug: "decoration",
      items: [{ label:"Bougies",slug:"bougies"},{ label:"Cadres",slug:"cadres"},{ label:"Tapis",slug:"tapis"},{ label:"Coussins",slug:"coussins"},{ label:"Plantes",slug:"plantes"}] },
    { title: "Cuisine & Table", slug: "cuisine-table",
      items: [{ label:"Vaisselle",slug:"vaisselle"},{ label:"Ustensiles",slug:"ustensiles"},{ label:"Appareils cuisine",slug:"appareils-cuisine"},{ label:"Boîtes rangement",slug:"boites-rangement"}] },
    { title: "Literie", slug: "literie",
      items: [{ label:"Couettes",slug:"couettes"},{ label:"Oreillers",slug:"oreillers"},{ label:"Draps",slug:"draps"}] },
  ],
  "food-grocery": [
    { title: "Épicerie", slug: "epicerie",
      items: [{ label:"Huile d'olive",slug:"huile-olive"},{ label:"Dattes",slug:"dattes"},{ label:"Miel",slug:"miel"},{ label:"Conserves",slug:"conserves"},{ label:"Harissa",slug:"harissa"}] },
    { title: "Boissons", slug: "boissons",
      items: [{ label:"Thé",slug:"the"},{ label:"Café",slug:"cafe"},{ label:"Jus naturels",slug:"jus-naturels"},{ label:"Eau minérale",slug:"eau-minerale"}] },
    { title: "Bio & Naturel", slug: "bio-naturel",
      items: [{ label:"Herbes aromatiques",slug:"herbes-aromatiques"},{ label:"Épices",slug:"epices"},{ label:"Produits bio",slug:"produits-bio"}] },
  ],
  "beauty-personal-care": [
    { title: "Soin visage", slug: "soin-visage",
      items: [{ label:"Crème hydratante",slug:"creme-hydratante"},{ label:"Sérum",slug:"serum"},{ label:"Masque",slug:"masque"},{ label:"Nettoyant",slug:"nettoyant"}] },
    { title: "Maquillage", slug: "maquillage",
      items: [{ label:"Fond de teint",slug:"fond-de-teint"},{ label:"Rouge à lèvres",slug:"rouge-a-levres"},{ label:"Mascara",slug:"mascara"},{ label:"Eyeliner",slug:"eyeliner"},{ label:"Blush",slug:"blush"}] },
    { title: "Parfums", slug: "parfums",
      items: [{ label:"Eau de parfum",slug:"eau-de-parfum"},{ label:"Eau de toilette",slug:"eau-de-toilette"},{ label:"Déodorant",slug:"deodorant"},{ label:"Huile parfumée",slug:"huile-parfumee"}] },
    { title: "Cheveux", slug: "cheveux",
      items: [{ label:"Shampoing",slug:"shampoing"},{ label:"Après-shampoing",slug:"apres-shampoing"},{ label:"Masque capillaire",slug:"masque-capillaire"},{ label:"Huile argan",slug:"huile-argan"}] },
  ],
  "sports-outdoors": [
    { title: "Vêtements sport", slug: "vetements-sport",
      items: [{ label:"T-shirt",slug:"t-shirt-sport"},{ label:"Survêtement",slug:"survetement"},{ label:"Short sport",slug:"short-sport"},{ label:"Sweat-shirt",slug:"sweat-shirt"},{ label:"Uniforme",slug:"uniforme"}] },
    { title: "Chaussures sport", slug: "chaussures-sport",
      items: [{ label:"Running",slug:"running"},{ label:"Football",slug:"football"},{ label:"Randonnée",slug:"randonnee"},{ label:"Basket",slug:"basket"}] },
    { title: "Équipement", slug: "equipement-sport",
      items: [{ label:"Fitness",slug:"fitness"},{ label:"Natation",slug:"natation"},{ label:"Cyclisme",slug:"cyclisme"},{ label:"Yoga",slug:"yoga"}] },
  ],
  "arts-crafts": [
    { title: "Peinture", slug: "peinture",
      items: [{ label:"Acrylique",slug:"acrylique"},{ label:"Aquarelle",slug:"aquarelle"},{ label:"Huile",slug:"peinture-huile"},{ label:"Toiles",slug:"toiles"}] },
    { title: "Artisanat", slug: "artisanat",
      items: [{ label:"Poterie",slug:"poterie"},{ label:"Bijoux",slug:"bijoux-art"},{ label:"Broderie",slug:"broderie"},{ label:"Tapis",slug:"tapis-art"}] },
    { title: "Loisirs créatifs", slug: "loisirs-creatifs",
      items: [{ label:"Couture",slug:"couture"},{ label:"Tricot",slug:"tricot"},{ label:"Scrapbooking",slug:"scrapbooking"}] },
  ],
  "books-stationery": [
    { title: "Livres", slug: "livres",
      items: [{ label:"Romans",slug:"romans"},{ label:"BD & Manga",slug:"bd-manga"},{ label:"Scolaires",slug:"scolaires"},{ label:"Religion",slug:"religion"}] },
    { title: "Papeterie", slug: "papeterie",
      items: [{ label:"Cahiers",slug:"cahiers"},{ label:"Stylos",slug:"stylos"},{ label:"Agendas",slug:"agendas"},{ label:"Cartables",slug:"cartables"}] },
  ],
  "kids-baby": [
    { title: "Jouets", slug: "jouets",
      items: [{ label:"Peluches",slug:"peluches"},{ label:"Jeux éducatifs",slug:"jeux-educatifs"},{ label:"Lego",slug:"lego"},{ label:"Voitures jouets",slug:"voitures-jouets"}] },
    { title: "Bébé", slug: "bebe",
      items: [{ label:"Vêtements bébé",slug:"vetements-bebe"},{ label:"Couches",slug:"couches"},{ label:"Poussettes",slug:"poussettes"},{ label:"Biberon",slug:"biberon"}] },
  ],
};


/* ─────────────────────────────────────────────────────────────
   SVG ICON MAP — maps category slug/name keywords → SVG path
───────────────────────────────────────────────────────────── */
function getCategoryIcon(slug: string, name: string): React.ReactNode {
  const s = (slug + " " + name).toLowerCase();

  // Fashion & Clothing
  if (/fashion|clothing|vetement|mode|wear|tenue|femme|homme|male/.test(s))
    return (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
      </svg>
    );

  // Electronics & Tech
  if (/electronic|tech|phone|mobile|computer|laptop|informatique/.test(s))
    return (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
      </svg>
    );

  // Home & Living
  if (/home|living|maison|meuble|decoration|furniture|interieur/.test(s))
    return (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    );

  // Food & Grocery
  if (/food|grocery|alimentation|epicerie|nourriture|cuisine|eat/.test(s))
    return (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
        <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    );

  // Beauty & Personal Care
  if (/beauty|beaute|cosmetic|soin|makeup|skincare|personal|hygiene|parfum/.test(s))
    return (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    );

  // Health & Wellness
  if (/health|wellness|sante|bien.etre|medical|pharmacie/.test(s))
    return (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    );

  // Sports & Outdoors
  if (/sport|outdoor|fitness|gym|training|running/.test(s))
    return (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4l3 3"/>
        <path d="M3.6 9h16.8M3.6 15h16.8"/>
      </svg>
    );

  // Arts & Crafts
  if (/art|craft|artisanat|handmade|diy|peinture|dessin/.test(s))
    return (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="13.5" cy="6.5" r="2.5"/>
        <circle cx="17.5" cy="10.5" r="2.5"/>
        <circle cx="8.5" cy="7.5" r="2.5"/>
        <circle cx="6.5" cy="12.5" r="2.5"/>
        <path d="M12 20v-8.5c0-1.1.9-2 2-2"/>
        <path d="M12 20c-3.3 0-6-2.7-6-6v-1.5"/>
      </svg>
    );

  // Books & Stationery
  if (/book|livre|stationery|papeterie|school|ecole/.test(s))
    return (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    );

  // Kids & Baby
  if (/kid|baby|enfant|bebe|child|jouet|toy/.test(s))
    return (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46L5.5 8H4a1 1 0 0 1 0-2h1.09A2.5 2.5 0 0 1 9.5 2z"/>
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46L18.5 8H20a1 1 0 0 0 0-2h-1.09A2.5 2.5 0 0 0 14.5 2z"/>
      </svg>
    );

  // Automotive
  if (/auto|car|voiture|moto|vehicule|garage/.test(s))
    return (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/>
        <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
      </svg>
    );

  // Default / Other
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   AVATAR HELPERS  (identical to original)
───────────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  ["#fde68a","#92400e"],["#bfdbfe","#1e40af"],["#bbf7d0","#14532d"],
  ["#fecaca","#991b1b"],["#e9d5ff","#4c1d95"],["#fed7aa","#7c2d12"],
  ["#cffafe","#164e63"],["#fce7f3","#831843"],
];

function avatarMeta(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const [bg, fg] = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  return { initials, bg, fg };
}

function fixGoogleAvatarUrl(url: string): string {
  return url.replace(/=s\d+-?c?$/, "=s200-c");
}

function Avatar({ user, size = 36 }: { user: AuthUser; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const { initials, bg, fg } = avatarMeta(user.name);
  const avatarUrl = user.avatar ? fixGoogleAvatarUrl(user.avatar) : null;

  if (avatarUrl && !imgErr) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={user.name}
        referrerPolicy="no-referrer"
        onError={() => setImgErr(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover",
          flexShrink: 0, border: "2px solid rgba(0,0,0,0.08)", display: "block" }}
      />
    );
  }
  return (
    <span style={{ width: size, height: size, background: bg, color: fg,
      fontSize: size * 0.38, borderRadius: "50%", display: "inline-flex",
      alignItems: "center", justifyContent: "center", fontWeight: 800,
      letterSpacing: "-0.02em", flexShrink: 0, lineHeight: 1,
      border: "2px solid rgba(0,0,0,0.06)" }}>
      {initials}
    </span>
  );
}

function RoleBadge({ role }: { role: AuthUser["role"] }) {
  const map: Record<string, string> = {
    seller: "bg-amber-100 text-amber-700",
    client: "bg-blue-100 text-blue-700",
    admin:  "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${map[role] ?? map.client}`}>
      {role}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   MEGA MENU PANEL
───────────────────────────────────────────────────────────── */
function MegaMenu({
  categories,
  visible,
  onClose,
}: {
  categories: ApiCategory[];
  visible: boolean;
  onClose: () => void;
}) {
  const [activeSlug, setActiveSlug] = useState<string>("");

  useEffect(() => {
    if (visible && categories.length > 0 && !activeSlug) {
      setActiveSlug(categories[0].slug);
    }
  }, [visible, categories, activeSlug]);

  if (!visible) return null;

  const activeSubs = MEGA[activeSlug] ?? [];
  const activeCat  = categories.find(c => c.slug === activeSlug);

  return (
    <>
      {/* Dark backdrop — sits BELOW the mega panel, click it to close */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          top: 96,
          background: "rgba(0,0,0,0.45)",
          zIndex: 9997,
        }}
      />

      {/* Mega panel */}
      <div
        style={{
          position: "fixed",
          top: 96,
          left: 0,
          right: 0,
          background: "#fff",
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
          borderTop: "3px solid #dc2626",
          zIndex: 9998,
          display: "flex",
          maxHeight: "80vh",
          overflow: "hidden",
          animation: "megaIn 0.2s ease",
        }}
      >
        <style>{`
          @keyframes megaIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
          .mcat:hover { background:#fff5f5 !important; color:#dc2626 !important; }
          .mcat.on    { background:#fef2f2 !important; color:#dc2626 !important; border-left:3px solid #dc2626 !important; }
          .msub:hover { color:#dc2626 !important; }
          .mmore:hover{ color:#dc2626 !important; }
        `}</style>

        {/* LEFT — category list */}
        <div style={{ width: 220, flexShrink: 0, background: "#fafafa",
          borderRight: "1px solid #f3f4f6", overflowY: "auto", padding: "8px 0" }}>
          {categories.map(cat => (
            <button
              key={cat.slug}
              onMouseEnter={() => setActiveSlug(cat.slug)}
              onClick={() => setActiveSlug(cat.slug)}
              className={`mcat ${activeSlug === cat.slug ? "on" : ""}`}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "11px 16px", textAlign: "left", background: "transparent",
                border: "none", borderLeft: "3px solid transparent",
                cursor: "pointer", fontSize: 13, fontWeight: activeSlug === cat.slug ? 700 : 500,
                color: activeSlug === cat.slug ? "#dc2626" : "#374151",
              }}
            >
              <span style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(220,38,38,0.08)",
                color: "#dc2626",
              }}>
                {getCategoryIcon(cat.slug, cat.name)}
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {cat.name}
              </span>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0, opacity: 0.35 }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          ))}
        </div>

        {/* RIGHT — subcategory grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 32px" }}>
          {activeSubs.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: 14, color: "#9ca3af", minHeight: 200 }}>
              <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Explore {activeCat?.name}</p>
              <Link href={`/shop?category=${activeSlug}`} onClick={onClose}
                style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", textDecoration: "none",
                  padding: "8px 20px", border: "1.5px solid #dc2626", borderRadius: 999 }}>
                View all products →
              </Link>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: "24px 20px" }}>
                {activeSubs.map(group => (
                  <div key={group.slug}>
                    <Link
                      href={`/shop?category=${activeSlug}&sub=${group.slug}`}
                      onClick={onClose}
                      style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#dc2626",
                        textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.07em",
                        marginBottom: 10, paddingBottom: 6, borderBottom: "1.5px solid #fee2e2" }}>
                      {group.title}
                    </Link>
                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                      {group.items.map(item => (
                        <li key={item.slug}>
                          <Link
                            href={`/shop?category=${activeSlug}&sub=${group.slug}&item=${item.slug}`}
                            onClick={onClose}
                            className="msub"
                            style={{ fontSize: 13, color: "#4b5563", textDecoration: "none",
                              fontWeight: 400, display: "block", lineHeight: 1.5, transition: "color 0.12s" }}>
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={`/shop?category=${activeSlug}&sub=${group.slug}`}
                      onClick={onClose}
                      className="mmore"
                      style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11,
                        fontWeight: 700, color: "#9ca3af", textDecoration: "none", marginTop: 8,
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        borderBottom: "1px dashed #d1d5db", paddingBottom: 1, transition: "color 0.12s" }}>
                      Voir plus
                      <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </Link>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
                <Link
                  href={`/shop?category=${activeSlug}`}
                  onClick={onClose}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12,
                    fontWeight: 700, color: "#dc2626", textDecoration: "none",
                    padding: "7px 16px", background: "#fff5f5", borderRadius: 999,
                    border: "1.5px solid #fecaca" }}>
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

/* ═══════════════════════════════════════════════════════════════
   NAVBAR  — original code preserved exactly, mega menu added
═══════════════════════════════════════════════════════════════ */
const NAV_LINKS = [
  { label: "Shop",       href: "/shop"       },
  { label: "Vendors",    href: "/vendors"    },
  { label: "Deals",      href: "/deals"      },
];

export default function Navbar() {
  const router = useRouter();

  // ── original state ──
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user,         setUser]         = useState<AuthUser | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── NEW: mega menu state ──
  const [megaOpen,    setMegaOpen]    = useState(false);
  const [categories,  setCategories]  = useState<ApiCategory[]>([]);
  const catBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isAuthenticated()) setUser(getUser());
  }, []);

  // fetch categories once
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    fetch(`${API_URL}/api/categories`, { headers: { Accept: "application/json" } })
      .then(r => r.json())
      .then(j => setCategories(j.data ?? []))
      .catch(() => {});
  }, []);

  const loggedIn = !!user;
  const isSeller = user?.role === "seller";

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMenuOpen(false);
    await logout();
    setUser(null);
    router.push("/auth/login");
  };

  // close account dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // close mega menu when clicking outside (but not on the cat button itself)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catBtnRef.current && catBtnRef.current.contains(e.target as Node)) return;
      // mega panel and backdrop handle their own clicks — nothing else needed
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleMega = () => {
    setMegaOpen(o => !o);
    setDropdownOpen(false); // close account dropdown when opening categories
  };

  return (
    <>
      {/* ── MEGA MENU (rendered in portal-like fashion, outside header) ── */}
      <MegaMenu
        categories={categories}
        visible={megaOpen}
        onClose={() => setMegaOpen(false)}
      />

      <header className="w-full bg-white border-b border-zinc-100 sticky top-0 z-50">

        {/* Announcement bar */}
        <div className="bg-zinc-950 text-white text-xs text-center py-2 tracking-widest uppercase font-medium">
          🇹🇳 Free delivery on orders over 50 DT — Tunisia&apos;s #1 marketplace
        </div>

        {/* ── Main row ── */}
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">

          {/* Logo — unchanged */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/images/logo.png" alt="ChooseTounsi Logo" className="w-16 h-16 object-contain" />
            <span className="text-zinc-950 font-black text-xl tracking-tight">
              Choose<span className="text-red-600">Tounsi</span>
            </span>
          </Link>

          {/* Search — unchanged */}
          <div className="hidden md:flex flex-1 mx-4">
            <div className="flex w-full max-w-xl border border-zinc-200 rounded-sm overflow-hidden hover:border-zinc-400 transition-colors">
              <input
                type="text"
                placeholder="Search products, brands, vendors..."
                className="flex-1 px-4 py-2.5 text-sm outline-none bg-white text-zinc-800 placeholder:text-zinc-400"
              />
              <button className="bg-red-600 hover:bg-red-700 transition-colors px-5 text-white">
                <SearchIcon />
              </button>
            </div>
          </div>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1 shrink-0">

            {/* ── CATEGORIES button (NEW) ── */}
            <button
              ref={catBtnRef}
              onClick={toggleMega}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: megaOpen ? "#fef2f2" : "transparent",
                color: megaOpen ? "#dc2626" : "#52525b",
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
              Categories
              <svg
                width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                style={{ transform: megaOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {/* Original nav links */}
            {NAV_LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 transition-all"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* ── Far-right group — UNCHANGED from original ── */}
          <div className="flex items-center gap-4 ml-auto shrink-0">

            {/* Seller dashboard shortcut */}
            {loggedIn && isSeller && (
              <Link
                href="/seller"
                className="hidden md:flex flex-col items-center text-zinc-500 hover:text-red-600 transition-colors group"
                title="Seller Dashboard"
              >
                <DashboardIcon />
                <span className="text-[10px] mt-0.5 font-medium tracking-wider group-hover:text-red-600">
                  Dashboard
                </span>
              </Link>
            )}

            {/* Cart */}
            <button className="flex flex-col items-center text-zinc-600 hover:text-red-600 transition-colors group relative">
              <CartIcon />
              <span className="text-[10px] mt-0.5 font-medium tracking-wider group-hover:text-red-600">Cart</span>
              <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                0
              </span>
            </button>

            {/* ── Account dropdown — UNCHANGED from original ── */}
            <div className="relative hidden md:block" ref={dropdownRef}>
              <button
                onClick={() => { setDropdownOpen(o => !o); setMegaOpen(false); }}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
                className="flex items-center gap-2 group focus:outline-none"
              >
                {loggedIn && user ? (
                  <>
                    <Avatar user={user} size={36} />
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-xs font-bold text-zinc-800 group-hover:text-red-600 transition-colors max-w-[120px] truncate">
                        {user.name}
                      </span>
                      <RoleBadge role={user.role} />
                    </div>
                    <ChevronIcon open={dropdownOpen} />
                  </>
                ) : (
                  <div className="flex flex-col items-center text-zinc-600 hover:text-red-600 transition-colors">
                    <UserIcon />
                    <span className="text-[10px] mt-0.5 font-medium tracking-wider">Account</span>
                  </div>
                )}
              </button>

              {/* Dropdown panel — fixed so it escapes header stacking context */}
              {dropdownOpen && (
                <div className="fixed w-56 bg-white border border-zinc-100 rounded-2xl shadow-2xl shadow-black/10 py-2 z-[9999] overflow-hidden" style={{ top: 97, right: 24 }}>

                  {loggedIn && user && (
                    <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-3">
                      <Avatar user={user} size={42} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-900 truncate">{user.name}</p>
                        <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  )}

                  {!loggedIn && (
                    <>
                      <Link href="/auth/login" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors">
                        <UserIcon /> Log In
                      </Link>
                      <Link href="/auth/register" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors">
                        <RegisterIcon /> Register
                      </Link>
                    </>
                  )}

                  {loggedIn && (
                    <>
                      <Link href="/profile" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors">
                        <UserIcon /> My Profile
                      </Link>
                      {isSeller && (
                        <Link href="/seller" onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors">
                          <DashboardIcon /> Dashboard
                        </Link>
                      )}
                      <div className="my-1.5 border-t border-zinc-100" />
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">
                        <LogoutIcon /> Log Out
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Hamburger (mobile only) — unchanged */}
            <button
              className="lg:hidden text-zinc-700 hover:text-zinc-950 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </nav>

        {/* ════ Mobile drawer — unchanged ════ */}
        {menuOpen && (
          <div className="lg:hidden border-t border-zinc-100 bg-white px-6 py-4 flex flex-col gap-4">

            {loggedIn && user && (
              <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <Avatar user={user} size={44} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-900 truncate">{user.name}</p>
                  <p className="text-xs text-zinc-400 truncate mb-1">{user.email}</p>
                  <RoleBadge role={user.role} />
                </div>
              </div>
            )}

            <div className="flex border border-zinc-200 rounded-sm overflow-hidden">
              <input type="text" placeholder="Search..."
                className="flex-1 px-4 py-2.5 text-sm outline-none bg-white text-zinc-800 placeholder:text-zinc-400" />
              <button className="bg-red-600 px-4 text-white"><SearchIcon /></button>
            </div>

            {/* Mobile categories accordion */}
            <details className="group">
              <summary className="text-sm font-semibold text-zinc-800 hover:text-red-600 cursor-pointer py-1 border-b border-zinc-50 list-none flex items-center justify-between">
                Categories
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="group-open:rotate-180 transition-transform duration-200">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </summary>
              <div className="mt-2 flex flex-col gap-0 pl-3">
                {categories.map(cat => (
                  <Link key={cat.slug} href={`/shop?category=${cat.slug}`} onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm font-medium text-zinc-700 hover:text-red-600 border-b border-zinc-50 transition-colors">
                    {getCategoryIcon(cat.slug, cat.name)}
                    {cat.name}
                  </Link>
                ))}
              </div>
            </details>

            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                className="text-sm font-semibold text-zinc-800 hover:text-red-600 transition-colors py-1 border-b border-zinc-50 tracking-wide">
                {l.label}
              </Link>
            ))}

            {!loggedIn && (
              <>
                <Link href="/auth/login" onClick={() => setMenuOpen(false)}
                  className="text-sm font-semibold text-zinc-800 hover:text-red-600 py-1 border-b border-zinc-50">
                  Log In
                </Link>
                <Link href="/auth/register" onClick={() => setMenuOpen(false)}
                  className="text-sm font-semibold text-zinc-800 hover:text-red-600 py-1 border-b border-zinc-50">
                  Register
                </Link>
              </>
            )}

            {loggedIn && isSeller && (
              <Link href="/seller" onClick={() => setMenuOpen(false)}
                className="text-sm font-semibold text-zinc-800 hover:text-red-600 py-1 border-b border-zinc-50">
                Dashboard
              </Link>
            )}

            {loggedIn && (
              <button onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-3 rounded-xl transition-colors">
                <LogoutIcon /> Log Out
              </button>
            )}
          </div>
        )}
      </header>
    </>
  );
}

/* ─── Icons — identical to original ─────────────────────── */
function SearchIcon() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
}
function UserIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function DashboardIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
}
function CartIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>;
}
function MenuIcon() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
}
function CloseIcon() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>;
}
function LogoutIcon() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}
function RegisterIcon() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
}
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
      <path d="M6 9l6 6 6-6"/>
    </svg>
  );
}