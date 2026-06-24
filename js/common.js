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
    // User not logged in: Tampilkan tombol Log In hijau solid yang konsisten
    // On input.html, redirect to landing.html with openLogin param (no openAuthModal function there)
    const loginOnClick = window.location.pathname.includes('input.html')
      ? "location.href='landing.html?openLogin=true'"
      : "openAuthModal('login')";
    container.innerHTML = `
      <button class="btn-nav-solid" onclick="${loginOnClick}" style="
        background-color: #0F6E56; 
        color: #ffffff; 
        border: none; 
        padding: 0.6rem 1.4rem; 
        border-radius: 20px; 
        font-size: 14px; 
        font-weight: 600; 
        cursor: pointer; 
        box-shadow: 0 2px 8px rgba(15, 110, 86, 0.2);
        transition: all 0.2s ease;
      " onmouseover="this.style.backgroundColor='#1D9E75'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(29, 158, 117, 0.3)';" 
        onmouseout="this.style.backgroundColor='#0F6E56'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(15, 110, 86, 0.2)';">
        Log In
      </button>
    `;
  }
  
  // Sembunyikan dropdown secara default
  const dd = document.getElementById('profile-dropdown-card');
  if (dd) dd.style.display = 'none';
}
