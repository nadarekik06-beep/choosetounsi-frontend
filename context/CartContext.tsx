'use client'

/**
 * context/CartContext.tsx
 * Global cart state. Wrap your layout with <CartProvider>.
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
  addToCart: (productId: number, qty?: number) => Promise<void>
  updateItem: (cartItemId: number, qty: number) => Promise<void>
  removeItem: (cartItemId: number) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>

  // Favorites
  favorites: FavoriteItem[]
  isFavorited: (productId: number) => boolean
  toggleFavorite: (productId: number) => Promise<void>
  favLoading: boolean

  // Flash message
  flash: string | null
  clearFlash: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items,       setItems]       = useState<CartItem[]>([])
  const [count,       setCount]       = useState(0)
  const [subtotal,    setSubtotal]    = useState(0)
  const [cartLoading, setCartLoading] = useState(false)

  const [favorites,   setFavorites]   = useState<FavoriteItem[]>([])
  const [favLoading,  setFavLoading]  = useState(false)

  const [flash, setFlash] = useState<string | null>(null)

  const showFlash = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 3000)
  }

  /* ── Load cart & favorites on mount (if authenticated) ── */
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

  /* ── Cart actions ── */

  const addToCart = async (productId: number, qty = 1) => {
    setCartLoading(true)
    try {
      await cartApi.add(productId, qty)
      await refreshCart()
      showFlash('Added to cart! 🛒')
    } catch (err: any) {
      showFlash(err.message ?? 'Failed to add to cart.')
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

  /* ── Favorites actions ── */

  const isFavorited = (productId: number) =>
    favorites.some(f => f.product_id === productId)

  const toggleFavorite = async (productId: number) => {
    if (!isAuthenticated()) {
      showFlash('Please log in to save favorites.')
      return
    }
    setFavLoading(true)
    try {
      if (isFavorited(productId)) {
        await favoritesApi.remove(productId)
        setFavorites(prev => prev.filter(f => f.product_id !== productId))
      } else {
        const res = await favoritesApi.add(productId)
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