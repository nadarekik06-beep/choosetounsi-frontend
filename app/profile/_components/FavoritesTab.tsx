'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Heart, Store, ChevronRight, Package } from 'lucide-react'
import { api } from '@/lib/auth'
import { useFormat } from '@/lib/i18n/useFormat'
import { profileApi, type FollowedSeller } from '@/lib/profileApi'
import { AvatarImage, EmptyState, Skeleton } from '@/components/profile/ui'

interface Fav { id: number; name: string; slug: string; image_url: string | null; price: number; final_price?: number }

export default function FavoritesTab() {
  const t   = useTranslations('profile.favoritesTab')
  const fmt = useFormat()
  const [favs, setFavs] = useState<Fav[] | null>(null)
  const [shops, setShops] = useState<FollowedSeller[] | null>(null)

  useEffect(() => {
    api.get<{ data: Fav[] }>('/favorites').then(r => setFavs(r.data.data)).catch(() => setFavs([]))
    profileApi.followedSellers().then(setShops).catch(() => setShops([]))
  }, [])

  return (
    <div className="pf-panel pf-grid">
      <section className="pf-card" aria-labelledby="pf-fav-title">
        <div className="pf-card-head">
          <div>
            <h2 id="pf-fav-title">{t('title')}</h2>
            {favs && favs.length > 0 && <p className="pf-card-sub">{t('count', { count: favs.length })}</p>}
          </div>
          {favs && favs.length > 0 && <Link href="/favorites" className="pf-link">{t('viewAll')}<ChevronRight size={14} className="pf-flip" /></Link>}
        </div>
        {!favs ? (
          <div className="pf-fav-grid">{[0, 1, 2, 3].map(i => <Skeleton key={i} h={190} r={14} />)}</div>
        ) : favs.length === 0 ? (
          <EmptyState icon={<Heart size={34} />} title={t('emptyTitle')} body={t('emptyBody')}
            action={<Link href="/" className="pf-btn primary">{t('cta')}</Link>} />
        ) : (
          <div className="pf-fav-grid">
            {favs.slice(0, 8).map(f => (
              <Link key={f.id} href={`/products/${f.slug}`} className="pf-fav">
                {f.image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={f.image_url} alt="" loading="lazy" />
                  : <span className="ph" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}><Package size={28} /></span>}
                <div>
                  <span style={{ color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dir="auto">{f.name}</span>
                  <span>{fmt.price(f.final_price ?? f.price)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="pf-card" aria-labelledby="pf-shops-title">
        <div className="pf-card-head">
          <div>
            <h2 id="pf-shops-title">{t('following')}</h2>
            {shops && shops.length > 0 && <p className="pf-card-sub">{t('followingCount', { count: shops.length })}</p>}
          </div>
        </div>
        {!shops ? (
          <div className="pf-shops">{[0, 1, 2, 3].map(i => <Skeleton key={i} w={96} h={90} r={14} />)}</div>
        ) : shops.length === 0 ? (
          <EmptyState icon={<Store size={34} />} title={t('followingEmpty')} body={t('followingEmptyBody')}
            action={<Link href="/shop" className="pf-btn light">{t('discoverShops')}</Link>} />
        ) : (
          <div className="pf-shops">
            {shops.map(s => (
              <Link key={s.id} href={`/sellers/${s.id}`} className="pf-shop">
                <span className="ph" style={{ overflow: 'hidden' }}><AvatarImage name={s.name} src={s.avatar} /></span>
                <span dir="auto">{s.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
