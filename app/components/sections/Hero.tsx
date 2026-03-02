'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import SellerApplicationModal from "../sections/SellerApplicationModal";
import { isAuthenticated } from '@/lib/auth'

const BADGES = ['Free Returns', 'Secure Payment', '100% Local Brands']

export default function Hero() {
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  const handleBecomeVendor = () => {
    if (!isAuthenticated()) {
      // Not logged in — send to login, then come back
      router.push('/auth/login?redirect=/?vendor=1')
      return
    }
    setShowModal(true)
  }

  return (
    <>
      <section className="w-full bg-zinc-950 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 min-h-[580px] grid grid-cols-1 lg:grid-cols-2 items-center gap-8 py-16 lg:py-0">

          {/* ── LEFT ── */}
          <div className="flex flex-col justify-center order-2 lg:order-1 py-8 lg:py-16">

            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-10 bg-red-600" />
              <span className="text-red-500 text-xs font-bold tracking-[0.2em] uppercase">
                Tunisia&apos;s Multi-Vendor Marketplace
              </span>
            </div>

            <h1 className="text-white font-black leading-[1.05] mb-6" style={{ fontFamily: "'Syne', sans-serif" }}>
              <span className="block text-5xl lg:text-6xl xl:text-7xl">Shop Local.</span>
              <span className="block text-5xl lg:text-6xl xl:text-7xl text-red-500">Shop Smart.</span>
              <span className="block text-5xl lg:text-6xl xl:text-7xl">Shop Tunisian.</span>
            </h1>

            <p className="text-zinc-400 text-base lg:text-lg leading-relaxed max-w-md mb-10">
              Discover thousands of products from verified local vendors —
              fashion, electronics, home goods, and more. All in one place,
              delivered to your door.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm px-8 py-4 tracking-wide uppercase transition-all duration-200"
              >
                Start Shopping
                <ArrowRight />
              </Link>
              <button
                onClick={handleBecomeVendor}
                className="inline-flex items-center gap-2 border border-zinc-700 hover:border-zinc-400 text-zinc-300 hover:text-white font-bold text-sm px-8 py-4 tracking-wide uppercase transition-all duration-200"
              >
                Become a Vendor
              </button>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {BADGES.map((badge) => (
                <div key={badge} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span className="text-zinc-400 text-xs tracking-wide">{badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className="relative order-1 lg:order-2 h-64 lg:h-full lg:min-h-[580px] flex items-center justify-center">
            <div className="absolute inset-0 lg:inset-y-0 lg:left-8 lg:right-0">
              <div className="w-full h-full bg-zinc-900" />
            </div>
            <div className="absolute top-0 left-8 w-1 h-full bg-red-600 hidden lg:block" />
            <div className="absolute bottom-8 left-4 lg:left-12 bg-white px-5 py-4 z-10 shadow-2xl hidden md:block">
              <p className="text-zinc-950 font-black text-2xl">12,000+</p>
              <p className="text-zinc-500 text-xs tracking-widest uppercase font-medium">Products Listed</p>
            </div>
            <div className="absolute top-8 right-4 lg:right-8 bg-red-600 px-5 py-4 z-10 hidden md:block">
              <p className="text-white font-black text-2xl">450+</p>
              <p className="text-red-200 text-xs tracking-widest uppercase font-medium">Local Vendors</p>
            </div>
            <div className="relative z-[1] w-full h-64 lg:h-full lg:min-h-[580px]">
              <Image
                src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&q=80"
                alt="Shop Tunisian products"
                fill
                className="object-cover object-center opacity-70"
                priority
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/20 to-transparent lg:block hidden" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent" />
            </div>
          </div>

        </div>
      </section>

      {showModal && <SellerApplicationModal onClose={() => setShowModal(false)} />}
    </>
  )
}

function ArrowRight() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}