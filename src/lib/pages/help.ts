import { siteHead, siteHeader, siteFooter } from '../site-chrome'

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What are these receipts for?',
    a: "Chapo'sHub receipts are simulated, branded records for personal bookkeeping, invoicing your own customers, and demo/testing purposes. They are not issued by PayPal, Binance, or any platform they're styled after, and are not intended to be submitted as official proof of payment to a third party."
  },
  {
    q: 'Do I need a credit card to sign up?',
    a: 'No. Every new account gets 245 free points instantly, no card required. You only pay if/when you want to top up points.'
  },
  {
    q: 'Can I customize the receipt branding?',
    a: 'Yes — pick a platform preset for instant styling, or use the generic template and set your own store name, currency, tax rate, and line items.'
  },
  {
    q: 'How does the points system work?',
    a: 'Every account starts with 245 free points. Actions like downloading, printing, emailing, or generating an AI reply each cost a small number of points. Top up anytime — points never expire and there\'s no recurring subscription.'
  },
  {
    q: 'What does the AI reply tool do?',
    a: "Paste in a customer's message, choose a tone (professional, friendly, casual, urgent, or apologetic), and get an instantly generated reply you can copy and send."
  },
  {
    q: 'How do I buy points?',
    a: 'Open the Points page from your dashboard and pick a package. Purchases are processed securely by Whop — you\'ll be taken to Whop\'s checkout, and points are credited to your account automatically once payment completes.'
  },
  {
    q: "I paid but didn't receive my points — what do I do?",
    a: 'This can happen if the email you used at Whop checkout doesn\'t match your Chapo\'sHub account email. Contact support with your order/payment ID and the email you used, and we\'ll reconcile it manually.'
  },
  {
    q: 'What is the Support Page Builder?',
    a: 'It lets you generate a branded contact page with your own company name, brand color, and contact channels (email, WhatsApp, Telegram) in one click — useful for giving customers a clean place to reach you.'
  },
  {
    q: 'Is my data secure?',
    a: 'All traffic is SSL encrypted, and your account data is stored in Cloudflare\'s distributed D1 database. We never store your password in plain text.'
  },
  {
    q: 'Can I delete my account or receipts?',
    a: 'Yes — you can delete individual receipts from your History page. For full account deletion, contact support and we\'ll process the request.'
  }
]

export function helpPageHtml(): string {
  const faqItems = FAQS.map(
    (f, i) => `<details class="landing-faq-item" data-faq-index="${i}">
      <summary>${f.q}</summary>
      <p>${f.a}</p>
    </details>`
  ).join('\n    ')

  return `<!DOCTYPE html>
<html lang="en">
<head>
${siteHead({
  title: "Help Center — Chapo'sHub",
  description: "Find answers to common questions about Chapo'sHub's receipt generator, points system, AI replies, and support page builder.",
  path: '/help'
})}
</head>
<body class="landing-mode">
${siteHeader('/help')}

<main class="subpage" role="main">
  <section class="subpage-hero">
    <div class="subpage-eyebrow">Help Center</div>
    <h1 class="subpage-title">How can we help you?</h1>
    <p class="subpage-sub">Find answers to common questions below, or reach out to our support team directly.</p>
  </section>

  <section class="subpage-section" aria-label="Frequently asked questions">
    <div class="help-search">
      <input type="text" id="faqSearch" placeholder="Search the help center..." aria-label="Search FAQs">
    </div>
    <div id="faqList">
    ${faqItems}
    </div>
    <div class="help-faq-empty" id="faqEmpty">No results found. Try a different search, or <a href="/contact" style="color:var(--accent-light)">contact us</a> directly.</div>
  </section>

  <section class="subpage-section" style="text-align:center">
    <h2>Still need help?</h2>
    <p>Our support team is ready to assist you via WhatsApp or email.</p>
    <button class="landing-cta-primary" style="margin:0 auto" onclick="location.href='/contact'">Contact Support</button>
  </section>
</main>

${siteFooter()}
<script>
(function () {
  var input = document.getElementById('faqSearch');
  var items = Array.prototype.slice.call(document.querySelectorAll('#faqList .landing-faq-item'));
  var empty = document.getElementById('faqEmpty');
  input.addEventListener('input', function () {
    var q = input.value.trim().toLowerCase();
    var visibleCount = 0;
    items.forEach(function (item) {
      var text = item.textContent.toLowerCase();
      var match = !q || text.indexOf(q) !== -1;
      item.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    empty.style.display = visibleCount === 0 ? 'block' : 'none';
  });
})();
</script>
</body>
</html>`
}
