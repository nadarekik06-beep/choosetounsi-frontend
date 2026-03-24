"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout, isAuthenticated, getUser, AuthUser } from "@/lib/auth";
import { useCart } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";
import { Heart, ShoppingBag, ClipboardList } from "lucide-react";

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
    { title: "Clothing", slug: "vetements",
      items: [{ label:"Dress",slug:"robe"},{ label:"T-shirt",slug:"t-shirt"},{ label:"Shirt",slug:"chemise"},{ label:"Jeans",slug:"jeans"},{ label:"Denim Jacket",slug:"veste-en-jean"},{ label:"Shorts",slug:"shorts"}] },
    { title: "Shoes", slug: "chaussures",
      items: [{ label:"High Heels",slug:"talons-hauts"},{ label:"Sneakers",slug:"baskets"},{ label:"Casual Shoes",slug:"chaussures-decontractees"},{ label:"Ballet Flats",slug:"ballerines"},{ label:"Sandals",slug:"sandales"}] },
    { title: "Bags", slug: "sac-femme",
      items: [{ label:"Shoulder Bag",slug:"sac-bandouliere"},{ label:"Backpack",slug:"sac-a-dos"},{ label:"Purse",slug:"bourse"}] },
    { title: "Accessories & Bags", slug: "accessoires-sacs",
      items: [{ label:"Bags",slug:"sac"},{ label:"Watch",slug:"montre"},{ label:"Jewelry Gift",slug:"cadeau-bijoux"},{ label:"Scarf",slug:"foulard"}] },
    { title: "Underwear & Nightwear", slug: "sous-vetements",
      items: [{ label:"Pyjama Set",slug:"pyjama"},{ label:"Bra",slug:"soutien-gorge"},{ label:"Sets",slug:"ensembles"},{ label:"Fantasy Wear",slug:"vetements-fantastiques"}] },
    { title: "Cosmetics", slug: "cosmetique-femme",
      items: [{ label:"Perfume",slug:"parfum"},{ label:"Eye Makeup",slug:"maquillage-yeux"},{ label:"Skincare",slug:"soins-peau"},{ label:"Hair Care",slug:"soins-capillaires"},{ label:"Makeup",slug:"se-maquiller"}] },
    { title: "Sports & Leisure", slug: "sports-femme",
      items: [{ label:"Sweat-shirt",slug:"sweat-shirt"},{ label:"Sports T-shirt",slug:"t-shirt-sport"},{ label:"Sports Bra",slug:"soutien-gorge-sport"},{ label:"Gaiters",slug:"guetres"},{ label:"Tracksuit",slug:"survetement"}] },
  ],
  "electronics-tech": [
    { title: "Phones", slug: "telephones",
      items: [{ label:"Smartphones",slug:"smartphones"},{ label:"Phone Accessories",slug:"accessoires-tel"},{ label:"Phone Cases",slug:"coques"},{ label:"Chargers",slug:"chargeurs"}] },
    { title: "Computing", slug: "informatique",
      items: [{ label:"Laptops",slug:"ordinateurs-portables"},{ label:"Tablets",slug:"tablettes"},{ label:"Mouse & Keyboard",slug:"souris-clavier"},{ label:"Hard Drives",slug:"disques-durs"},{ label:"USB Drives",slug:"cle-usb"}] },
    { title: "Audio & Video", slug: "audio-video",
      items: [{ label:"Earphones",slug:"ecouteurs"},{ label:"Speakers",slug:"haut-parleurs"},{ label:"Headphones",slug:"casques"},{ label:"TV",slug:"tv"}] },
    { title: "Smartwatches", slug: "montres-connectees",
      items: [{ label:"Smartwatch",slug:"smartwatch"},{ label:"Sports Band",slug:"bracelet-sport"},{ label:"Fitness Tracker",slug:"fitness-tracker"}] },
    { title: "Video Games", slug: "jeux-video",
      items: [{ label:"Consoles",slug:"consoles"},{ label:"Games",slug:"jeux"},{ label:"Controllers",slug:"manettes"},{ label:"Gaming PC",slug:"pc-gaming"}] },
  ],
  "home-living": [
    { title: "Furniture", slug: "meubles",
      items: [{ label:"Living Room",slug:"salon"},{ label:"Bedroom",slug:"chambre"},{ label:"Office",slug:"bureau"},{ label:"Kitchen",slug:"cuisine"}] },
    { title: "Decoration", slug: "decoration",
      items: [{ label:"Candles",slug:"bougies"},{ label:"Frames",slug:"cadres"},{ label:"Rugs",slug:"tapis"},{ label:"Cushions",slug:"coussins"},{ label:"Plants",slug:"plantes"}] },
    { title: "Kitchen & Dining", slug: "cuisine-table",
      items: [{ label:"Crockery",slug:"vaisselle"},{ label:"Utensils",slug:"ustensiles"},{ label:"Kitchen Appliances",slug:"appareils-cuisine"},{ label:"Storage Boxes",slug:"boites-rangement"}] },
    { title: "Bedding", slug: "literie",
      items: [{ label:"Duvets",slug:"couettes"},{ label:"Pillows",slug:"oreillers"},{ label:"Bed Sheets",slug:"draps"}] },
  ],
  "food-grocery": [
    { title: "Grocery", slug: "epicerie",
      items: [{ label:"Olive Oil",slug:"huile-olive"},{ label:"Dates",slug:"dattes"},{ label:"Honey",slug:"miel"},{ label:"Canned Goods",slug:"conserves"},{ label:"Harissa",slug:"harissa"}] },
    { title: "Beverages", slug: "boissons",
      items: [{ label:"Tea",slug:"the"},{ label:"Coffee",slug:"cafe"},{ label:"Natural Juices",slug:"jus-naturels"},{ label:"Mineral Water",slug:"eau-minerale"}] },
    { title: "Organic & Natural", slug: "bio-naturel",
      items: [{ label:"Aromatic Herbs",slug:"herbes-aromatiques"},{ label:"Spices",slug:"epices"},{ label:"Organic Products",slug:"produits-bio"}] },
  ],
  "beauty-personal-care": [
    { title: "Face Care", slug: "soin-visage",
      items: [{ label:"Moisturiser",slug:"creme-hydratante"},{ label:"Serum",slug:"serum"},{ label:"Face Mask",slug:"masque"},{ label:"Cleanser",slug:"nettoyant"}] },
    { title: "Makeup", slug: "maquillage",
      items: [{ label:"Foundation",slug:"fond-de-teint"},{ label:"Lipstick",slug:"rouge-a-levres"},{ label:"Mascara",slug:"mascara"},{ label:"Eyeliner",slug:"eyeliner"},{ label:"Blush",slug:"blush"}] },
    { title: "Perfumes", slug: "parfums",
      items: [{ label:"Eau de Parfum",slug:"eau-de-parfum"},{ label:"Eau de Toilette",slug:"eau-de-toilette"},{ label:"Deodorant",slug:"deodorant"},{ label:"Perfume Oil",slug:"huile-parfumee"}] },
    { title: "Hair Care", slug: "cheveux",
      items: [{ label:"Shampoo",slug:"shampoing"},{ label:"Conditioner",slug:"apres-shampoing"},{ label:"Hair Mask",slug:"masque-capillaire"},{ label:"Argan Oil",slug:"huile-argan"}] },
  ],
  "sports-outdoors": [
    { title: "Sportswear", slug: "vetements-sport",
      items: [{ label:"T-shirt",slug:"t-shirt-sport"},{ label:"Tracksuit",slug:"survetement"},{ label:"Sports Shorts",slug:"short-sport"},{ label:"Sweat-shirt",slug:"sweat-shirt"},{ label:"Uniform",slug:"uniforme"}] },
    { title: "Sports Shoes", slug: "chaussures-sport",
      items: [{ label:"Running",slug:"running"},{ label:"Football",slug:"football"},{ label:"Hiking",slug:"randonnee"},{ label:"Basketball",slug:"basket"}] },
    { title: "Equipment", slug: "equipement-sport",
      items: [{ label:"Fitness",slug:"fitness"},{ label:"Swimming",slug:"natation"},{ label:"Cycling",slug:"cyclisme"},{ label:"Yoga",slug:"yoga"}] },
  ],
  "arts-crafts": [
    { title: "Painting", slug: "peinture",
      items: [{ label:"Acrylic",slug:"acrylique"},{ label:"Watercolour",slug:"aquarelle"},{ label:"Oil Paint",slug:"peinture-huile"},{ label:"Canvases",slug:"toiles"}] },
    { title: "Crafts", slug: "artisanat",
      items: [{ label:"Pottery",slug:"poterie"},{ label:"Jewellery",slug:"bijoux-art"},{ label:"Embroidery",slug:"broderie"},{ label:"Rugs",slug:"tapis-art"}] },
    { title: "Creative Hobbies", slug: "loisirs-creatifs",
      items: [{ label:"Sewing",slug:"couture"},{ label:"Knitting",slug:"tricot"},{ label:"Scrapbooking",slug:"scrapbooking"}] },
  ],
  "books-stationery": [
    { title: "Books", slug: "livres",
      items: [{ label:"Novels",slug:"romans"},{ label:"Comics & Manga",slug:"bd-manga"},{ label:"School Books",slug:"scolaires"},{ label:"Religion",slug:"religion"}] },
    { title: "Stationery", slug: "papeterie",
      items: [{ label:"Notebooks",slug:"cahiers"},{ label:"Pens",slug:"stylos"},{ label:"Planners",slug:"agendas"},{ label:"School Bags",slug:"cartables"}] },
  ],
  "kids-baby": [
    { title: "Toys", slug: "jouets",
      items: [{ label:"Plush Toys",slug:"peluches"},{ label:"Educational Games",slug:"jeux-educatifs"},{ label:"Lego",slug:"lego"},{ label:"Toy Cars",slug:"voitures-jouets"}] },
    { title: "Baby", slug: "bebe",
      items: [{ label:"Baby Clothes",slug:"vetements-bebe"},{ label:"Nappies",slug:"couches"},{ label:"Strollers",slug:"poussettes"},{ label:"Baby Bottle",slug:"biberon"}] },
  ],
};

