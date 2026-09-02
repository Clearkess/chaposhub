import React from 'react'
import { usePage } from '../contexts/PageContext'

// Ported from the repeated `.receipt-page-header` back-button markup used at
// the top of every non-dashboard page in src/lib/app-html.ts.
export default function PageHeader({ title }: { title: string }) {
  const { goTo } = usePage()
  return (
    <div className="receipt-page-header">
      <button className="back-btn" onClick={() => goTo('dashboard')} aria-label="Go back">
        ←
      </button>
      <div className="page-title-sm">{title}</div>
    </div>
  )
}
