'use client';
import { useState } from 'react';
import RedSidebar from './RedSidebar';
import RedTopBar from './RedTopBar';
import { useRedPlanGuard } from '@/hooks/useRedPlanGuard';

export default function RedLayout({ children }: { children: React.ReactNode }) {
  const allowed = useRedPlanGuard();
  const [collapsed, setCollapsed] = useState(false);

  if (!allowed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c0392b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex" style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap');
        :root {
          --red: #c0392b;
          --red-light: #e74c3c;
          --red-dark: #922b21;
          --red-glow: rgba(192,57,43,0.25);
          --red-subtle: rgba(192,57,43,0.08);
          --surface: #0a0a0a;
          --surface2: #111111;
          --surface3: #1a1a1a;
          --surface4: #222222;
          --border: rgba(255,255,255,0.06);
          --border-red: rgba(192,57,43,0.3);
          --text: #f0f0f0;
          --text2: #888888;
          --text3: #444444;
          --green: #27ae60;
          --gold: #f39c12;
          --blue: #3498db;
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .red-card {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 14px;
          transition: border-color 0.2s, transform 0.2s;
        }
        .red-card:hover { border-color: var(--border-red); }
        .red-btn {
          background: var(--red);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          transition: all 0.15s;
          font-family: inherit;
        }
        .red-btn:hover { background: var(--red-light); }
        .red-btn:active { transform: scale(0.97); }
        .red-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ghost-btn {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text2);
          border-radius: 8px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          transition: all 0.15s;
          font-family: inherit;
        }
        .ghost-btn:hover { border-color: var(--border-red); color: var(--red-light); }
        .red-input {
          width: 100%;
          background: var(--surface3);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 9px 12px;
          color: var(--text);
          font-family: inherit;
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s;
        }
        .red-input:focus { border-color: var(--red); }
        .red-select {
          width: 100%;
          background: var(--surface3);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 9px 12px;
          color: var(--text);
          font-family: inherit;
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s;
          appearance: none;
        }
        .red-select:focus { border-color: var(--red); }
        .red-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          color: var(--text2);
          text-transform: uppercase;
          letter-spacing: 0.7px;
          margin-bottom: 5px;
        }
        .kpi-card {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
          cursor: default;
        }
        .kpi-card:hover { border-color: var(--border-red); transform: translateY(-2px); }
        .ai-card {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          transition: border-color 0.2s, transform 0.2s;
        }
        .ai-card:hover { border-color: var(--border-red); transform: translateY(-1px); }
        .ai-output {
          background: var(--surface3);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px;
          margin-top: 14px;
          min-height: 72px;
          transition: border-color 0.2s;
        }
        .ai-output.has-result { border-color: var(--border-red); }
        @keyframes dot-pulse { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        .dot { width:7px; height:7px; background: var(--red-light); border-radius:50%; display:inline-block; animation: dot-pulse 1.2s ease-in-out infinite; }
        .dot:nth-child(2){animation-delay:0.2s}
        .dot:nth-child(3){animation-delay:0.4s}
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        .chip {
          display: inline-block;
          background: var(--surface4);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 3px 10px;
          font-size: 11px;
          color: var(--text2);
        }
        .badge-red {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--red-subtle);
          border: 1px solid var(--border-red);
          color: var(--red-light);
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
          letter-spacing: 0.4px;
        }
        .progress-bar {
          background: var(--surface4);
          border-radius: 4px;
          height: 5px;
          overflow: hidden;
          margin-top: 5px;
        }
        .progress-fill {
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, var(--red-dark), var(--red-light));
          transition: width 0.8s ease;
        }
        table { border-collapse: collapse; width: 100%; font-size: 13px; }
        th {
          text-align: left;
          font-size: 10px;
          font-weight: 700;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          padding: 0 12px 10px;
          border-bottom: 1px solid var(--border);
        }
        td { padding: 12px; border-bottom: 1px solid var(--border); color: var(--text2); vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: var(--surface3); color: var(--text); }
      `}</style>

      <RedSidebar collapsed={collapsed} onCollapse={setCollapsed} />

      <div
        style={{
          marginLeft: collapsed ? 72 : 228,
          flex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left 0.3s ease',
        }}
      >
        <RedTopBar />
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}