'use client'

import {
  createContext, useContext, useEffect, useState,
  useCallback, useRef, ReactNode
} from 'react'
import { cartApi, favoritesApi, type CartItem, type FavoriteItem } from '@/lib/shopApi'
import { isAuthenticated } from '@/lib/auth'

interface CartContextValue {
  items: CartItem[]
  count: number
  subtotal: number
  cartLoading: boolean
  // loadingItemId: which specific cart item is being updated right now
  loadingItemId: number | null
  addToCart: (productId: number, qty?: number, variantId?: number | null) => Promise<void>
  updateItem: (cartItemId: number, qty: number) => Promise<void>
  removeItem: (cartItemId: number) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
  favorites: FavoriteItem[]
  isFavorited: (productId: number, variantId?: number | null) => boolean
  toggleFavorite: (productId: number, variantId?: number | null) => Promise<void>
  favLoading: boolean
  flash: string | null
  clearFlash: () => void
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items,         setItems]         = useState<CartItem[]>([])
  const [count,         setCount]         = useState(0)
  const [subtotal,      setSubtotal]      = useState(0)
  const [cartLoading,   setCartLoading]   = useState(false)
  const [loadingItemId, setLoadingItemId] = useState<number | null>(null)
  const [favorites,     setFavorites]     = useState<FavoriteItem[]>([])
  const [favLoading,    setFavLoading]    = useState(false)
  const [flash,         setFlash]         = useState<string | null>(null)
  const [drawerOpen,    setDrawerOpen]    = useState(false)

  // ── Per-item request lock — prevents duplicate concurrent requests ─────────
  // Key: `product-{productId}-{variantId}` for add, `item-{cartItemId}` for update
  const pendingRef = useRef<Set<string>>(new Set())

  const isLocked  = (key: string) => pendingRef.current.has(key)
  const lock      = (key: string) => pendingRef.current.add(key)
  const unlock    = (key: string) => pendingRef.current.delete(key)

  const openDrawer  = useCallback(() => setDrawerOpen(true),  [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const showFlash = useCallback((msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 3500)
  }, [])

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated()) return
    setCartLoading(true)
    try {
      const res = await cartApi.get()
      setItems(res.data.items)
      setCount(res.data.count)
      setSubtotal(res.data.subtotal)
    } catch {
      // silent
    } finally {
      setCartLoading(false)
    }
  }, [])

  const refreshFavorites = useCallback(async () => {
    if (!isAuthenticated()) return
    try {
      const res = await favoritesApi.get()
      setFavorites(res.data)
    } catch {}
  }, [])

  useEffect(() => {
    refreshCart()
    refreshFavorites()
  }, [refreshCart, refreshFavorites])

  // ── addToCart — locked per (productId + variantId) ────────────────────────
  const addToCart = useCallback(async (
    productId: number,
    qty = 1,
    variantId?: number | null,
  ) => {
    const lockKey = `product-${productId}-${variantId ?? 'base'}`

    // Drop the request if one is already in flight for this exact item
    if (isLocked(lockKey)) return
    lock(lockKey)
    setCartLoading(true)

    try {
      await cartApi.add(productId, qty, variantId)
      await refreshCart()
      openDrawer()
    } catch (err: any) {
      showFlash(err.message ?? 'Failed to add to cart.')
    } finally {
      unlock(lockKey)
      setCartLoading(false)
    }
  }, [refreshCart, openDrawer, showFlash])

  // ── updateItem — locked per cartItemId ───────────────────────────────────
  const updateItem = useCallback(async (cartItemId: number, qty: number) => {
    const lockKey = `item-${cartItemId}`

    // Drop if already updating this item
    if (isLocked(lockKey)) return
    lock(lockKey)
    setLoadingItemId(cartItemId)

    try {
      await cartApi.update(cartItemId, qty)
      await refreshCart()
    } catch (err: any) {
      showFlash(err.message ?? 'Failed to update.')
      // Refresh to resync with server state in case of stock error
      await refreshCart()
    } finally {
      unlock(lockKey)
      setLoadingItemId(null)
    }
  }, [refreshCart, showFlash])

  // ── removeItem ────────────────────────────────────────────────────────────
  const removeItem = useCallback(async (cartItemId: number) => {
    const lockKey = `item-${cartItemId}`
    if (isLocked(lockKey)) return
    lock(lockKey)
    setLoadingItemId(cartItemId)
    try {
      await cartApi.remove(cartItemId)
      await refreshCart()
    } catch {
    } finally {
      unlock(lockKey)
      setLoadingItemId(null)
    }
  }, [refreshCart])

  const clearCart = useCallback(async () => {
    try {
      await cartApi.clear()
      setItems([])
      setCount(0)
      setSubtotal(0)
    } catch {}
  }, [])

  const isFavorited = useCallback((productId: number, variantId?: number | null): boolean => {
    if (variantId != null) {
      return favorites.some(f => f.product_id === productId && f.variant_id === variantId)
    }
    return favorites.some(f => f.product_id === productId)
  }, [favorites])

  const toggleFavorite = useCallback(async (productId: number, variantId?: number | null) => {
    if (!isAuthenticated()) { showFlash('Please log in to save favorites.'); return }
    setFavLoading(true)
    try {
      if (isFavorited(productId, variantId ?? undefined)) {
        await favoritesApi.remove(productId, variantId)
        setFavorites(prev => variantId != null
          ? prev.filter(f => !(f.product_id === productId && f.variant_id === variantId))
          : prev.filter(f => f.product_id !== productId)
        )
      } else {
        const res = await favoritesApi.add(productId, variantId)
        setFavorites(prev => [...prev, res.data])
        showFlash('Saved to favorites! ❤️')
      }
    } catch (err: any) {
      showFlash(err.message ?? 'Error updating favorites.')
    } finally {
      setFavLoading(false)
    }
  }, [isFavorited, showFlash])

  return (
    <CartContext.Provider value={{
      items, count, subtotal, cartLoading, loadingItemId,
      addToCart, updateItem, removeItem, clearCart, refreshCart,
      favorites, isFavorited, toggleFavorite, favLoading,
      flash, clearFlash: () => setFlash(null),
      drawerOpen, openDrawer, closeDrawer,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}