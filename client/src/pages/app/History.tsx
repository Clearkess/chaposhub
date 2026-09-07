import React, { useEffect, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { api, APIError } from '../../api/client'
import { relativeTime, isFaIcon } from '../../lib/config'
import { useAuth } from '../../contexts/AuthContext'

interface HistoryItem {
  type: string
  title: string
  desc: string
  icon: string
  color: string
  time: string
}

// Ported from `#page-history` + refreshHistory() in public/static/js/app.js.
export default function History() {
  const { logout } = useAuth()
  const [items, setItems] = useState<HistoryItem[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.getHistory()
        if (!cancelled) setItems(res)
      } catch (err) {
        if (cancelled) return
        if (err instanceof APIError && err.status === 401) {
          logout()
        } else {
          setError(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="page active" role="main" aria-label="History">
      <PageHeader title="Chapo'sHub History" icon="fa-solid fa-clock-rotate-left" />
      <div className="history-list">
        {error && (
          <div className="empty-state">
            <div className="empty-state-icon"><i className="fa-solid fa-triangle-exclamation"></i></div>
            <div className="empty-state-title">Could not load history</div>
          </div>
        )}
        {!error && items && items.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><i className="fa-solid fa-clock-rotate-left"></i></div>
            <div className="empty-state-title">No activity yet</div>
            <div className="empty-state-desc">Your actions will show up here.</div>
          </div>
        )}
        {!error &&
          items &&
          items.map((h, i) => (
            <div className="history-item" key={i}>
              <div className="history-icon" style={{ background: h.color }}>
                {isFaIcon(h.icon) ? <i className={h.icon}></i> : h.icon}
              </div>
              <div className="history-info">
                <div className="history-title">{h.title}</div>
                <div className="history-desc">{h.desc}</div>
              </div>
              <div className="history-time">{relativeTime(h.time)}</div>
            </div>
          ))}
      </div>
    </div>
  )
}
