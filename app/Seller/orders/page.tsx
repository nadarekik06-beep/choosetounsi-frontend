'use client';

import { useEffect, useState, useCallback } from 'react';
import { ordersApi } from '@/lib/sellerApi';
import type { Order, OrderDetail, PaginatedResponse } from '@/types/seller';
import {
  Search, Eye, ChevronLeft, ChevronRight, X, Loader2,
  ShoppingBag, AlertCircle, User, MapPin, Package,
  Hash, Calendar, RefreshCw, CheckCircle, XCircle, Clock,
} from 'lucide-react';
import { useTheme } from '../layout';

/* ── status config ── */
const STATUS_COLORS: Record<string, string> = {
  pending:    '#f59e0b',
  processing: '#3b82f6',
  completed:  '#10b981',
  delivered:  '#14b8a6',
  cancelled:  '#ef4444',
  refunded:   '#a855f7',
};

function StatusBadge({ status, dark }: { status: string; dark: boolean }) {
  const color = STATUS_COLORS[status] ?? '#94a3b8';
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      fontSize:10, fontWeight:800, padding:'3px 9px', borderRadius:999,
      background:`${color}18`, color, border:`1px solid ${color}30`,
      textTransform:'capitalize',
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:color }}/>
      {status}
    </span>
  );
}

const PAYMENT_COLORS: Record<string,string> = { paid:'#10b981', unpaid:'#f59e0b', refunded:'#a855f7' };

function PaymentBadge({ status }: { status: string }) {
  const color = PAYMENT_COLORS[status] ?? '#94a3b8';
  return (
    <span style={{
      display:'inline-flex', fontSize:10, fontWeight:800,
      padding:'3px 9px', borderRadius:999, textTransform:'capitalize',
      background:`${color}18`, color, border:`1px solid ${color}30`,
    }}>{status}</span>
  );
}

