'use client'

// One page-entry overlay at a time (review prompt, sponsored entry popup, …).
//
//   acquireOverlay('ad_popup')          → false if another overlay is showing
//   acquireOverlay('review', true)      → takes over (the other one closes itself)
//   releaseOverlay(id) when it closes;  useOverlayOwner() to react to changes

import { useSyncExternalStore } from 'react'

let owner: string | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(l => l())
}

export function acquireOverlay(id: string, force = false): boolean {
  if (owner && owner !== id && !force) return false
  if (owner !== id) {
    owner = id
    emit()
  }
  return true
}

export function releaseOverlay(id: string) {
  if (owner === id) {
    owner = null
    emit()
  }
}

export function useOverlayOwner(): string | null {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => owner,
    () => null,
  )
}
