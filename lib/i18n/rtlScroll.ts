// Horizontal carousels that work in both LTR and RTL.
// In RTL, browsers report scrollLeft as 0 at the start and negative towards the end,
// so "next" means scrolling towards negative x.

function isRtl(el: HTMLElement): boolean {
  return getComputedStyle(el).direction === 'rtl'
}

/** How far the track has scrolled from its logical start (always ≥ 0). */
export function scrollOffset(el: HTMLElement): number {
  return Math.abs(el.scrollLeft)
}

export function canScrollPrev(el: HTMLElement, threshold = 4): boolean {
  return scrollOffset(el) > threshold
}

export function canScrollNext(el: HTMLElement, threshold = 4): boolean {
  return scrollOffset(el) + el.clientWidth < el.scrollWidth - threshold
}

/** Scroll a carousel one "page" towards its logical start or end. */
export function scrollCarousel(el: HTMLElement, dir: 'prev' | 'next', amount = el.clientWidth * 0.75) {
  const sign = (dir === 'next' ? 1 : -1) * (isRtl(el) ? -1 : 1)
  el.scrollBy({ left: sign * amount, behavior: 'smooth' })
}
