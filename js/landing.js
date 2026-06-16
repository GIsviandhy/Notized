/* ── Global State ── */
let currentAuthMode = "login";

/* ── Initialization ── */
window.addEventListener('DOMContentLoaded', () => {
  // Merender status auth pertama kali saat halaman dimuat
  if (typeof renderGlobalNavAuth === 'function') {
    renderGlobalNavAuth();
  }
});

/* ── Custom Alert Modal ── */
function showCustomAlert(message) {
  const alertModal = document.getElementById('custom-alert-modal');
  const alertMessage = document.getElementById('custom-alert-message');
  if (alertModal && alertMessage) {
    alertMessage.textContent = message;
    alertModal.style.setProperty('display', 'flex', 'important');
  }
}

// Tutup Custom Alert
function closeCustomAlert() {
  const alertModal = document.getElementById('custom-alert-modal');
  if (alertModal) {
    alertModal.style.setProperty('display', 'none', 'important');
  }
}

/* ── Profile Dropdown Card ── */
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

// Tutup dropdown otomatis jika klik di area luar profil
window.addEventListener('click', () => {
  const dropdown = document.getElementById('profile-dropdown-card');
  if (dropdown) dropdown.style.display = 'none';
});

// Mencegah dropdown menutup saat elemen di dalam dropdown itu sendiri diklik
document.addEventListener('DOMContentLoaded', () => {
  const profileDropdownCard = document.getElementById('profile-dropdown-card');
  if (profileDropdownCard) {
    profileDropdownCard.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
});

/* ── Authentication Modals ── */
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
  
  const authForm = document.getElementById('auth-form');
  if (authForm) authForm.reset();

  if (currentAuthMode === "login") {
    titleEl.textContent = "Welcome Back";
    descEl.textContent = "Log in to sync your study notes across devices.";
    if (nameField) nameField.style.display = 'none';
    
    const nameInput = document.getElementById('auth-input-name');
    if (nameInput) nameInput.removeAttribute('required');
    
    submitBtn.textContent = "Log In";
    if (switchText) switchText.textContent = "Don't have an account?";
    if (switchLink) switchLink.textContent = "Sign Up Free";
  } else {
    titleEl.textContent = "Create Account";
    descEl.textContent = "Join Notized to optimize your notes and learning paths.";
    if (nameField) nameField.style.display = 'flex';
    
    const nameInput = document.getElementById('auth-input-name');
    if (nameInput) nameInput.setAttribute('required', 'true');
    
    submitBtn.textContent = "Create Account";
    if (switchText) switchText.textContent = "Already have an account?";
    if (switchLink) switchLink.textContent = "Log In";
  }
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'none';
}

function toggleAuthMode() {
  if (currentAuthMode === "login") {
    openAuthModal("signup");
  } else {
    openAuthModal("login");
  }
}

/* ── Auth Form Handler (API XAMPP / MySQL Connection) ── */
async function handleAuthSubmit(event) {
  event.preventDefault();
  
  const email = document.getElementById('auth-input-email').value.trim().toLowerCase();
  const password = document.getElementById('auth-input-password').value;

  if (currentAuthMode === "login") {
    try {
      const response = await fetch('api.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      });
      const result = await response.json();

      if (result.status === "error") {
        showCustomAlert(result.message);
        return;
      }

      // DISINKRONKAN: Simpan ke notized_currentUser & currentUser sekaligus agar aman
      localStorage.setItem('notized_currentUser', JSON.stringify(result.user));
      localStorage.setItem('currentUser', JSON.stringify(result.user));
      
      closeAuthModal();
      
      if (typeof renderGlobalNavAuth === 'function') renderGlobalNavAuth();
      window.location.href = 'dashboard.html';

    } catch (error) {
      console.error("Error database login engine:", error);
      showCustomAlert("Terjadi gangguan koneksi ke database XAMPP.");
    }

  } else {
    const nameInput = document.getElementById('auth-input-name');
    const name = nameInput ? nameInput.value.trim() : "User";

    if (!name) {
      showCustomAlert("Nama lengkap tidak boleh kosong!");
      return;
    }

    try {
      const response = await fetch('api.php?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, password: password })
      });
      const result = await response.json();

      if (result.status === "error") {
        showCustomAlert(result.message);
        return;
      }

      const newUserObj = { name: name, email: email };
      // DISINKRONKAN: Simpan ke kedua key LocalStorage
      localStorage.setItem('notized_currentUser', JSON.stringify(newUserObj));
      localStorage.setItem('currentUser', JSON.stringify(newUserObj));
      
      closeAuthModal();
      
      if (typeof renderGlobalNavAuth === 'function') renderGlobalNavAuth();
      window.location.href = 'dashboard.html';

    } catch (error) {
      console.error("Error database register engine:", error);
      showCustomAlert("Gagal terhubung ke server MySQL XAMPP.");
    }
  }
}

function handleLogOut() {
  localStorage.removeItem('notized_currentUser');
  localStorage.removeItem('currentUser');
  if (typeof renderGlobalNavAuth === 'function') renderGlobalNavAuth();
  window.location.href = 'landing.html';
}

/* ── LocalStorage Helpers ── */
function getRegisteredUsers() {
  const users = localStorage.getItem('notized_users_db');
  return users ? JSON.parse(users) : [];
}

/* ── Scroll Reveal Observer ── */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

/* ── Testimonial Carousel Navigator ── */
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