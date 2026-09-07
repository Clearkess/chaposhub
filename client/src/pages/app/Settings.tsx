import React, { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { api } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { usePage } from '../../contexts/PageContext'

// SlipCraft-styled Settings page: profile-card header, quick-actions,
// 3 tabs (Personal info / Security / Danger zone). Logout now lives here
// (Danger zone) instead of the bottom nav, mirroring the reference screenshot's
// 5-item nav with no separate Logout icon.

type Tab = 'personal' | 'security' | 'danger'

export default function Settings() {
  const { user, logout, refreshUser } = useAuth()
  const { showToast } = useToast()
  const { goTo } = usePage()

  const [tab, setTab] = useState<Tab>('personal')
  const [name, setName] = useState(user?.name || '')
  const [whatsapp, setWhatsapp] = useState((user?.whatsapp as string) || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setError('')
    const trimmedWhatsapp = whatsapp.trim()
    if (trimmedWhatsapp && !/^\+?[0-9\s-]{7,20}$/.test(trimmedWhatsapp)) {
      setError('Enter a valid WhatsApp number (e.g. +2348012345678)')
      return
    }
    setSaving(true)
    try {
      await api.updateProfile({ name: name.trim(), whatsapp: trimmedWhatsapp })
      await refreshUser()
      showToast('Profile saved ✓')
    } catch (err: any) {
      setError(err.details || err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  function confirmLogout() {
    if (window.confirm('Log out of Chapo\'sHub?')) {
      logout()
    }
  }

  return (
    <div className="page active" role="main" aria-label="Settings">
      <PageHeader title="Settings" />

      <div className="points-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.6rem' }}>
          <i className="fa-solid fa-circle-user" style={{ fontSize: '2.2rem' }}></i>
        </div>
        <div className="points-label" style={{ marginTop: '.5rem', fontSize: '1rem', fontWeight: 700, opacity: 1 }}>
          {user?.name || user?.username}
        </div>
        <div className="points-label">@{user?.username}</div>
      </div>

      <div style={{ display: 'flex', gap: '.6rem', padding: '0 1rem 1rem' }}>
        <button
          className="action-btn secondary"
          style={{ flex: 1 }}
          onClick={() => showToast('Fees: 0% on P2P orders — vendors set their own rate.')}
        >
          <i className="fa-solid fa-tags"></i> Fees &amp; pricing
        </button>
        <button
          className="action-btn secondary"
          style={{ flex: 1 }}
          onClick={() => window.open('https://t.me/chaposhubupdates', '_blank', 'noopener,noreferrer')}
        >
          <i className="fa-brands fa-telegram"></i> Contact Telegram
        </button>
      </div>

      <div className="auth-tabs" style={{ margin: '0 1rem 1rem' }}>
        <button className={`auth-tab ${tab === 'personal' ? 'active' : ''}`} onClick={() => setTab('personal')}>
          Personal info
        </button>
        <button className={`auth-tab ${tab === 'security' ? 'active' : ''}`} onClick={() => setTab('security')}>
          Security
        </button>
        <button className={`auth-tab ${tab === 'danger' ? 'active' : ''}`} onClick={() => setTab('danger')}>
          Danger zone
        </button>
      </div>

      {tab === 'personal' && (
        <div style={{ padding: '0 1rem 1.5rem' }}>
          <div className="form-field">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={user?.email || ''} disabled />
          </div>
          <div className="form-field">
            <label>Username</label>
            <input type="text" value={user?.username || ''} disabled />
            <div style={{ fontSize: '.72rem', color: 'var(--text-dim)', marginTop: '.35rem' }}>
              Usernames can't be changed. Contact support if you need help.
            </div>
          </div>
          <div className="form-field">
            <label>WhatsApp Number</label>
            <input
              type="tel"
              placeholder="+2348012345678"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <div style={{ fontSize: '.72rem', color: 'var(--text-dim)', marginTop: '.35rem' }}>
              Used for P2P vendor order notifications only.
            </div>
          </div>
          {error && <div className="auth-error show" style={{ marginBottom: '.8rem' }}>{error}</div>}
          <button className="action-btn primary" style={{ width: '100%' }} disabled={saving} onClick={save}>
            {saving ? <span className="spinner"></span> : 'Save'}
          </button>
        </div>
      )}

      {tab === 'security' && (
        <div style={{ padding: '0 1rem 1.5rem' }}>
          <div className="empty-state">
            <div className="empty-state-icon"><i className="fa-solid fa-lock"></i></div>
            <div className="empty-state-title">Password &amp; security</div>
            <div className="empty-state-desc">Password change and 2FA options are coming soon.</div>
          </div>
        </div>
      )}

      {tab === 'danger' && (
        <div style={{ padding: '0 1rem 1.5rem' }}>
          <div className="form-field">
            <label style={{ color: 'var(--danger)' }}>Log out</label>
            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.8rem' }}>
              Sign out of Chapo'sHub on this device.
            </div>
            <button className="action-btn secondary" style={{ width: '100%', color: 'var(--danger)' }} onClick={confirmLogout}>
              <i className="fa-solid fa-right-from-bracket"></i> Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
