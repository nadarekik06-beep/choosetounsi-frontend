// Runs before first paint on /seller pages so the background already matches the saved seller
// theme while SellerShell waits for localStorage (no white flash for dark users).
// A <style> in <head> (not an attribute on <html>) keeps React hydration clean.
// Rendered by the root layout with next/script "beforeInteractive": an inline <script> in the
// seller layout is never executed when React renders it on a client-side navigation.
// SellerShell creates / keeps the same style in sync afterwards — keep the id, key and colours aligned.
export const SELLER_THEME_BOOT = `try{if(/^\\/seller(\\/|$)/.test(location.pathname)){var s=document.createElement('style');s.id='ct-seller-theme-bg';s.textContent='body{background:'+(localStorage.getItem('ct_seller_theme')==='light'?'#f0f2f5':'#0D1117')+'}';document.head.appendChild(s)}}catch(e){}`
