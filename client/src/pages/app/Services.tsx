import React from 'react'
import PageHeader from '../../components/PageHeader'
import { usePage } from '../../contexts/PageContext'
import { allServices, isFaIcon } from '../../lib/config'

// Ported from `#page-services` + renderServicesGrid() in public/static/js/app.js.
export default function Services() {
  const { goTo, goToReceiptsWithPlatform } = usePage()

  function serviceNavAction(s: (typeof allServices)[number]) {
    if (s.dedicated) goTo(s.key as any)
    else goToReceiptsWithPlatform(s.key)
  }

  return (
    <div className="page active" role="main" aria-label="Services">
      <PageHeader title="Chapo'sHub Services" icon="fa-solid fa-cart-shopping" />
      <div style={{ padding: '1rem' }}>
        <div className="service-grid">
          {allServices.map((s) => (
            <div className="service-card" key={s.key} onClick={() => serviceNavAction(s)}>
              <div
                className="service-logo"
                style={{ background: s.color || 'linear-gradient(135deg,#f97316,#fb923c)', color: 'white' }}
              >
                {isFaIcon(s.icon) ? <i className={s.icon}></i> : s.icon}
              </div>
              <div className="service-name">{s.name}</div>
              {s.new && <div className="service-new">New</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
