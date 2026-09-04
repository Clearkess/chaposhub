import React, { useCallback, useEffect, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import JoinVendorModal from '../../components/JoinVendorModal'
import { api, APIError } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

// Replaces the old Whop card-checkout package grid with a peer-to-peer (P2P)
// points marketplace: vendors list points for sale at a self-set NGN-per-point
// rate, buyers place an order and pay the vendor off-platform (WhatsApp / bank
// transfer), and points transfer atomically once the vendor confirms receipt.
// UI patterns (tabs, chips, form-overlay, empty-state) are reused 1:1 from
// Marketplace.tsx to stay SlipCraft-styled and consistent with the rest of the app.

interface Listing {
  id: string
  vendorId: string
  vendorUsername?: string
  rateNgnPerPoint: number
  minPoints: number
  maxPoints: number
  status: string
  isOwner?: boolean
  createdAt: string
  [key: string]: any
}

interface Order {
  id: string
  listingId: string
  vendorId: string
  vendorUsername?: string
  buyerId: string
  buyerUsername?: string
  pointsAmount: number
  rateNgnPerPoint: number
  totalNgn: number
  status: string
  createdAt: string
  [key: string]: any
}

type Tab = 'buy' | 'sell' | 'orders'
type OrdersView = 'buying' | 'selling'

const NGN = (n: number) => `\u20a6${Number(n).toLocaleString()}`

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusIcon(s: string) {
  switch (s) {
    case 'active':
    case 'completed':
      return 'fa-solid fa-circle-check'
    case 'paused':
      return 'fa-solid fa-circle-pause'
    case 'pending_payment':
      return 'fa-solid fa-hourglass-half'
    case 'awaiting_confirmation':
      return 'fa-solid fa-clock'
    case 'cancelled':
      return 'fa-solid fa-circle-xmark'
    default:
      return 'fa-solid fa-circle'
  }
}

export default function Points() {
  const { user, logout, refreshUser } = useAuth()
  const { showToast } = useToast()
  const points = user?.points ?? 0
  const isVendor = !!user?.isVendor

  const [tab, setTab] = useState<Tab>('buy')
  const [vendorModalOpen, setVendorModalOpen] = useState(false)

  // Buy tab
  const [browseListings, setBrowseListings] = useState<Listing[] | null>(null)
  const [browseError, setBrowseError] = useState(false)

  // Sell tab
  const [myListings, setMyListings] = useState<Listing[] | null>(null)
  const [myListingsError, setMyListingsError] = useState(false)

  // Orders tab
  const [ordersView, setOrdersView] = useState<OrdersView>('buying')
  const [buyingOrders, setBuyingOrders] = useState<Order[] | null>(null)
  const [sellingOrders, setSellingOrders] = useState<Order[] | null>(null)
  const [ordersError, setOrdersError] = useState(false)

  // Order-placement modal (Buy tab)
  const [orderListing, setOrderListing] = useState<Listing | null>(null)
  const [orderPoints, setOrderPoints] = useState('')
  const [orderError, setOrderError] = useState('')
  const [orderSubmitting, setOrderSubmitting] = useState(false)

  // Create-listing modal (Sell tab)
  const [listingFormOpen, setListingFormOpen] = useState(false)
  const [fieldRate, setFieldRate] = useState('')
  const [fieldMin, setFieldMin] = useState('50')
  const [fieldMax, setFieldMax] = useState('')
  const [listingFormError, setListingFormError] = useState('')
  const [listingSubmitting, setListingSubmitting] = useState(false)

  function handleAuthFailure(err: unknown) {
    if (err instanceof APIError && err.status === 401) logout()
  }

  const loadBrowse = useCallback(async () => {
    setBrowseListings(null)
    setBrowseError(false)
    try {
      const listings = await api.getP2pListings()
      setBrowseListings(listings)
    } catch (err) {
      setBrowseError(true)
      handleAuthFailure(err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMyListings = useCallback(async () => {
    setMyListings(null)
    setMyListingsError(false)
    try {
      const listings = await api.getMyP2pListings()
      setMyListings(listings)
    } catch (err) {
      setMyListingsError(true)
      handleAuthFailure(err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadOrders = useCallback(async () => {
    setOrdersError(false)
    try {
      const [buying, selling] = await Promise.all([api.getP2pOrdersBuying(), api.getP2pOrdersSelling()])
      setBuyingOrders(buying)
      setSellingOrders(selling)
    } catch (err) {
      setOrdersError(true)
      handleAuthFailure(err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (tab === 'buy') loadBrowse()
    else if (tab === 'sell') loadMyListings()
    else if (tab === 'orders') loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  function switchTab(t: Tab) {
    setTab(t)
  }

  function openOrderModal(l: Listing) {
    setOrderListing(l)
    setOrderPoints(String(l.minPoints))
    setOrderError('')
  }

  function closeOrderModal() {
    setOrderListing(null)
  }

  async function submitOrder() {
    if (!orderListing) return
    setOrderError('')
    const amount = parseInt(orderPoints, 10)
    if (!Number.isInteger(amount) || amount < orderListing.minPoints || amount > orderListing.maxPoints) {
      setOrderError(`Enter an amount between ${orderListing.minPoints} and ${orderListing.maxPoints} points`)
      return
    }
    setOrderSubmitting(true)
    try {
      await api.createP2pOrder(orderListing.id, amount)
      showToast('Order placed — coordinate payment with the vendor')
      closeOrderModal()
      setTab('orders')
      setOrdersView('buying')
      loadOrders()
    } catch (err: any) {
      setOrderError(err.details || err.message || 'Failed to place order')
    } finally {
      setOrderSubmitting(false)
    }
  }

  function openListingForm() {
    setFieldRate('')
    setFieldMin('50')
    setFieldMax('')
    setListingFormError('')
    setListingFormOpen(true)
  }

  function closeListingForm() {
    setListingFormOpen(false)
  }

  async function submitListingForm() {
    setListingFormError('')
    const rate = parseFloat(fieldRate)
    const minPoints = parseInt(fieldMin, 10)
    const maxPoints = parseInt(fieldMax, 10)
    if (!Number.isFinite(rate) || rate <= 0) {
      setListingFormError('Enter a valid NGN-per-point rate')
      return
    }
    setListingSubmitting(true)
    try {
      await api.createP2pListing({ rateNgnPerPoint: rate, minPoints, maxPoints })
      showToast('Listing created ✓')
      closeListingForm()
      loadMyListings()
    } catch (err: any) {
      setListingFormError(err.details || err.message || 'Failed to create listing')
    } finally {
      setListingSubmitting(false)
    }
  }

  async function toggleListingStatus(l: Listing) {
    const next = l.status === 'active' ? 'paused' : 'active'
    try {
      await api.updateP2pListing(l.id, { status: next })
      showToast(next === 'active' ? 'Listing resumed' : 'Listing paused')
      loadMyListings()
    } catch (err: any) {
      showToast(err.message || 'Failed to update listing', 'error')
    }
  }

  async function removeListing(l: Listing) {
    if (!window.confirm('Remove this listing?')) return
    try {
      await api.updateP2pListing(l.id, { status: 'removed' })
      showToast('Listing removed')
      loadMyListings()
    } catch (err: any) {
      showToast(err.message || 'Failed to remove listing', 'error')
    }
  }

  async function markPaid(o: Order) {
    try {
      await api.markP2pOrderPaid(o.id)
      showToast("Marked as paid — waiting for vendor's confirmation")
      loadOrders()
    } catch (err: any) {
      showToast(err.message || 'Failed to update order', 'error')
    }
  }

  async function confirmOrder(o: Order) {
    if (!window.confirm(`Confirm you received ${NGN(o.totalNgn)} for ${o.pointsAmount} points?`)) return
    try {
      await api.confirmP2pOrder(o.id)
      showToast('Payment confirmed — points transferred ✓')
      loadOrders()
      refreshUser()
    } catch (err: any) {
      showToast(err.message || 'Failed to confirm order', 'error')
    }
  }

  async function cancelOrder(o: Order) {
    if (!window.confirm('Cancel this order?')) return
    try {
      await api.cancelP2pOrder(o.id)
      showToast('Order cancelled')
      loadOrders()
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel order', 'error')
    }
  }

  function OrderCard({ o, side }: { o: Order; side: OrdersView }) {
    const counterparty = side === 'buying' ? o.vendorUsername : o.buyerUsername
    return (
      <div className="mkt-listing-card" style={{ gridColumn: '1 / -1', cursor: 'default' }}>
        <div className="mkt-listing-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.6rem' }}>
            <div>
              <div className="mkt-listing-title">{o.pointsAmount.toLocaleString()} pts</div>
              <div className="mkt-listing-meta">
                {side === 'buying' ? 'from' : 'to'} {counterparty || 'user'} · {NGN(o.totalNgn)} @ {NGN(o.rateNgnPerPoint)}/pt
              </div>
            </div>
            <span
              className="p2p-status-pill"
              data-status={o.status}
            >
              <i className={statusIcon(o.status)}></i> {statusLabel(o.status)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.7rem' }}>
            {side === 'buying' && o.status === 'pending_payment' && (
              <button className="action-btn primary" style={{ flex: 1 }} onClick={() => markPaid(o)}>
                <i className="fa-solid fa-check"></i> Mark as Paid
              </button>
            )}
            {side === 'selling' && (o.status === 'awaiting_confirmation' || o.status === 'pending_payment') && (
              <button className="action-btn success" style={{ flex: 1 }} onClick={() => confirmOrder(o)}>
                <i className="fa-solid fa-check-double"></i> Confirm Payment
              </button>
            )}
            {(o.status === 'pending_payment' || o.status === 'awaiting_confirmation') && (
              <button className="action-btn secondary" style={{ flex: 1 }} onClick={() => cancelOrder(o)}>
                <i className="fa-solid fa-xmark"></i> Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const activeOrders = ordersView === 'buying' ? buyingOrders : sellingOrders

  return (
    <div className="page active" role="main" aria-label="Points Store">
      <PageHeader title="Chapo'sHub Points" />
      <div className="points-card">
        <div className="points-amount">{points}</div>
        <div className="points-label">Available Points</div>
      </div>

      <div className="mkt-tabs" role="tablist" aria-label="Points marketplace sections">
        <button className={`mkt-tab ${tab === 'buy' ? 'active' : ''}`} onClick={() => switchTab('buy')} role="tab" aria-selected={tab === 'buy'}>
          <i className="fa-solid fa-cart-shopping"></i> Buy
        </button>
        <button className={`mkt-tab ${tab === 'sell' ? 'active' : ''}`} onClick={() => switchTab('sell')} role="tab" aria-selected={tab === 'sell'}>
          <i className="fa-solid fa-store"></i> Sell
        </button>
        <button className={`mkt-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => switchTab('orders')} role="tab" aria-selected={tab === 'orders'}>
          <i className="fa-solid fa-receipt"></i> Orders
        </button>
      </div>

      {/* ===== BUY TAB ===== */}
      <div className={`mkt-tab-panel ${tab === 'buy' ? 'active' : ''}`}>
        <div className="mkt-listing-grid">
          {browseListings === null && !browseError && (
            <div className="ow-skeleton" style={{ height: 100, margin: '0 1rem', gridColumn: '1 / -1' }}></div>
          )}
          {browseError && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-title">Couldn't load vendor listings</div>
            </div>
          )}
          {!browseError && browseListings && browseListings.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon"><i className="fa-solid fa-store-slash"></i></div>
              <div className="empty-state-title">No vendors selling right now</div>
              <div className="empty-state-desc">Check back soon, or become a vendor yourself.</div>
            </div>
          )}
          {!browseError &&
            browseListings &&
            browseListings.map((l) => (
              <div key={l.id} className="mkt-listing-card" style={{ gridColumn: '1 / -1', cursor: 'pointer' }} onClick={() => openOrderModal(l)}>
                <div className="mkt-listing-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="mkt-listing-title">{NGN(l.rateNgnPerPoint)} / point</div>
                      <div className="mkt-listing-meta">
                        by {l.vendorUsername || 'vendor'} · {l.minPoints.toLocaleString()}–{l.maxPoints.toLocaleString()} pts
                      </div>
                    </div>
                    <i className="fa-solid fa-chevron-right" style={{ color: 'var(--text-dim)' }}></i>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ===== SELL TAB ===== */}
      <div className={`mkt-tab-panel ${tab === 'sell' ? 'active' : ''}`}>
        {!isVendor ? (
          <div className="empty-state">
            <div className="empty-state-icon"><i className="fa-solid fa-store"></i></div>
            <div className="empty-state-title">Become a vendor to sell points</div>
            <div className="empty-state-desc">List your points for sale at your own NGN-per-point rate.</div>
            <button className="action-btn primary" style={{ marginTop: '1rem' }} onClick={() => setVendorModalOpen(true)}>
              <i className="fa-solid fa-store"></i> Join Vendor
            </button>
          </div>
        ) : (
          <>
            <div style={{ padding: '1rem' }}>
              <button className="action-btn primary" style={{ width: '100%' }} onClick={openListingForm}>
                <i className="fa-solid fa-plus"></i> Create Sell Listing
              </button>
            </div>
            <div className="mkt-listing-grid">
              {myListings === null && !myListingsError && (
                <div className="ow-skeleton" style={{ height: 100, margin: '0 1rem', gridColumn: '1 / -1' }}></div>
              )}
              {myListingsError && (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <div className="empty-state-title">Couldn't load your listings</div>
                </div>
              )}
              {!myListingsError && myListings && myListings.length === 0 && (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <div className="empty-state-icon"><i className="fa-solid fa-tags"></i></div>
                  <div className="empty-state-title">No listings yet</div>
                  <div className="empty-state-desc">Create your first sell listing above.</div>
                </div>
              )}
              {!myListingsError &&
                myListings &&
                myListings.map((l) => (
                  <div key={l.id} className="mkt-listing-card" style={{ gridColumn: '1 / -1', cursor: 'default' }}>
                    <div className="mkt-listing-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div className="mkt-listing-title">{NGN(l.rateNgnPerPoint)} / point</div>
                          <div className="mkt-listing-meta">
                            {l.minPoints.toLocaleString()}–{l.maxPoints.toLocaleString()} pts
                          </div>
                        </div>
                        <span className="p2p-status-pill" data-status={l.status}>
                          <i className={statusIcon(l.status)}></i> {statusLabel(l.status)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '.5rem', marginTop: '.7rem' }}>
                        <button className="action-btn secondary" style={{ flex: 1 }} onClick={() => toggleListingStatus(l)}>
                          {l.status === 'active' ? (
                            <><i className="fa-solid fa-pause"></i> Pause</>
                          ) : (
                            <><i className="fa-solid fa-play"></i> Resume</>
                          )}
                        </button>
                        <button className="action-btn secondary" style={{ flex: 1, color: 'var(--danger)' }} onClick={() => removeListing(l)}>
                          <i className="fa-solid fa-trash"></i> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      {/* ===== ORDERS TAB ===== */}
      <div className={`mkt-tab-panel ${tab === 'orders' ? 'active' : ''}`}>
        <div className="ai-tool-scroll" role="tablist" aria-label="Order views">
          <div className={`ai-tool-chip ${ordersView === 'buying' ? 'active' : ''}`} onClick={() => setOrdersView('buying')} role="tab" aria-selected={ordersView === 'buying'}>
            Buying
          </div>
          <div className={`ai-tool-chip ${ordersView === 'selling' ? 'active' : ''}`} onClick={() => setOrdersView('selling')} role="tab" aria-selected={ordersView === 'selling'}>
            Selling
          </div>
        </div>
        <div className="mkt-listing-grid">
          {activeOrders === null && !ordersError && (
            <div className="ow-skeleton" style={{ height: 100, margin: '0 1rem', gridColumn: '1 / -1' }}></div>
          )}
          {ordersError && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-title">Couldn't load orders</div>
            </div>
          )}
          {!ordersError && activeOrders && activeOrders.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon"><i className="fa-solid fa-receipt"></i></div>
              <div className="empty-state-title">No {ordersView} orders yet</div>
            </div>
          )}
          {!ordersError && activeOrders && activeOrders.map((o) => <OrderCard key={o.id} o={o} side={ordersView} />)}
        </div>
      </div>

      {/* ===== ORDER PLACEMENT MODAL (Buy) ===== */}
      <div className={`mkt-form-overlay ${orderListing ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeOrderModal() }}>
        <div className="mkt-form-sheet">
          {orderListing && (
            <>
              <div className="mkt-form-header">
                <span>Buy Points</span>
                <button className="mkt-form-close" onClick={closeOrderModal} aria-label="Close">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                From {orderListing.vendorUsername || 'vendor'} at {NGN(orderListing.rateNgnPerPoint)}/point. You'll
                coordinate payment directly with the vendor off-platform (WhatsApp / bank transfer).
              </p>
              <div className="form-field">
                <label>Points to buy ({orderListing.minPoints.toLocaleString()}–{orderListing.maxPoints.toLocaleString()})</label>
                <input
                  type="number"
                  min={orderListing.minPoints}
                  max={orderListing.maxPoints}
                  value={orderPoints}
                  onChange={(e) => setOrderPoints(e.target.value)}
                />
              </div>
              {Number.isFinite(parseInt(orderPoints, 10)) && (
                <div style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '.8rem' }}>
                  Total: {NGN((parseInt(orderPoints, 10) || 0) * orderListing.rateNgnPerPoint)}
                </div>
              )}
              {orderError && <div className="auth-error show" style={{ marginBottom: '.8rem' }}>{orderError}</div>}
              <button className="action-btn primary" style={{ width: '100%' }} disabled={orderSubmitting} onClick={submitOrder}>
                {orderSubmitting ? <span className="spinner"></span> : 'Place Order'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ===== CREATE LISTING MODAL (Sell) ===== */}
      <div className={`mkt-form-overlay ${listingFormOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeListingForm() }}>
        <div className="mkt-form-sheet">
          <div className="mkt-form-header">
            <span>Create Sell Listing</span>
            <button className="mkt-form-close" onClick={closeListingForm} aria-label="Close">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="form-field">
            <label>Rate (NGN per point)</label>
            <input type="number" min={1} max={5000} step="0.01" placeholder="e.g. 5" value={fieldRate} onChange={(e) => setFieldRate(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Minimum points per order</label>
            <input type="number" min={50} value={fieldMin} onChange={(e) => setFieldMin(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Maximum points per order</label>
            <input type="number" min={50} placeholder={`up to your balance (${points})`} value={fieldMax} onChange={(e) => setFieldMax(e.target.value)} />
          </div>
          {listingFormError && <div className="auth-error show" style={{ marginBottom: '.8rem' }}>{listingFormError}</div>}
          <button className="action-btn primary" style={{ width: '100%' }} disabled={listingSubmitting} onClick={submitListingForm}>
            {listingSubmitting ? <span className="spinner"></span> : 'Create Listing'}
          </button>
        </div>
      </div>

      <JoinVendorModal open={vendorModalOpen} onClose={() => setVendorModalOpen(false)} onSuccess={() => setTab('sell')} />
    </div>
  )
}
