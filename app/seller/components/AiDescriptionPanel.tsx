'use client';

import { useState, useMemo } from 'react';
import {
  Sparkles, Loader2, Check, ChevronDown, ChevronUp,
  Lock, ArrowRight, AlertTriangle, Info, CheckCircle2,
} from 'lucide-react';
import { sellerAiApi } from '@/lib/sellerAiApi';
import type { DescriptionResult } from '@/lib/sellerAiApi';
import type { AttributeValues, Attribute } from '@/types/Attributes';
import type { VariantRow } from './VariantBuilder';
import { useLocale, useTranslations } from 'next-intl';
import { useFormat } from '@/lib/i18n/useFormat';

// ── Constants ──────────────────────────────────────────────────────────────────

const THRESHOLD = 65;

// Labels live in seller.aiDescription.tones / .langs
const TONES = ['professional', 'casual', 'exciting', 'trust-focused'] as const;

const LANGS = ['fr', 'ar', 'en'] as const;

// ── Option resolver ────────────────────────────────────────────────────────────
// Builds a flat map: option_id (number) → human-readable label (string)
// from ALL variant + info axes combined.

function buildOptionMap(axes: Attribute[]): Record<number, string> {
  const map: Record<number, string> = {};
  for (const axis of axes) {
    for (const opt of axis.options ?? []) {
      map[Number(opt.id)] = opt.value;
    }
  }
  return map;
}

// Resolves raw attrValues (which contain option IDs) → { "Gender": "Men", "Material": "Cotton" }
function resolveAttributes(
  attrValues:  AttributeValues,
  allAxes:     Attribute[],
  optionMap:   Record<number, string>,
): Record<string, string> {
  const axisMap: Record<string, Attribute> = {};
  for (const axis of allAxes) axisMap[axis.slug] = axis;

  const out: Record<string, string> = {};

  for (const [slug, val] of Object.entries(attrValues)) {
    if (val === null || val === undefined || val === '') continue;

    const axis     = axisMap[slug];
    const axisName = axis?.name ?? slug;
    const axisType = axis?.type ?? 'text';

    if (Array.isArray(val)) {
      // multiselect / color — array of option IDs
      const labels = val
        .map(id => optionMap[Number(id)])
        .filter(Boolean);
      if (labels.length) out[axisName] = labels.join(', ');

    } else if (typeof val === 'boolean') {
      out[axisName] = val ? 'Yes' : 'No';

    } else if (['select', 'color'].includes(axisType)) {
      // Single option ID stored as number or numeric string
      const label = optionMap[Number(val)];
      if (label) out[axisName] = label;
      else if (String(val)) out[axisName] = String(val);

    } else {
      // text / number — direct value
      const str = String(val).trim();
      if (str) out[axisName] = str;
    }
  }

  return out;
}

// Builds human-readable variant labels from option_ids
// e.g. [104, 22] → "Black / XL"
function resolveVariantLabels(
  variantRows: VariantRow[],
  optionMap:   Record<number, string>,
): string[] {
  return variantRows
    .filter(v => v.option_ids.some((id: number) => id > 0))
    .map(v => {
      // In edit mode the row already has a label — use it directly
      if ((v as any).label) return (v as any).label as string;

      // In add mode build from option_ids
      const labels = v.option_ids
        .filter((id: number) => id > 0)
        .map((id: number) => optionMap[id])
        .filter(Boolean);

      return labels.join(' / ') || null;
    })
    .filter((l): l is string => !!l)
    .slice(0, 12);
}

// ── Completeness Engine ────────────────────────────────────────────────────────

type CheckKey = 'name' | 'category' | 'price' | 'photo' | 'shortDescription' | 'attributes' | 'variants';

interface CompletenessResult {
  score:       number;
  checks:      Array<{ label: CheckKey; weight: number; pass: boolean }>;
  canGenerate: boolean;
}

