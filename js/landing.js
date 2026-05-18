// ─── 🔐 AUTHENTICATION & DATABASE SESSION SYSTEM (LANDING PAGE) ───
let currentAuthMode = "login";

// Jalankan pengecekan status login setiap kali landing page dibuka
window.addEventListener('DOMContentLoaded', () => {
  renderNavbarAuth();
});

// 🚨 ENGINE ALERT KUSTOM (MENGGANTIKAN ALERT LOCALHOST BROWSER)
function showCustomAlert(message) {
  const alertModal = document.getElementById('custom-alert-modal');
  const alertMessage = document.getElementById('custom-alert-message');
  if (alertModal && alertMessage) {
    alertMessage.textContent = message;
    alertModal.style.setProperty('display', 'flex', 'important');
  }
}

function closeCustomAlert() {
  const alertModal = document.getElementById('custom-alert-modal');
  if (alertModal) {
    alertModal.style.setProperty('display', 'none', 'important');
  }
}

// Fungsi mengambil list "database" user terdaftar dari localStorage
function getRegisteredUsers() {
  const users = localStorage.getItem('notized_users_db');
  return users ? JSON.parse(users) : [];
}

// Fungsi untuk merender ulang isi navbar
function renderNavbarAuth() {
  const container = document.getElementById('nav-auth-container');
  if (!container) return;

  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  if (currentUser && currentUser.name) {
    const initialLetter = currentUser.name.charAt(0).toUpperCase();

    container.innerHTML = `
      <div id="user-avatar-circle" onclick="toggleProfileDropdown(event)" style="width: 34px; height: 34px; border-radius: 50%; background: #6B8F71; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; cursor: pointer; box-shadow: var(--shadow-sm); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        ${initialLetter}
      </div>
    `;

    if (document.getElementById('dropdown-user-name')) document.getElementById('dropdown-user-name').textContent = currentUser.name;
    if (document.getElementById('dropdown-user-email')) document.getElementById('dropdown-user-email').textContent = currentUser.email;
  } else {
    container.innerHTML = `
      <button id="btn-login-trigger" class="btn-primary" onclick="openAuthModal('login')" style="padding: 0.5rem 1rem; font-size: 13px;">Log In</button>
    `;
    const dropdown = document.getElementById('profile-dropdown-card');
    if (dropdown) dropdown.style.display = 'none';
  }
}

// Buka tutup dropdown profil kartu melayang
function toggleProfileDropdown(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('profile-dropdown-card');
  if (!dropdown) return;

  if (dropdown.style.display === 'none' || dropdown.style.display === '') {
    dropdown.style.display = 'flex';
  } else {
    dropdown.style.display = 'none';
  }
}

// Tutup dropdown otomatis jika klik area luar layar
window.addEventListener('click', () => {
  const dropdown = document.getElementById('profile-dropdown-card');
  if (dropdown) dropdown.style.display = 'none';
});

// ─── 🔥 HANDLER VALIDATION & REGISTRATION DATA ───
function handleAuthSubmit(event) {
  event.preventDefault();
  
  const email = document.getElementById('auth-input-email').value.trim().toLowerCase();
  const password = document.getElementById('auth-input-password').value;
  let usersDb = getRegisteredUsers();

  if (currentAuthMode === "login") {
    const foundUser = usersDb.find(user => user.email === email);

    if (!foundUser) {
      // 🎯 MODAL ALERT KUSTOM
      showCustomAlert("Email belum terdaftar! Silakan klik 'Sign Up Free' di bawah untuk buat akun dulu ya.");
      return;
    }

    if (foundUser.password !== password) {
      // 🎯 MODAL ALERT KUSTOM
      showCustomAlert("Password salah! Silakan coba lagi.");
      return;
    }

    localStorage.setItem('currentUser', JSON.stringify({ name: foundUser.name, email: foundUser.email }));
    closeAuthModal();
    renderNavbarAuth();
    window.location.href = 'dashboard.html';

  } else {
    const nameInput = document.getElementById('auth-input-name');
    const name = nameInput ? nameInput.value.trim() : "User";

    if (!name) {
      showCustomAlert("Nama lengkap tidak boleh kosong!");
      return;
    }

    const isEmailExist = usersDb.some(user => user.email === email);
    if (isEmailExist) {
      // 🎯 MODAL ALERT KUSTOM
      showCustomAlert("Email ini sudah terdaftar! Silakan langsung ganti ke mode Log In.");
      return;
    }

    const newUser = { name: name, email: email, password: password };
    usersDb.push(newUser);
    localStorage.setItem('notized_users_db', JSON.stringify(usersDb));

    localStorage.setItem('currentUser', JSON.stringify({ name: name, email: email }));
    
    closeAuthModal();
    renderNavbarAuth();
    window.location.href = 'dashboard.html';
  }
}

// Fungsi tombol Log Out
function handleLogOut() {
  localStorage.removeItem('currentUser');
  renderNavbarAuth();
  window.location.reload();
}

// Kontrol Buka/Tutup Modal Auth
function openAuthModal(mode = "login") {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  currentAuthMode = mode;
  modal.style.display = 'flex';
  
  const titleEl = document.getElementById('auth-modal-title');
  const descEl = document.getElementById('auth-modal-desc');
  const nameField = document.getElementById('auth-field-name');
  const submitBtn = document.getElementById('auth-btn-submit');
  const switchText = document.getElementById('auth-switch-text');
  const switchLink = document.getElementById('auth-switch-link');
  
  document.getElementById('auth-form').reset();
  if (currentAuthMode === "login") {
    titleEl.textContent = "Welcome Back";
    descEl.textContent = "Log in to sync your study notes across devices.";
    nameField.style.display = 'none';
    document.getElementById('auth-input-name').removeAttribute('required');
    submitBtn.textContent = "Log In";
    switchText.textContent = "Don't have an account?";
    switchLink.textContent = "Sign Up Free";
  } else {
    titleEl.textContent = "Create Account";
    descEl.textContent = "Join Notized to optimize your notes and learning paths.";
    nameField.style.display = 'flex';
    document.getElementById('auth-input-name').setAttribute('required', 'true');
    submitBtn.textContent = "Create Account";
    switchText.textContent = "Already have an account?";
    switchLink.textContent = "Log In";
  }
}

// Menutup modal dengan aman
function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'none';
}

function toggleAuthMode() {
  if (currentAuthMode === "login") openAuthModal("signup");
  else openAuthModal("login");
}

// Testimonial Carousel Navigation
document.addEventListener('DOMContentLoaded', function() {
  const carousel = document.querySelector('.testimonial-carousel');
  const leftArrow = document.querySelector('.carousel-arrow-left');
  const rightArrow = document.querySelector('.carousel-arrow-right');
  
  if (carousel && leftArrow && rightArrow) {
    leftArrow.addEventListener('click', () => {
      carousel.scrollBy({ left: -420, behavior: 'smooth' });
    });
    
    rightArrow.addEventListener('click', () => {
      carousel.scrollBy({ left: 420, behavior: 'smooth' });
    });
  }
});
