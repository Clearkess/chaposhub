import React, { useCallback, useEffect, useRef, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { api, APIError } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

// Ported from the `Marketplace` IIFE in public/static/js/app.js (lines
// 1049-1366) + the `#page-marketplace` markup in src/lib/app-html.ts
// (lines 489-542). Legit "Scripts Marketplace" for buying/selling website
// templates with points, including an admin review queue.

const CATEGORIES = ['business', 'portfolio', 'ecommerce', 'landing', 'saas', 'blog', 'other'] as const
type Category = typeof CATEGORIES[number]

function catLabel(c: string) {
  return c.charAt(0).toUpperCase() + c.slice(1)
}

interface Listing {
  id: string
  title: string
  description: string
  category: string
  pricePoints: number
  pricePaid?: number
  previewImageUrl?: string | null
  status?: string
  rejectionReason?: string | null
  sellerUsername?: string
  salesCount?: number
  purchased?: boolean
  hasFile?: boolean
  fileName?: string
  [key: string]: any
}

interface Purchase {
  id: string
  title: string
  sellerUsername: string
  pricePaid: number
  previewImageUrl?: string | null
}

type Tab = 'browse' | 'mylistings' | 'purchases' | 'admin'

export default function Marketplace() {
  const { user, logout, refreshUser } = useAuth()
  const { showToast } = useToast()
  const isAdmin = user?.role === 'admin'

  const [tab, setTab] = useState<Tab>('browse')

  // Browse tab state
  const [category, setCategory] = useState<'all' | Category>('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [browseListings, setBrowseListings] = useState<Listing[] | null>(null)
  const [browseError, setBrowseError] = useState(false)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // My listings tab state
  const [myListings, setMyListings] = useState<Listing[] | null>(null)
  const [myListingsError, setMyListingsError] = useState(false)

  // Purchases tab state
  const [purchases, setPurchases] = useState<Purchase[] | null>(null)
  const [purchasesError, setPurchasesError] = useState(false)

  // Admin tab state
  const [adminQueue, setAdminQueue] = useState<Listing[] | null>(null)
  const [adminError, setAdminError] = useState(false)

  // Create/Edit form overlay
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fieldTitle, setFieldTitle] = useState('')
  const [fieldDescription, setFieldDescription] = useState('')
  const [fieldCategory, setFieldCategory] = useState<Category>('business')
  const [fieldPrice, setFieldPrice] = useState('')
  const [fieldPreview, setFieldPreview] = useState('')
  const [fieldFile, setFieldFile] = useState<File | null>(null)
  const [fileStatus, setFileStatus] = useState('')
  const [formError, setFormError] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailListing, setDetailListing] = useState<Listing | null>(null)
  const [detailContext, setDetailContext] = useState<'browse' | 'mine'>('browse')
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(false)

  function handleAuthFailure(err: unknown) {
    if (err instanceof APIError && err.status === 401) {
      logout()
    }
  }

  const loadBrowse = useCallback(async () => {
    setBrowseListings(null)
    setBrowseError(false)
    try {
      const listings = await api.getMarketplaceListings({
        category: category === 'all' ? undefined : category,
        search: searchTerm || undefined
      })
      setBrowseListings(listings)
    } catch (err) {
      setBrowseError(true)
      handleAuthFailure(err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, searchTerm])

  const loadMyListings = useCallback(async () => {
    setMyListings(null)
    setMyListingsError(false)
    try {
      const listings = await api.getMyMarketplaceListings()
      setMyListings(listings)
    } catch (err) {
      setMyListingsError(true)
      handleAuthFailure(err)
    }
  }, [])

  const loadPurchases = useCallback(async () => {
    setPurchases(null)
    setPurchasesError(false)
    try {
      const p = await api.getMarketplacePurchases()
      setPurchases(p)
    } catch (err) {
      setPurchasesError(true)
      handleAuthFailure(err)
    }
  }, [])

  const loadAdminQueue = useCallback(async () => {
    setAdminQueue(null)
    setAdminError(false)
    try {
      const listings = await api.getMarketplaceAdminPending()
      setAdminQueue(listings)
    } catch (err) {
      setAdminError(true)
      handleAuthFailure(err)
    }
  }, [])

  // Load the active tab's data whenever the tab (or browse filters) change.
  useEffect(() => {
    if (tab === 'browse') loadBrowse()
    else if (tab === 'mylistings') loadMyListings()
    else if (tab === 'purchases') loadPurchases()
    else if (tab === 'admin') loadAdminQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, category, searchTerm])

  function switchTab(t: Tab) {
    setTab(t)
  }

  function onSearchInput(v: string) {
    setSearchInput(v)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => setSearchTerm(v.trim()), 300)
  }

  async function download(purchaseId: string, ev: React.MouseEvent) {
    ev.stopPropagation()
    try {
      const { blob, filename } = await api.downloadMarketplaceFile(purchaseId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (err: any) {
      showToast(err.message || 'Download failed', 'error')
    }
  }

  async function approve(id: string) {
    try {
      await api.approveMarketplaceListing(id)
      showToast('Listing approved ✓')
      loadAdminQueue()
    } catch (err: any) {
      showToast(err.message || 'Failed to approve', 'error')
    }
  }

  async function reject(id: string) {
    const reason = window.prompt('Rejection reason (shown to the seller):')
    if (!reason || !reason.trim()) return
    try {
      await api.rejectMarketplaceListing(id, reason.trim())
      showToast('Listing rejected')
      loadAdminQueue()
    } catch (err: any) {
      showToast(err.message || 'Failed to reject', 'error')
    }
  }

  function openCreateForm() {
    setEditingId(null)
    setFieldTitle('')
    setFieldDescription('')
    setFieldCategory('business')
    setFieldPrice('')
    setFieldPreview('')
    setFieldFile(null)
    setFileStatus('')
    setFormError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    setFormOpen(true)
  }

  function closeCreateForm() {
    setFormOpen(false)
  }

  async function editListing(id: string) {
    try {
      const l = await api.getMarketplaceListing(id)
      setEditingId(id)
      setFieldTitle(l.title)
      setFieldDescription(l.description)
      setFieldCategory(l.category)
      setFieldPrice(String(l.pricePoints))
      setFieldPreview(l.previewImageUrl || '')
      setFieldFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setFileStatus(l.hasFile ? `Current file: ${l.fileName}` : 'No file uploaded yet')
      setFormError('')
      setFormOpen(true)
      closeDetail()
    } catch (err: any) {
      showToast(err.message || 'Failed to load listing', 'error')
    }
  }

  async function submitListing() {
    setFormError('')
    const payload = {
      title: fieldTitle.trim(),
      description: fieldDescription.trim(),
      category: fieldCategory,
      pricePoints: parseInt(fieldPrice, 10),
      previewImageUrl: fieldPreview.trim() || undefined
    }
    setFormSubmitting(true)
    try {
      let listing: Listing
      if (editingId) {
        listing = await api.updateMarketplaceListing(editingId, payload)
      } else {
        listing = await api.createMarketplaceListing(payload)
      }
      if (fieldFile) {
        if (!/\.zip$/i.test(fieldFile.name)) throw new Error('Only .zip files are accepted')
        if (fieldFile.size > 25 * 1024 * 1024) throw new Error('File too large (max 25MB)')
        await api.uploadMarketplaceFile(listing.id, fieldFile)
      }
      showToast('Listing submitted for review ✓')
      closeCreateForm()
      loadMyListings()
    } catch (err: any) {
      setFormError(err.details || err.message || 'Something went wrong')
    } finally {
      setFormSubmitting(false)
    }
  }

  async function deleteListing(id: string) {
    if (!window.confirm('Remove this listing? Buyers who already purchased it keep their download.')) return
    try {
      await api.deleteMarketplaceListing(id)
      showToast('Listing removed')
      loadMyListings()
      closeDetail()
    } catch (err: any) {
      showToast(err.message || 'Failed to remove listing', 'error')
    }
  }

  async function openDetail(id: string, context: 'browse' | 'mine') {
    setDetailContext(context)
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailError(false)
    setDetailListing(null)
    try {
      const l = await api.getMarketplaceListing(id)
      setDetailListing(l)
    } catch {
      setDetailError(true)
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setDetailOpen(false)
    setDetailListing(null)
  }

  function buyThenClose() {
    closeDetail()
    switchTab('purchases')
  }

  async function purchase(id: string) {
    try {
      const result = await api.purchaseMarketplaceListing(id)
      showToast(`Purchased "${result.title}" ✓`)
      closeDetail()
      refreshUser()
      switchTab('purchases')
    } catch (err: any) {
      showToast(err.message || 'Purchase failed', 'error')
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0]
    setFieldFile(f || null)
    setFileStatus(f ? f.name : '')
  }

  function ListingCard({ l, context }: { l: Listing; context: 'browse' | 'mine' }) {
    return (
      <div className="mkt-listing-card" onClick={() => openDetail(l.id, context)}>
        {l.previewImageUrl ? (
          <img
            src={l.previewImageUrl}
            alt=""
            style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: '12px 12px 0 0' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: 110,
              borderRadius: '12px 12px 0 0',
              background: 'var(--bg-card-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem'
            }}
          >
            🛒
          </div>
        )}
        {context === 'mine' && l.status && l.status !== 'approved' && (
          <div className={`mkt-status-tag mkt-status-${l.status}`}>{l.status}</div>
        )}
        {l.purchased && <div className="mkt-status-tag mkt-status-approved">Owned</div>}
        <div className="mkt-listing-body">
          <div className="mkt-listing-title">{l.title}</div>
          <div className="mkt-listing-meta">
            {catLabel(l.category)} {l.sellerUsername ? `· by ${l.sellerUsername}` : ''}
          </div>
          <div className="mkt-listing-price">{l.pricePoints || l.pricePaid || 0} pts</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page active" role="main" aria-label="Scripts Marketplace">
      <PageHeader title="🛒 Scripts Marketplace" />

      <div className="mkt-tabs" role="tablist" aria-label="Marketplace sections">
        <button
          className={`mkt-tab ${tab === 'browse' ? 'active' : ''}`}
          onClick={() => switchTab('browse')}
          role="tab"
          aria-selected={tab === 'browse'}
        >
          Browse
        </button>
        <button
          className={`mkt-tab ${tab === 'mylistings' ? 'active' : ''}`}
          onClick={() => switchTab('mylistings')}
          role="tab"
          aria-selected={tab === 'mylistings'}
        >
          My Listings
        </button>
        <button
          className={`mkt-tab ${tab === 'purchases' ? 'active' : ''}`}
          onClick={() => switchTab('purchases')}
          role="tab"
          aria-selected={tab === 'purchases'}
        >
          My Purchases
        </button>
        {isAdmin && (
          <button
            className={`mkt-tab ${tab === 'admin' ? 'active' : ''}`}
            onClick={() => switchTab('admin')}
            role="tab"
            aria-selected={tab === 'admin'}
          >
            Review Queue
          </button>
        )}
      </div>

      {/* ===== BROWSE TAB ===== */}
      <div className={`mkt-tab-panel ${tab === 'browse' ? 'active' : ''}`}>
        <div className="ai-tool-scroll" role="tablist" aria-label="Categories">
          <div
            className={`ai-tool-chip ${category === 'all' ? 'active' : ''}`}
            onClick={() => setCategory('all')}
            role="tab"
            aria-selected={category === 'all'}
          >
            All
          </div>
          {CATEGORIES.map((c) => (
            <div
              key={c}
              className={`ai-tool-chip ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
              role="tab"
              aria-selected={category === c}
            >
              {catLabel(c)}
            </div>
          ))}
        </div>
        <div className="mkt-search-box">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchInput}
            onChange={(e) => onSearchInput(e.target.value)}
          />
        </div>
        <div className="mkt-listing-grid">
          {browseListings === null && !browseError && (
            <div className="ow-skeleton" style={{ height: 180, margin: '0 1rem', gridColumn: '1 / -1' }}></div>
          )}
          {browseError && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-title">Couldn't load listings</div>
            </div>
          )}
          {!browseError && browseListings && browseListings.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">🛒</div>
              <div className="empty-state-title">No templates yet</div>
              <div className="empty-state-desc">Be the first to list a website template.</div>
            </div>
          )}
          {!browseError &&
            browseListings &&
            browseListings.map((l) => <ListingCard key={l.id} l={l} context="browse" />)}
        </div>
      </div>

      {/* ===== MY LISTINGS TAB ===== */}
      <div className={`mkt-tab-panel ${tab === 'mylistings' ? 'active' : ''}`}>
        <div style={{ padding: '1rem' }}>
          <button className="action-btn primary" style={{ width: '100%' }} onClick={openCreateForm}>
            + Create New Listing
          </button>
        </div>
        <div className="mkt-listing-grid">
          {myListings === null && !myListingsError && (
            <div className="ow-skeleton" style={{ height: 180, margin: '0 1rem', gridColumn: '1 / -1' }}></div>
          )}
          {myListingsError && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-title">Couldn't load your listings</div>
            </div>
          )}
          {!myListingsError && myListings && myListings.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">No listings yet</div>
              <div className="empty-state-desc">Create your first template listing above.</div>
            </div>
          )}
          {!myListingsError &&
            myListings &&
            myListings.map((l) => (
              <React.Fragment key={l.id}>
                <ListingCard l={l} context="mine" />
                {l.status === 'rejected' && l.rejectionReason && (
                  <div
                    style={{
                      fontSize: '.72rem',
                      color: 'var(--danger)',
                      padding: '0 .8rem .6rem',
                      gridColumn: '1 / -1'
                    }}
                  >
                    Rejected: {l.rejectionReason}
                  </div>
                )}
              </React.Fragment>
            ))}
        </div>
      </div>

      {/* ===== MY PURCHASES TAB ===== */}
      <div className={`mkt-tab-panel ${tab === 'purchases' ? 'active' : ''}`}>
        <div className="mkt-listing-grid">
          {purchases === null && !purchasesError && (
            <div className="ow-skeleton" style={{ height: 180, margin: '0 1rem', gridColumn: '1 / -1' }}></div>
          )}
          {purchasesError && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-title">Couldn't load purchases</div>
            </div>
          )}
          {!purchasesError && purchases && purchases.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">🧾</div>
              <div className="empty-state-title">No purchases yet</div>
              <div className="empty-state-desc">Templates you buy will show up here with a download link.</div>
            </div>
          )}
          {!purchasesError &&
            purchases &&
            purchases.map((p) => (
              <div className="mkt-listing-card" key={p.id}>
                <div
                  style={{
                    width: '100%',
                    height: 110,
                    borderRadius: '12px 12px 0 0',
                    background: 'var(--bg-card-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    overflow: 'hidden'
                  }}
                >
                  {p.previewImageUrl ? (
                    <img
                      src={p.previewImageUrl}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      alt=""
                    />
                  ) : (
                    '🛒'
                  )}
                </div>
                <div className="mkt-listing-body">
                  <div className="mkt-listing-title">{p.title}</div>
                  <div className="mkt-listing-meta">
                    by {p.sellerUsername} · {p.pricePaid} pts paid
                  </div>
                  <button
                    className="action-btn primary"
                    style={{ width: '100%', marginTop: '.6rem' }}
                    onClick={(e) => download(p.id, e)}
                  >
                    ⬇ Download
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ===== ADMIN REVIEW QUEUE TAB ===== */}
      {isAdmin && (
        <div className={`mkt-tab-panel ${tab === 'admin' ? 'active' : ''}`}>
          <div className="mkt-listing-grid">
            {adminQueue === null && !adminError && (
              <div className="ow-skeleton" style={{ height: 180, margin: '0 1rem', gridColumn: '1 / -1' }}></div>
            )}
            {adminError && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <div className="empty-state-title">Couldn't load review queue</div>
              </div>
            )}
            {!adminError && adminQueue && adminQueue.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-title">Nothing pending</div>
                <div className="empty-state-desc">New submissions will appear here for review.</div>
              </div>
            )}
            {!adminError &&
              adminQueue &&
              adminQueue.map((l) => (
                <div className="mkt-listing-card" key={l.id} style={{ gridColumn: '1 / -1' }}>
                  <div className="mkt-listing-body">
                    <div className="mkt-listing-title">{l.title}</div>
                    <div className="mkt-listing-meta">
                      {catLabel(l.category)} · by {l.sellerUsername} · {l.pricePoints} pts
                    </div>
                    <div
                      style={{
                        fontSize: '.8rem',
                        color: 'var(--text-muted)',
                        margin: '.5rem 0',
                        maxHeight: 80,
                        overflow: 'auto'
                      }}
                    >
                      {l.description}
                    </div>
                    <div style={{ display: 'flex', gap: '.5rem' }}>
                      <button className="action-btn success" style={{ flex: 1 }} onClick={() => approve(l.id)}>
                        ✓ Approve
                      </button>
                      <button className="action-btn secondary" style={{ flex: 1 }} onClick={() => reject(l.id)}>
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ===== CREATE / EDIT LISTING FORM (overlay) ===== */}
      <div
        className={`mkt-form-overlay ${formOpen ? 'open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeCreateForm()
        }}
      >
        <div className="mkt-form-sheet">
          <div className="mkt-form-header">
            <span>{editingId ? 'Edit Listing' : 'Create Listing'}</span>
            <button className="mkt-form-close" onClick={closeCreateForm} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="form-field">
            <label>Title</label>
            <input
              type="text"
              maxLength={100}
              placeholder="e.g. Modern SaaS Landing Page"
              value={fieldTitle}
              onChange={(e) => setFieldTitle(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Description</label>
            <textarea
              maxLength={2000}
              placeholder="Describe what the buyer gets, tech stack, features..."
              value={fieldDescription}
              onChange={(e) => setFieldDescription(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Category</label>
            <select value={fieldCategory} onChange={(e) => setFieldCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {catLabel(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Price (points)</label>
            <input
              type="number"
              min={10}
              max={500000}
              placeholder="e.g. 500"
              value={fieldPrice}
              onChange={(e) => setFieldPrice(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Preview Image URL</label>
            <input
              type="url"
              placeholder="https://..."
              value={fieldPreview}
              onChange={(e) => setFieldPreview(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Template File (.zip, max 25MB)</label>
            <input type="file" accept=".zip" ref={fileInputRef} onChange={onFileChange} />
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.4rem' }}>{fileStatus}</div>
          </div>
          <button
            className="action-btn primary"
            style={{ width: '100%', marginTop: '.5rem' }}
            disabled={formSubmitting}
            onClick={submitListing}
          >
            {formSubmitting ? 'Submitting...' : 'Submit for Review'}
          </button>
          {formError && (
            <div style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: '.6rem' }}>{formError}</div>
          )}
        </div>
      </div>

      {/* ===== LISTING DETAIL / PURCHASE MODAL ===== */}
      <div
        className={`mkt-form-overlay ${detailOpen ? 'open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDetail()
        }}
      >
        <div className="mkt-form-sheet">
          {detailLoading && <div className="ow-skeleton" style={{ height: 200, margin: '1rem' }}></div>}
          {!detailLoading && detailError && (
            <div className="empty-state">
              <div className="empty-state-title">Couldn't load listing</div>
            </div>
          )}
          {!detailLoading && !detailError && detailListing && (
            <>
              <div className="mkt-form-header">
                <span>{detailListing.title}</span>
                <button className="mkt-form-close" onClick={closeDetail}>
                  ✕
                </button>
              </div>
              {detailListing.previewImageUrl && (
                <img
                  src={detailListing.previewImageUrl}
                  style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, marginBottom: '1rem' }}
                  alt=""
                />
              )}
              <div className="mkt-listing-meta" style={{ marginBottom: '.6rem' }}>
                {catLabel(detailListing.category)}{' '}
                {detailListing.sellerUsername ? `· by ${detailListing.sellerUsername}` : ''}{' '}
                {detailListing.salesCount !== undefined ? `· ${detailListing.salesCount} sales` : ''}
              </div>
              <div
                style={{
                  fontSize: '.88rem',
                  color: 'var(--text)',
                  whiteSpace: 'pre-wrap',
                  marginBottom: '1rem'
                }}
              >
                {detailListing.description}
              </div>
              <div className="mkt-listing-price" style={{ marginBottom: '1rem' }}>
                {detailListing.pricePoints} pts
              </div>
              {detailContext === 'mine' ? (
                <>
                  <button
                    className="action-btn secondary"
                    style={{ width: '100%', marginBottom: '.5rem' }}
                    onClick={() => editListing(detailListing.id)}
                  >
                    ✎ Edit
                  </button>
                  <button
                    className="action-btn secondary"
                    style={{ width: '100%', color: 'var(--danger)' }}
                    onClick={() => deleteListing(detailListing.id)}
                  >
                    🗑 Remove Listing
                  </button>
                </>
              ) : detailListing.purchased ? (
                <>
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'var(--success)',
                      fontWeight: 700,
                      marginBottom: '.5rem'
                    }}
                  >
                    ✓ You own this template
                  </div>
                  <button className="action-btn primary" style={{ width: '100%' }} onClick={buyThenClose}>
                    Go to My Purchases →
                  </button>
                </>
              ) : (
                <button
                  className="action-btn primary"
                  style={{ width: '100%' }}
                  onClick={() => purchase(detailListing.id)}
                >
                  Buy for {detailListing.pricePoints} pts
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