/* ─────────────────────────────────────────────────────────────
   SVG ICON MAP
───────────────────────────────────────────────────────────── */
function getCategoryIcon(slug: string, name: string): React.ReactNode {
  const s = (slug + " " + name).toLowerCase();
  if (/fashion|clothing|vetement|mode|wear|tenue|femme|homme|male/.test(s))
    return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg>;
  if (/electronic|tech|phone|mobile|computer|laptop|informatique/.test(s))
    return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>;
  if (/home|living|maison|meuble|decoration|furniture|interieur/.test(s))
    return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
  if (/food|grocery|alimentation|epicerie|nourriture|cuisine|eat/.test(s))
    return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>;
  if (/beauty|beaute|cosmetic|soin|makeup|skincare|personal|hygiene|parfum/.test(s))
    return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
  if (/sport|outdoor|fitness|gym|training|running/.test(s))
    return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/><path d="M3.6 9h16.8M3.6 15h16.8"/></svg>;
  if (/art|craft|artisanat|handmade|diy|peinture|dessin/.test(s))
    return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 20v-8.5c0-1.1.9-2 2-2"/><path d="M12 20c-3.3 0-6-2.7-6-6v-1.5"/></svg>;
  if (/book|livre|stationery|papeterie|school|ecole/.test(s))
    return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
  if (/kid|baby|enfant|bebe|child|jouet|toy/.test(s))
    return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46L5.5 8H4a1 1 0 0 1 0-2h1.09A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46L18.5 8H20a1 1 0 0 0 0-2h-1.09A2.5 2.5 0 0 0 14.5 2z"/></svg>;
  if (/auto|car|voiture|moto|vehicule|garage/.test(s))
    return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
}

