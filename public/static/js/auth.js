// Chapo'sHub auth modal - login/register UI wired to the real API
(function () {
  let mode = 'login'; // 'login' | 'register'

  function el(id) { return document.getElementById(id); }

  function showError(msg) {
    const box = el('authError');
    box.textContent = msg;
    box.classList.add('show');
  }

  function clearError() {
    const box = el('authError');
    box.classList.remove('show');
    box.textContent = '';
  }

  function setMode(newMode) {
    mode = newMode;
    clearError();
    el('authTabLogin').classList.toggle('active', mode === 'login');
    el('authTabRegister').classList.toggle('active', mode === 'register');
    el('authUsernameField').style.display = mode === 'register' ? 'block' : 'none';
    el('authSubmitBtn').querySelector('.btn-label').textContent = mode === 'login' ? 'Log In' : 'Create Account';
    el('authTitle').textContent = mode === 'login' ? '👋 Welcome back' : '🚀 Join Chapo\'sHub';
    el('authSub').textContent = mode === 'login'
      ? 'Log in to access your receipts, points & AI tools.'
      : 'Create an account and get 245 free points to start.';
  }

  function setLoading(loading) {
    const btn = el('authSubmitBtn');
    btn.disabled = loading;
    btn.querySelector('.spinner').style.display = loading ? 'inline-block' : 'none';
    btn.querySelector('.btn-label').style.display = loading ? 'none' : 'inline';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    const email = el('authEmail').value.trim();
    const password = el('authPassword').value;
    const username = el('authUsername').value.trim();

    if (!email || !password) {
      showError('Please fill in all required fields.');
      return;
    }
    if (mode === 'register' && (!username || username.length < 3)) {
      showError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 8) {
      showError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await window.api.login(email, password);
      } else {
        await window.api.register(username, email, password);
      }
      hideAuthModal();
      if (window.ChapoApp && typeof window.ChapoApp.onAuthenticated === 'function') {
        await window.ChapoApp.onAuthenticated();
      }
    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function showAuthModal(initialMode) {
    setMode(initialMode === 'register' ? 'register' : 'login');
    el('authOverlay').classList.remove('hidden');
  }

  function hideAuthModal() {
    el('authOverlay').classList.add('hidden');
  }

  function logout() {
    window.api.logout();
    location.reload();
  }

  document.addEventListener('DOMContentLoaded', function () {
    el('authTabLogin').addEventListener('click', () => setMode('login'));
    el('authTabRegister').addEventListener('click', () => setMode('register'));
    el('authForm').addEventListener('submit', handleSubmit);
    el('authSwitchLink').addEventListener('click', (e) => {
      e.preventDefault();
      setMode(mode === 'login' ? 'register' : 'login');
    });
    setMode('login');
  });

  window.ChapoAuth = { showAuthModal, hideAuthModal, logout };
})();
