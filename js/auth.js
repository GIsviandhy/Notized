// ─── AUTHENTICATION AND CONSOLE ROUTING LOGIC ─────────────────────────────

// Setup mock account database structure on initialization
if (!localStorage.getItem('notized_users')) {
  localStorage.setItem('notized_users', JSON.stringify([]));
}

let currentAuthMode = 'login'; // 'login' | 'register'

// Fungsi helper pembuat pesan error dinamis di bawah input
function getOrCreateErrorEl(inputEl, id) {
  if (!inputEl) return null;
  let errEl = document.getElementById(id);
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.id = id;
    errEl.style.cssText = 'color: #ef4444; font-size: 12px; margin-top: 4px; display: none; text-align: left;';
    inputEl.parentNode.insertBefore(errEl, inputEl.nextSibling);
  }
  return errEl;
}

// ─── LIVE VALIDATION SAAT MENGETIK ───
window.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('auth-email');
  const passInput = document.getElementById('auth-password');
  const nameInput = document.getElementById('auth-name');
  const globalErrorEl = document.getElementById('auth-error');

  function validateLive() {
    if (globalErrorEl) globalErrorEl.style.display = 'none'; // Sembunyikan error submit global
    
    const nameErr = getOrCreateErrorEl(nameInput, 'err-name-live');
    const emailErr = getOrCreateErrorEl(emailInput, 'err-email-live');
    const passErr = getOrCreateErrorEl(passInput, 'err-pass-live');

    // Validasi Register Name
    if (currentAuthMode === 'register' && nameInput && nameInput.value.trim().length > 0 && nameInput.value.trim().length < 3) {
      if(nameErr) { nameErr.textContent = "Username must be at least 3 characters."; nameErr.style.display = 'block'; }
    } else {
      if(nameErr) nameErr.style.display = 'none';
    }

    // Validasi Format Email
    if (emailInput && emailInput.value.length > 0 && !emailInput.value.includes('@')) {
      if(emailErr) { emailErr.textContent = "Please include an '@' in the email address."; emailErr.style.display = 'block'; }
    } else {
      if(emailErr) emailErr.style.display = 'none';
    }

    // Validasi Panjang Password
    if (passInput && passInput.value.length > 0 && passInput.value.length < 4) {
      if(passErr) { passErr.textContent = "Password must be at least 4 characters."; passErr.style.display = 'block'; }
    } else {
      if(passErr) passErr.style.display = 'none';
    }
  }

  if (emailInput) emailInput.addEventListener('input', validateLive);
  if (passInput) passInput.addEventListener('input', validateLive);
  if (nameInput) nameInput.addEventListener('input', validateLive);
});

function openAuthModal(mode, loadExample = false) {
  currentAuthMode = mode;
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  
  modal.style.display = 'flex';
  switchAuthTab(mode);
  
  if (loadExample) {
    localStorage.setItem('notized_loadExampleFlag', 'true');
  } else {
    localStorage.removeItem('notized_loadExampleFlag');
  }
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'none';
  document.getElementById('auth-error').style.display = 'none';
  
  // Bersihkan error live saat ditutup
  ['err-name-live', 'err-email-live', 'err-pass-live'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.style.display = 'none';
  });
}

function switchAuthTab(mode) {
  currentAuthMode = mode;
  document.getElementById('tab-login').classList.toggle('active', mode === 'login');
  document.getElementById('tab-register').classList.toggle('active', mode === 'register');
  
  const nameField = document.getElementById('field-name');
  const descText = document.getElementById('auth-description');
  const submitBtn = document.getElementById('btn-auth-submit');
  
  if (mode === 'login') {
    if (nameField) nameField.style.display = 'none';
    descText.textContent = "Sign in to access your saved notes and directory trees.";
    submitBtn.textContent = "Sign In";
    document.getElementById('auth-name').removeAttribute('required');
  } else {
    if (nameField) nameField.style.display = 'block';
    descText.textContent = "Create an account to isolate and customize folder pathways.";
    submitBtn.textContent = "Create Account";
    document.getElementById('auth-name').setAttribute('required', 'required');
  }
}

function handleAuthSubmit(event) {
  event.preventDefault();
  
  // Cegah submit jika masih ada error live yang tampil
  const liveErrors = ['err-name-live', 'err-email-live', 'err-pass-live'];
  for (let id of liveErrors) {
      let el = document.getElementById(id);
      if (el && el.style.display === 'block') return;
  }

  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  const password = document.getElementById('auth-password').value;
  const errorEl = document.getElementById('auth-error');
  
  if (!email || !password) return;
  if (errorEl) errorEl.style.display = 'none';
  
  let users = JSON.parse(localStorage.getItem('notized_users'));
  
  if (currentAuthMode === 'register') {
    const name = document.getElementById('auth-name').value.trim();
    if (!name) return;
    
    if (users.some(u => u.email === email)) {
      errorEl.textContent = "An account with this email already exists.";
      errorEl.style.display = 'block';
      return;
    }
    
    const newUser = { id: 'usr_' + Date.now(), name: name, email: email, password: password };
    users.push(newUser);
    localStorage.setItem('notized_users', JSON.stringify(users));
    localStorage.setItem('notized_currentUser', JSON.stringify(newUser));
  } else {
    const matchedUser = users.find(u => u.email === email && u.password === password);
    if (!matchedUser) {
      errorEl.textContent = "Invalid email credentials or password matching constraint.";
      errorEl.style.display = 'block';
      return;
    }
    localStorage.setItem('notized_currentUser', JSON.stringify(matchedUser));
  }
  
  const exampleFlag = localStorage.getItem('notized_loadExampleFlag');
  if (exampleFlag === 'true') {
    localStorage.removeItem('notized_loadExampleFlag');
    window.location.href = 'dashboard.html?loadExample=true';
  } else {
    window.location.href = 'dashboard.html';
  }
}

function handleLogout() {
  localStorage.removeItem('notized_currentUser');
  window.location.href = 'index.html';
}

// ─── TRY SAMPLE TANPA LOGIN (GUEST MURNI) ───
function handleTrySampleBypass() {
  localStorage.removeItem('notized_currentUser');
  window.location.href = 'dashboard.html?loadExample=true';
}

window.addEventListener('DOMContentLoaded', () => {
  const greetingEl = document.getElementById('user-greeting');
  if (greetingEl) {
    const user = JSON.parse(localStorage.getItem('notized_currentUser'));
    if (user && user.name) {
      greetingEl.textContent = `Hello, ${user.name}`;
    }
  }
});