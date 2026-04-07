'use client'

/**
 * context/CartContext.tsx
 * Global cart state. Wrap your layout with <CartProvider>.
 * Updated to support product variants.
 */

import {
  createContext, useContext, useEffect, useState, useCallback, ReactNode
} from 'react'
import { cartApi, favoritesApi, type CartItem, type FavoriteItem } from '@/lib/shopApi'
import { isAuthenticated } from '@/lib/auth'

interface CartContextValue {
  // Cart
  items: CartItem[]
  count: number
  subtotal: number
  cartLoading: boolean
  addToCart: (productId: number, qty?: number, variantId?: number | null) => Promise<void>
  updateItem: (cartItemId: number, qty: number) => Promise<void>
  removeItem: (cartItemId: number) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>

  // Favorites
  favorites: FavoriteItem[]
  isFavorited: (productId: number, variantId?: number | null) => boolean
  toggleFavorite: (productId: number, variantId?: number | null) => Promise<void>
  favLoading: boolean

  // Flash message
  flash: string | null
  clearFlash: () => void

  // Drawer
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items,       setItems]       = useState<CartItem[]>([])
  const [count,       setCount]       = useState(0)
  const [subtotal,    setSubtotal]    = useState(0)
  const [cartLoading, setCartLoading] = useState(false)

  const [favorites,   setFavorites]   = useState<FavoriteItem[]>([])
  const [favLoading,  setFavLoading]  = useState(false)

  const [flash,       setFlash]       = useState<string | null>(null)

  const [drawerOpen,  setDrawerOpen]  = useState(false)

  const openDrawer  = useCallback(() => setDrawerOpen(true),  [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const showFlash = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 3000)
  }

  // ── Load cart & favorites on mount (if authenticated) ─────────────────────

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated()) return
    setCartLoading(true)
    try {
      const res = await cartApi.get()
      setItems(res.data.items)
      setCount(res.data.count)
      setSubtotal(res.data.subtotal)
    } catch {
      // silent — user might be logged out
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

  // ── Cart actions ───────────────────────────────────────────────────────────

  /**
   * Add a product to cart.
   * Pass variantId when the product uses the variants system.
   * The backend will reject if variants exist but no variantId is given.
   */
const addToCart = async (productId: number, qty = 1, variantId?: number | null) => {
  setCartLoading(true)
  try {
    await cartApi.add(productId, qty, variantId)
    await refreshCart()
    openDrawer()
  } catch (err: any) {
    // Own-product errors are shown as a flash only — no drawer, no noise.
    // All other errors also just flash, but we keep the distinction explicit
    // in case you want different behavior per code in the future.
    const isOwnProduct = (err as any)?.data?.code === 'OWN_PRODUCT'
    showFlash(err.message ?? 'Failed to add to cart.')
    if (!isOwnProduct) {
      // For non-ownership errors (e.g. out of stock), still open drawer
      // so the user sees their current cart state. Remove this if you
      // prefer the drawer to never open on errors.
    }
  } finally {
    setCartLoading(false)
  }
}

  const updateItem = async (cartItemId: number, qty: number) => {
    try {
      await cartApi.update(cartItemId, qty)
      await refreshCart()
    } catch (err: any) {
      showFlash(err.message ?? 'Failed to update.')
    }
  }

  const removeItem = async (cartItemId: number) => {
    try {
      await cartApi.remove(cartItemId)
      await refreshCart()
    } catch {}
  }

  const clearCart = async () => {
    try {
      await cartApi.clear()
      setItems([])
      setCount(0)
      setSubtotal(0)
    } catch {}
  }

  // ── Favorites actions ──────────────────────────────────────────────────────

  /**
   * Check if a product (or a specific variant) is in favorites.
   * When variantId is passed, matches both product AND variant.
   * When variantId is null/undefined, matches any favorite for this product.
   */
  const isFavorited = (productId: number, variantId?: number | null): boolean => {
    if (variantId != null) {
      return favorites.some(
        f => f.product_id === productId && f.variant_id === variantId
      )
    }
    return favorites.some(f => f.product_id === productId)
  }

  /**
   * Toggle favorite for a product or a specific variant.
   */
  const toggleFavorite = async (productId: number, variantId?: number | null) => {
    if (!isAuthenticated()) {
      showFlash('Please log in to save favorites.')
      return
    }
    setFavLoading(true)
    try {
      if (isFavorited(productId, variantId ?? undefined)) {
        await favoritesApi.remove(productId, variantId)
        setFavorites(prev => {
          if (variantId != null) {
            return prev.filter(
              f => !(f.product_id === productId && f.variant_id === variantId)
            )
          }
          return prev.filter(f => f.product_id !== productId)
        })
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
  }

  return (
    <CartContext.Provider value={{
      items, count, subtotal, cartLoading,
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