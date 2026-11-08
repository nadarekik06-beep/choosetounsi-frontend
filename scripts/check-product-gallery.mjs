#!/usr/bin/env node
// Product page gallery, in a real browser: navigating the gallery must NEVER change the
// selected variant (color, size, price, stock, SKU), and the cart / buy-now line must be
// the selected variant, not the photo on screen.
//
//   npm run check:gallery                                   # local storefront :3000 + API :8000
//   SLUG=glbab BASE_URL=https://choosetounsi.tn API_URL=https://api.choosetounsi.tn npm run check:gallery
//   TOKEN=<local TEST buyer token> npm run check:gallery    # + add to cart / buy now checks
//
// Env: SLUG (multi-color product), SLUG_SINGLE (one photo), SLUG_NOVAR (no variants, several
// photos), LOCALES=fr,ar, WIDTHS=1280,375, SHOTS=<dir for screenshots>, CHROME_PATH.
// Without TOKEN nothing is written anywhere (read-only page views): safe on production.
// The cart line it creates with TOKEN is deleted again at the end.

import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const BASE    = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const API     = (process.env.API_URL || 'http://localhost:8000').replace(/\/$/, '')
const SLUG    = process.env.SLUG || 'cool-baggy-denim-shourts-for-summer'
const SLUG_SINGLE = process.env.SLUG_SINGLE ?? 'whey-protein-powder'
const SLUG_NOVAR  = process.env.SLUG_NOVAR ?? 'rugculturee'
const LOCALES = (process.env.LOCALES || 'fr,ar').split(',')
const WIDTHS  = (process.env.WIDTHS || '1280,375').split(',').map(Number)
const TOKEN   = process.env.TOKEN || ''
const SHOTS   = process.env.SHOTS || ''
const CHROME  = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(p => fs.existsSync(p))

let failures = 0
const ok   = (cond, msg) => { console.log(`${cond ? '  ✔' : '  ✘'} ${msg}`); if (!cond) failures++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const getJson = async (url, init = {}) => {
  const r = await fetch(url, { ...init, headers: { Accept: 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}), ...(init.headers || {}) } })
  if (!r.ok) throw new Error(`${url} → ${r.status}`)
  return r.json()
}

const product = (await getJson(`${API}/api/products/${SLUG}`)).data
const colorAxis = product.selectable_axes.find(a => a.type === 'color')
const otherAxes = product.selectable_axes.filter(a => a.type !== 'color')
const user = TOKEN ? (await getJson(`${API}/api/auth/user`)).user : null

// Everything the buyer is buying, as shown on the page (the preview reminder excluded)
const snapshot = page => page.evaluate(() => {
  const col = document.querySelector('.pd-grid > div:nth-child(2)')
  const c = col.cloneNode(true)
  // buttons change on their own (cart loading / "added"): not part of what is bought
  c.querySelectorAll('.pd-preview-note, .pd-actions, button:not(.pd-swatch):not(.pd-size)').forEach(n => n.remove())
  return {
    swatches: [...document.querySelectorAll('.pd-swatch')].map(b => b.getAttribute('aria-checked')).join(','),
    options:  [...document.querySelectorAll('.pd-size')].map(b => b.getAttribute('aria-checked')).join(','),
    text:     c.innerText.replace(/\s+/g, ' '),
  }
})
const gIndex = page => page.evaluate(() => {
  const t = document.querySelector('.pg-track')
  return Math.round(Math.abs(t.scrollLeft) / t.clientWidth)
})
const slideCount = page => page.locator('.pg-slide').count()

async function expectUnchanged(page, before, what) {
  await wait(650)
  const after = await snapshot(page)
  const same = after.swatches === before.swatches && after.options === before.options && after.text === before.text
  ok(same, `${what}: selection, price, stock, SKU unchanged`)
  if (!same) console.log('    before', before, '\n    after ', after)
}

// A real touch gesture (touchStart → touchMove… → touchEnd) made inside the photo, like a
// thumb would: never from the screen edge, where the phone's own "back" gesture lives.
async function swipe(cdp, page, dx, dy = 0, repeat = 1) {
  const box = await page.locator('.pg-frame').boundingBox()
  const x0 = box.x + box.width * (dx > 0 ? 0.3 : dx < 0 ? 0.7 : 0.5)
  const y0 = box.y + box.height * (dy < 0 ? 0.75 : dy > 0 ? 0.25 : 0.5)
  for (let r = 0; r < repeat; r++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
    const steps = 8
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (dx * i) / steps, y: y0 + (dy * i) / steps }] })
      await wait(16)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await wait(repeat > 1 ? 60 : 450)
  }
}

