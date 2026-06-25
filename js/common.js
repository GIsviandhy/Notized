// ─── COMMON UTILITIES & SHARED FUNCTIONS ────────────────────────────────────

// Ensure notized_users array always exists
if (!localStorage.getItem('notized_users')) {
  localStorage.setItem('notized_users', JSON.stringify([]));
}

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ─── ESCAPE UTILITY ──────────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

// ─── SLEEP UTILITY ───────────────────────────────────────────────────────────
function sleep(ms) { 
  return new Promise(r => setTimeout(r, ms)); 
}

// ─── STORAGE MANAGEMENT ──────────────────────────────────────────────────────
function getLibraryData() {
  const data = localStorage.getItem('notized_library');
  if (data) return JSON.parse(data);

  const freshLibrary = {
    "root_files": {},
    "folders": {}
  };
  localStorage.setItem('notized_library', JSON.stringify(freshLibrary));
  return freshLibrary;
}

// ─── PDF EXTRACTION ──────────────────────────────────────────────────────────
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageStrings = content.items.map(item => item.str);
    fullText += pageStrings.join(" ") + "\n\n";
  }
  return fullText;
}

if (!document.getElementById('shared-auth-modal-styles')) {
  const authStyle = document.createElement('style');
  authStyle.id = 'shared-auth-modal-styles';
  authStyle.textContent = `
    #auth-modal.modal-overlay {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(28, 26, 22, 0.42);
      backdrop-filter: blur(2px);
      z-index: 999999;
      padding: 1.25rem;
    }
    #auth-modal .modal-card {
      width: 100%;
      max-width: 380px;
      background: var(--white, #ffffff);
      border: 1px solid var(--border, rgba(28,26,22,0.1));
      border-radius: 16px;
      box-shadow: 0 12px 40px rgba(28,26,22,0.16);
      padding: 2rem;
    }
    #auth-modal .modal-title {
      font-size: 20px;
      color: var(--text-primary, #1C1A16);
      margin-bottom: 0.4rem;
    }
    #auth-modal .modal-subtitle {
      font-size: 13.5px;
      color: var(--text-muted, #6B6760);
      line-height: 1.45;
      margin-bottom: 1.25rem;
    }
    #auth-modal .modal-input {
      width: 100%;
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      border: 1px solid var(--border, rgba(28,26,22,0.1));
      background: var(--bg-app, #F6F4EF);
      color: var(--text-primary, #1C1A16);
      font: inherit;
      outline: none;
    }
    #auth-modal .modal-input:focus {
      border-color: var(--primary, #528d5c);
      box-shadow: 0 0 0 1px var(--primary, #528d5c);
    }
    #auth-modal .input-group {
      margin-bottom: 1rem;
    }
    #auth-modal .form-label {
      display: block;
      margin-bottom: 0.35rem;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted, #6B6760);
    }
    #auth-modal .modal-actions {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      margin-top: 1.25rem;
    }
    #auth-modal .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1rem;
      border: none;
      border-radius: 8px;
      background: var(--primary, #528d5c);
      color: #ffffff;
      font-weight: 600;
      font-size: 13.5px;
      box-shadow: 0 2px 8px rgba(82, 141, 92, 0.18);
      cursor: pointer;
    }
    #auth-modal .btn-primary:hover {
      background: var(--primary-hover, #3e8a4a);
      transform: translateY(-1px);
    }
    #auth-modal .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.65rem 1rem;
      border: 1px solid var(--border, rgba(28,26,22,0.1));
      border-radius: 8px;
      background: rgba(28,26,22,0.05);
      color: var(--text-primary, #1C1A16);
      font-weight: 600;
      font-size: 13.5px;
      cursor: pointer;
    }
    #auth-modal .btn-secondary:hover {
      background: rgba(28,26,22,0.1);
    }
    #auth-modal .btn-primary,
    #auth-modal .btn-secondary {
      width: 100%;
      justify-content: center;
    }
    #auth-modal .modal-switch a {
      color: var(--primary, #528d5c);
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }
    #auth-modal .modal-switch a:hover {
      text-decoration: underline;
    }
  `;
  document.head.appendChild(authStyle);
}

