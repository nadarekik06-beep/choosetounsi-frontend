#!/usr/bin/env node
// Mobile layout check: fails when a page scrolls sideways at phone widths.
//
//   npm run check:mobile                       # storefront on http://localhost:3000
//   BASE_URL=http://localhost:3001 PAGES=/,/orders ADMIN_TOKEN=… npm run check:mobile   # admin panel
//
// For each page × width (360, 390 by default) it fails if
//   • the document is wider than the viewport, or
//   • a visible element sticks out of the screen without a parent that clips or scrolls it, or
//   • a <table> still scrolls sideways inside its box (wide tables must become cards).
// Swipe carousels that are meant to scroll are listed in ALLOWED_SCROLLERS.
//
// Logged-in pages: set TOKEN (storefront Sanctum token, e.g. a local TEST account) or
// ADMIN_TOKEN (admin panel). Locale: LOCALES=fr,ar. Browser: CHROME_PATH or the default Chrome install.

import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const API = (process.env.API_URL || 'http://localhost:8000').replace(/\/$/, '');
const WIDTHS = (process.env.WIDTHS || '360,390').split(',').map(Number);
const LOCALES = (process.env.LOCALES || 'fr,ar').split(',');
const TOKEN = process.env.TOKEN || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const GUEST_PAGES = ['/', '/search?q=a', '/shop', '/deals', '/about', '/contact', '/privacy', '/terms',
  '/auth/login', '/auth/register', '/auth/forgot-password'];
const BUYER_PAGES = ['/orders', '/complaints', '/complaints/new', '/favorites', '/profile', '/notifications',
  '/account/addresses', '/checkout'];
const SELLER_PAGES = ['/seller', '/seller/products', '/seller/packs', '/seller/promotions', '/seller/orders',
  '/seller/earnings', '/seller/earnings/receipt', '/seller/complaints', '/seller/reviews', '/seller/subscription',
  '/seller/settings', '/seller/promote', '/seller/black', '/seller/growth-radar'];

const ALLOWED_SCROLLERS = ['.feed-track', '.pc-track', '.vl-plans', '.vl-marquee', '.leaflet-container', '.maplibregl-map'];

const CHROME = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(p => fs.existsSync(p));

async function sessionUser() {
  if (!TOKEN) return null;
  const res = await fetch(`${API}/api/auth/user`, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`TOKEN rejected by ${API} (${res.status})`);
  return (await res.json()).user;
}

function pagesFor(user) {
  if (process.env.PAGES) return process.env.PAGES.split(',');
  if (ADMIN_TOKEN) return ['/'];
  if (!user) return GUEST_PAGES;
  return [...GUEST_PAGES, ...BUYER_PAGES, ...(user.role === 'seller' ? SELLER_PAGES : [])];
}

function inspect(allowed) {
  const vw = document.documentElement.clientWidth;
  const problems = [];
  if (document.documentElement.scrollWidth > vw + 1) problems.push(`document is ${document.documentElement.scrollWidth}px wide`);
  const isAllowed = el => allowed.some(sel => el.closest(sel));
  const describe = el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''} "${(el.innerText || '').trim().slice(0, 30).replace(/\s+/g, ' ')}"`;
  const clippedByParent = el => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (getComputedStyle(a).overflowX !== 'visible' && a.getBoundingClientRect().right <= vw + 1) return true;
    }
    return false;
  };
  for (const el of document.querySelectorAll('body *')) {
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.position === 'fixed' || s.position === 'absolute') continue;
    if (b.left >= vw - 1 || b.right <= 1) continue; // fully off-canvas (closed drawers)
    if ((b.right > vw + 1 || b.left < -1) && !clippedByParent(el) && !isAllowed(el)) {
      // report only the deepest element that sticks out
      if (![...el.children].some(c => { const r = c.getBoundingClientRect(); return r.width && (r.right > vw + 1 || r.left < -1); })) {
        problems.push(`sticks out (${Math.round(b.left)}→${Math.round(b.right)}px): ${describe(el)}`);
      }
    }
  }
  for (const t of document.querySelectorAll('table')) {
    const box = t.parentElement;
    if (!box || isAllowed(t) || !t.getBoundingClientRect().width) continue;
    if (box.scrollWidth > box.clientWidth + 4) problems.push(`table scrolls sideways (${box.scrollWidth}/${box.clientWidth}px): ${describe(t)}`);
  }
  return [...new Set(problems)].slice(0, 10);
}

const user = await sessionUser();
const pages = pagesFor(user);
if (!CHROME) { console.error('No Chrome found: set CHROME_PATH.'); process.exit(2); }
const browser = await chromium.launch({ executablePath: CHROME });
let failures = 0;
for (const locale of ADMIN_TOKEN ? ['en'] : LOCALES) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true });
    const cookies = [{ name: 'NEXT_LOCALE', value: locale, url: BASE }];
    if (TOKEN) cookies.push({ name: 'ct_token_exists', value: '1', url: BASE });
    if (ADMIN_TOKEN) cookies.push({ name: 'admin_token', value: ADMIN_TOKEN, url: BASE });
    await ctx.addCookies(cookies);
    if (TOKEN && user) {
      await ctx.addInitScript(([t, u]) => { localStorage.setItem('ct_auth_token', t); localStorage.setItem('ct_auth_user', u); }, [TOKEN, JSON.stringify(user)]);
    }
    const page = await ctx.newPage();
    for (const path of pages) {
      try { await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60000 }); } catch { /* slow page: check what rendered */ }
      await page.waitForTimeout(1200);
      const problems = await page.evaluate(inspect, ALLOWED_SCROLLERS);
      const label = `${locale} ${width}px ${path}`;
      if (problems.length) {
        failures++;
        console.log(`✗ ${label}`);
        for (const p of problems) console.log(`    ${p}`);
      } else {
        console.log(`✓ ${label}`);
      }
    }
    await ctx.close();
  }
}
await browser.close();
if (failures) { console.error(`\n${failures} page(s) overflow at phone width.`); process.exit(1); }
console.log('\nNo horizontal overflow.');