async function mouseDrag(page, dx, release = null) {
  const box = await page.locator('.pg-frame').boundingBox()
  const x = box.x + box.width / 2, y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y, { steps: 12 })
  if (release) await page.mouse.move(release.x, release.y, { steps: 6 })
  await page.mouse.up()
}

// Shows a photo of another color than the chosen one (via the dots); true when found
async function showOtherColor(page) {
  const dots = await page.locator('.pg-dot').count()
  for (let i = 0; i < dots; i++) {
    await page.locator('.pg-dot').nth(i).click(); await wait(450)
    if (await page.locator('.pg-preview').count()) return true
  }
  return false
}

async function pickVariant(page, colorIdx, optionIdxs) {
  // explicit taps: the ONLY way the selection may change
  if (colorAxis) await page.locator('[data-axis="color"] .pd-swatch').nth(colorIdx).click()
  for (const [slug, i] of Object.entries(optionIdxs)) await page.locator(`[data-axis="${CSS_escape(slug)}"] .pd-size`).nth(i).click()
  await wait(700)
}
const CSS_escape = s => s.replace(/"/g, '\\"')

async function enabledIndexes(page, sel) {
  return page.locator(sel).evaluateAll(bs => bs.map((b, i) => (b.disabled ? -1 : i)).filter(i => i >= 0))
}

async function shot(page, name) {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) })
}

if (!CHROME) { console.error('No Chrome found: set CHROME_PATH.'); process.exit(2) }
const browser = await chromium.launch({ executablePath: CHROME })

