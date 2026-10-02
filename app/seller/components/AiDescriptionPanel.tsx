'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Sparkles, Loader2, Check, ChevronDown, ChevronUp, Lock, ArrowRight, AlertTriangle,
  Info, RefreshCw, Copy, CheckCircle2, Mic, Hash, Search, Megaphone, Crown,
} from 'lucide-react';
import { sellerAiApi } from '@/lib/sellerAiApi';
import type {
  DescriptionOptions, DescriptionVariant, DescriptionTone, DescriptionLanguage,
  DescriptionLength, DescriptionLevel, DescriptionUsage,
} from '@/lib/sellerAiApi';
import type { AttributeValues, Attribute } from '@/types/Attributes';
import type { VariantRow } from './VariantBuilder';
import { useLocale, useTranslations } from 'next-intl';
import { useFormat } from '@/lib/i18n/useFormat';

// ── Constants ──────────────────────────────────────────────────────────────────

const RED   = '#db142e';
const GREEN = '#047857';
const BLUE  = '#1d4ed8';
const MUTED = '#5b6472';

const LEVEL_LABEL: Record<DescriptionLevel, string> = { free: 'Green', red: 'Red', black: 'Black' };

// ── Option resolvers ───────────────────────────────────────────────────────────
// Product form values hold option IDs; the AI needs the human-readable labels.

function buildOptionMap(axes: Attribute[]): Record<number, { value: string; axis: string }> {
  const map: Record<number, { value: string; axis: string }> = {};
  for (const axis of axes) {
    for (const opt of axis.options ?? []) map[Number(opt.id)] = { value: opt.value, axis: axis.name };
  }
  return map;
}

// { "Gender": "Men", "Material": "Cotton" }
function resolveAttributes(
  attrValues: AttributeValues,
  allAxes:    Attribute[],
  optionMap:  Record<number, { value: string; axis: string }>,
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
      const labels = val.map(id => optionMap[Number(id)]?.value).filter(Boolean);
      if (labels.length) out[axisName] = labels.join(', ');
    } else if (typeof val === 'boolean') {
      out[axisName] = val ? 'Yes' : 'No';
    } else if (['select', 'color'].includes(axisType)) {
      out[axisName] = optionMap[Number(val)]?.value ?? String(val);
    } else {
      const str = String(val).trim();
      if (str) out[axisName] = str;
    }
  }
  return out;
}

