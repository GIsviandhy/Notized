/* ==========================================================================
   NOTIZED — LANDING PAGE SCRIPT
   Auth: notized_currentUser + notized_users (sync dengan auth.js & dashboard.js)
   ========================================================================== */

/* ── Global State ── */
let currentAuthMode = "login";

/* ── Initialization ── */
window.addEventListener('DOMContentLoaded', () => {
  // Clear ONLY auth data on logout redirect, preserve notes
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('logout')) {
    localStorage.removeItem('notized_currentUser');
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
  }
  
  // If redirected from input.html with openLogin=true, auto-open the login modal
  if (urlParams.get('openLogin') === 'true') {
    setTimeout(() => {
      if (typeof openAuthModal === 'function') {
        openAuthModal('login');
      }
    }, 100);
  }
  
  // Render auth UI based on current login state
  if (typeof renderGlobalNavAuth === 'function') {
    setTimeout(() => {
      renderGlobalNavAuth();
    }, 50);
  }
});

/* ── Profile Dropdown ── */
function toggleProfileDropdown(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('profile-dropdown-card');
  if (!dropdown) return;
  dropdown.style.display =
    (dropdown.style.display === 'none' || !dropdown.style.display) ? 'flex' : 'none';
}

window.addEventListener('click', () => {
  const dropdown = document.getElementById('profile-dropdown-card');
  if (dropdown) dropdown.style.display = 'none';
});

document.addEventListener('DOMContentLoaded', () => {
  const card = document.getElementById('profile-dropdown-card');
  if (card) card.addEventListener('click', e => e.stopPropagation());
});

/* ── Auth Modal ── */
function openAuthModal(mode = "login") {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  currentAuthMode = mode;
  modal.style.display = 'flex';

  const titleEl    = document.getElementById('auth-modal-title');
  const descEl     = document.getElementById('auth-modal-desc');
  const nameField  = document.getElementById('auth-field-name');
  const submitBtn  = document.getElementById('auth-btn-submit');
  const switchText = document.getElementById('auth-switch-text');
  const switchLink = document.getElementById('auth-switch-link');
  const authForm   = document.getElementById('auth-form');

  if (authForm) authForm.reset();

  if (currentAuthMode === "login") {
    if (titleEl)    titleEl.textContent    = "Welcome Back";
    if (descEl)     descEl.textContent     = "Log in to sync your study notes across devices.";
    if (nameField)  nameField.style.display = 'none';
    const nameInput = document.getElementById('auth-input-name');
    if (nameInput)  nameInput.removeAttribute('required');
    if (submitBtn)  submitBtn.textContent  = "Log In";
    if (switchText) switchText.textContent = "Don't have an account?";
    if (switchLink) switchLink.textContent = " Sign Up Free";
  } else {
    if (titleEl)    titleEl.textContent    = "Create Account";
    if (descEl)     descEl.textContent     = "Join Notized to optimize your notes and learning paths.";
    if (nameField)  nameField.style.display = 'flex';
    const nameInput = document.getElementById('auth-input-name');
    if (nameInput)  nameInput.setAttribute('required', 'true');
    if (submitBtn)  submitBtn.textContent  = "Create Account";
    if (switchText) switchText.textContent = "Already have an account?";
    if (switchLink) switchLink.textContent = " Log In";
  }
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'none';
}

function toggleAuthMode() {
  openAuthModal(currentAuthMode === "login" ? "signup" : "login");
}

/* ── Auth Submit: pakai notized_users localStorage (sama dengan auth.js) ── */
function handleAuthSubmit(event) {
  event.preventDefault();

  const email    = document.getElementById('auth-input-email').value.trim().toLowerCase();
  const password = document.getElementById('auth-input-password').value;
  let   users    = JSON.parse(localStorage.getItem('notized_users') || '[]');

  if (currentAuthMode === "login") {
    const matched = users.find(u => u.email === email && u.password === password);
    if (!matched) { showCustomAlert("Invalid email or password."); return; }
    _saveSession(matched);
    closeAuthModal();
    if (typeof renderGlobalNavAuth === 'function') renderGlobalNavAuth();
    localStorage.removeItem('notizedData');
    localStorage.removeItem('notized_target_folder');

    window.location.href = 'dashboard.html';

  } else {
    const nameInput = document.getElementById('auth-input-name');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) { showCustomAlert("Please enter your full name."); return; }
    if (users.some(u => u.email === email)) {
      showCustomAlert("An account with this email already exists.");
      return;
    }
    const newUser = { id: 'usr_' + Date.now(), name, email, password };
    users.push(newUser);
    localStorage.setItem('notized_users', JSON.stringify(users));
    _saveSession(newUser);
    closeAuthModal();
    if (typeof renderGlobalNavAuth === 'function') renderGlobalNavAuth();
    localStorage.removeItem('notizedData');
    localStorage.removeItem('notized_target_folder');

    window.location.href = 'dashboard.html';
  }
}