/* ─────────────────────────────────────────────────────────────
   AVATAR HELPERS
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
      <img src={avatarUrl} alt={user.name} referrerPolicy="no-referrer" onError={() => setImgErr(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(0,0,0,0.08)", display: "block" }}
      />
    );
  }
  return (
    <span style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38, borderRadius: "50%",
      display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800,
      letterSpacing: "-0.02em", flexShrink: 0, lineHeight: 1, border: "2px solid rgba(0,0,0,0.06)" }}>
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
function MegaMenu({ categories, visible, onClose }: {
  categories: ApiCategory[];
  visible: boolean;
  onClose: () => void;
}) {
  const [activeSlug, setActiveSlug] = useState<string>("");
  useEffect(() => {
    if (visible && categories.length > 0 && !activeSlug) setActiveSlug(categories[0].slug);
  }, [visible, categories, activeSlug]);

  if (!visible) return null;
  const activeSubs = MEGA[activeSlug] ?? [];
  const activeCat  = categories.find(c => c.slug === activeSlug);

  // Navbar height = announcement bar (32px) + top utility bar (36px) + main nav (64px) = 132px
  const OFFSET = 132;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, top: OFFSET, background: "rgba(0,0,0,0.45)", zIndex: 9997 }} />
      <div style={{
        position: "fixed", top: OFFSET, left: 0, right: 0, background: "#fff",
        boxShadow: "0 16px 48px rgba(0,0,0,0.18)", borderTop: "3px solid #dc2626",
        zIndex: 9998, display: "flex", maxHeight: "80vh", overflow: "hidden", animation: "megaIn 0.2s ease",
      }}>
        <style>{`
          @keyframes megaIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
          .mcat:hover{background:#fff5f5!important;color:#dc2626!important}
          .mcat.on{background:#fef2f2!important;color:#dc2626!important;border-left:3px solid #dc2626!important}
          .msub:hover{color:#dc2626!important}
          .mmore:hover{color:#dc2626!important}
        `}</style>
        {/* LEFT */}
        <div style={{ width: 220, flexShrink: 0, background: "#fafafa", borderRight: "1px solid #f3f4f6", overflowY: "auto", padding: "8px 0" }}>
          {categories.map(cat => (
            <button key={cat.slug} onMouseEnter={() => setActiveSlug(cat.slug)} onClick={() => setActiveSlug(cat.slug)}
              className={`mcat ${activeSlug === cat.slug ? "on" : ""}`}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", textAlign: "left",
                background: "transparent", border: "none", borderLeft: "3px solid transparent", cursor: "pointer",
                fontSize: 13, fontWeight: activeSlug === cat.slug ? 700 : 500, color: activeSlug === cat.slug ? "#dc2626" : "#374151" }}>
              <span style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
                {getCategoryIcon(cat.slug, cat.name)}
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{cat.name}</span>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0, opacity: 0.35 }}><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ))}
        </div>
        {/* RIGHT */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 32px" }}>
          {activeSubs.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14, color: "#9ca3af", minHeight: 200 }}>
              <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Explore {activeCat?.name}</p>
              <Link href={`/shop?category=${activeSlug}`} onClick={onClose}
                style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", textDecoration: "none", padding: "8px 20px", border: "1.5px solid #dc2626", borderRadius: 999 }}>
                View all products →
              </Link>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: "24px 20px" }}>
                {activeSubs.map(group => (
                  <div key={group.slug}>
                    <Link href={`/shop?category=${activeSlug}&sub=${group.slug}`} onClick={onClose}
                      style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#dc2626", textDecoration: "none",
                        textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, paddingBottom: 6, borderBottom: "1.5px solid #fee2e2" }}>
                      {group.title}
                    </Link>
                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                      {group.items.map(item => (
                        <li key={item.slug}>
                          <Link href={`/shop?category=${activeSlug}&sub=${group.slug}&item=${item.slug}`} onClick={onClose} className="msub"
                            style={{ fontSize: 13, color: "#4b5563", textDecoration: "none", fontWeight: 400, display: "block", lineHeight: 1.5, transition: "color 0.12s" }}>
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link href={`/shop?category=${activeSlug}&sub=${group.slug}`} onClick={onClose} className="mmore"
                      style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: "#9ca3af",
                        textDecoration: "none", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.05em",
                        borderBottom: "1px dashed #d1d5db", paddingBottom: 1, transition: "color 0.12s" }}>
                      View more <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                    </Link>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
                <Link href={`/shop?category=${activeSlug}`} onClick={onClose}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#dc2626",
                    textDecoration: "none", padding: "7px 16px", background: "#fff5f5", borderRadius: 999, border: "1.5px solid #fecaca" }}>
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
   NAVBAR
