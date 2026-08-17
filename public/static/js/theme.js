// Shared dark/light theme toggle, used on the landing page, the dashboard
// app shell, and every static marketing subpage (about/help/contact/legal).
(function () {
  function apply(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    document.querySelectorAll('#themeToggleBtn, .top-icon-btn[aria-label="Toggle theme"]').forEach(function (btn) {
      btn.textContent = theme === 'light' ? '☀️' : '🌙';
    });
  }

  function current() {
    try { return localStorage.getItem('chapo_theme') || 'dark'; } catch (e) { return 'dark'; }
  }

  function toggle() {
    const next = current() === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('chapo_theme', next); } catch (e) {}
    apply(next);
  }

  document.addEventListener('DOMContentLoaded', function () {
    apply(current());
  });

  window.ChapoTheme = { toggle, apply, current };
})();
