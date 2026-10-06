'use client';
/**
 * app/seller/black/listing-quality/page.tsx
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/app/hooks/useSubscription';
import { useTheme } from '../../SellerShell';
import { useTranslations } from 'next-intl';
import ProductQualityAudit from '@/app/components/seller/black/ProductQualityAudit';
import BrandLoader from '@/components/brand/BrandLoader'
import { usePageLoading } from '@/components/brand/NavigationLoader'

export default function ListingQualityPage() {
  const { dark } = useTheme();
  const { isBlack, loading } = useSubscription();
  // holds the navigation loader until the plan is known
  usePageLoading(loading);
  const router = useRouter();
  const t = useTranslations('seller.black.pages');
  useEffect(() => { if (!loading && !isBlack) router.replace('/seller/subscription'); }, [isBlack, loading, router]);
  if (loading || !isBlack) return <BrandLoader variant="section" size="lg" minHeight="60vh" theme={dark ? 'dark' : 'light'} />;

  const txtMain = dark ? '#fff' : '#111';
  const txtMut  = dark ? 'rgba(255,255,255,0.55)' : '#5b6472';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: txtMain, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          {t('quality.title')}
        </h1>
        <p style={{ fontSize: 13, color: txtMut, margin: 0 }}>
          {t('quality.subtitle')}
        </p>
      </div>
      <ProductQualityAudit dark={dark} />
    </div>
  );
}