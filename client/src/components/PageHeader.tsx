import React from 'react'
import { usePage } from '../contexts/PageContext'

// Ported from the repeated `.receipt-page-header` back-button markup used at
// the top of every non-dashboard page in src/lib/app-html.ts.
// `icon` is an optional FontAwesome class string (e.g. "fa-solid fa-receipt")
// rendered before the title, replacing the old inline emoji-in-title pattern.
export default function PageHeader({ title, icon }: { title: string; icon?: string }) {
  const { goTo } = usePage()
  return (
    <div className="receipt-page-header">
      <button className="back-btn" onClick={() => goTo('dashboard')} aria-label="Go back">
        <i className="fa-solid fa-arrow-left"></i>
      </button>
      <div className="page-title-sm">
        {icon && <i className={icon} style={{ marginRight: '.5rem' }}></i>}
        {title}
      </div>
    </div>
  )
}