for (const locale of LOCALES) for (const width of WIDTHS) {
  const mobile = width < 768
  console.log(`\n■ ${SLUG} — ${locale.toUpperCase()} — ${width}px`)
  const ctx = await browser.newContext({
    viewport: { width, height: mobile ? 812 : 900 }, isMobile: mobile, hasTouch: mobile, locale,
    reducedMotion: 'no-preference',
  })
  await ctx.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: BASE }])
  if (TOKEN) await ctx.addInitScript(([t, u]) => { localStorage.setItem('ct_auth_token', t); localStorage.setItem('ct_auth_user', u) }, [TOKEN, JSON.stringify(user)])
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  if (process.env.DEBUG) page.on('framenavigated', f => { if (f === page.mainFrame()) console.log('    nav →', f.url()) })
  // Slow photos down so the first swipes happen while they load
  await page.route(/\.(jpe?g|png|webp)(\?|$)/i, async r => { await wait(1500); r.continue().catch(() => {}) })
  await page.goto(`${BASE}/products/${SLUG}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.pg-track', { timeout: 60000 })
  await wait(400)
  const count = await slideCount(page)
  const dir = await page.evaluate(() => document.documentElement.dir)
  ok(dir === (locale === 'ar' ? 'rtl' : 'ltr'), `page direction is ${dir}`)
  ok(count >= 2, `gallery has ${count} photos (all colors)`)
  if (colorAxis && colorAxis.options.length > 1) {
    ok(await page.locator('.pg-hint').waitFor({ timeout: 3000 }).then(() => true, () => false), 'swipe hint shown on first visit')
    await shot(page, `${locale}-${width}-hint`)
  }

  // Swiping / keys while photos are still loading: nothing gets selected
  const fresh = await snapshot(page)
  if (mobile) { await swipe(cdp, page, -220); await swipe(cdp, page, -220) }
  else { await page.locator('.pg-track').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight') }
  await expectUnchanged(page, fresh, 'navigating while photos load')
  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await wait(3200)
  ok(!(await page.locator('.pg-hint:not(.is-out)').count()), 'swipe hint gone after the first swipe / 3 s')
  ok(await page.evaluate(() => { try { return localStorage.getItem('ct_gallery_swipe_hint_seen') === '1' } catch { return false } }), 'hint dismissal remembered')

  // Choose: the last available color, the first available value of every other axis
  const colorIdxs = colorAxis ? await enabledIndexes(page, '[data-axis="color"] .pd-swatch') : []
  const colorIdx = colorIdxs[colorIdxs.length - 1]
  if (colorAxis) await page.locator('[data-axis="color"] .pd-swatch').nth(colorIdx).click()
  await wait(300)
  const optionIdxs = {}
  for (const a of otherAxes) optionIdxs[a.slug] = (await enabledIndexes(page, `[data-axis="${a.slug}"] .pd-size`))[0]
  await pickVariant(page, colorIdx, optionIdxs)
  const colorKey = colorAxis ? (colorAxis.options[colorIdx].group_key ?? String(colorAxis.options[colorIdx].id)) : null
  // the name as displayed (Arabic pages translate color names)
  const colorName = colorAxis ? (await page.locator('[data-axis="color"] p > span').nth(1).innerText()).trim() : undefined
  const expected = product.variants.find(v =>
    (!colorAxis || v.color_group_key === colorKey) &&
    otherAxes.every(a => String(v.option_map[a.slug]?.id) === String(a.options[optionIdxs[a.slug]].id)))
  ok(!!expected, `selected ${colorName ?? ''} ${otherAxes.map(a => a.options[optionIdxs[a.slug]].value).join(' ')} → variant #${expected?.id}`)
  ok(!(await page.locator('.pg-preview').count()), 'gallery jumped to the chosen color (no "Preview" label)')
  const chosen = await snapshot(page)
  await shot(page, `${locale}-${width}-chosen`)

  // 1. keyboard through every photo and back
  await page.locator('.pg-track').focus()
  const startIdx = await gIndex(page)
  const seen = new Set([startIdx])
  for (let i = 0; i < count; i++) { await page.keyboard.press('ArrowRight'); await wait(380); seen.add(await gIndex(page)) }
  for (let i = 0; i < count; i++) { await page.keyboard.press('ArrowLeft'); await wait(380); seen.add(await gIndex(page)) }
  ok(seen.size === count, `keyboard ← → visited all ${count} photos`)
  await expectUnchanged(page, chosen, 'keyboard ← → through all photos')

  // 2. arrows (wrap through all) — in RTL "next" is on the left. Touch screens: no arrows.
  if (!mobile) {
    for (let i = 0; i < count; i++) { await page.locator('.pg-arrow--next').click({ force: true }); await wait(300) }
    for (let i = 0; i < count; i++) { await page.locator('.pg-arrow--prev').click({ force: true }); await wait(300) }
    await expectUnchanged(page, chosen, 'arrow buttons')
  } else ok(!(await page.locator('.pg-arrow').first().isVisible()), 'no arrows on a touch screen (swipe + dots)')

  // a photo of another color: label + reminder, swatch selection untouched
  const otherFound = await showOtherColor(page)
  if (colorAxis && colorAxis.options.length > 1) {
    ok(otherFound, `"${otherFound ? await page.locator('.pg-preview').innerText() : 'Preview'}" label on another color's photo`)
    const note = page.locator('[data-testid="preview-note"]')
    ok(await note.count() > 0 && (await note.innerText()).includes(colorName), `reminder line names the chosen color (${colorName})`)
    ok(await page.locator('.pd-swatch.is-preview').count() === 1 && await page.locator('.pd-swatch.is-preview[aria-checked="true"]').count() === 0,
      'previewed swatch softly outlined, not checked')
    await shot(page, `${locale}-${width}-preview`)
    await expectUnchanged(page, chosen, 'showing another color\'s photo')
  }

  // 3. dots / thumbnails
  const dots = await page.locator('.pg-dot').count()
  for (let i = 0; i < dots; i++) { await page.locator('.pg-dot').nth(i).click(); await wait(250) }
  if (!mobile) { const n = await page.locator('.pg-thumb').count(); for (let i = 0; i < n; i++) { await page.locator('.pg-thumb').nth(i).click(); await wait(250) } }
  await expectUnchanged(page, chosen, mobile ? 'dots' : 'dots + thumbnail strip')

  if (mobile) {
    // 4. touch swipes, slow and fast, both ways
    const fwd = dir === 'rtl' ? 200 : -200                  // finger direction for "next"
    await page.locator('.pg-dot').first().click(); await wait(600)
    await swipe(cdp, page, fwd); await wait(500)
    const afterSwipe = await gIndex(page)
    ok(afterSwipe === 1, `touch swipe shows the next photo, mirrored in RTL (index ${afterSwipe})`)
    const seenT = new Set()
    for (let i = 0; i < count; i++) { await swipe(cdp, page, fwd); seenT.add(await gIndex(page)) }
    for (let i = 0; i < count; i++) { await swipe(cdp, page, -fwd); seenT.add(await gIndex(page)) }
    ok(seenT.size === count, `swiped to the end and back (${seenT.size}/${count} photos)`)
    await swipe(cdp, page, fwd, 0, 6); await swipe(cdp, page, -fwd, 0, 6)    // fast repeated swipes
    ok(page.url().includes(SLUG), 'still on the product page (no accidental "back")')
    await expectUnchanged(page, chosen, 'touch swipes (slow + fast, to the end and back)')
    await page.touchscreen.tap(...Object.values(await page.locator('.pg-frame').boundingBox().then(b => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 }))))
    await expectUnchanged(page, chosen, 'tap on the photo')

    // 5. vertical page scroll starting on the gallery is not hijacked
    await page.evaluate(() => window.scrollTo(0, 0)); await wait(300)
    const idx0 = await gIndex(page)
    await swipe(cdp, page, -30, -300); await wait(600)
    const y = await page.evaluate(() => window.scrollY)
    ok(y > 150, `vertical swipe on the gallery scrolls the page (scrollY ${Math.round(y)})`)
    ok((await gIndex(page)) === idx0, 'vertical swipe does not change the photo')
    await page.evaluate(() => window.scrollTo(0, 0)); await wait(300)
  } else {
    // 4. mouse drag, drag-then-click, drag released over another swatch
    await page.locator('.pg-track').focus(); await page.keyboard.press('Home'); await wait(600)
    const before = await gIndex(page)
    await mouseDrag(page, dir === 'rtl' ? 260 : -260); await wait(600)
    ok((await gIndex(page)) !== before, 'mouse drag changes the photo')
    await expectUnchanged(page, chosen, 'mouse drag')
    await mouseDrag(page, dir === 'rtl' ? -200 : 200)
    await page.locator('.pg-frame').click(); await wait(300)                     // click after a drag = zoom only
    await page.locator('.pg-frame').click(); await wait(300)
    await expectUnchanged(page, chosen, 'drag then click')
    const other = page.locator('[data-axis="color"] .pd-swatch[aria-checked="false"]:not([disabled])').first()
    if (await other.count()) {
      const ob = await other.boundingBox()
      await mouseDrag(page, -120, { x: ob.x + ob.width / 2, y: ob.y + ob.height / 2 })
      await expectUnchanged(page, chosen, 'drag released over another color swatch')
    }
    // trackpad horizontal scroll
    const box = await page.locator('.pg-frame').boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(dir === 'rtl' ? -400 : 400, 0); await wait(700)
    await expectUnchanged(page, chosen, 'trackpad horizontal scroll')
  }

  // 6. cart + buy now carry the SELECTED variant while another color's photo is on screen
  if (TOKEN && expected) {
    await showOtherColor(page)
    const addBtn = mobile ? page.locator('.pd-sticky button').first() : page.locator('.add-cart-btn')
    const posted = page.waitForResponse(r => r.url().includes('/api/cart') && r.request().method() === 'POST', { timeout: 20000 })
    await addBtn.click()
    const body = await (await posted).request().postDataJSON()
    ok(Number(body.variant_id) === expected.id, `add to cart sent variant #${body.variant_id} (expected #${expected.id})`)
    const cart = (await getJson(`${API}/api/cart`)).data
    const line = cart.items.find(i => i.product_id === product.id && i.variant_id === expected.id)
    ok(!!line, 'cart line is the selected variant')
    ok(cart.items.filter(i => i.product_id === product.id).length === 1, 'no other variant of this product in the cart')
    if (line) {
      ok(line.image_url === expected.primary_image_url, `cart line image is the ${colorName} photo`)
      // the cart drawer (opens after the add) shows that photo, not the one in the gallery
      await wait(1500)
      const drawer = page.locator('[role="dialog"][aria-modal="true"][aria-hidden="false"]').last()
      const srcs = await drawer.locator('img').evaluateAll(imgs => imgs.map(i => i.currentSrc || i.src))
      const want = expected.primary_image_url.split('/').pop()
      const shown = await page.evaluate(() => { const t = document.querySelector('.pg-track'); const i = Math.round(Math.abs(t.scrollLeft) / t.clientWidth); return document.querySelectorAll('.pg-slide img')[i]?.src })
      ok(srcs.some(s => decodeURIComponent(s).includes(want)), `cart drawer thumbnail is the ${colorName} photo`)
      if (!srcs.some(s => decodeURIComponent(s).includes(want))) console.log('    drawer imgs', srcs, 'want', want)
      ok(!srcs.some(s => s === shown) || shown?.includes(want), 'cart drawer does not show the gallery photo of the other color')
      await shot(page, `${locale}-${width}-cart`)
      await fetch(`${API}/api/cart/${line.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' } })
    }
    // Buy now, again with another color's photo on screen
    await page.goto(`${BASE}/products/${SLUG}`); await page.waitForSelector('.pg-track'); await wait(500)
    await pickVariant(page, colorIdx, optionIdxs)
    ok(await showOtherColor(page) || !colorAxis, 'another color on screen before Buy now')
    const buyBtn = mobile ? page.locator('.pd-sticky button').last() : page.locator('.buy-now-btn')
    await buyBtn.click()
    await page.waitForURL(/\/checkout/, { timeout: 30000 })
    const vId = new URL(page.url()).searchParams.get('variant_id')
    ok(Number(vId) === expected.id, `buy now opened checkout with variant #${vId}`)
    await wait(3000)
    if (colorName) ok((await page.locator('body').innerText()).includes(colorName), `checkout shows ${colorName}`)
    await shot(page, `${locale}-${width}-checkout`)
  }

  // 7. tapping a color swatch: the ONLY allowed change, and the gallery follows
  await page.goto(`${BASE}/products/${SLUG}`); await page.waitForSelector('.pg-track'); await wait(500)
  if (colorAxis && colorIdxs.length > 1) {
    await page.locator('[data-axis="color"] .pd-swatch').nth(colorIdxs[0]).click(); await wait(900)
    ok(await page.locator('[data-axis="color"] .pd-swatch').nth(colorIdxs[0]).getAttribute('aria-checked') === 'true', 'tapping a swatch selects that color')
    ok(!(await page.locator('.pg-preview').count()), 'gallery shows the tapped color')
    await page.locator('[data-axis="color"] .pd-swatch').nth(colorIdx).click(); await wait(900)
    ok(await page.locator('[data-axis="color"] .pd-swatch').nth(colorIdx).getAttribute('aria-checked') === 'true', 'tapping another swatch switches the color')
    ok(!(await page.locator('.pg-preview').count()), 'gallery jumped to that color')
  }
  await ctx.close()
}

// Products that must behave as before
for (const [slug, kind] of [[SLUG_SINGLE, 'single photo'], [SLUG_NOVAR, 'no variants']]) {
  if (!slug) continue
  for (const width of WIDTHS) {
    console.log(`\n■ ${slug} (${kind}) — ${width}px`)
    const ctx = await browser.newContext({ viewport: { width, height: 850 }, isMobile: width < 768, hasTouch: width < 768 })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/products/${slug}`); await page.waitForSelector('.pg-track', { timeout: 60000 }); await wait(800)
    const n = await slideCount(page)
    ok(!(await page.locator('.pg-hint').count()), 'no swipe hint')
    ok(!(await page.locator('.pg-preview').count()), 'no preview label')
    if (n <= 1) ok(!(await page.locator('.pg-arrow, .pg-dots, .pg-counter').count()), `one photo: no arrows, dots or counter`)
    else {
      await page.locator('.pg-dot').nth(1).click(); await wait(600)
      ok((await gIndex(page)) === 1 && !(await page.locator('.pg-preview').count()), `${n} photos: dots / swipe work, no label`)
      ok(await page.locator('.pg-counter').isVisible(), 'counter shown')
    }
    await ctx.close()
  }
}

await browser.close()
console.log(failures ? `\n✘ ${failures} check(s) failed` : '\n✔ all gallery checks passed')
process.exit(failures ? 1 : 0)