/* ── Order Detail Modal ── */
function OrderDetailModal({ orderId, onClose, onUpdated, dark }: {
  orderId: number; onClose:()=>void; onUpdated:()=>void; dark:boolean;
}) {
  const [detail,   setDetail]   = useState<OrderDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [newStatus,setNewStatus]= useState('');
  const [updating, setUpdating] = useState(false);
  const [error,    setError]    = useState('');

  const bg      = dark ? '#161b27' : '#ffffff';
  const bgSub   = dark ? '#1e2535' : '#f8fafc';
  const border  = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const textMain = dark ? '#fff' : '#0f172a';
  const textMuted= dark ? 'rgba(255,255,255,0.4)' : '#64748b';

  useEffect(() => {
    ordersApi.getOne(orderId)
      .then(res => setDetail(res.data))
      .catch(()  => setError('Failed to load order details.'))
      .finally(()=> setLoading(false));
  }, [orderId]);

  const handleUpdate = async () => {
    if (!newStatus) return;
    setUpdating(true);
    try { await ordersApi.updateStatus(orderId, newStatus); onUpdated(); onClose(); }
    catch { setError('Failed to update status.'); }
    finally { setUpdating(false); }
  };

  return (
    <div style={{
      position:'fixed', inset:0,
      background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)',
      zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16,
    }}>
      <div style={{
        background:bg, borderRadius:20, width:'100%', maxWidth:680,
        maxHeight:'92vh', display:'flex', flexDirection:'column',
        boxShadow:'0 24px 64px rgba(0,0,0,0.4)',
        border:`1px solid ${border}`,
      }}>
        {/* header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px', borderBottom:`1px solid ${border}` }}>
          <h2 style={{ fontSize:15, fontWeight:800, color:textMain, margin:0 }}>Order Details</h2>
          <button onClick={onClose} style={{ background:'transparent', border:'none', cursor:'pointer', color:textMuted, padding:6, borderRadius:10 }}>
            <X size={16}/>
          </button>
        </div>

        <div style={{ overflowY:'auto', flex:1, padding:24 }}>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'48px 0' }}>
              <Loader2 size={24} style={{ animation:'spin 0.8s linear infinite', color:'#3b82f6' }}/>
            </div>
          ) : error ? (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(219,20,46,0.1)', border:'1px solid rgba(219,20,46,0.2)', borderRadius:12, padding:'12px 16px', color:'#db142e', fontSize:13 }}>
              <AlertCircle size={15}/>{error}
            </div>
          ) : detail ? (
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              {/* meta grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { icon:Hash,     label:'Order Number', value:detail.order.order_number },
                  { icon:Calendar, label:'Date',         value:new Date(detail.order.created_at).toLocaleDateString('fr-TN') },
                  { icon:User,     label:'Customer',     value:detail.order.customer?.name, sub:detail.order.customer?.email },
                  { icon:MapPin,   label:'Wilaya',       value:detail.order.wilaya ?? detail.order.customer?.state ?? '—' },
                ].map(({ icon:Icon, label, value, sub }) => (
                  <div key={label} style={{ background:bgSub, borderRadius:12, padding:'12px 14px', border:`1px solid ${border}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:textMuted, marginBottom:6 }}>
                      <Icon size={9}/>{label}
                    </div>
                    <p style={{ fontWeight:800, color:textMain, fontSize:13, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value}</p>
                    {sub && <p style={{ fontSize:11, color:textMuted, margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sub}</p>}
                  </div>
                ))}
              </div>

              {/* status + payment */}
              <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                <div>
                  <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:textMuted, marginBottom:6 }}>Order Status</p>
                  <StatusBadge status={detail.order.status} dark={dark}/>
                </div>
                <div>
                  <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:textMuted, marginBottom:6 }}>Payment</p>
                  <PaymentBadge status={detail.order.payment_status}/>
                </div>
              </div>

              {/* items table */}
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <Package size={14} color="#3b82f6"/>
                  <h3 style={{ fontSize:13, fontWeight:800, color:textMain, margin:0 }}>Your Items</h3>
                </div>
                <div style={{ border:`1px solid ${border}`, borderRadius:14, overflow:'hidden' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr style={{ background:bgSub }}>
                        {['Product','Qty','Unit','Total'].map((h,i) => (
                          <th key={h} style={{ padding:'8px 14px', textAlign:i>0?'right':'left', fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:textMuted }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map(item => (
                        <tr key={item.id} style={{ borderTop:`1px solid ${border}` }}>
                          <td style={{ padding:'10px 14px', fontWeight:700, color:textMain, fontSize:12 }}>{item.product_name}</td>
                          <td style={{ padding:'10px 14px', textAlign:'right', color:textMuted }}>{item.quantity}</td>
                          <td style={{ padding:'10px 14px', textAlign:'right', color:textMuted }}>{Number(item.unit_price).toFixed(3)}</td>
                          <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:800, color:'#3b82f6' }}>{Number(item.total).toFixed(3)} TND</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background:dark?'rgba(59,130,246,0.1)':'#eff6ff', borderTop:`1px solid ${border}` }}>
                        <td colSpan={3} style={{ padding:'10px 14px', fontSize:12, fontWeight:800, color:dark?'#93c5fd':'#1e40af' }}>Your Subtotal</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:900, color:'#3b82f6', fontSize:13 }}>{Number(detail.seller_subtotal).toFixed(3)} TND</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* update status */}
              <div style={{ background:bgSub, borderRadius:14, padding:16, border:`1px solid ${border}` }}>
                <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:textMuted, marginBottom:10 }}>Update Status</p>
                {error && <p style={{ fontSize:11, color:'#ef4444', marginBottom:6 }}>{error}</p>}
                <div style={{ display:'flex', gap:10 }}>
                  <select value={newStatus} onChange={e=>setNewStatus(e.target.value)}
                    style={{
                      flex:1, border:`1px solid ${border}`, borderRadius:10,
                      padding:'8px 12px', fontSize:13, fontWeight:600,
                      background:dark?'#0d1117':'#fff', color:textMain,
                      outline:'none',
                    }}>
                    <option value="">Select new status…</option>
                    {['pending','processing','completed','cancelled'].map(s => (
                      <option key={s} value={s} style={{ textTransform:'capitalize' }}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                    ))}
                  </select>
                  <button onClick={handleUpdate} disabled={!newStatus||updating}
                    style={{
                      padding:'8px 18px', background:'linear-gradient(135deg,#3b82f6,#2563eb)',
                      color:'#fff', fontWeight:700, fontSize:13, borderRadius:10,
                      border:'none', cursor:'pointer',
                      opacity:(!newStatus||updating)?0.5:1,
                      display:'flex', alignItems:'center', gap:6,
                    }}>
                    {updating && <Loader2 size={13} style={{ animation:'spin 0.8s linear infinite' }}/>}
                    Update
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ═══════════════════════════════ PAGE ═══════════════════════════════ */
export default function OrdersPage() {
  const { dark } = useTheme();
  const [data,          setData]          = useState<PaginatedResponse<Order> | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [page,          setPage]          = useState(1);
  const [selectedId,    setSelectedId]    = useState<number | null>(null);

  const empty: PaginatedResponse<Order> = { data:[], current_page:1, last_page:1, per_page:12, total:0, from:0, to:0 };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ordersApi.getAll({
        page, per_page:12,
        ...(search        && { search }),
        ...(filterStatus  && { status:filterStatus }),
        ...(filterPayment && { payment_status:filterPayment }),
      });
      const payload = (res as any)?.data ?? res;
      setData(Array.isArray(payload?.data) ? payload : empty);
    } catch { setData(empty); }
    finally  { setLoading(false); }
  }, [page, search, filterStatus, filterPayment]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* theme vars */
  const bg        = dark ? '#0D1117' : '#f0f2f5';
  const cardBg    = dark ? '#161b27' : '#ffffff';
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textMain  = dark ? '#ffffff' : '#0f172a';
  const textMuted = dark ? 'rgba(255,255,255,0.38)' : '#94a3b8';
  const inputBg   = dark ? '#0d1117' : '#f8fafc';
  const theadBg   = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
  const rowHover  = dark ? 'rgba(255,255,255,0.03)' : '#f9fafb';

  const inputStyle: React.CSSProperties = {
    border:`1px solid ${border}`, borderRadius:10,
    padding:'8px 12px', fontSize:13, fontWeight:500,
    background:inputBg, color:textMain, outline:'none',
    transition:'border 0.15s ease',
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <style>{`
        .order-row:hover td { background:${rowHover}!important; }
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontSize:20, fontWeight:900, color:textMain, margin:'0 0 2px', letterSpacing:'-0.02em' }}>Orders</h1>
        <p style={{ fontSize:11, color:textMuted, margin:0, fontWeight:500 }}>Orders that contain your products</p>
      </div>

      {/* Filters */}
      <div style={{ background:cardBg, borderRadius:16, padding:16, border:`1px solid ${border}`, display:'flex', flexWrap:'wrap', gap:10, alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:textMuted, pointerEvents:'none' }}/>
          <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }}
            placeholder="Search order number…"
            style={{ ...inputStyle, width:'100%', paddingLeft:32 }}/>
        </div>
        <select value={filterStatus} onChange={e=>{ setFilterStatus(e.target.value); setPage(1); }}
          style={inputStyle}>
          <option value="">All Statuses</option>
          {['pending','processing','completed','delivered','cancelled'].map(s=>(
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
        <select value={filterPayment} onChange={e=>{ setFilterPayment(e.target.value); setPage(1); }}
          style={inputStyle}>
          <option value="">All Payments</option>
          {['unpaid','paid','refunded'].map(s=>(
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
        {data && (
          <span style={{ fontSize:11, fontWeight:700, color:textMuted, marginLeft:'auto' }}>
            {data.total} order{data.total!==1?'s':''}
          </span>
        )}
      </div>

      {/* Table */}
      <div style={{ background:cardBg, borderRadius:18, border:`1px solid ${border}`, overflow:'hidden' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'64px 0' }}>
            <Loader2 size={24} style={{ animation:'spin 0.8s linear infinite', color:'#3b82f6' }}/>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:theadBg }}>
                  {['Order','Customer','Wilaya','Status','Payment','Amount','Date',''].map((h,i)=>(
                    <th key={h+i} style={{
                      padding:'10px 20px', fontSize:9, fontWeight:800,
                      textTransform:'uppercase', letterSpacing:'0.1em', color:textMuted,
                      textAlign: h==='Amount'?'right': h===''?'center':'left',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.data.map(order=>(
                  <tr key={order.id} className="order-row" style={{ borderTop:`1px solid ${border}` }}>
                    <td style={{ padding:'13px 20px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{
                          width:32, height:32, borderRadius:10,
                          background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.2)',
                          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                        }}>
                          <ShoppingBag size={13} color="#3b82f6"/>
                        </div>
                        <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:11, background:dark?'rgba(255,255,255,0.07)':'#f1f5f9', color:textMain, padding:'2px 7px', borderRadius:6 }}>
                          {order.order_number}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding:'13px 20px' }}>
                      <p style={{ fontWeight:700, color:textMain, margin:'0 0 2px', fontSize:12 }}>{order.user?.name??`User #${order.user_id}`}</p>
                      <p style={{ fontSize:10, color:textMuted, margin:0 }}>{order.user?.email}</p>
                    </td>
                    <td style={{ padding:'13px 20px', fontSize:12, fontWeight:500, color:textMuted }}>{order.wilaya??order.user?.state??'—'}</td>
                    <td style={{ padding:'13px 20px' }}><StatusBadge status={order.status} dark={dark}/></td>
                    <td style={{ padding:'13px 20px' }}><PaymentBadge status={order.payment_status}/></td>
                    <td style={{ padding:'13px 20px', textAlign:'right', fontWeight:900, color:textMain, fontSize:12 }}>{Number(order.total_amount).toFixed(3)} TND</td>
                    <td style={{ padding:'13px 20px', fontSize:11, color:textMuted, fontWeight:500 }}>{new Date(order.created_at).toLocaleDateString('fr-TN')}</td>
                    <td style={{ padding:'13px 20px', textAlign:'center' }}>
                      <button onClick={()=>setSelectedId(order.id)}
                        style={{ background:'transparent', border:'none', cursor:'pointer', padding:6, borderRadius:8, color:textMuted }}
                        className="eye-btn">
                        <Eye size={14}/>
                      </button>
                    </td>
                  </tr>
                ))}
                {data?.data.length===0 && (
                  <tr><td colSpan={8} style={{ padding:'56px 20px', textAlign:'center' }}>
                    <ShoppingBag size={28} style={{ margin:'0 auto 10px', display:'block', color:textMuted, opacity:0.4 }}/>
                    <p style={{ fontSize:13, fontWeight:700, color:textMuted, margin:'0 0 4px' }}>No orders found</p>
                    <p style={{ fontSize:11, color:textMuted, opacity:0.6, margin:0 }}>Try adjusting your filters</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.last_page>1 && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderTop:`1px solid ${border}` }}>
            <span style={{ fontSize:11, fontWeight:700, color:textMuted }}>Showing {data.from}–{data.to} of {data.total}</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                style={{ padding:6, borderRadius:8, border:`1px solid ${border}`, background:'transparent', cursor:'pointer', color:textMuted, opacity:page===1?0.4:1 }}>
                <ChevronLeft size={14}/>
              </button>
              <span style={{ fontSize:11, fontWeight:800, color:textMain, padding:'0 4px' }}>{data.current_page}/{data.last_page}</span>
              <button onClick={()=>setPage(p=>Math.min(data.last_page,p+1))} disabled={page===data.last_page}
                style={{ padding:6, borderRadius:8, border:`1px solid ${border}`, background:'transparent', cursor:'pointer', color:textMuted, opacity:page===data.last_page?0.4:1 }}>
                <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`.eye-btn:hover{background:${dark?'rgba(59,130,246,0.12)':'rgba(59,130,246,0.08)'}!important;color:#3b82f6!important}`}</style>

      {selectedId!==null && (
        <OrderDetailModal orderId={selectedId} onClose={()=>setSelectedId(null)} onUpdated={fetchData} dark={dark}/>
      )}
    </div>
  );
}