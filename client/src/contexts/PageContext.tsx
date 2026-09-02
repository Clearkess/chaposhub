import React, { createContext, useContext, useState } from 'react'

// Client-side page switcher for the authenticated dashboard app shell,
// mirroring the original showPage(pageId) behaviour from public/static/js/app.js
// (single-page app, no browser routing inside the dashboard).
export type PageId =
  | 'dashboard'
  | 'receipts'
  | 'opay'
  | 'marketplace'
  | 'ai'
  | 'points'
  | 'services'
  | 'history'
  | 'orders'
  | 'support'

interface PageContextValue {
  page: PageId
  goTo: (page: PageId) => void
  // Optional pre-selected platform key, consumed once by Receipts when
  // navigating from a service card (mirrors setPlatform() side-effect).
  pendingPlatform: string | null
  goToReceiptsWithPlatform: (platformKey: string) => void
  consumePendingPlatform: () => string | null
}

const PageContext = createContext<PageContextValue | undefined>(undefined)

export function PageProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<PageId>('dashboard')
  const [pendingPlatform, setPendingPlatform] = useState<string | null>(null)

  function goTo(next: PageId) {
    setPage(next)
    window.scrollTo(0, 0)
  }

  function goToReceiptsWithPlatform(platformKey: string) {
    setPendingPlatform(platformKey)
    goTo('receipts')
  }

  function consumePendingPlatform() {
    const p = pendingPlatform
    setPendingPlatform(null)
    return p
  }

  return (
    <PageContext.Provider value={{ page, goTo, pendingPlatform, goToReceiptsWithPlatform, consumePendingPlatform }}>
      {children}
    </PageContext.Provider>
  )
}

export function usePage(): PageContextValue {
  const ctx = useContext(PageContext)
  if (!ctx) throw new Error('usePage must be used within PageProvider')
  return ctx
}
