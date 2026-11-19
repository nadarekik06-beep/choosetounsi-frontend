'use client'

import { useEffect, useState } from 'react'
import {
  DEFAULT_DELIVERY_TIME_SETTINGS, estimateDelivery, secondsToBetterEstimate,
  type DeliveryEstimate, type DeliveryTimeSettings,
} from '@/lib/deliveryEstimate'
import { loadDeliveryTimeSettings } from '@/lib/deliveryTimeApi'
import { getUser } from '@/lib/auth'
import { addressApi } from '@/lib/profileApi'

export interface LiveEstimate {
  estimate: DeliveryEstimate
  /** Whole minutes left to order before the cutoff for an earlier date, null when it would change nothing */
  minutesToCutoff: number | null
}

/**
 * The delivery estimate for a product, computed on the client AFTER mount (it depends on the clock):
 * the server and the first client render both output nothing, so there is no hydration mismatch.
 * Refreshes every 30 s; state only changes when a displayed value changes, so only the component
 * using the hook re-renders.
 */
export function useDeliveryEstimate(preparationDays: number | null | undefined): LiveEstimate | null {
  const [settings, setSettings] = useState<DeliveryTimeSettings>(DEFAULT_DELIVERY_TIME_SETTINGS)
  const [live, setLive] = useState<LiveEstimate | null>(null)

  useEffect(() => {
    let alive = true
    loadDeliveryTimeSettings().then(s => { if (alive) setSettings(s) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const compute = () => {
      const now = new Date()
      const estimate = estimateDelivery(now, preparationDays, settings)
      const secs = secondsToBetterEstimate(now, preparationDays, settings)
      const minutesToCutoff = secs === null ? null : Math.max(1, Math.ceil(secs / 60))
      setLive(prev =>
        prev && prev.minutesToCutoff === minutesToCutoff
          && prev.estimate.deliveryMin === estimate.deliveryMin && prev.estimate.deliveryMax === estimate.deliveryMax
          && prev.estimate.businessDaysMin === estimate.businessDaysMin && prev.estimate.businessDaysMax === estimate.businessDaysMax
          ? prev
          : { estimate, minutesToCutoff })
    }
    compute()
    const id = setInterval(compute, 30_000)
    return () => clearInterval(id)
  }, [preparationDays, settings])

  return live
}

let cityCache: { userId: number; promise: Promise<string | null> } | null = null

/**
 * The delivery city, ONLY from the logged-in customer's own saved address (default one, else the first).
 * Guests, sellers and failures → null: no city is ever shown.
 */
export function useSavedCity(): string | null {
  const [city, setCity] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    const user = getUser()
    if (!user || user.role !== 'client') return
    if (cityCache?.userId !== user.id) {
      cityCache = {
        userId: user.id,
        promise: addressApi.list()
          .then(list => {
            const a = list.find(x => x.is_default) ?? list[0]
            return a?.wilaya?.trim() || null
          })
          .catch(() => null),
      }
    }
    cityCache.promise.then(c => { if (alive) setCity(c) })
    return () => { alive = false }
  }, [])
  return city
}