let sharedAuthMode = 'login';

function ensureAuthModal() {
  if (document.getElementById('auth-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-card auth-card animate-scale" style="max-width:380px;">
      <h3 class="serif modal-title" id="auth-modal-title">Welcome Back</h3>
      <p class="modal-subtitle" id="auth-modal-desc">Log in to sync your study notes across devices.</p>
      <form id="auth-form" onsubmit="handleAuthSubmit(event)">
        <div id="auth-field-name" class="input-group" style="display:none;">
          <label class="form-label">Full Name</label>
          <input type="text" id="auth-input-name" placeholder="e.g., Laurensia" class="modal-input">
        </div>
        <div class="input-group">
          <label class="form-label">Email Address</label>
          <input type="email" id="auth-input-email" required placeholder="username@gmail.com" class="modal-input">
        </div>
        <div class="input-group">
          <label class="form-label">Password</label>
          <input type="password" id="auth-input-password" required placeholder="••••••••" class="modal-input">
        </div>
        <div id="auth-error" class="error-msg" style="display:none; margin-top:-0.25rem; margin-bottom:0.75rem;"></div>
        <button type="submit" id="auth-btn-submit" class="btn-primary" style="width:100%; justify-content:center; margin-top:0.25rem;">Log In</button>
        <button type="button" class="btn-secondary" onclick="closeAuthModal()" style="width:100%; margin-top:0.65rem;">Cancel</button>
      </form>
      <div class="modal-switch" style="margin-top:1rem; text-align:center; font-size:13px; color:var(--text-muted);">
        <span id="auth-switch-text">Don't have an account?</span>
        <a href="#" onclick="toggleAuthMode(); return false;" id="auth-switch-link"> Sign Up Free</a>
      </div>
    </div>
  `;

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeAuthModal();
  });

  document.body.appendChild(modal);
}

function setAuthError(message) {
  const errorEl = document.getElementById('auth-error');
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

function clearAuthError() {
  const errorEl = document.getElementById('auth-error');
  if (!errorEl) return;
  errorEl.textContent = '';
  errorEl.style.display = 'none';
}

function openAuthModal(mode = 'login') {
  ensureAuthModal();

  sharedAuthMode = mode;
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  const titleEl = document.getElementById('auth-modal-title');
  const descEl = document.getElementById('auth-modal-desc');
  const nameField = document.getElementById('auth-field-name');
  const nameInput = document.getElementById('auth-input-name');
  const submitBtn = document.getElementById('auth-btn-submit');
  const switchText = document.getElementById('auth-switch-text');
  const switchLink = document.getElementById('auth-switch-link');
  const form = document.getElementById('auth-form');

  if (form) form.reset();
  clearAuthError();

  if (sharedAuthMode === 'login') {
    if (titleEl) titleEl.textContent = 'Welcome Back';
    if (descEl) descEl.textContent = 'Log in to sync your study notes across devices.';
    if (nameField) nameField.style.display = 'none';
    if (nameInput) nameInput.removeAttribute('required');
    if (submitBtn) submitBtn.textContent = 'Log In';
    if (switchText) switchText.textContent = "Don't have an account?";
    if (switchLink) switchLink.textContent = ' Sign Up Free';
  } else {
    if (titleEl) titleEl.textContent = 'Create Account';
    if (descEl) descEl.textContent = 'Join Notized to optimize your notes and learning paths.';
    if (nameField) nameField.style.display = 'block';
    if (nameInput) nameInput.setAttribute('required', 'true');
    if (submitBtn) submitBtn.textContent = 'Create Account';
    if (switchText) switchText.textContent = 'Already have an account?';
    if (switchLink) switchLink.textContent = ' Log In';
  }

  modal.style.display = 'flex';
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'none';
  clearAuthError();
}

function toggleAuthMode() {
  openAuthModal(sharedAuthMode === 'login' ? 'signup' : 'login');
}

function handleAuthSubmit(event) {
  event.preventDefault();

  const email = (document.getElementById('auth-input-email')?.value || '').trim().toLowerCase();
  const password = document.getElementById('auth-input-password')?.value || '';
  const users = JSON.parse(localStorage.getItem('notized_users') || '[]');

  clearAuthError();

  if (!email || !password) {
    setAuthError('Please enter your email and password.');
    return;
  }

  if (sharedAuthMode === 'signup') {
    const name = (document.getElementById('auth-input-name')?.value || '').trim();
    if (!name) {
      setAuthError('Please enter your full name.');
      return;
    }
    if (users.some(u => u.email === email)) {
      setAuthError('An account with this email already exists.');
      return;
    }

    const newUser = { id: 'usr_' + Date.now(), name, email, password };
    users.push(newUser);
    localStorage.setItem('notized_users', JSON.stringify(users));
    localStorage.setItem('notized_currentUser', JSON.stringify(newUser));
    localStorage.setItem('currentUser', JSON.stringify(newUser));
  } else {
    const matchedUser = users.find(u => u.email === email && u.password === password);
    if (!matchedUser) {
      setAuthError('Invalid email or password.');
      return;
    }
    localStorage.setItem('notized_currentUser', JSON.stringify(matchedUser));
    localStorage.setItem('currentUser', JSON.stringify(matchedUser));
  }

  closeAuthModal();
  localStorage.removeItem('notizedData');
  localStorage.removeItem('notized_target_folder');
  window.location.href = 'dashboard.html';
}

// Render auth nav: Dashboard + Profile if logged in, else Log In button
function renderGlobalNavAuth() {
  const container = document.getElementById('nav-auth-container');
  if (!container) return;
  
  const user = JSON.parse(localStorage.getItem('notized_currentUser') || localStorage.getItem('currentUser') || 'null');
  
  if (user && user.name) {
    // User is logged in: Tampilkan Dashboard membulat + avatar sejajar horizontal
    const initial = user.name.charAt(0).toUpperCase();
    container.innerHTML = `
      <button class="btn-nav-secondary" onclick="location.href='dashboard.html'" style="
        background: transparent; 
        border: 1px solid var(--border, #e2e8f0); 
        padding: 0.5rem 1.2rem; 
        border-radius: 20px; 
        cursor: pointer; 
        font-size: 13px; 
        font-weight: 500;
        transition: background 0.2s;
      " onmouseover="this.style.background='rgba(0,0,0,0.03)'" onmouseout="this.style.background='transparent'">
        Dashboard
      </button>
      <div id="user-avatar-circle" onclick="toggleProfileDropdown(event)" style="
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: var(--sage, #6B8F71);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        user-select: none;
      ">${initial}</div>
    `;
    const dn = document.getElementById('dropdown-user-name');
    const de = document.getElementById('dropdown-user-email');
    if (dn) dn.textContent = user.name;
    if (de) de.textContent = user.email || '';
  } else {
    container.innerHTML = `
      <button class="btn-nav-solid" onclick="openAuthModal('login')" style="
        background-color: var(--primary); 
        color: #ffffff; 
        border: none; 
        padding: 0.6rem 1.4rem; 
        border-radius: 20px; 
        font-size: 14px; 
        font-weight: 600; 
        cursor: pointer; 
        box-shadow: 0 2px 8px rgba(82, 141, 92, 0.2);
        transition: all 0.2s ease;
      " onmouseover="this.style.backgroundColor='var(--primary-hover)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(62, 138, 74, 0.3)';" 
        onmouseout="this.style.backgroundColor='var(--primary)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(82, 141, 92, 0.2)';">
        Log In
      </button>
    `;
  }
  
  // Sembunyikan dropdown secara default
  const dd = document.getElementById('profile-dropdown-card');
  if (dd) dd.style.display = 'none';
}
