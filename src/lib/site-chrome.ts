// Shared header/footer + <head> boilerplate for all public marketing pages
// (landing "/", /about, /help, /contact, /privacy-policy, /terms).
// Keeps nav/footer/theme-toggle consistent across every page, matching the
// persistent-nav pattern SlipCraft uses across its Home/Help/About/Contact pages.

export const CONTACT = {
  whatsappDisplay: '+234 705 660 6129',
  whatsappHref: 'https://wa.me/2347056606129',
  email: 'support@chaposhub.com'
}

export function siteHead(opts: { title: string; description: string; path: string }): string {
  const { title, description, path } = opts
  const url = `https://chaposhub.pages.dev${path}`
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="theme-color" content="#0f0f14">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Chapo'sHub">
<meta property="og:image" content="https://chaposhub.pages.dev/static/images/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="https://chaposhub.pages.dev/static/images/og-image.png">
<link rel="icon" type="image/png" href="/static/images/logo.png">
<link rel="apple-touch-icon" href="/static/images/logo.png">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="/static/css/app.css" rel="stylesheet">
<script>(function(){try{var t=localStorage.getItem('chapo_theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();</script>`
}

export function siteHeader(activePath: string): string {
  const link = (href: string, label: string) =>
    `<a href="${href}"${activePath === href ? ' aria-current="page"' : ''}>${label}</a>`
  return `<header class="landing-header">
    <a href="/" class="landing-logo" style="text-decoration:none">🧾 Chapo'sHub</a>
    <nav class="landing-nav" aria-label="Site navigation">
      ${link('/help', 'Help')}
      ${link('/about', 'About')}
      ${link('/contact', 'Contact')}
    </nav>
    <div class="landing-header-right">
      <button class="landing-theme-btn" id="themeToggleBtn" onclick="window.ChapoTheme && window.ChapoTheme.toggle()" aria-label="Toggle dark/light theme" title="Toggle theme">🌙</button>
      <button class="landing-signin-btn" onclick="location.href='/?auth=login'">Sign In</button>
    </div>
  </header>`
}

export function siteFooter(): string {
  return `<footer class="site-footer">
    <div class="site-footer-grid">
      <div>
        <div class="site-footer-brand">🧾 Chapo'sHub</div>
        <p class="site-footer-tagline">A trusted points-based hub for generating branded receipts and digital tools. Simplify your workflow today.</p>
      </div>
      <div class="site-footer-col">
        <div class="site-footer-col-title">Resources</div>
        <a href="/help">Help Center</a>
        <a href="/privacy-policy">Privacy Policy</a>
        <a href="/terms">Terms &amp; Conditions</a>
      </div>
      <div class="site-footer-col">
        <div class="site-footer-col-title">Company</div>
        <a href="/about">About Us</a>
        <a href="/contact">Contact Us</a>
      </div>
      <div class="site-footer-col">
        <div class="site-footer-col-title">Contact Us</div>
        <a href="mailto:${CONTACT.email}">${CONTACT.email}</a>
        <a href="${CONTACT.whatsappHref}" target="_blank" rel="noopener">WhatsApp: ${CONTACT.whatsappDisplay}</a>
      </div>
    </div>
    <div class="site-footer-bottom">© 2026 Chapo'sHub. Receipts are simulated records for personal/demo use, not official proof of payment.</div>
  </footer>
  <script src="/static/js/theme.js"></script>`
}
