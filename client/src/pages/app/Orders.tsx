import React from 'react'
import PageHeader from '../../components/PageHeader'
import { usePage } from '../../contexts/PageContext'

// Ported from `#page-orders` in src/lib/app-html.ts (static empty state).
export default function Orders() {
  const { goTo } = usePage()
  return (
    <div className="page active" role="main" aria-label="Orders">
      <PageHeader title="Chapo'sHub Orders" icon="fa-solid fa-bag-shopping" />
      <div className="empty-state">
        <div className="empty-state-icon"><i className="fa-solid fa-box"></i></div>
        <div className="empty-state-title">No orders yet</div>
        <div className="empty-state-desc">Start generating receipts to see your orders here.</div>
        <button className="action-btn primary" style={{ marginTop: '1.5rem' }} onClick={() => goTo('receipts')}>
          Generate Receipt
        </button>
      </div>
    </div>
  )
}
