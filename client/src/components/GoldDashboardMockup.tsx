import React from 'react'
import CountUp from './CountUp'

// Static illustrative dashboard mockup used by both the Hero visual and the
// Dashboard Preview section of the new gold-luxury homepage. Deliberately a
// simplified illustration (not a literal re-render of the real Dashboard),
// styled entirely with `.gh-mockup*` classes.
//
// Branding note: the gold "eJ" logo is used here ONLY at small brand-mark
// scale (topbar + sidebar), per the user's explicit request to avoid
// repeating/enlarging the firearm-shaped logo element elsewhere in the UI.
const SIDEBAR_ITEMS = [
  'Dashboard',
  'AI Reply',
  'Instant Generation',
  'Receipt Generator',
  'Orders',
  'History',
  'Points',
  'Support'
]

const ACTIVITY = [
  { text: '🧾 Receipt generated · PayPal', time: '2m ago' },
  { text: '✉️ Flash email sent', time: '14m ago' },
  { text: '🔐 Login page created', time: '38m ago' },
  { text: '📊 Activity synced', time: '1h ago' }
]

export default function GoldDashboardMockup({ large = false }: { large?: boolean }) {
  return (
    <div className="gh-mockup">
      <div className="gh-mockup-topbar">
        <div className="gh-mockup-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="gh-mockup-topbar-brand">
          <img src="/images/logo-mark.png" alt="" width={20} height={20} />
          ChaposHub
        </div>
        <div className="gh-mockup-topbar-pts">⭐ 2,450 pts</div>
      </div>
      <div className="gh-mockup-body">
        <div className="gh-mockup-sidebar">
          <div className="gh-mockup-sidebar-brand">
            <img src="/images/logo-mark.png" alt="" />
            ChaposHub
          </div>
          {SIDEBAR_ITEMS.map((item, i) => (
            <div className={`gh-mockup-nav-item${i === 0 ? ' active' : ''}`} key={item}>
              <span className="dot" />
              {item}
            </div>
          ))}
        </div>
        <div className="gh-mockup-main">
          <div className="gh-mockup-cards">
            <div className="gh-mockup-card">
              <div className="lbl">Total Activities</div>
              <div className="val">
                <CountUp target={806095} suffix="+" />
              </div>
            </div>
            <div className="gh-mockup-card">
              <div className="lbl">Happy Users</div>
              <div className="val">
                <CountUp target={401212} suffix="+" />
              </div>
            </div>
            <div className="gh-mockup-card">
              <div className="lbl">Emails Sent</div>
              <div className="val">
                <CountUp target={595986} suffix="+" />
              </div>
            </div>
          </div>
          <div className="gh-mockup-activity-title">Recent Activity</div>
          {ACTIVITY.slice(0, large ? 4 : 3).map((a) => (
            <div className="gh-mockup-activity-row" key={a.text}>
              <span className="gh-mockup-activity-text">{a.text}</span>
              <span className="gh-mockup-activity-time">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
