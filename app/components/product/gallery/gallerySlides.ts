/**
 * Builds the product page gallery: every photo of the product in one ordered list.
 *
 * Pure data, no React: the page passes the color groups (in swatch order) and the
 * general photos; the gallery only DISPLAYS the result. Nothing here, or in the
 * gallery, may ever choose a variant (see ProductGallery.tsx).
 *
 * Kept free of path aliases and TS-only syntax so `node --test` can import it directly
 * (scripts/test-product-gallery.mjs).
 */

export interface GalleryColor {
  /** Selection key of the color swatch (group_key, e.g. "112" or "104|105") */
  key: string
  /** Name shown to the buyer ("Blanc", "Noir+Rouge") */
  label: string
  /** That color group's photos, in order */
  images: string[]
}

export interface GallerySlide {
  src: string
  /** Color group the photo belongs to; null for general product photos */
  colorKey: string | null
  colorLabel: string | null
}

/**
 * Order: the lead color's photos (the color selected when the page opened), then the
 * other colors grouped in swatch order, then the general photos. With no lead color the
 * general photos (the product cover) come first. Each URL appears once; a photo that is
 * both general and a color photo keeps its color, so the "Preview: <color>" label is right.
 */
export function buildGallerySlides(
  colors: GalleryColor[],
  general: string[],
  leadColorKey?: string | null,
): GallerySlide[] {
  const seen = new Set<string>()

  const colorGroups: { key: string; slides: GallerySlide[] }[] = []
  for (const c of colors) {
    const slides: GallerySlide[] = []
    for (const src of c.images) {
      if (!src || seen.has(src)) continue
      seen.add(src)
      slides.push({ src, colorKey: c.key, colorLabel: c.label })
    }
    if (slides.length > 0) colorGroups.push({ key: c.key, slides })
  }

  const generalSlides: GallerySlide[] = []
  for (const src of general) {
    if (!src || seen.has(src)) continue
    seen.add(src)
    generalSlides.push({ src, colorKey: null, colorLabel: null })
  }

  const lead = leadColorKey ? colorGroups.find(g => g.key === leadColorKey) : undefined
  if (lead) {
    return [
      ...lead.slides,
      ...colorGroups.filter(g => g !== lead).flatMap(g => g.slides),
      ...generalSlides,
    ]
  }
  return [...generalSlides, ...colorGroups.flatMap(g => g.slides)]
}

/** Index of a color's first photo, or -1 when that color has no photo. */
export function firstSlideOfColor(slides: GallerySlide[], colorKey: string): number {
  return slides.findIndex(s => s.colorKey === colorKey)
}

/** Number of distinct colors that have at least one photo in the gallery. */
export function colorCount(slides: GallerySlide[]): number {
  return new Set(slides.map(s => s.colorKey).filter(k => k !== null)).size
}
