import React, { useEffect, useState } from 'react'
import { usePage } from '../../contexts/PageContext'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { api, APIError } from '../../api/client'
import { CONFIG, relativeTime } from '../../lib/config'

// Ported from `#page-opay` (.ow-app) + the OpayWallet IIFE module in
// public/static/js/app.js. Full send-money / transfer-to-bank / history
// flows for the simulated demo wallet.

type OwView = 'dashboard' | 'send' | 'tobank' | 'history'
type SendStep = 'recipient' | 'amount' | 'confirm' | 'pin' | 'success'
type BankStep = 'recipient' | 'amount' | 'confirm' | 'pin' | 'success'

interface Wallet {
  balance: number
  [key: string]: any
}

interface Txn {
  id: string
  type: 'credit' | 'debit'
  category: string
  status: string
  amount: number
  counterpartyName?: string
  counterpartyPhone?: string
  bankName?: string
  accountNumber?: string
  note?: string
  reference?: string
  pointsCharged?: number
  createdAt: string
}

function fmtNaira(v: number): string {
  return '₦' + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STEP_ORDER: SendStep[] = ['recipient', 'amount', 'confirm', 'pin', 'success']

function StepProgress({ steps, activeStep }: { steps: string[]; activeStep: string }) {
  const idx = steps.indexOf(activeStep)
  if (activeStep === 'success') return null
  return (
    <div className="ow-step-progress">
      {steps.map((s, i) => (
        <span key={s} className={`ow-seg ${i <= idx ? 'done' : ''}`} />
      ))}
    </div>
  )
}

function PinPad({
  pin,
  onKey,
  disabled
}: {
  pin: string
  onKey: (key: string) => void
  disabled: boolean
}) {
  return (
    <>
      <div className="ow-pin-wrap">
        <p>Enter any 4 digits to confirm (demo)</p>
        <div className="ow-pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`ow-dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>
      </div>
      <div className="ow-keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <button key={k} disabled={disabled} onClick={() => onKey(k)}>
            {k}
          </button>
        ))}
        <button className="ow-key-empty" disabled />
        <button disabled={disabled} onClick={() => onKey('0')}>
          0
        </button>
        <button disabled={disabled} onClick={() => onKey('del')}>
          <i className="fa-solid fa-delete-left" />
        </button>
      </div>
    </>
  )
}

