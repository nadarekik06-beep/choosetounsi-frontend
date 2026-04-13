'use client';
/**
 * app/seller/dashboard/red/complaints/page.tsx
 *
 * Red Pepper — Complaints
 * ────────────────────────
 * Renders the EXACT same complaints page as Green (app/seller/complaints/page.tsx)
 * inside the Red layout. Zero duplication.
 *
 * The Green complaints page already has:
 *  - Real sellerComplaintApi calls
 *  - Status filters, approve/reject modal
 *  - Complaint detail drawer
 */

// Re-export the Green complaints page component as-is
export { default } from '@/app/seller/complaints/page';