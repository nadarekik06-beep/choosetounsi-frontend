export const TABS = ['overview', 'orders', 'addresses', 'favorites', 'reviews', 'complaints', 'settings'] as const
export type TabKey = typeof TABS[number]
export const isTab = (v: string | null): v is TabKey => !!v && (TABS as readonly string[]).includes(v)
