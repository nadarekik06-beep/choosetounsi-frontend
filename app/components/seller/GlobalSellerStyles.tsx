'use client';

/**
 * app/components/seller/GlobalSellerStyles.tsx  ← NEW FILE
 *
 * Injects global CSS rules into the seller shell:
 *   - Light mode: all buttons get #198f41 green hover
 *   - Smooth transitions on all interactive elements
 *
 * Mount this once inside SellerLayout so it covers the entire dashboard.
 */

interface GlobalSellerStylesProps {
  dark: boolean;
}

export default function GlobalSellerStyles({ dark }: GlobalSellerStylesProps) {
  return (
    <style>{`
      /* ── Light mode: global button hover → brand green ── */
      ${!dark ? `
        button:hover,
        a[role="button"]:hover {
          background-color: #198f41 !important;
          color: #ffffff !important;
          border-color: transparent !important;
          transition: background-color 0.22s ease, color 0.22s ease,
                      border-color 0.22s ease, box-shadow 0.22s ease !important;
        }

        button:hover svg,
        a[role="button"]:hover svg {
          color: #ffffff !important;
          stroke: #ffffff !important;
        }

        /* Smooth transition on ALL buttons in light mode (rest state) */
        button,
        a[role="button"] {
          transition: background-color 0.22s ease, color 0.22s ease,
                      border-color 0.22s ease, box-shadow 0.22s ease !important;
        }

        /* Preserve red active nav links — don't override intentional reds */
        a.nav-link[style*="linear-gradient"]:hover,
        a.nav-link[style*="linear-gradient(135deg,#db142e"]:hover {
          background: linear-gradient(135deg, #198f41, #126b30) !important;
          color: #ffffff !important;
          box-shadow: 0 4px 14px rgba(25, 143, 65, 0.4) !important;
        }

        /* Logout button stays red-toned on hover (it's a destructive action) */
        button.logout-btn:hover {
          background-color: rgba(219, 20, 46, 0.1) !important;
          color: #db142e !important;
        }

        /* Theme toggle keeps its own color logic */
        button.theme-toggle:hover {
          background-color: #198f41 !important;
          color: #ffffff !important;
        }
      ` : `
        /* Dark mode: keep existing hover behaviors, just ensure smooth transitions */
        button,
        a[role="button"] {
          transition: background-color 0.22s ease, color 0.22s ease,
                      border-color 0.22s ease, box-shadow 0.22s ease !important;
        }
      `}

      /* ── Red Plan top bar pulse animation ── */
      @keyframes red-plan-shimmer {
        0%   { opacity: 0.6; }
        50%  { opacity: 1;   }
        100% { opacity: 0.6; }
      }

      @keyframes pepper-badge-glow {
        0%, 100% { box-shadow: 0 0 0 2px rgba(219, 20, 46, 0.25); }
        50%       { box-shadow: 0 0 0 5px rgba(219, 20, 46, 0.1);  }
      }

      @keyframes pulse-green {
        0%, 100% { box-shadow: 0 0 0 2px rgba(25, 143, 65, 0.3); }
        50%       { box-shadow: 0 0 0 5px rgba(25, 143, 65, 0.1); }
      }
    `}</style>
  );
}