function computeCompleteness(p: {
  name:           string;
  categoryId:     string;
  price:          string;
  shortDesc:      string;
  imageCount:     number;
  hasAttrs:       boolean;
  hasVariantAxes: boolean;
  hasVariants:    boolean;
}): CompletenessResult {
  const checks: Array<{ label: CheckKey; weight: number; pass: boolean }> = [
    { label: 'name',             weight: 25, pass: !!p.name.trim() },
    { label: 'category',         weight: 20, pass: !!p.categoryId },
    { label: 'price',            weight: 15, pass: !!p.price && Number(p.price) > 0 },
    { label: 'photo',            weight: 20, pass: p.imageCount > 0 },
    { label: 'shortDescription', weight: 10, pass: !!p.shortDesc.trim() },
    { label: 'attributes',       weight:  5, pass: p.hasAttrs },
  ];

  if (p.hasVariantAxes) {
    checks.push({ label: 'variants', weight: 5, pass: p.hasVariants });
  }

  const total  = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter(c => c.pass).reduce((s, c) => s + c.weight, 0);
  const score  = Math.round((earned / total) * 100);

  return { score, checks, canGenerate: score >= THRESHOLD };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface AiDescriptionPanelProps {
  productName:      string;
  categoryId:       string;
  categoryName?:    string;
  price:            string;
  shortDescription: string;
  imageCount:       number;
  attrValues:       AttributeValues;
  variantRows:      VariantRow[];
  variantAxes:      Attribute[];   // ← needed to resolve option IDs → labels
  infoAxes:         Attribute[];   // ← needed to resolve info attribute IDs → labels
  hasVariantAxes:   boolean;
  canUseAi:         boolean;
  onInsert: (fields: { short_description?: string; description?: string }) => void;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AiDescriptionPanel({
  productName, categoryId, categoryName, price, shortDescription,
  imageCount, attrValues, variantRows, variantAxes, infoAxes,
  hasVariantAxes, canUseAi, onInsert,
}: AiDescriptionPanelProps) {
  const t      = useTranslations('seller.aiDescription');
  const locale = useLocale();
  const { price: fmtPrice } = useFormat();
  const [open,    setOpen]    = useState(false);
  const [tone,    setTone]    = useState('professional');
  // Generates in the dashboard language by default
  const [lang,    setLang]    = useState<string>(locale);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<DescriptionResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  // ── Resolve option IDs → labels (memoized) ──────────────────────────────
  const optionMap = useMemo(
    () => buildOptionMap([...variantAxes, ...infoAxes]),
    [variantAxes, infoAxes],
  );

  const resolvedAttrs = useMemo(
    () => resolveAttributes(attrValues, [...variantAxes, ...infoAxes], optionMap),
    [attrValues, variantAxes, infoAxes, optionMap],
  );

  const resolvedVariants = useMemo(
    () => resolveVariantLabels(variantRows, optionMap),
    [variantRows, optionMap],
  );

  // ── Completeness ─────────────────────────────────────────────────────────
  const hasAttrs = Object.keys(resolvedAttrs).length > 0;

  const completeness = useMemo(() => computeCompleteness({
    name:           productName,
    categoryId,
    price,
    shortDesc:      shortDescription,
    imageCount,
    hasAttrs,
    hasVariantAxes,
    hasVariants:    resolvedVariants.length > 0,
  }), [productName, categoryId, price, shortDescription, imageCount, hasAttrs, hasVariantAxes, resolvedVariants]);

  const scoreColor  = completeness.score >= 65 ? '#10b981' : completeness.score >= 40 ? '#f59e0b' : '#ef4444';
  const showHint    = !!productName.trim() && !completeness.canGenerate && !open;
  const missingList = completeness.checks.filter(c => !c.pass).map(c => t(`checks.${c.label}`));

  // ── Locked (no plan) ────────────────────────────────────────────────────
  if (!canUseAi) {
    return (
      <span
        title={t('requiresPlan')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 8,
          background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.18)',
          cursor: 'not-allowed',
        }}
      >
        <Lock size={10} color="#94a3b8" />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>{t('generateShort')}</span>
        <span style={{
          fontSize: 8, fontWeight: 800, color: '#db142e',
          background: 'rgba(219,20,46,0.08)', border: '1px solid rgba(219,20,46,0.2)',
          padding: '1px 5px', borderRadius: 4,
        }}>Red+</span>
      </span>
    );
  }

  const handleToggle = () => {
    setOpen(o => !o);
    if (open) { setResult(null); setError(null); }
  };

  const generate = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await sellerAiApi.quickDescription({
        name:              productName.trim(),
        category:          categoryName,
        price,
        short_description: shortDescription,
        attributes:        resolvedAttrs,    // ← human-readable: { "Gender": "Men", "Material": "Cotton" }
        variants:          resolvedVariants, // ← human-readable: ["Black / XL", "White / M"]
        image_count:       imageCount,
        tone,
        language:          lang,
      });
      setResult(res.data.ai_result);
    } catch (e: any) {
      setError(e.message ?? t('failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <style>{`@keyframes ai-spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Button + live score bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={handleToggle}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', borderRadius: 8, fontFamily: 'inherit',
            background: open ? 'rgba(219,20,46,0.09)' : 'rgba(219,20,46,0.05)',
            border: `1px solid ${open ? 'rgba(219,20,46,0.3)' : 'rgba(219,20,46,0.15)'}`,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          <Sparkles size={11} color="#db142e" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#db142e' }}>{t('generateShort')}</span>
          {completeness.canGenerate
            ? (open ? <ChevronUp size={9} color="#db142e" /> : <ChevronDown size={9} color="#db142e" />)
            : <AlertTriangle size={9} color="#f59e0b" />
          }
        </button>

        {!!productName.trim() && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 52, height: 4, borderRadius: 2, background: '#e5e7eb', overflow: 'hidden' }}>
              <div style={{
                width: `${completeness.score}%`, height: '100%',
                borderRadius: 2, background: scoreColor, transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: scoreColor }}>
              {completeness.score}%
            </span>
          </div>
        )}
      </div>

      {/* ── Subtle hint before clicking ── */}
      {showHint && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 6,
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 8, padding: '7px 10px',
        }}>
          <Info size={11} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: '#92400e', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
            {t.rich('tip', {
              items: missingList.slice(0, 3).join(', ').toLocaleLowerCase(locale),
              more: missingList.length - 3,
              b: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        </div>
      )}

      {/* ── Expandable panel ── */}
      {open && (
        <div style={{
          background: '#f8fafc', border: '1px solid #e5e7eb',
          borderRadius: 12, padding: '16px',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>

          {/* ══ BLOCKING VIEW (incomplete) ══ */}
          {!completeness.canGenerate && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#92400e', margin: '0 0 3px' }}>
                    {t('moreDetails')}
                  </p>
                  <p style={{ fontSize: 11, color: '#92400e', margin: 0, lineHeight: 1.5, opacity: 0.9 }}>
                    {t('completeFirst')}
                  </p>
                </div>
              </div>

              <div>
                <p style={{
                  fontSize: 9, fontWeight: 800, color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px',
                }}>{t('checklist')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {completeness.checks.map(({ label, pass }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {pass
                        ? <CheckCircle2 size={13} color="#10b981" style={{ flexShrink: 0 }} />
                        : <div style={{
                            width: 13, height: 13, borderRadius: '50%',
                            border: '1.5px solid #d1d5db', flexShrink: 0,
                          }} />
                      }
                      <span style={{ fontSize: 11, fontWeight: pass ? 600 : 400, color: pass ? '#374151' : '#9ca3af' }}>
                        {t(`checks.${label}`)}
                      </span>
                      {!pass && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: '#f59e0b',
                          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                          padding: '1px 5px', borderRadius: 4,
                        }}>{t('missing')}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t('completeness')}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: scoreColor }}>
                    {t('scoreNeed', { score: completeness.score, need: THRESHOLD })}
                  </span>
                </div>
                <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${completeness.score}%`, height: '100%',
                    background: scoreColor, borderRadius: 3, transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* ══ GENERATION VIEW (complete enough) ══ */}
          {completeness.canGenerate && (
            <>
              {/* Context summary — shows what the AI will actually use */}
              <div style={{
                background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)',
                borderRadius: 8, padding: '10px 12px',
              }}>
                <p style={{
                  fontSize: 9, fontWeight: 800, color: '#3b82f6',
                  textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 7px',
                }}>{t('willUse')}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {[
                    productName                              && `📦 ${productName}`,
                    categoryName                             && `🏷️ ${categoryName}`,
                    price && Number(price) > 0               && `💰 ${fmtPrice(price, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`,
                    imageCount > 0                           && `🖼️ ${t('photos', { count: imageCount })}`,
                    resolvedVariants.length > 0              && `🎨 ${resolvedVariants.join(', ')}`,
                    shortDescription.trim()                  && `✍️ ${t('yourDraft')}`,
                    ...Object.entries(resolvedAttrs).map(([k, v]) => `${k}: ${v}`),
                  ].filter(Boolean).map((item, i) => (
                    <span key={i} style={{
                      fontSize: 10, fontWeight: 600, color: '#1e40af',
                      background: 'rgba(59,130,246,0.08)',
                      padding: '2px 8px', borderRadius: 999,
                    }}>{item as string}</span>
                  ))}
                </div>
              </div>

              {/* Tone + Language */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 7px' }}>
                    {t('tone')}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {TONES.map(value => (
                      <button key={value} type="button" onClick={() => setTone(value)}
                        style={{
                          padding: '4px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                          cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                          background: tone === value ? 'rgba(219,20,46,0.1)' : '#f1f5f9',
                          color:      tone === value ? '#dc2626' : '#64748b',
                          outline:    tone === value ? '1.5px solid rgba(219,20,46,0.35)' : '1px solid transparent',
                        }}
                      >{t(`tones.${value}`)}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 7px' }}>
                    {t('language')}
                  </p>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {LANGS.map(value => (
                      <button key={value} type="button" onClick={() => setLang(value)}
                        style={{
                          padding: '4px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                          cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                          background: lang === value ? 'rgba(59,130,246,0.1)' : '#f1f5f9',
                          color:      lang === value ? '#3b82f6' : '#64748b',
                          outline:    lang === value ? '1.5px solid rgba(59,130,246,0.35)' : '1px solid transparent',
                        }}
                      >{t(`langs.${value}`)}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate */}
              <button
                type="button" onClick={generate} disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 0', borderRadius: 10, border: 'none', fontFamily: 'inherit',
                  background: loading ? 'rgba(219,20,46,0.35)' : 'linear-gradient(135deg,#db142e,#a00f22)',
                  color: '#fff', fontWeight: 700, fontSize: 12,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(219,20,46,0.3)',
                }}
              >
                {loading
                  ? <><Loader2 size={13} style={{ animation: 'ai-spin 0.8s linear infinite' }} />{t('generating')}</>
                  : <><Sparkles size={13} />{t('generate')}</>
                }
              </button>

              {error && (
                <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, margin: 0 }}>{error}</p>
              )}

              {/* Result */}
              {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ height: 1, background: '#e5e7eb' }} />
                  <ResultBlock
                    label={t('shortDescription')}
                    text={result.short_description}
                    onInsert={() => onInsert({ short_description: result.short_description })}
                  />
                  <ResultBlock
                    label={t('fullDescription')}
                    text={result.description}
                    onInsert={() => onInsert({ description: result.description })}
                    scrollable
                  />
                  <button
                    type="button"
                    onClick={() => onInsert({
                      short_description: result.short_description,
                      description:       result.description,
                    })}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '9px 0', borderRadius: 10, fontFamily: 'inherit',
                      border: '1.5px solid rgba(16,185,129,0.4)',
                      background: 'rgba(16,185,129,0.06)',
                      color: '#059669', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    <Check size={13} /> {t('insertBoth')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── ResultBlock ────────────────────────────────────────────────────────────────

function ResultBlock({ label, text, onInsert, scrollable = false }: {
  label: string; text: string; onInsert: () => void; scrollable?: boolean;
}) {
  const t = useTranslations('seller.aiDescription');
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <p style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
          {label}
        </p>
        <button type="button" onClick={onInsert} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 6, border: 'none', fontFamily: 'inherit',
          background: 'rgba(16,185,129,0.1)', color: '#059669',
          fontSize: 10, fontWeight: 700, cursor: 'pointer',
        }}>
          <ArrowRight size={10} /> {t('insert')}
        </button>
      </div>
      <p dir="auto" style={{
        fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap',
        ...(scrollable ? { maxHeight: 120, overflowY: 'auto' } : {}),
      }}>{text}</p>
    </div>
  );
}