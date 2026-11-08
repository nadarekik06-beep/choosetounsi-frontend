#!/usr/bin/env node
// Product page gallery tests (no browser):   npm run test:gallery
//
//  1. buildGallerySlides: order, grouping, no duplicates, color attribution.
//  2. Guard for the absolute rule "the gallery never changes the selected variant":
//     ProductGallery.tsx must not see the selection or its setter, and the product page
//     must change the selection in exactly one place (VariantSelector's onSelect).
// Behaviour in a real browser (swipe / drag / keys, cart line): scripts/check-product-gallery.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildGallerySlides, firstSlideOfColor, colorCount } from '../app/components/product/gallery/gallerySlides.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')

const colors = [
  { key: '112', label: 'Blanc', images: ['b1.jpg', 'b2.jpg'] },
  { key: '118', label: 'Rose',  images: ['r1.jpg'] },
  { key: '123', label: 'Beige', images: [] },               // no photo: skipped
  { key: '115', label: 'Vert',  images: ['v1.jpg', 'b1.jpg'] }, // b1 already Blanc's
]
const general = ['cover.jpg', 'r1.jpg']                       // r1 is also Rose's

test('no lead color: general photos first, then colors in swatch order, no duplicates', () => {
  const s = buildGallerySlides(colors, general)
  assert.deepEqual(s.map(x => x.src), ['cover.jpg', 'b1.jpg', 'b2.jpg', 'r1.jpg', 'v1.jpg'])
  assert.equal(new Set(s.map(x => x.src)).size, s.length)
  // a photo that is both general and a color photo keeps its color
  assert.equal(s.find(x => x.src === 'r1.jpg').colorKey, '118')
  assert.equal(s.find(x => x.src === 'cover.jpg').colorKey, null)
})

test('lead color first, then the other colors, then general photos', () => {
  const s = buildGallerySlides(colors, general, '115')
  assert.deepEqual(s.map(x => x.src), ['v1.jpg', 'b1.jpg', 'b2.jpg', 'r1.jpg', 'cover.jpg'])
  assert.deepEqual(s.map(x => x.colorLabel), ['Vert', 'Blanc', 'Blanc', 'Rose', null])
})

test('unknown lead color falls back to the default order', () => {
  assert.deepEqual(buildGallerySlides(colors, general, '999'), buildGallerySlides(colors, general))
})

test('helpers', () => {
  const s = buildGallerySlides(colors, general)
  assert.equal(firstSlideOfColor(s, '118'), 3)
  assert.equal(firstSlideOfColor(s, '123'), -1)
  assert.equal(colorCount(s), 3)
  assert.equal(colorCount(buildGallerySlides([], ['a.jpg', 'b.jpg'])), 0)  // no variants: no hint
})

test('ProductGallery cannot reach the selected variant', () => {
  const src = read('app/components/product/gallery/ProductGallery.tsx')
  for (const forbidden of ['setSelectedOptions', 'selectedOptions', 'onSelect', 'selectedVariant', 'variant_id', 'addToCart', 'useCart']) {
    assert.ok(!src.includes(forbidden), `ProductGallery.tsx must not reference ${forbidden}`)
  }
  // its only callbacks are display-only
  const props = src.match(/export default function ProductGallery\(\{([^}]*)\}/)[1]
  assert.deepEqual(props.split(',').map(p => p.trim()).filter(Boolean).sort(),
    ['badge', 'focusRequest', 'onPreviewChange', 'productName', 'selectedColorKey', 'slides'])
})

test('product page changes the selection only on an explicit swatch / size tap', () => {
  const src = read('app/products/[slug]/page.tsx')
  // setSelectedOptions(...) calls: the reset on product load, the auto-pick on load, onSelect
  const calls = [...src.matchAll(/setSelectedOptions\(/g)].length
  assert.equal(calls, 3, 'a new setSelectedOptions call appeared: it must not come from the gallery')
  const gallery = src.match(/<ProductGallery[\s\S]*?\/>/)[0]
  assert.ok(!/setSelectedOptions|onSelect/.test(gallery), 'the gallery must not get the variant setter')
  assert.match(gallery, /onPreviewChange=\{setPreviewColorKey\}/)
  // and previewColorKey never feeds back into the selection
  assert.ok(!/setSelectedOptions\([^)]*previewColorKey/.test(src))
})