/* Simpan sesi ke kedua key agar sync dengan dashboard.js & auth.js */
function _saveSession(user) {
  localStorage.setItem('notized_currentUser', JSON.stringify(user));
  localStorage.setItem('currentUser', JSON.stringify(user));
}

/* ── Logout ── */
function handleLogOut() {
  // Clear ONLY auth data, preserve notes library
  localStorage.removeItem('notized_currentUser');
  localStorage.removeItem('currentUser');
  sessionStorage.removeItem('notized_greeted');
  sessionStorage.clear();
  const dd = document.getElementById('profile-dropdown-card');
  if (dd) dd.style.display = 'none';
  if (typeof renderGlobalNavAuth === 'function') renderGlobalNavAuth();
  // Force full page reload to ensure fresh state
  setTimeout(() => {
    window.location.href = 'index.html?t=' + Date.now();
  }, 100);
}

/* ── Change Password (landing page) ── */
function openLCPModal() {
  ['lcp-current', 'lcp-new', 'lcp-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.type = 'password'; }
  });
  const errEl = document.getElementById('lcp-error');
  const okEl  = document.getElementById('lcp-success');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  if (okEl)  okEl.style.display = 'none';

  const dd = document.getElementById('profile-dropdown-card');
  if (dd) dd.style.display = 'none';

  const modal = document.getElementById('cp-modal');
  if (modal) modal.classList.add('active');
}

function closeLCPModal() {
  const modal = document.getElementById('cp-modal');
  if (modal) modal.classList.remove('active');
}

function lcpToggleEye(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.innerHTML = isHidden
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

function confirmLCP() {
  const currentVal = (document.getElementById('lcp-current')?.value || '').trim();
  const newVal     = (document.getElementById('lcp-new')?.value || '').trim();
  const confirmVal = (document.getElementById('lcp-confirm')?.value || '').trim();
  const errEl      = document.getElementById('lcp-error');
  const okEl       = document.getElementById('lcp-success');

  const showErr = msg => { errEl.textContent = msg; errEl.style.display = 'block'; okEl.style.display = 'none'; };
  errEl.style.display = 'none';
  okEl.style.display  = 'none';

  if (!currentVal || !newVal || !confirmVal) return showErr('Please fill in all fields.');
  if (newVal.length < 6)                      return showErr('New password must be at least 6 characters.');
  if (newVal !== confirmVal)                  return showErr('New passwords do not match.');

  const currentUser = JSON.parse(localStorage.getItem('notized_currentUser') || 'null');
  if (!currentUser) return showErr('Session expired. Please log in again.');

  // Fallback: look up password from notized_users if not present on session object
  const users = JSON.parse(localStorage.getItem('notized_users') || '[]');
  const userRecord = users.find(u => u.id === currentUser.id || u.email === currentUser.email);
  const storedPassword = currentUser.password !== undefined ? currentUser.password : (userRecord ? userRecord.password : undefined);

  if (storedPassword === undefined) return showErr('Password data not found. Please log out and log in again.');
  if (storedPassword !== currentVal) return showErr('Current password is incorrect.');
  if (newVal === currentVal)         return showErr('New password must differ from your current one.');

  const idx = users.findIndex(u => u.id === currentUser.id || u.email === currentUser.email);
  if (idx !== -1) {
    users[idx].password = newVal;
    localStorage.setItem('notized_users', JSON.stringify(users));
  }
  currentUser.password = newVal;
  _saveSession(currentUser);

  okEl.style.display = 'block';
  ['lcp-current', 'lcp-new', 'lcp-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  setTimeout(() => closeLCPModal(), 1800);
}

/* ── Custom Alert ── */
function showCustomAlert(message) {
  const modal = document.getElementById('custom-alert-modal');
  const msg   = document.getElementById('custom-alert-message');
  if (modal && msg) { msg.textContent = message; modal.style.display = 'flex'; }
}

function closeCustomAlert() {
  const modal = document.getElementById('custom-alert-modal');
  if (modal) modal.style.display = 'none';
}

/* ── Scroll Reveal ── */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
