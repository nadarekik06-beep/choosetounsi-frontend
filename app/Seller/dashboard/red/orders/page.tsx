'use client';
/**
 * app/seller/dashboard/red/orders/page.tsx
 *
 * Red Pepper — Orders
 * ────────────────────
 * Renders the EXACT same orders page as Green (from app/seller/orders/page.tsx)
 * but inside the Red layout. Zero duplication — we just re-export.
 *
 * The Green orders page already has:
 *  - Real ordersApi calls
 *  - Pagination, search, status/payment filters
 *  - Order detail modal with status & payment update
 *
 * This page gets its own URL (/seller/dashboard/red/orders) so the Red
 * sidebar "Orders" link stays inside the Red layout instead of jumping
 * to the Green layout at /seller/orders.
 */

// Re-export the Green orders page component as-is
export { default } from '@/app/seller/orders/page';