═══════════════════════════════════════════════════════════════ */
const NAV_LINKS = [
  { label: "Shop",    href: "/shop"    },
  { label: "Vendors", href: "/vendors" },
  { label: "Deals",   href: "/deals"   },
];

export default function Navbar() {
  const router = useRouter();

  const [menuOpen,     setMenuOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user,         setUser]         = useState<AuthUser | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [megaOpen,   setMegaOpen]   = useState(false);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const catBtnRef = useRef<HTMLButtonElement>(null);

  const [cartOpen, setCartOpen] = useState(false);
  const { count, favorites } = useCart();

  useEffect(() => {
    if (isAuthenticated()) setUser(getUser());
  }, []);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    fetch(`${API_URL}/api/categories`, { headers: { Accept: "application/json" } })
      .then(r => r.json())
      .then(j => setCategories(j.data ?? []))
      .catch(() => {});
  }, []);

  const loggedIn = !!user;
  const isSeller = user?.role === "seller";
  const favCount = favorites.length;

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMenuOpen(false);
    await logout();
    setUser(null);
    router.push("/auth/login");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleMega = () => { setMegaOpen(o => !o); setDropdownOpen(false); };
  const closeAll   = () => { setMegaOpen(false); setDropdownOpen(false); setMenuOpen(false); };

  return (
    <>
      <MegaMenu categories={categories} visible={megaOpen} onClose={() => setMegaOpen(false)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <header className="w-full bg-white sticky top-0 z-50" style={{ boxShadow: '0 1px 0 #f1f5f9' }}>

        {/* ══ ROW 1: Announcement bar ══ */}
        <div className="bg-zinc-950 text-white text-xs text-center py-2 tracking-widest uppercase font-medium">
          🇹🇳 Free delivery on orders over 50 DT — Tunisia&apos;s #1 marketplace
        </div>

        {/* ══ ROW 2: Top utility bar (SHEIN-style) ══ */}
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <div className="max-w-7xl mx-auto px-6" style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>

            <style>{`
              .util-link { display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;color:#52525b;transition:color 0.15s ease,background 0.15s ease;white-space:nowrap;position:relative;border:none;background:transparent;cursor:pointer; }
              .util-link:hover { color:#dc2626;background:rgba(220,38,38,0.06); }
              .util-badge { position:absolute;top:-2px;right:2px;background:#dc2626;color:#fff;font-size:9px;font-weight:900;border-radius:999px;min-width:15px;height:15px;display:flex;align-items:center;justify-content:center;padding:0 3px;border:1.5px solid #fff; }
            `}</style>

            {/* Orders */}
            <Link href="/orders" onClick={closeAll} className="util-link">
              <ClipboardList size={14} />
              My Orders
            </Link>

            <span style={{ width: 1, height: 14, background: '#e5e7eb', flexShrink: 0 }} />

            {/* Favorites */}
            <Link href="/favorites" onClick={closeAll} className="util-link" style={{ position: 'relative' }}>
              <Heart size={14} />
              Favorites
              {favCount > 0 && <span className="util-badge">{favCount > 9 ? '9+' : favCount}</span>}
            </Link>

            <span style={{ width: 1, height: 14, background: '#e5e7eb', flexShrink: 0 }} />

            {/* Cart */}
            <button onClick={() => { setCartOpen(true); closeAll(); }} className="util-link" style={{ position: 'relative' }}>
              <ShoppingBag size={14} />
              Cart
              {count > 0 && <span className="util-badge">{count > 99 ? '99+' : count}</span>}
            </button>

            <span style={{ width: 1, height: 14, background: '#e5e7eb', flexShrink: 0 }} />

            {/* Auth links or user avatar */}
            {!loggedIn ? (
              <>
                <Link href="/auth/login" onClick={closeAll} className="util-link">
                  <UserIcon /> Log In
                </Link>
                <Link href="/auth/register" onClick={closeAll} className="util-link" style={{ background: '#dc2626', color: '#fff', borderRadius: 6, padding: '4px 12px' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#b91c1c' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#dc2626' }}
                >
                  Register
                </Link>
              </>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => { setDropdownOpen(o => !o); setMegaOpen(false); }}
                  className="util-link"
                  style={{ gap: 7 }}
                >
                  <Avatar user={user!} size={22} />
                  <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user!.name}</span>
                  <RoleBadge role={user!.role} />
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                    style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>

                {dropdownOpen && (
                  <div style={{
                    position: "fixed", top: 100, right: 24, width: 220,
                    background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16,
                    boxShadow: "0 20px 60px rgba(0,0,0,0.14)", zIndex: 9999, overflow: "hidden",
                  }}>
                    {/* User header */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar user={user!} size={40} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user!.name}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user!.email}</p>
                      </div>
                    </div>

                    <style>{`
                      .dd-item{display:flex;align-items:center;gap:10px;padding:11px 16px;font-size:13px;font-weight:600;color:#374151;text-decoration:none;transition:background 0.13s,color 0.13s;border:none;background:transparent;cursor:pointer;width:100%;}
                      .dd-item:hover{background:#fafafa;color:#dc2626;}
                      .dd-item.danger{color:#dc2626;font-weight:700;}
                      .dd-item.danger:hover{background:#fff5f5;}
                    `}</style>

                    <Link href="/profile"   onClick={() => setDropdownOpen(false)} className="dd-item"><UserIcon />    My Profile</Link>
                    <Link href="/orders"    onClick={() => setDropdownOpen(false)} className="dd-item"><OrdersIcon /> My Orders</Link>
                    <Link href="/favorites" onClick={() => setDropdownOpen(false)} className="dd-item"><HeartIcon />  Favorites</Link>
                    {isSeller && (
                      <Link href="/seller" onClick={() => setDropdownOpen(false)} className="dd-item"><DashboardIcon /> Dashboard</Link>
                    )}
                    <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
                    <button onClick={handleLogout} className="dd-item danger"><LogoutIcon /> Log Out</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══ ROW 3: Main nav ══ */}
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/images/logo.png" alt="ChooseTounsi Logo" className="w-12 h-12 object-contain" />
            <span className="text-zinc-950 font-black text-xl tracking-tight">
              Choose<span className="text-red-600">Tounsi</span>
            </span>
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1 mx-4">
            <div className="flex w-full max-w-2xl border border-zinc-200 rounded-sm overflow-hidden hover:border-zinc-400 transition-colors">
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
            <button
              ref={catBtnRef}
              onClick={toggleMega}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: megaOpen ? "#fef2f2" : "transparent", color: megaOpen ? "#dc2626" : "#52525b" }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
              Categories
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                style={{ transform: megaOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 transition-all">
                {l.label}
              </Link>
            ))}
            {loggedIn && isSeller && (
              <Link href="/seller" className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 transition-all">
                Dashboard
              </Link>
            )}
          </div>

          {/* Hamburger mobile */}
          <button className="lg:hidden text-zinc-700 hover:text-zinc-950 transition-colors ml-auto"
            onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </nav>

        {/* ════ Mobile drawer ════ */}
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
              <input type="text" placeholder="Search..." className="flex-1 px-4 py-2.5 text-sm outline-none bg-white text-zinc-800 placeholder:text-zinc-400" />
              <button className="bg-red-600 px-4 text-white"><SearchIcon /></button>
            </div>

            <details className="group">
              <summary className="text-sm font-semibold text-zinc-800 hover:text-red-600 cursor-pointer py-1 border-b border-zinc-50 list-none flex items-center justify-between">
                Categories
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="group-open:rotate-180 transition-transform duration-200"><path d="M6 9l6 6 6-6"/></svg>
              </summary>
              <div className="mt-2 flex flex-col gap-0 pl-3">
                {categories.map(cat => (
                  <Link key={cat.slug} href={`/shop?category=${cat.slug}`} onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm font-medium text-zinc-700 hover:text-red-600 border-b border-zinc-50 transition-colors">
                    {getCategoryIcon(cat.slug, cat.name)}{cat.name}
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

            <button onClick={() => { setMenuOpen(false); setCartOpen(true); }}
              className="text-sm font-semibold text-zinc-800 hover:text-red-600 py-1 border-b border-zinc-50 text-left flex items-center gap-2">
              <ShoppingBag size={16} /> Cart {count > 0 && <span className="bg-red-600 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{count}</span>}
            </button>

            {loggedIn && <>
              <Link href="/orders"    onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-zinc-800 hover:text-red-600 py-1 border-b border-zinc-50 flex items-center gap-2"><ClipboardList size={16} /> My Orders</Link>
              <Link href="/favorites" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-zinc-800 hover:text-red-600 py-1 border-b border-zinc-50 flex items-center gap-2"><Heart size={16} /> Favorites {favCount > 0 && <span className="bg-red-600 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{favCount}</span>}</Link>
            </>}

            {!loggedIn && <>
              <Link href="/auth/login"    onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-zinc-800 hover:text-red-600 py-1 border-b border-zinc-50">Log In</Link>
              <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-zinc-800 hover:text-red-600 py-1 border-b border-zinc-50">Register</Link>
            </>}

            {loggedIn && isSeller && (
              <Link href="/seller" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-zinc-800 hover:text-red-600 py-1 border-b border-zinc-50">Dashboard</Link>
            )}
            {loggedIn && (
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-3 rounded-xl transition-colors">
                <LogoutIcon /> Log Out
              </button>
            )}
          </div>
        )}
      </header>
    </>
  );
}

/* ─── Icons ─────────────────────────────────────────────── */
function SearchIcon()    { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>; }
function UserIcon()      { return <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function DashboardIcon() { return <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
function MenuIcon()      { return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>; }
function CloseIcon()     { return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>; }
function LogoutIcon()    { return <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function OrdersIcon()    { return <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>; }
function HeartIcon()     { return <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>; }