export default function OpayWallet() {
  const { goTo } = usePage()
  const { showToast } = useToast()
  const { refreshUser } = useAuth()

  const [view, setView] = useState<OwView>('dashboard')
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [balanceVisible, setBalanceVisible] = useState(false)
  const [recentTxns, setRecentTxns] = useState<Txn[] | null>(null)
  const [recentError, setRecentError] = useState(false)

  // ---- Send Money state ----
  const [sendStep, setSendStep] = useState<SendStep>('recipient')
  const [sendName, setSendName] = useState('')
  const [sendPhone, setSendPhone] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [sendNote, setSendNote] = useState('')
  const [sendPin, setSendPin] = useState('')
  const [sendKeypadDisabled, setSendKeypadDisabled] = useState(false)
  const [sendResult, setSendResult] = useState<{ amount: number; name: string; phone: string; ref: string; date: string } | null>(null)

  // ---- Transfer to Bank state ----
  const [bankStep, setBankStep] = useState<BankStep>('recipient')
  const [banks, setBanks] = useState<{ code: string; name: string }[] | null>(null)
  const [bankCode, setBankCode] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [resolvedAccount, setResolvedAccount] = useState<{ name: string; bankCode: string; bankName: string; accountNumber: string } | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [bankAmount, setBankAmount] = useState('')
  const [bankNote, setBankNote] = useState('')
  const [bankPin, setBankPin] = useState('')
  const [bankKeypadDisabled, setBankKeypadDisabled] = useState(false)
  const [bankResult, setBankResult] = useState<{ amount: number; ref: string; date: string } | null>(null)

  // ---- History state ----
  const [allTxns, setAllTxns] = useState<Txn[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('all')
  const [historySearch, setHistorySearch] = useState('')
  const [receiptTxn, setReceiptTxn] = useState<Txn | null>(null)

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadDashboard() {
    setRecentError(false)
    try {
      const w = await api.getOpayWallet()
      setWallet(w)
    } catch (err) {
      setRecentError(true)
      handleAuthFailure(err)
      return
    }
    try {
      const txns = await api.getOpayTransactions(5)
      setRecentTxns(txns)
    } catch {
      setRecentTxns(null)
      setRecentError(true)
    }
  }

  function handleAuthFailure(err: unknown) {
    if (err instanceof APIError && err.status === 401) {
      showToast('❌ Please log in again', 'error')
    } else {
      showToast('❌ ' + (err instanceof Error ? err.message : 'Something went wrong'), 'error')
    }
  }

  // ---- Send Money flow ----
  function openSend() {
    setSendStep('recipient')
    setSendName('')
    setSendPhone('')
    setSendAmount('')
    setSendNote('')
    setSendPin('')
    setSendResult(null)
    setView('send')
  }

  function sendGoToAmount() {
    if (!sendName.trim()) {
      showToast('❌ Recipient name required', 'error')
      return
    }
    if (!sendPhone.trim()) {
      showToast('❌ Recipient phone required', 'error')
      return
    }
    setSendStep('amount')
  }

  function sendGoToConfirm() {
    setSendStep('confirm')
  }

  function sendGoToPin() {
    setSendPin('')
    setSendStep('pin')
  }

  function handleSendPinKey(key: string) {
    setSendPin((prev) => {
      const next = key === 'del' ? prev.slice(0, -1) : prev.length < 4 ? prev + key : prev
      if (next.length === 4) setTimeout(() => processSend(), 250)
      return next
    })
  }

  async function processSend() {
    setSendKeypadDisabled(true)
    const amt = parseInt(sendAmount || '0', 10)
    try {
      const res = await api.opaySendMoney({
        recipientName: sendName,
        recipientPhone: sendPhone,
        amount: amt,
        note: sendNote || undefined
      })
      const txn = res.transaction
      setSendResult({
        amount: amt,
        name: sendName + ' (' + sendPhone + ')',
        phone: sendPhone,
        ref: txn.reference,
        date: new Date(txn.createdAt).toLocaleString()
      })
      setSendStep('success')
      await refreshUser()
      showToast(`🟢 Sent! (-${res.pointsCharged} pts)`, 'success')
    } catch (err) {
      if (err instanceof APIError && err.status === 402) {
        showToast('❌ ' + (err.message || 'Insufficient balance for this transfer'), 'error')
      } else {
        handleAuthFailure(err)
      }
      setSendStep('confirm')
    } finally {
      setSendKeypadDisabled(false)
    }
  }

  const sendAmountNum = parseInt(sendAmount || '0', 10)
  const sendAmountValid = sendAmountNum > 0 && !!wallet && sendAmountNum <= Number(wallet.balance || 0)

  // ---- Transfer to Bank flow ----
  function openTransfer() {
    setBankStep('recipient')
    setBankAccountNumber('')
    setBankAmount('')
    setBankNote('')
    setBankPin('')
    setResolvedAccount(null)
    setVerifyError('')
    setBankResult(null)
    setView('tobank')
    loadBanks()
  }

  async function loadBanks() {
    if (banks) return
    try {
      const res = await api.getBanks()
      const list = (res && res.data) || []
      if (!list.length) throw new Error('empty')
      setBanks(list)
    } catch {
      setBanks([])
    }
  }

  function clearResolvedAccount() {
    setResolvedAccount(null)
    setVerifyError('')
  }

  async function resolveBankAccount() {
    const selectedBank = banks?.find((b) => b.code === bankCode)
    if (!bankCode) {
      showToast('❌ Select a bank first', 'error')
      return
    }
    if (!/^\d{10}$/.test(bankAccountNumber)) {
      showToast('❌ Enter a valid 10-digit account number', 'error')
      return
    }
    setVerifying(true)
    setVerifyError('')
    try {
      const res = await api.resolveBankAccount({ bank_code: bankCode, account_number: bankAccountNumber })
      const name = res && res.data && res.data.account_name
      if (res && res.success && name) {
        setResolvedAccount({
          name,
          bankCode,
          bankName: selectedBank?.name || '',
          accountNumber: bankAccountNumber
        })
        showToast('✓ Account verified', 'success')
      } else {
        throw new Error((res && res.message) || 'Could not resolve account')
      }
    } catch (err) {
      setResolvedAccount(null)
      setVerifyError(err instanceof Error ? err.message : 'Could not verify account')
    } finally {
      setVerifying(false)
    }
  }

  function bankGoToAmount() {
    if (!resolvedAccount) {
      showToast('❌ Verify the recipient account first', 'error')
      return
    }
    setBankStep('amount')
  }

  function bankGoToConfirm() {
    setBankStep('confirm')
  }

  function bankGoToPin() {
    setBankPin('')
    setBankStep('pin')
  }

  function handleBankPinKey(key: string) {
    setBankPin((prev) => {
      const next = key === 'del' ? prev.slice(0, -1) : prev.length < 4 ? prev + key : prev
      if (next.length === 4) setTimeout(() => processBankTransfer(), 250)
      return next
    })
  }

  async function processBankTransfer() {
    if (!resolvedAccount) return
    setBankKeypadDisabled(true)
    const amt = parseInt(bankAmount || '0', 10)
    try {
      const res = await api.opayBankTransfer({
        bankName: resolvedAccount.bankName,
        bankCode: resolvedAccount.bankCode,
        accountNumber: resolvedAccount.accountNumber,
        accountName: resolvedAccount.name,
        amount: amt,
        note: bankNote || undefined
      })
      const txn = res.transaction
      setBankResult({ amount: amt, ref: txn.reference, date: new Date(txn.createdAt).toLocaleString() })
      setBankStep('success')
      await refreshUser()
      showToast(`🟢 Transfer successful! (-${res.pointsCharged} pts)`, 'success')
    } catch (err) {
      if (err instanceof APIError && err.status === 402) {
        showToast('❌ ' + (err.message || 'Insufficient balance for this transfer'), 'error')
      } else {
        handleAuthFailure(err)
      }
      setBankStep('confirm')
    } finally {
      setBankKeypadDisabled(false)
    }
  }

  const bankAmountNum = parseInt(bankAmount || '0', 10)
  const bankAmountValid = bankAmountNum > 0 && !!wallet && bankAmountNum <= Number(wallet.balance || 0)

  // ---- History flow ----
  async function openHistory() {
    setView('history')
    setHistoryFilter('all')
    setHistorySearch('')
    setHistoryLoading(true)
    setHistoryError(false)
    try {
      const txns = await api.getOpayTransactions(200)
      setAllTxns(txns)
    } catch (err) {
      setAllTxns([])
      setHistoryError(true)
      handleAuthFailure(err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const OW_CATEGORY_META: Record<string, { icon: string; color: string; label: string }> = {
    transfer: { icon: 'fa-solid fa-arrow-right-arrow-left', color: '#1DC677', label: 'Send Money' },
    bank_transfer: { icon: 'fa-solid fa-building-columns', color: '#3B82F6', label: 'Bank Transfer' },
    default: { icon: 'fa-solid fa-receipt', color: '#6B7280', label: 'Transaction' }
  }
  function owCategoryMeta(cat: string) {
    return OW_CATEGORY_META[cat] || OW_CATEGORY_META.default
  }
  function owTxnTitle(t: Txn) {
    if (t.category === 'bank_transfer') return 'To ' + (t.bankName || 'Bank') + (t.counterpartyName ? ' · ' + t.counterpartyName : '')
    return 'To ' + (t.counterpartyName || 'Someone')
  }
  function owGroupDateLabel(iso: string): string {
    if (!iso) return 'Earlier'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return 'Earlier'
    const now = new Date()
    const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
    if (sameDay(d, now)) return 'Today'
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (sameDay(d, yesterday)) return 'Yesterday'
    return 'Earlier'
  }

  const totalIn = allTxns.filter((t) => t.type === 'credit' && t.status === 'completed').reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalOut = allTxns.filter((t) => t.type === 'debit' && t.status === 'completed').reduce((s, t) => s + Number(t.amount || 0), 0)

  function owMatchesFilter(t: Txn) {
    if (historyFilter === 'all') return true
    if (historyFilter === 'credit' || historyFilter === 'debit') return t.type === historyFilter
    if (historyFilter === 'completed' || historyFilter === 'pending' || historyFilter === 'failed') return t.status === historyFilter
    return t.category === historyFilter
  }
  function owMatchesSearch(t: Txn) {
    if (!historySearch) return true
    const hay = [t.counterpartyName, t.bankName, t.note, t.category].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(historySearch)
  }

  const filteredTxns = allTxns.filter((t) => owMatchesFilter(t) && owMatchesSearch(t))
  const groups: { label: string; txns: Txn[] }[] = []
  filteredTxns.forEach((t) => {
    const label = owGroupDateLabel(t.createdAt)
    let group = groups.find((g) => g.label === label)
    if (!group) {
      group = { label, txns: [] }
      groups.push(group)
    }
    group.txns.push(t)
  })

  function renderReceiptModal() {
    if (!receiptTxn) return null
    const t = receiptTxn
    const meta = owCategoryMeta(t.category)
    const statusColor = t.status === 'completed' ? 'var(--ow-mint)' : t.status === 'pending' ? '#eab308' : 'var(--ow-accent-red)'
    const dateStr = (() => {
      const d = new Date(t.createdAt)
      return Number.isNaN(d.getTime()) ? t.createdAt || '-' : d.toLocaleString()
    })()
    return (
      <div className="ow-modal-sheet">
        <div className="ow-modal-handle" />
        <div className="ow-receipt-icon-wrap">
          <div className="ow-r-icon" style={{ background: meta.color }}>
            <i className={meta.icon} />
          </div>
        </div>
        <div className="ow-receipt-amount">-{fmtNaira(t.amount)}</div>
        <div className="ow-receipt-status" style={{ color: statusColor }}>
          <i className="fa-solid fa-circle" style={{ fontSize: 8 }} /> {(t.status || '').charAt(0).toUpperCase() + (t.status || '').slice(1)}
        </div>
        <div className="ow-receipt-rows">
          <div className="ow-receipt-row">
            <span className="label">To</span>
            <span className="value">{t.counterpartyName || '-'}</span>
          </div>
          {t.counterpartyPhone && (
            <div className="ow-receipt-row">
              <span className="label">Phone</span>
              <span className="value">{t.counterpartyPhone}</span>
            </div>
          )}
          {t.bankName && (
            <div className="ow-receipt-row">
              <span className="label">Bank</span>
              <span className="value">{t.bankName}</span>
            </div>
          )}
          {t.accountNumber && (
            <div className="ow-receipt-row">
              <span className="label">Account No.</span>
              <span className="value">{t.accountNumber}</span>
            </div>
          )}
          <div className="ow-receipt-row">
            <span className="label">Category</span>
            <span className="value">{meta.label}</span>
          </div>
          <div className="ow-receipt-row">
            <span className="label">Date</span>
            <span className="value">{dateStr}</span>
          </div>
          <div className="ow-receipt-row">
            <span className="label">Note</span>
            <span className="value">{t.note || '-'}</span>
          </div>
          <div className="ow-receipt-row">
            <span className="label">Points Charged</span>
            <span className="value">{Number(t.pointsCharged || 0)}</span>
          </div>
          <div className="ow-receipt-row">
            <span className="label">Reference</span>
            <span className="value">{t.reference || '-'}</span>
          </div>
        </div>
        <button className="action-btn primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setReceiptTxn(null)}>
          Close
        </button>
      </div>
    )
  }

  return (
    <div className="page active" role="main" aria-label="OPay Wallet Demo">
      <div className="ow-app">
        {/* DASHBOARD VIEW */}
        <div className={`ow-view ${view === 'dashboard' ? 'active' : ''}`}>
          <div className="receipt-page-header">
            <button className="back-btn" onClick={() => goTo('dashboard')} aria-label="Go back">
              ←
            </button>
            <div className="page-title-sm">🟢 OPay Wallet (Demo)</div>
          </div>
          <div className="ow-disclaimer">
            ⚠️ <strong>Simulated demo wallet.</strong> This is a private play-money wallet for UI/UX demo purposes
            only — no real OPay account, bank account, or payment rail is ever touched. Sending money here costs
            Chapo'sHub points.
          </div>
          <div className="ow-balance-card">
            <div className="ow-balance-top-row">
              <span>Wallet Balance</span>
              <button
                className="ow-icon-btn ow-eye-toggle"
                aria-label="Toggle balance visibility"
                onClick={() => setBalanceVisible((v) => !v)}
              >
                <i className={balanceVisible ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} />
              </button>
            </div>
            <div className="ow-balance-amount">{balanceVisible && wallet ? fmtNaira(wallet.balance) : '₦••••••'}</div>
            <div className="ow-balance-sub">{recentError ? 'Could not load wallet' : wallet ? 'OPay Demo Wallet' : 'Loading…'}</div>
          </div>
          <div className="ow-transfer-row">
            <div className="ow-transfer-item" onClick={openSend}>
              <div className="ow-transfer-icon" style={{ background: 'var(--ow-mint)' }}>
                <i className="fa-solid fa-arrow-up" />
              </div>
              <span>Send Money</span>
            </div>
            <div className="ow-transfer-item" onClick={openTransfer}>
              <div className="ow-transfer-icon" style={{ background: 'var(--ow-accent-blue)' }}>
                <i className="fa-solid fa-building-columns" />
              </div>
              <span>To Bank</span>
            </div>
            <div className="ow-transfer-item" onClick={openHistory}>
              <div className="ow-transfer-icon" style={{ background: 'var(--ow-accent-purple)' }}>
                <i className="fa-solid fa-clock-rotate-left" />
              </div>
              <span>History</span>
            </div>
          </div>
          <div className="ow-section-title">
            Recent Activity{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                loadDashboard()
              }}
            >
              ↻ Refresh
            </a>
          </div>
          <div className="ow-txn-list">
            {recentTxns === null && !recentError && <div className="ow-skeleton" />}
            {recentError && (
              <div className="empty-state">
                <div className="empty-state-icon">⚠️</div>
                <div className="empty-state-title">Could not load transactions</div>
              </div>
            )}
            {recentTxns && recentTxns.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🧾</div>
                <div className="empty-state-title">No transactions yet</div>
              </div>
            )}
            {recentTxns &&
              recentTxns.map((t) => {
                const isBank = t.category === 'bank_transfer'
                const icon = isBank ? '🏦' : '👤'
                const title = isBank ? 'To ' + (t.bankName || 'Bank') : 'To ' + (t.counterpartyName || 'Someone')
                return (
                  <div className="ow-txn-item" key={t.id}>
                    <div className="ow-txn-icon">{icon}</div>
                    <div className="ow-txn-info">
                      <div className="ow-txn-title">{title}</div>
                      <div className="ow-txn-sub">{t.note || t.accountNumber || ''}</div>
                    </div>
                    <div className="ow-txn-right">
                      <div className="ow-txn-amount out">-{fmtNaira(t.amount)}</div>
                      <div className="ow-txn-time">{relativeTime(t.createdAt)}</div>
                    </div>
                  </div>
                )
              })}
          </div>
          <div style={{ height: 20 }} />
        </div>

        {/* SEND MONEY VIEW */}
        <div className={`ow-view ${view === 'send' ? 'active' : ''}`}>
          <div className="receipt-page-header">
            <button className="back-btn" onClick={() => setView('dashboard')} aria-label="Go back">
              ←
            </button>
            <div className="page-title-sm">
              {sendStep === 'recipient' && 'Send Money'}
              {sendStep === 'amount' && 'Enter Amount'}
              {sendStep === 'confirm' && 'Confirm Transfer'}
              {sendStep === 'pin' && 'Enter PIN'}
              {sendStep === 'success' && 'Success'}
            </div>
          </div>
          <StepProgress steps={STEP_ORDER} activeStep={sendStep} />

          {sendStep === 'recipient' && (
            <div className="ow-step active">
              <div className="form-section">
                <div className="form-field">
                  <label>Recipient Name</label>
                  <input type="text" placeholder="e.g. Jane Smith" maxLength={60} value={sendName} onChange={(e) => setSendName(e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Recipient Phone</label>
                  <input type="tel" placeholder="e.g. 0810 987 6543" maxLength={20} value={sendPhone} onChange={(e) => setSendPhone(e.target.value)} />
                </div>
              </div>
              <div className="ow-btn-row">
                <button className="action-btn primary" style={{ width: '100%' }} onClick={sendGoToAmount}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {sendStep === 'amount' && (
            <div className="ow-step active">
              <div className="ow-amount-display">
                <span>₦</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
              <div className="ow-balance-hint">
                {wallet && sendAmountNum > Number(wallet.balance || 0) && sendAmountNum > 0 ? (
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                    Insufficient balance — available {fmtNaira(wallet.balance)}
                  </span>
                ) : (
                  'Available balance: ' + fmtNaira(wallet ? wallet.balance : 0)
                )}
              </div>
              <div className="ow-quick-amounts">
                {[1000, 5000, 10000, 20000].map((amt) => (
                  <button key={amt} onClick={() => setSendAmount(String(amt))}>
                    ₦{amt.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="form-field" style={{ marginTop: '1rem' }}>
                <label>Note (optional)</label>
                <input type="text" placeholder="What's this for?" maxLength={200} value={sendNote} onChange={(e) => setSendNote(e.target.value)} />
              </div>
              <div className="ow-btn-row">
                <button className="action-btn primary" style={{ width: '100%' }} disabled={!sendAmountValid} onClick={sendGoToConfirm}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {sendStep === 'confirm' && (
            <div className="ow-step active">
              <div className="ow-confirm-card">
                <div className="ow-confirm-row">
                  <span>Amount</span>
                  <strong>{fmtNaira(sendAmountNum)}</strong>
                </div>
                <div className="ow-confirm-row">
                  <span>To</span>
                  <strong>{sendName}</strong>
                </div>
                <div className="ow-confirm-row">
                  <span>Phone</span>
                  <strong>{sendPhone}</strong>
                </div>
                <div className="ow-confirm-row">
                  <span>Note</span>
                  <strong>{sendNote || '—'}</strong>
                </div>
                <div className="ow-confirm-row">
                  <span>Points Cost</span>
                  <strong>{CONFIG.points.opay_wallet_send} pts</strong>
                </div>
              </div>
              <div className="ow-btn-row">
                <button className="action-btn primary" style={{ width: '100%' }} onClick={sendGoToPin}>
                  Confirm &amp; Continue
                </button>
              </div>
            </div>
          )}

          {sendStep === 'pin' && (
            <div className="ow-step active">
              <PinPad pin={sendPin} onKey={handleSendPinKey} disabled={sendKeypadDisabled} />
            </div>
          )}

          {sendStep === 'success' && sendResult && (
            <div className="ow-step active">
              <div className="ow-success-wrap">
                <div className="ow-success-icon">
                  <i className="fa-solid fa-circle-check" />
                </div>
                <div className="ow-success-title">Money Sent!</div>
                <div className="ow-success-amount">{fmtNaira(sendResult.amount)}</div>
                <div className="ow-success-detail-card">
                  <div className="ow-confirm-row">
                    <span>To</span>
                    <strong>{sendResult.name}</strong>
                  </div>
                  <div className="ow-confirm-row">
                    <span>Reference</span>
                    <strong>{sendResult.ref}</strong>
                  </div>
                  <div className="ow-confirm-row">
                    <span>Date</span>
                    <strong>{sendResult.date}</strong>
                  </div>
                </div>
                <button className="action-btn primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setView('dashboard')}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* TRANSFER TO BANK VIEW */}
        <div className={`ow-view ${view === 'tobank' ? 'active' : ''}`}>
          <div className="receipt-page-header">
            <button className="back-btn" onClick={() => setView('dashboard')} aria-label="Go back">
              ←
            </button>
            <div className="page-title-sm">
              {bankStep === 'recipient' && 'Transfer To Bank'}
              {bankStep === 'amount' && 'Enter Amount'}
              {bankStep === 'confirm' && 'Confirm Transfer'}
              {bankStep === 'pin' && 'Enter PIN'}
              {bankStep === 'success' && 'Success'}
            </div>
          </div>
          <StepProgress steps={STEP_ORDER} activeStep={bankStep} />

          {bankStep === 'recipient' && (
            <div className="ow-step active">
              <div className="ow-real-note">
                🏦 <strong>Verify Recipient Bank Account · REAL LOOKUP</strong>
                <br />
                Pulls today's actual Nigerian bank list and confirms the account name via Paystack — this check is
                real, but no money moves and no bank account is touched.
              </div>
              <div className="form-section">
                <div className="form-field">
                  <label>Recipient Bank</label>
                  <select
                    value={bankCode}
                    onChange={(e) => {
                      setBankCode(e.target.value)
                      clearResolvedAccount()
                    }}
                  >
                    <option value="">{banks === null ? 'Loading banks…' : banks.length === 0 ? 'Unable to load banks — check Paystack setup' : 'Select bank'}</option>
                    {banks?.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Account Number</label>
                    <input
                      type="text"
                      placeholder="10-digit NUBAN"
                      maxLength={10}
                      inputMode="numeric"
                      value={bankAccountNumber}
                      onChange={(e) => {
                        setBankAccountNumber(e.target.value.replace(/[^0-9]/g, ''))
                        clearResolvedAccount()
                      }}
                    />
                  </div>
                  <div className="form-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button type="button" className="action-btn secondary" style={{ width: '100%' }} onClick={resolveBankAccount} disabled={verifying}>
                      {verifying ? '🔍 Verifying…' : '🔍 Verify'}
                    </button>
                  </div>
                </div>
                {resolvedAccount && (
                  <div className="ow-resolved-account success" style={{ display: 'block' }}>
                    ✓ {resolvedAccount.name}
                  </div>
                )}
                {!resolvedAccount && verifyError && (
                  <div className="ow-resolved-account error" style={{ display: 'block' }}>
                    ❌ {verifyError}
                  </div>
                )}
              </div>
              <div className="ow-btn-row">
                <button className="action-btn primary" style={{ width: '100%' }} disabled={!resolvedAccount} onClick={bankGoToAmount}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {bankStep === 'amount' && (
            <div className="ow-step active">
              <div className="ow-amount-display">
                <span>₦</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={bankAmount}
                  onChange={(e) => setBankAmount(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
              <div className="ow-balance-hint">
                {wallet && bankAmountNum > Number(wallet.balance || 0) && bankAmountNum > 0 ? (
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                    Insufficient balance — available {fmtNaira(wallet.balance)}
                  </span>
                ) : (
                  'Available balance: ' + fmtNaira(wallet ? wallet.balance : 0)
                )}
              </div>
              <div className="ow-quick-amounts">
                {[1000, 5000, 10000, 20000].map((amt) => (
                  <button key={amt} onClick={() => setBankAmount(String(amt))}>
                    ₦{amt.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="form-field" style={{ marginTop: '1rem' }}>
                <label>Note (optional)</label>
                <input type="text" placeholder="What's this for?" maxLength={200} value={bankNote} onChange={(e) => setBankNote(e.target.value)} />
              </div>
              <div className="ow-btn-row">
                <button className="action-btn primary" style={{ width: '100%' }} disabled={!bankAmountValid} onClick={bankGoToConfirm}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {bankStep === 'confirm' && resolvedAccount && (
            <div className="ow-step active">
              <div className="ow-confirm-card">
                <div className="ow-confirm-row">
                  <span>Amount</span>
                  <strong>{fmtNaira(bankAmountNum)}</strong>
                </div>
                <div className="ow-confirm-row">
                  <span>Bank</span>
                  <strong>{resolvedAccount.bankName}</strong>
                </div>
                <div className="ow-confirm-row">
                  <span>Account Name</span>
                  <strong>{resolvedAccount.name}</strong>
                </div>
                <div className="ow-confirm-row">
                  <span>Account Number</span>
                  <strong>{resolvedAccount.accountNumber}</strong>
                </div>
                <div className="ow-confirm-row">
                  <span>Points Cost</span>
                  <strong>{CONFIG.points.opay_bank_transfer} pts</strong>
                </div>
              </div>
              <div className="ow-btn-row">
                <button className="action-btn primary" style={{ width: '100%' }} onClick={bankGoToPin}>
                  Confirm &amp; Continue
                </button>
              </div>
            </div>
          )}

          {bankStep === 'pin' && (
            <div className="ow-step active">
              <PinPad pin={bankPin} onKey={handleBankPinKey} disabled={bankKeypadDisabled} />
            </div>
          )}

          {bankStep === 'success' && bankResult && resolvedAccount && (
            <div className="ow-step active">
              <div className="ow-success-wrap">
                <div className="ow-success-icon">
                  <i className="fa-solid fa-circle-check" />
                </div>
                <div className="ow-success-title">Transfer Successful!</div>
                <div className="ow-success-amount">{fmtNaira(bankResult.amount)}</div>
                <div className="ow-success-detail-card">
                  <div className="ow-confirm-row">
                    <span>To</span>
                    <strong>{resolvedAccount.name}</strong>
                  </div>
                  <div className="ow-confirm-row">
                    <span>Bank</span>
                    <strong>{resolvedAccount.bankName}</strong>
                  </div>
                  <div className="ow-confirm-row">
                    <span>Reference</span>
                    <strong>{bankResult.ref}</strong>
                  </div>
                  <div className="ow-confirm-row">
                    <span>Date</span>
                    <strong>{bankResult.date}</strong>
                  </div>
                </div>
                <button className="action-btn primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setView('dashboard')}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* HISTORY VIEW */}
        <div className={`ow-view ${view === 'history' ? 'active' : ''}`}>
          <div className="receipt-page-header">
            <button className="back-btn" onClick={() => setView('dashboard')} aria-label="Go back">
              ←
            </button>
            <div className="page-title-sm">Transaction History</div>
          </div>
          <div className="ow-summary-row">
            <div className="ow-summary-box">
              <div className="ow-summary-label">Total In</div>
              <div className="ow-summary-value ow-in">{fmtNaira(totalIn)}</div>
            </div>
            <div className="ow-summary-box">
              <div className="ow-summary-label">Total Out</div>
              <div className="ow-summary-value ow-out">{fmtNaira(totalOut)}</div>
            </div>
          </div>
          <div className="ow-filter-chips">
            {[
              ['all', 'All'],
              ['credit', 'Money In'],
              ['debit', 'Money Out'],
              ['transfer', 'Send'],
              ['bank_transfer', 'Bank Transfer'],
              ['completed', 'Completed'],
              ['pending', 'Pending'],
              ['failed', 'Failed']
            ].map(([key, label]) => (
              <button key={key} className={`ow-filter-chip ${historyFilter === key ? 'active' : ''}`} onClick={() => setHistoryFilter(key)}>
                {label}
              </button>
            ))}
          </div>
          <div className="ow-search-box">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Search by name or note"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value.trim().toLowerCase())}
            />
          </div>
          <div>
            {historyLoading && <div className="ow-skeleton" style={{ height: 64, margin: 16 }} />}
            {!historyLoading && historyError && (
              <div className="empty-state">
                <div className="empty-state-icon">⚠️</div>
                <div className="empty-state-title">Could not load transaction history</div>
              </div>
            )}
            {!historyLoading && !historyError && filteredTxns.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🧾</div>
                <div className="empty-state-title">No transactions match your filters</div>
              </div>
            )}
            {!historyLoading &&
              !historyError &&
              groups.map((g) => (
                <React.Fragment key={g.label}>
                  <div className="ow-date-group-label">{g.label}</div>
                  <div className="ow-txn-list">
                    {g.txns.map((t) => {
                      const meta = owCategoryMeta(t.category)
                      return (
                        <div className="ow-txn-item" key={t.id} onClick={() => setReceiptTxn(t)}>
                          <div className="ow-txn-icon" style={{ background: meta.color }}>
                            <i className={meta.icon} />
                          </div>
                          <div className="ow-txn-info">
                            <div className="ow-txn-title">{owTxnTitle(t)}</div>
                            <div className="ow-txn-sub">
                              {relativeTime(t.createdAt)}
                              {t.note ? ' · ' + t.note : ''}
                            </div>
                          </div>
                          <div className="ow-txn-right">
                            <div className="ow-txn-amount out">-{fmtNaira(t.amount)}</div>
                            <span className={`ow-status-tag ow-status-${t.status}`}>{t.status}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </React.Fragment>
              ))}
          </div>
          <div style={{ height: 20 }} />
        </div>
      </div>

      <div className={`ow-modal-overlay ${receiptTxn ? 'open' : ''}`} onClick={() => setReceiptTxn(null)}>
        {receiptTxn && (
          <div onClick={(e) => e.stopPropagation()}>{renderReceiptModal()}</div>
        )}
      </div>
    </div>
  )
}
