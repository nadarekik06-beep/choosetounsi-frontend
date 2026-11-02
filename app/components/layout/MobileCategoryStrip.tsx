"use client";

// Phone-only quick access to the top-level categories, right under the header search bar.
// Same data and order as the mega menu: the Navbar's /categories list, filtered by the cached
// /categories/mega-menu answer exactly like the menu rail. "Tout voir" opens the existing
// categories menu. Not sticky: it scrolls away with the page. Hidden from 768px up.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutGrid } from "lucide-react";
import CatIcon from "@/app/components/layout/CategoryIcon";
import { useMegaMenu } from "@/lib/gender";
import { STORAGE_URL } from "@/lib/constants";
import { canScrollNext } from "@/lib/i18n/rtlScroll";

export interface StripCategory {
  id: number;
  name: string;
  slug: string;
  image: string | null;
}

// Browsing pages only. Pages without the Navbar (checkout, auth, profile, seller…) never get here.
function showOn(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/shop" ||
    pathname === "/deals" ||
    pathname.startsWith("/deals/") ||
    pathname.startsWith("/category/")
  );
}

function imageSrc(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${STORAGE_URL}/${path.replace(/^\/?(storage\/)?/, "")}`;
}

// Padding is set inline, not with Tailwind classes: some pages (category page) inject an
// unlayered `*{margin:0;padding:0}` reset that would beat the utility layer.
const TRACK_PAD = { paddingBlock: "4px 6px", paddingInline: 8, scrollPaddingInline: 8 } as const;
const CHIP_PAD = { padding: 2 } as const;

const CHIP =
  "group flex w-[72px] min-h-11 flex-col items-center gap-1 rounded-xl no-underline " +
  "outline-none focus-visible:ring-2 focus-visible:ring-[#db142e] focus-visible:ring-offset-1";
const CIRCLE =
  "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full transition-colors";
const LABEL = "block w-full truncate text-center text-[11px] leading-[14px]";

export default function MobileCategoryStrip({
  categories,
  onOpenAll,
}: {
  /** null while the Navbar is still loading them */
  categories: StripCategory[] | null;
  onOpenAll: () => void;
}) {
  const t = useTranslations("nav.categoryStrip");
  const pathname = usePathname() ?? "";
  const menu = useMegaMenu();
  const trackRef = useRef<HTMLUListElement>(null);
  const [more, setMore] = useState(false);
  const [broken, setBroken] = useState<Set<number>>(() => new Set());

  const activeSlug = pathname.startsWith("/category/")
    ? decodeURIComponent(pathname.slice("/category/".length).split("/")[0] ?? "")
    : "";

  // Same rule as the mega menu rail (Navbar.tsx → MegaMenu): the admin's show_in_menu wins,
  // otherwise categories with products; never an empty list.
  const items = useMemo(() => {
    if (!categories || menu === null) return null;
    if (menu.length === 0 || menu.every(m => m.has_products === undefined)) return categories;
    if (menu.some(m => m.show_in_menu !== undefined)) {
      const shown = categories.filter(c => menu.find(m => m.slug === c.slug)?.show_in_menu !== false);
      return shown.length > 0 ? shown : categories;
    }
    const withProducts = categories.filter(c => menu.find(m => m.slug === c.slug)?.has_products);
    return withProducts.length > 0 ? withProducts : categories;
  }, [categories, menu]);

  const loading = items === null;
  const visible = showOn(pathname);

  // Trailing fade only while there is more to scroll
  const check = useCallback(() => {
    const el = trackRef.current;
    if (el) setMore(canScrollNext(el, 6));
  }, []);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [items, visible, check]);

  // Bring the current category chip into view (horizontal only, the page itself does not move)
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !activeSlug || !items) return;
    const chip = el.querySelector<HTMLElement>(`[data-slug="${CSS.escape(activeSlug)}"]`);
    if (!chip) return;
    const a = el.getBoundingClientRect();
    const b = chip.getBoundingClientRect();
    if (b.left < a.left + 8 || b.right > a.right - 8) {
      el.scrollBy({ left: b.left - a.left - a.width / 2 + b.width / 2, behavior: "auto" });
    }
  }, [activeSlug, items]);

  if (!visible) return null;
  // Failed or empty: no strip at all, the header stays as it was
  if (!loading && items.length === 0) return null;

  return (
    <nav
      aria-label={t("label")}
      aria-busy={loading || undefined}
      className="relative border-b border-zinc-100 bg-white md:hidden"
    >
      <ul
        ref={trackRef}
        style={TRACK_PAD}
        className={
          "m-0 flex list-none gap-0.5 overflow-x-auto overscroll-x-contain " +
          "snap-x snap-proximity [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        }
      >
        {loading
          ? Array.from({ length: 7 }, (_, i) => (
              <li key={i} aria-hidden="true" className="shrink-0">
                <div style={CHIP_PAD} className="flex w-[72px] flex-col items-center gap-1">
                  <span className="size-11 animate-pulse rounded-full bg-zinc-100" />
                  <span style={{ marginBlock: 3 }} className="block h-2 w-12 animate-pulse rounded bg-zinc-100" />
                </div>
              </li>
            ))
          : items.map(cat => {
              const active = cat.slug === activeSlug;
              const src = broken.has(cat.id) ? null : imageSrc(cat.image);
              return (
                <li key={cat.id} data-slug={cat.slug} className="shrink-0 snap-start">
                  <Link
                    href={`/category/${cat.slug}`}
                    aria-label={cat.name}
                    aria-current={active ? "page" : undefined}
                    style={CHIP_PAD}
                    className={CHIP}
                  >
                    <span
                      className={
                        CIRCLE +
                        (active
                          ? " bg-[#db142e]/10 text-[#db142e] ring-2 ring-[#db142e]"
                          : " bg-[#db142e]/[0.06] text-[#db142e]/80 group-hover:text-[#db142e]")
                      }
                    >
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element -- category image from the API storage
                        <img
                          src={src}
                          alt=""
                          width={44}
                          height={44}
                          loading="lazy"
                          decoding="async"
                          className="size-full object-cover"
                          onError={() => setBroken(prev => new Set(prev).add(cat.id))}
                        />
                      ) : (
                        <CatIcon slug={cat.slug} name={cat.name} size={20} />
                      )}
                    </span>
                    <span
                      className={
                        LABEL +
                        (active ? " font-bold text-[#db142e]" : " font-medium text-zinc-700 group-hover:text-[#db142e]")
                      }
                    >
                      {cat.name}
                    </span>
                  </Link>
                </li>
              );
            })}
        {!loading && (
          <li className="shrink-0 snap-start">
            <button
              type="button"
              onClick={onOpenAll}
              aria-label={t("allAria")}
              aria-haspopup="dialog"
              style={CHIP_PAD}
              className={CHIP + " cursor-pointer border-0 bg-transparent font-[inherit]"}
            >
              <span className={CIRCLE + " bg-zinc-100 text-zinc-600 group-hover:text-[#db142e]"}>
                <LayoutGrid size={19} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className={LABEL + " font-medium text-zinc-700 group-hover:text-[#db142e]"}>{t("all")}</span>
            </button>
          </li>
        )}
      </ul>
      {/* Hint that the row scrolls: fades towards the logical end (right in LTR, left in RTL) */}
      <span
        aria-hidden="true"
        className={
          "pointer-events-none absolute inset-y-0 end-0 w-8 from-white to-transparent transition-opacity duration-200 " +
          "ltr:bg-linear-to-l rtl:bg-linear-to-r " +
          (more ? "opacity-100" : "opacity-0")
        }
      />
    </nav>
  );
}