// Variant rows → exact combinations ("Black / XL") and options grouped by type ({ Size: [S, M] })
function resolveVariants(
  rows:      VariantRow[],
  optionMap: Record<number, { value: string; axis: string }>,
): { combos: string[]; groups: Record<string, string[]> } {
  const combos: string[] = [];
  const groups: Record<string, string[]> = {};
  for (const row of rows) {
    if (row.is_active === false) continue;
    const ids  = row.option_ids.filter((id: number) => id > 0);
    const opts = ids.map((id: number) => optionMap[id]).filter(Boolean);
    // Several values on one axis in the same variant form one choice ("White/Green" colourway)
    const perAxis: Record<string, string[]> = {};
    for (const o of opts) (perAxis[o.axis] ??= []).push(o.value);
    for (const [axis, values] of Object.entries(perAxis)) {
      const value = values.join('/');
      groups[axis] ??= [];
      if (!groups[axis].includes(value)) groups[axis].push(value);
    }
    const label = ((row as any).label as string | undefined) ?? opts.map(o => o.value).join(' / ');
    if (label && !combos.includes(label)) combos.push(label);
  }
  return { combos: combos.slice(0, 30), groups };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface AiDescriptionPanelProps {
  productId?:       number;
  productName:      string;
  categoryId:       string;
  categoryName?:    string;
  subcategoryName?: string;
  price:            string;
  shortDescription: string;
  attrValues:       AttributeValues;
  variantRows:      VariantRow[];
  variantAxes:      Attribute[];
  infoAxes:         Attribute[];
  occasions?:       string[];
  isPack?:          boolean;
  packQuantity?:    string;
  packContents?:    string;
  onInsert: (fields: { short_description?: string; description?: string }) => void;
}

type ApiError = { message: string; code?: string; required_plan?: { slug: string; name: string } | null; retry_after?: number };

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AiDescriptionPanel(props: AiDescriptionPanelProps) {
  const {
    productId, productName, categoryId, categoryName, subcategoryName, price, shortDescription,
    attrValues, variantRows, variantAxes, infoAxes, occasions, isPack, packQuantity, packContents, onInsert,
  } = props;

  const t      = useTranslations('seller.aiDescription');
  const locale = useLocale();
  const { price: fmtPrice } = useFormat();

  const [open,     setOpen]     = useState(false);
  const [opts,     setOpts]     = useState<DescriptionOptions | null>(null);
  const [usage,    setUsage]    = useState<DescriptionUsage | null>(null);
  const [optsErr,  setOptsErr]  = useState<string | null>(null);

  const [tone,     setTone]     = useState<DescriptionTone>('professional');
  const [lang,     setLang]     = useState<DescriptionLanguage>((['fr', 'ar', 'en'].includes(locale) ? locale : 'fr') as DescriptionLanguage);
  const [allLangs, setAllLangs] = useState(false);
  const [length,   setLength]   = useState<DescriptionLength>('medium');
  const [count,    setCount]    = useState(1);
  const [extras,   setExtras]   = useState(true);
  const [keywords, setKeywords] = useState('');
  const [notes,    setNotes]    = useState('');

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<ApiError | null>(null);
  const [upsell,   setUpsell]   = useState<{ feature: string; level: DescriptionLevel | null } | null>(null);
  const [variants, setVariants] = useState<DescriptionVariant[]>([]);
  const [active,   setActive]   = useState(0);
  // Seller edits per variant id, kept until the next generation
  const [edits,    setEdits]    = useState<Record<string, { description: string; short: string }>>({});
  const [inserted, setInserted] = useState<string | null>(null);

  // ── Data the AI will use ──────────────────────────────────────────────────
  const optionMap = useMemo(() => buildOptionMap([...variantAxes, ...infoAxes]), [variantAxes, infoAxes]);
  const resolvedAttrs = useMemo(
    () => resolveAttributes(attrValues, [...variantAxes, ...infoAxes], optionMap),
    [attrValues, variantAxes, infoAxes, optionMap],
  );
  const { combos, groups } = useMemo(() => resolveVariants(variantRows, optionMap), [variantRows, optionMap]);

  const canGenerate = !!productName.trim() && !!categoryId;
  const richness = useMemo(() => {
    const checks = [
      { key: 'price',      pass: !!price && Number(price) > 0 },
      { key: 'attributes', pass: Object.keys(resolvedAttrs).length >= 2 },
      { key: 'variants',   pass: variantAxes.length === 0 || combos.length > 0 },
      { key: 'notes',      pass: notes.trim().length >= 15 || shortDescription.trim().length >= 15 },
    ];
    return { checks, score: Math.round((checks.filter(c => c.pass).length / checks.length) * 100) };
  }, [price, resolvedAttrs, variantAxes.length, combos.length, notes, shortDescription]);

  // ── Options (plan capabilities + usage) ───────────────────────────────────
  const loadOptions = useCallback(async () => {
    setOptsErr(null);
    try {
      const res = await sellerAiApi.descriptionOptions();
      const o   = res.data;
      setOpts(o);
      setUsage(o.usage);
      // Free plans write in the dashboard language only
      if (o.languages.find(l => l.key === lang)?.locked) setLang(o.default_language);
    } catch (e: any) {
      setOptsErr(e?.message ?? t('failed'));
    }
  }, [lang, t]);

  useEffect(() => { if (open && !opts) loadOptions(); }, [open, opts, loadOptions]);

  const level       = opts?.level ?? 'free';
  const toneInfo    = (k: DescriptionTone) => opts?.tones.find(x => x.key === k);
  const langInfo    = (k: DescriptionLanguage) => opts?.languages.find(x => x.key === k);
  const maxVariants = opts?.max_variants ?? 1;
  const outOfQuota  = usage?.remaining === 0;

  const lockedClick = (feature: string, required: DescriptionLevel | null | undefined) =>
    setUpsell({ feature, level: required ?? 'red' });

  const upgradeName = (lvl: DescriptionLevel | null | undefined) =>
    (lvl && lvl !== 'free' ? opts?.upgrade?.[lvl]?.name : null) ?? `${LEVEL_LABEL[(lvl ?? 'red') as DescriptionLevel]} Pepper`;

  // ── Generate ──────────────────────────────────────────────────────────────
  const generate = async () => {
    if (!opts) return;
    setLoading(true); setError(null); setUpsell(null); setInserted(null);
    try {
      const res = await sellerAiApi.generateDescription({
        product_id:        productId,
        name:              productName.trim(),
        category:          categoryName,
        subcategory:       subcategoryName,
        price,
        short_description: shortDescription,
        notes:             notes.trim() || undefined,
        keywords:          keywords.trim() || undefined,
        attributes:        resolvedAttrs,
        variants:          combos,
        option_groups:     groups,
        occasions,
        is_pack:           isPack,
        pack_quantity:     isPack && packQuantity ? Number(packQuantity) : null,
        pack_contents:     isPack ? packContents : undefined,
        tone,
        length,
        ...(allLangs && opts.multi_language
          ? { languages: ['fr', 'ar', 'en'] as DescriptionLanguage[], count: 3 }
          : { language: lang, count: Math.min(count, maxVariants) }),
        extras: opts.extras && extras,
      });
      setVariants(res.data.variants);
      setUsage(res.data.usage);
      setEdits({});
      setActive(0);
    } catch (e: any) {
      const data = e?.response?.data ?? {};
      setError({ message: data.message ?? e?.message ?? t('failed'), code: data.code, required_plan: data.required_plan, retry_after: data.retry_after });
      if (data.usage) setUsage(data.usage);
    } finally {
      setLoading(false);
    }
  };

  const current     = variants[active];
  const currentEdit = current ? (edits[current.id] ?? { description: current.description, short: current.short_description }) : null;
  const setEdit = (patch: Partial<{ description: string; short: string }>) => {
    if (!current || !currentEdit) return;
    setEdits(prev => ({ ...prev, [current.id]: { ...currentEdit, ...patch } }));
  };

  const insert = (which: 'description' | 'short' | 'both') => {
    if (!currentEdit) return;
    onInsert({
      ...(which !== 'short'       ? { description: currentEdit.description.trim() } : {}),
      ...(which !== 'description' ? { short_description: currentEdit.short.trim().slice(0, 500) } : {}),
    });
    setInserted(which);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <style>{`@keyframes ai-spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Toggle + usage ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', borderRadius: 8, fontFamily: 'inherit',
            background: open ? 'rgba(219,20,46,0.09)' : 'rgba(219,20,46,0.05)',
            border: `1px solid ${open ? 'rgba(219,20,46,0.3)' : 'rgba(219,20,46,0.15)'}`,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          <Sparkles size={11} color={RED} />
          <span style={{ fontSize: 11, fontWeight: 700, color: RED }}>{t('generateShort')}</span>
          {open ? <ChevronUp size={9} color={RED} /> : <ChevronDown size={9} color={RED} />}
        </button>
        {usage && usage.limit !== null && (
          <span style={{ fontSize: 10, fontWeight: 700, color: outOfQuota ? '#b91c1c' : MUTED }}>
            {t('usage', { used: usage.used, limit: usage.limit })}
          </span>
        )}
      </div>

      {open && (
        <div style={{
          background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {!opts && !optsErr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: MUTED }}>
              <Loader2 size={13} style={{ animation: 'ai-spin 0.8s linear infinite' }} /> {t('loading')}
            </div>
          )}
          {optsErr && <ErrorBox message={optsErr} onRetry={loadOptions} retryLabel={t('retry')} />}

          {opts && !canGenerate && (
            <Notice tone="warn" icon={<AlertTriangle size={14} color="#f59e0b" />} title={t('needBasics')}>
              {t('needBasicsHint')}
            </Notice>
          )}

          {opts && canGenerate && (
            <>
              {/* ── Plan line ── */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: MUTED }}>
                  {t('planLine', { plan: opts.plan.name })}
                </span>
                {level !== 'black' && (
                  <button type="button" onClick={() => setUpsell({ feature: 'overview', level: level === 'free' ? 'red' : 'black' })}
                    style={linkBtn}>
                    <Crown size={10} /> {t('seeWhatUnlocks', { plan: upgradeName(level === 'free' ? 'red' : 'black') })}
                  </button>
                )}
              </div>

              {/* ── Data the AI will use ── */}
              <div style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <p style={{ ...label, color: BLUE, margin: 0 }}>{t('willUse')}</p>
                  <span style={{ fontSize: 9, fontWeight: 800, color: richness.score >= 75 ? '#10b981' : '#f59e0b' }}>
                    {t('richness', { score: richness.score })}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {[
                    productName,
                    [categoryName, subcategoryName].filter(Boolean).join(' › '),
                    price && Number(price) > 0 && fmtPrice(price, { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
                    ...Object.entries(resolvedAttrs).map(([k, v]) => `${k}: ${v}`),
                    ...Object.entries(groups).map(([k, v]) => `${k}: ${v.join(', ')}`),
                    isPack && t('pack', { count: Number(packQuantity) || 0 }),
                    shortDescription.trim() && t('yourDraft'),
                  ].filter(Boolean).map((item, i) => (
                    <span key={i} dir="auto" style={{ fontSize: 10, fontWeight: 600, color: '#1e40af', background: 'rgba(59,130,246,0.08)', padding: '2px 8px', borderRadius: 999 }}>
                      {item as string}
                    </span>
                  ))}
                </div>
                {richness.score < 75 && (
                  <p style={{ fontSize: 10, color: '#92400e', margin: '8px 0 0', lineHeight: 1.45 }}>
                    <Info size={10} style={{ verticalAlign: '-1px', marginInlineEnd: 4 }} />
                    {t('richnessTip', { items: richness.checks.filter(c => !c.pass).map(c => t(`checks.${c.key}`)).join(', ').toLocaleLowerCase(locale) })}
                  </p>
                )}
              </div>

              {/* ── Seller inputs ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                <div>
                  <p style={label}>{t('notes')}</p>
                  <textarea
                    value={notes} onChange={e => setNotes(e.target.value)} maxLength={600} rows={2} dir="auto"
                    placeholder={t('notesPlaceholder')}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <p style={label}>{t('keywords')}</p>
                  <input
                    value={keywords} onChange={e => setKeywords(e.target.value)} maxLength={300} dir="auto"
                    placeholder={t('keywordsPlaceholder')}
                    style={inputStyle}
                  />
                  <p style={{ fontSize: 9, color: MUTED, margin: '4px 0 0' }}>{t('keywordsHint')}</p>
                </div>
              </div>

              {/* ── Tone ── */}
              <div>
                <p style={label}>{t('tone')}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {opts.tones.map(({ key, locked, requires }) => (
                    <Chip key={key} active={tone === key} locked={locked} lockLabel={LEVEL_LABEL[(requires ?? 'red') as DescriptionLevel]}
                      title={t(`toneHints.${key}`)}
                      onClick={() => locked ? lockedClick('tone', requires) : setTone(key)}>
                      {t(`tones.${key}`)}
                    </Chip>
                  ))}
                </div>
                <p style={{ fontSize: 10, color: MUTED, margin: '5px 0 0' }}>{t(`toneHints.${tone}`)}</p>
              </div>

              {/* ── Language · length · variants ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                <div>
                  <p style={label}>{t('language')}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(['fr', 'ar', 'en'] as DescriptionLanguage[]).map(key => {
                      const info = langInfo(key);
                      return (
                        <Chip key={key} color="blue" active={!allLangs && lang === key} locked={!!info?.locked}
                          lockLabel={LEVEL_LABEL[(info?.requires ?? 'red') as DescriptionLevel]}
                          onClick={() => info?.locked ? lockedClick('language', info.requires) : (setLang(key), setAllLangs(false))}>
                          {t(`langs.${key}`)}
                        </Chip>
                      );
                    })}
                    <Chip color="blue" active={allLangs} locked={!opts.multi_language} lockLabel="Black"
                      title={t('allLanguagesHint')}
                      onClick={() => !opts.multi_language ? lockedClick('multi_language', opts.requires.multi_language) : setAllLangs(a => !a)}>
                      {t('allLanguages')}
                    </Chip>
                  </div>
                </div>
                <div>
                  <p style={label}>{t('length')}</p>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {opts.lengths.map(key => (
                      <Chip key={key} active={length === key} onClick={() => setLength(key)}>{t(`lengths.${key}`)}</Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={label}>{t('variants')}</p>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3].map(n => {
                      const locked = n > maxVariants;
                      return (
                        <Chip key={n} active={!allLangs && count === n} locked={locked} lockLabel="Red"
                          onClick={() => locked ? lockedClick('variants', opts.requires.variants) : (setCount(n), setAllLangs(false))}>
                          {n}
                        </Chip>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Extras ── */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#374151' }}
                onClick={e => { if (!opts.extras) { e.preventDefault(); lockedClick('extras', opts.requires.extras); } }}>
                <input type="checkbox" checked={opts.extras && extras} disabled={!opts.extras} onChange={e => setExtras(e.target.checked)} />
                {t('extras')}
                {!opts.extras && <LockTag label="Red" />}
              </label>

              {/* ── Store voice (Black) ── */}
              <StoreVoice opts={opts} onLocked={() => lockedClick('brand_voice', opts.requires.brand_voice)} onSaved={voice => setOpts({ ...opts, voice })} />

              {/* ── Upgrade prompt ── */}
              {upsell && (
                <UpgradePrompt
                  title={t(`upsell.${upsell.feature}`, { plan: upgradeName(upsell.level) })}
                  body={t(`upsellBody.${upsell.level === 'black' ? 'black' : 'red'}`, {
                    plan: upgradeName(upsell.level), limit: opts.limits[upsell.level === 'black' ? 'black' : 'red'],
                  })}
                  cta={t('upgradeCta', { plan: upgradeName(upsell.level) })}
                  onClose={() => setUpsell(null)}
                  closeLabel={t('notNow')}
                />
              )}

              {/* ── Generate / regenerate ── */}
              <button
                type="button" onClick={generate} disabled={loading || outOfQuota}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 0', borderRadius: 10, border: 'none', fontFamily: 'inherit',
                  background: loading || outOfQuota ? 'rgba(219,20,46,0.35)' : 'linear-gradient(135deg,#db142e,#a00f22)',
                  color: '#fff', fontWeight: 700, fontSize: 12,
                  cursor: loading || outOfQuota ? 'not-allowed' : 'pointer',
                  boxShadow: loading || outOfQuota ? 'none' : '0 4px 14px rgba(219,20,46,0.3)',
                }}
              >
                {loading
                  ? <><Loader2 size={13} style={{ animation: 'ai-spin 0.8s linear infinite' }} />{t('generating')}</>
                  : variants.length
                    ? <><RefreshCw size={13} />{t('regenerate')}</>
                    : <><Sparkles size={13} />{t('generate')}</>}
              </button>

              {outOfQuota && !error && (
                <Notice tone="warn" icon={<AlertTriangle size={14} color="#f59e0b" />} title={t('quotaReached')}>
                  {level === 'black' ? t('quotaResets') : (
                    <>{t('quotaResets')} <a href="/seller/subscription" style={{ color: RED, fontWeight: 700 }}>
                      {t('upgradeCta', { plan: upgradeName(level === 'free' ? 'red' : 'black') })}
                    </a></>
                  )}
                </Notice>
              )}

              {error && (
                <ErrorBox
                  message={error.message}
                  upgrade={error.required_plan && ['FEATURE_LOCKED', 'AI_DAILY_LIMIT'].includes(error.code ?? '')
                    ? { href: '/seller/subscription', label: t('upgradeCta', { plan: error.required_plan.name }) } : undefined}
                  onRetry={['AI_RATE_LIMITED', 'AI_UNAVAILABLE', 'AI_BAD_OUTPUT'].includes(error.code ?? '') ? generate : undefined}
                  retryLabel={t('retry')}
                />
              )}

              {/* ── Results ── */}
              {current && currentEdit && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ height: 1, background: '#e5e7eb' }} />

                  {variants.length > 1 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {variants.map((v, i) => (
                        <button key={v.id} type="button" onClick={() => { setActive(i); setInserted(null); }}
                          style={{
                            padding: '5px 10px', borderRadius: 8, fontFamily: 'inherit', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                            border: `1px solid ${i === active ? 'rgba(219,20,46,0.35)' : '#e5e7eb'}`,
                            background: i === active ? 'rgba(219,20,46,0.08)' : '#fff',
                            color: i === active ? '#dc2626' : MUTED,
                          }}>
                          {t('variantTab', { n: i + 1 })} · {t(`langs.${v.language}`)} · {t(`hooks.${v.hook_style}`)}
                          {edits[v.id] && ' ✎'}
                        </button>
                      ))}
                    </div>
                  )}

                  {current.flags.length > 0 && (
                    <Notice tone="info" icon={<Info size={13} color={BLUE} />} title={t('reviewTitle')}>
                      {t('reviewBody')}
                    </Notice>
                  )}

                  <EditBlock
                    label={t('fullDescription')} value={currentEdit.description} rows={9}
                    onChange={v => setEdit({ description: v })}
                    onInsert={() => insert('description')} insertLabel={t('insert')}
                    footer={t('words', { count: currentEdit.description.trim().split(/\s+/).filter(Boolean).length })}
                  />
                  <EditBlock
                    label={t('shortDescription')} value={currentEdit.short} rows={2} max={160}
                    onChange={v => setEdit({ short: v })}
                    onInsert={() => insert('short')} insertLabel={t('insert')}
                    footer={`${currentEdit.short.length}/160`}
                  />

                  {current.seo_title !== undefined && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                      <CopyBlock icon={<Search size={11} />} label={t('seoTitle')} text={current.seo_title ?? ''} copyLabel={t('copy')} copiedLabel={t('copied')} />
                      <CopyBlock icon={<Hash size={11} />} label={t('tags')} text={(current.tags ?? []).join(', ')} copyLabel={t('copy')} copiedLabel={t('copied')}
                        chips={current.tags} />
                      <div style={{ gridColumn: '1 / -1' }}>
                        <CopyBlock icon={<Megaphone size={11} />} label={t('social')} text={current.social ?? ''} copyLabel={t('copy')} copiedLabel={t('copied')} />
                      </div>
                    </div>
                  )}

                  <button
                    type="button" onClick={() => insert('both')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '9px 0', borderRadius: 10, fontFamily: 'inherit',
                      border: '1.5px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.06)',
                      color: GREEN, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    <Check size={13} /> {t('insertBoth')}
                  </button>

                  {inserted && (
                    <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: GREEN, fontWeight: 600, margin: 0 }}>
                      <CheckCircle2 size={12} /> {t('insertedHint')}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pieces ─────────────────────────────────────────────────────────────────────

const label: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 7px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 12, color: '#111827',
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 9px', resize: 'vertical', outline: 'none',
};

const linkBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0, border: 'none', background: 'none',
  fontFamily: 'inherit', fontSize: 10, fontWeight: 700, color: RED, cursor: 'pointer',
};

function LockTag({ label: text }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 8, fontWeight: 800, color: RED,
      background: 'rgba(219,20,46,0.08)', border: '1px solid rgba(219,20,46,0.2)', padding: '1px 4px', borderRadius: 4,
    }}>
      <Lock size={7} /> {text}
    </span>
  );
}

function Chip({ active, locked = false, lockLabel, color = 'red', title, onClick, children }: {
  active: boolean; locked?: boolean; lockLabel?: string; color?: 'red' | 'blue'; title?: string;
  onClick: () => void; children: React.ReactNode;
}) {
  const on = color === 'red'
    ? { bg: 'rgba(219,20,46,0.1)', fg: '#dc2626', ring: 'rgba(219,20,46,0.35)' }
    : { bg: 'rgba(59,130,246,0.1)', fg: BLUE, ring: 'rgba(59,130,246,0.35)' };
  return (
    <button type="button" onClick={onClick} title={title} aria-pressed={active} aria-disabled={locked}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
        cursor: 'pointer', border: 'none', fontFamily: 'inherit',
        background: active ? on.bg : '#f1f5f9',
        color:      locked ? '#94a3b8' : active ? on.fg : '#64748b',
        outline:    active ? `1.5px solid ${on.ring}` : '1px solid transparent',
      }}>
      {children}
      {locked && lockLabel && <LockTag label={lockLabel} />}
    </button>
  );
}

function Notice({ tone, icon, title, children }: { tone: 'warn' | 'info'; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const c = tone === 'warn'
    ? { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', fg: '#92400e' }
    : { bg: 'rgba(59,130,246,0.05)', border: 'rgba(59,130,246,0.2)', fg: '#1e3a8a' };
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px' }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 11, fontWeight: 800, color: c.fg, margin: '0 0 2px' }}>{title}</p>
        <p style={{ fontSize: 11, color: c.fg, margin: 0, lineHeight: 1.5, opacity: 0.9 }}>{children}</p>
      </div>
    </div>
  );
}

function ErrorBox({ message, onRetry, retryLabel, upgrade }: {
  message: string; onRetry?: () => void; retryLabel: string; upgrade?: { href: string; label: string };
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px' }}>
      <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, marginTop: onRetry || upgrade ? 6 : 0 }}>
          {onRetry && (
            <button type="button" onClick={onRetry} style={{ ...linkBtn, color: '#b91c1c' }}><RefreshCw size={10} /> {retryLabel}</button>
          )}
          {upgrade && (
            <a href={upgrade.href} style={{ ...linkBtn, textDecoration: 'none' }}>{upgrade.label} <ArrowRight size={10} /></a>
          )}
        </div>
      </div>
    </div>
  );
}

function UpgradePrompt({ title, body, cta, onClose, closeLabel }: {
  title: string; body: string; cta: string; onClose: () => void; closeLabel: string;
}) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(219,20,46,0.06), rgba(219,20,46,0.02))',
      border: '1px solid rgba(219,20,46,0.25)', borderRadius: 12, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#111827', margin: 0 }}>
        <Crown size={13} color={RED} /> {title}
      </p>
      <p style={{ fontSize: 11, color: '#374151', margin: 0, lineHeight: 1.5 }}>{body}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
        <a href="/seller/subscription" style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
          background: 'linear-gradient(135deg,#db142e,#a00f22)', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none',
        }}>{cta} <ArrowRight size={11} /></a>
        <button type="button" onClick={onClose} style={{ ...linkBtn, color: MUTED }}>{closeLabel}</button>
      </div>
    </div>
  );
}

function EditBlock({ label: text, value, onChange, onInsert, insertLabel, rows, max, footer }: {
  label: string; value: string; onChange: (v: string) => void; onInsert: () => void; insertLabel: string;
  rows: number; max?: number; footer?: string;
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <p style={{ ...label, margin: 0 }}>{text}</p>
        <button type="button" onClick={onInsert} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: 'none',
          fontFamily: 'inherit', background: 'rgba(16,185,129,0.1)', color: GREEN, fontSize: 10, fontWeight: 700, cursor: 'pointer',
        }}>
          <ArrowRight size={10} /> {insertLabel}
        </button>
      </div>
      <textarea
        value={value} onChange={e => onChange(max ? e.target.value.slice(0, max) : e.target.value)} rows={rows} dir="auto"
        style={{ ...inputStyle, border: '1px dashed #e5e7eb', lineHeight: 1.55, padding: '6px 8px', color: '#374151' }}
      />
      {footer && <p style={{ fontSize: 9, color: MUTED, margin: '4px 0 0', textAlign: 'end' }}>{footer}</p>}
    </div>
  );
}

function CopyBlock({ icon, label: text, text: value, chips, copyLabel, copiedLabel }: {
  icon: React.ReactNode; label: string; text: string; chips?: string[]; copyLabel: string; copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <p style={{ ...label, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>{icon} {text}</p>
        <button type="button" onClick={copy} disabled={!value} style={{ ...linkBtn, color: copied ? GREEN : MUTED }}>
          {copied ? <><Check size={10} /> {copiedLabel}</> : <><Copy size={10} /> {copyLabel}</>}
        </button>
      </div>
      {chips?.length
        ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {chips.map(c => <span key={c} dir="auto" style={{ fontSize: 10, fontWeight: 600, color: '#374151', background: '#f1f5f9', padding: '2px 8px', borderRadius: 999 }}>{c}</span>)}
          </div>
        : <p dir="auto" style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.5 }}>{value || '—'}</p>}
    </div>
  );
}

function StoreVoice({ opts, onLocked, onSaved }: {
  opts: DescriptionOptions; onLocked: () => void; onSaved: (v: { voice: string; keywords: string[] }) => void;
}) {
  const t = useTranslations('seller.aiDescription');
  const [open,     setOpen]     = useState(false);
  const [voice,    setVoice]    = useState(opts.voice?.voice ?? '');
  const [keywords, setKeywords] = useState((opts.voice?.keywords ?? []).join(', '));
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState<string | null>(null);

  if (!opts.brand_voice) {
    return (
      <button type="button" onClick={onLocked} style={{ ...linkBtn, color: '#64748b', alignSelf: 'flex-start' }}>
        <Mic size={11} /> {t('voiceTitle')} <LockTag label="Black" />
      </button>
    );
  }

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await sellerAiApi.saveDescriptionVoice(voice, keywords);
      onSaved(res.data);
      setMsg(res.message);
    } catch (e: any) {
      setMsg(e?.message ?? t('failed'));
    } finally {
      setSaving(false);
    }
  };

  const active = !!(opts.voice?.voice || opts.voice?.keywords?.length);
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
        padding: '8px 11px', border: 'none', background: 'none', fontFamily: 'inherit', cursor: 'pointer',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#374151' }}>
          <Mic size={12} color={RED} /> {t('voiceTitle')}
          <span style={{ fontSize: 9, fontWeight: 700, color: active ? GREEN : MUTED }}>{active ? t('voiceOn') : t('voiceOff')}</span>
        </span>
        {open ? <ChevronUp size={11} color={MUTED} /> : <ChevronDown size={11} color={MUTED} />}
      </button>
      {open && (
        <div style={{ padding: '0 11px 11px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 10, color: MUTED, margin: 0, lineHeight: 1.45 }}>{t('voiceHint')}</p>
          <textarea value={voice} onChange={e => setVoice(e.target.value)} maxLength={600} rows={2} dir="auto"
            placeholder={t('voicePlaceholder')} style={inputStyle} />
          <input value={keywords} onChange={e => setKeywords(e.target.value)} maxLength={300} dir="auto"
            placeholder={t('voiceKeywordsPlaceholder')} style={inputStyle} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={save} disabled={saving} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: 'none',
              background: '#111827', color: '#fff', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
            }}>
              {saving ? <Loader2 size={11} style={{ animation: 'ai-spin 0.8s linear infinite' }} /> : <Check size={11} />} {t('voiceSave')}
            </button>
            {msg && <span style={{ fontSize: 10, color: MUTED }}>{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
