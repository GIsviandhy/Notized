/* ==========================================================================
   NOTIZED - CORE WORKSPACE LOGIC AND FILE TREE ENGINE (dashboard.js)
   ========================================================================== */

// ─── INJEKSI CSS UNTUK FIX TEXT AREA, TEKS PANJANG & TOASTER ───
const fixStyle = document.createElement('style');
fixStyle.innerHTML = `
  /* 1. Fix Teks Kepanjangan */
  .tree-folder-header > div { min-width: 0 !important; }
  .tree-folder-header strong, .tree-file-item span, .folder-grid-item span, .file-grid-item span {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    display: block;
  }
  .tree-svg-icon { flex-shrink: 0 !important; }
  .tree-file-item, .folder-grid-item, .file-grid-item { min-width: 0 !important; }

  /* 2. Fix Text Area Form Input */
  .modern-textarea-container { flex-grow: 1; display: flex; flex-direction: column; margin-bottom: 1.5rem; }
  #notes-input { flex-grow: 1; resize: none; min-height: 200px; }

  /* 3. TOASTER CSS */
  #toast-container {
    position: fixed !important; bottom: 24px !important; right: 24px !important; z-index: 2147483647 !important;
    display: flex !important; flex-direction: column !important; gap: 12px !important; pointer-events: none !important;
  }
  .notized-toast {
    padding: 12px 20px !important; border-radius: 8px !important; color: white !important; font-weight: 600 !important; font-size: 14px !important;
    opacity: 0; transform: translateY(20px); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2) !important; font-family: "Plus Jakarta Sans", sans-serif !important;
    display: flex !important; align-items: center !important; gap: 8px !important; pointer-events: auto !important;
  }
  .notized-toast.show { opacity: 1 !important; transform: translateY(0) !important; }
  .toast-success { background: #10b981 !important; }
  .toast-error { background: #ef4444 !important; }
  .toast-info { background: #0284c7 !important; }

  /* Responsive Fix for Note View 2 Column Inside Flex Container */
  .note-two-col { display: flex; gap: 1.5rem; align-items: flex-start; width: 100%; }
  @media (max-width: 768px) {
    .note-two-col { flex-direction: column; }
    .stats-sidebar-panel { width: 100% !important; }
  }
`;
document.head.appendChild(fixStyle);

// ─── TOASTER ENGINE ───
function showToast(msg, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `notized-toast toast-${type}`;
  
  let icon = '';
  if (type === 'success') icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  else if (type === 'error') icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  else icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

  toast.innerHTML = `${icon} <span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Set worker source untuk PDF.js
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* ── State Registries ── */
let selectedFolderColor = "#6B8F71"; // Default ke warna Sage
let currentRightClickedNodeId = null; 
let draggedNodeId = null;             
let isEditMode = false;      
let editingNodeId = null;    

let currentViewedFolderId = "root_root"; 
let currentViewedNoteId = null;
let isNoteEditingActive = false;
let noteEditingTargetId = null;
let isGuestMode = false;

// ─── ESCAPE UTILITY ───
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── SLEEP UTILITY ───
function sleep(ms) { 
  return new Promise(r => setTimeout(r, ms)); 
}

// ─── STORAGE MANAGEMENT & DATA INITIALIZATION ───
// function initLibraryTree() {
//   const existingTree = localStorage.getItem('notized_library_tree');
//   if (existingTree) {
//     return JSON.parse(existingTree);
//   }

//   const defaultTree = [
//     {
//       id: "node_uiux", name: "UI/UX Design", type: "folder", expanded: true, color: "#C9883A",
//       children: [
//         {
//           id: "node_glowdiary", name: "GlowDiary Case Study", type: "file",
//           data: {
//             rawText: "GlowDiary Skincare Application UX Research.\n\nTarget market analysis indicates that users of skincare products encompass all genders, not just women. The interactive prototype built in Figma must reflect an inclusive interface.",
//             summary: ["Target market is inclusive of all genders.","Interactive prototyping executed in Figma."],
//             keywords: ["UX Research", "Figma", "Skincare App"],
//             clusters: [{ name: "User Demographics", color: "indigo", topics: ["All Genders", "Inclusive"] }],
//             learningPath: [{ step: 1, title: "Define Target Market", duration: "10 min", tip: "Ensure gender-neutral copy." }],
//             isRawOnly: false
//           }
//         }
//       ]
//     },
//     {
//       id: "node_dismath", name: "Discrete Math", type: "folder", expanded: true, color: "#4A5586",
//       children: [
//         {
//           id: "node_graph", name: "Graph Theory: Kamp Layout", type: "file",
//           data: {
//             rawText: "Graph theory application on the kamp layout project. Based on latest constraints, the Kamp Layout requires exactly 13 edges.",
//             summary: ["Graph theory applied to kamp layout.","The layout structure consists of exactly 13 edges."],
//             keywords: ["Graph Theory", "Kamp Layout", "13 Edges"],
//             clusters: [{ name: "Graph Properties", color: "amber", topics: ["Edges", "Vertices"] }],
//             learningPath: [{ step: 1, title: "Node Mapping", duration: "15 min", tip: "Identify critical vertices first." }],
//             isRawOnly: false
//           }
//         }
//       ]
//     }
//   ];
//   localStorage.setItem('notized_library_tree', JSON.stringify(defaultTree));
//   return defaultTree;
// }
function initLibraryTree() {
  const existingTree = localStorage.getItem('notized_library_tree');
  if (existingTree) {
    return JSON.parse(existingTree);
  }

  const emptyTree = [];
  localStorage.setItem('notized_library_tree', JSON.stringify(emptyTree));
  return emptyTree;
}

function getLibraryData() {
  return initLibraryTree();
}

// ─── PDF EXTRACTION ───
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

// ─── GLOBAL CONTEXT MENU ENGINE ───
document.addEventListener('contextmenu', function(e) {
    const targetEl = e.target.closest('.tree-folder-header, .tree-file-item, .folder-grid-item, .file-grid-item');
    if (targetEl) {
        e.preventDefault(); 
        currentRightClickedNodeId = targetEl.getAttribute('data-id');
        const isFolder = targetEl.classList.contains('tree-folder-header') || targetEl.classList.contains('folder-grid-item');
        
        let menu = document.getElementById('notized-context-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'notized-context-menu';
            menu.style.cssText = 'position: fixed; display: none; background: #ffffff; border: 1px solid rgba(28,26,22,0.1); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-radius: 8px; z-index: 999999; padding: 0.5rem; min-width: 160px; flex-direction: column; gap: 0.25rem; font-family: "DM Sans", sans-serif;';
            document.body.appendChild(menu);
        }
        
        menu.innerHTML = `
            <div style="padding: 0.6rem 0.8rem; cursor: pointer; border-radius: 6px; font-size: 13px; font-weight: 600; color: #1C1A16; transition: all 0.2s;" onmouseover="this.style.background='rgba(28,26,22,0.05)'; this.style.color='#0F6E56';" onmouseout="this.style.background='transparent'; this.style.color='#1C1A16';" onclick="handleContextRename(${isFolder})">✎ Rename</div>
            <div style="padding: 0.6rem 0.8rem; cursor: pointer; border-radius: 6px; font-size: 13px; font-weight: 600; color: #B85C6E; transition: all 0.2s;" onmouseover="this.style.background='#FAEAED'" onmouseout="this.style.background='transparent'" onclick="handleContextDelete(${isFolder})">🗑 Delete</div>
        `;
        menu.style.display = 'flex';
        let x = e.clientX; let y = e.clientY;
        const rect = menu.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) x -= rect.width;
        if (y + rect.height > window.innerHeight) y -= rect.height;
        menu.style.left = x + 'px'; menu.style.top = y + 'px';
    }
});

document.addEventListener('click', (e) => {
    const menu = document.getElementById('notized-context-menu');
    if (menu) menu.style.display = 'none';
    
    // Tutup Create New Dropdown jika klik di luar tombol pembungkusnya
    const drop = document.getElementById('header-action-dropdown');
    if (drop && !e.target.closest('#create-new-wrapper')) {
      drop.classList.remove('active');
      drop.style.removeProperty('display');
    }
    
    const profileDropdown = document.getElementById('dashboard-profile-dropdown');
    if (profileDropdown && !e.target.closest('#dashboard-profile-dropdown') && !e.target.closest('#user-avatar-circle')) {
      profileDropdown.style.display = 'none';
    }
});

window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  isGuestMode = urlParams.get('loadExample') === 'true';

  if (typeof renderGlobalNavAuth === 'function') {
    renderGlobalNavAuth();
  }

  if (isGuestMode) {
    localStorage.removeItem('notized_currentUser');
    setupGuestUI();
    startNewIntake('root_root');
    const notesInput = document.getElementById('notes-input');
    if (notesInput) {
      notesInput.value = `Web Development: Laravel & React Integration\n\nWhen building modern web applications, combining Laravel as a backend API and React as a dynamic frontend yields high performance. Laravel handles routing, database ORM, and authentication smoothly. React consumes these APIs to render interactive UI components using Tailwind CSS for styling.`;
      updateWordCount();
    }
    showToast("Entered Guest Mode (Try Sample)", "info");
  } else if (!localStorage.getItem('notized_currentUser') && localStorage.getItem('notizedData')) {
    // Guest user arriving from input.html with analyzed notes — show result inline
    setupGuestUI();
    const incomingData = JSON.parse(localStorage.getItem('notizedData'));
    hideAllViews();
    document.getElementById('active-project-workspace').style.display = 'block';
    const projBreadcrumbs = document.getElementById('breadcrumbs-project');
    if (projBreadcrumbs) projBreadcrumbs.style.display = 'none';
    const actionBars = document.querySelectorAll('#active-project-workspace .explicit-action-bar');
    actionBars.forEach(bar => bar.style.display = 'none');
    
    document.getElementById('active-project-title').textContent = incomingData.title || 'Analysis Result';
    
    let guestMsg = document.getElementById('guest-save-msg');
    if (!guestMsg) {
      guestMsg = document.createElement('div');
      guestMsg.id = 'guest-save-msg';
      guestMsg.style.cssText = "margin-top: 1rem; padding: 1.5rem; background-color: #f8faec; border: 1px dashed #6B8F71; border-radius: 12px; text-align: center; margin-bottom: 2rem;";
      guestMsg.innerHTML = `
        <h3 class="serif" style="color: #0F6E56; margin-bottom: 0.5rem;">Analysis Complete!</h3>
        <p style="color: #1C1A16; margin-bottom: 1rem;">To edit, manage, and save this analysis into your personal directory, you must be signed in to an account.</p>
        <button class="btn-primary" onclick="window.location.href='landing.html'">Login or Register Account</button>
      `;
      const headerWrap = document.querySelector('#active-project-workspace .note-header-wrap');
      if (headerWrap) headerWrap.insertAdjacentElement('afterend', guestMsg);
    }
    
    document.getElementById('unanalyzed-state').style.display = 'none';
    document.getElementById('analyzed-content-state').style.display = 'block';
    const rawBody = document.getElementById('raw-notes-body');
    if (rawBody) {
      rawBody.style.display = 'none';
      rawBody.textContent = incomingData.rawText || '';
    }
    renderProjectContent(incomingData);
    showToast("Analysis complete!", "success");
  } else {
    refreshWorkspaceTree();
    setupSidebarResizer();
    viewRoot();
    
    const greetingEl = document.getElementById('user-greeting');
    const user = JSON.parse(localStorage.getItem('notized_currentUser') || localStorage.getItem('currentUser') || 'null');
    
    if (user && user.name) {
      if (greetingEl) {
        greetingEl.textContent = `Hello, ${user.name}`;
      }
      
      if (!sessionStorage.getItem('notized_greeted')) {
        showToast(`Welcome back, ${user.name}!`, "success");
        sessionStorage.setItem('notized_greeted', 'true');
      }
    }
    
    // Render avatar + nama profil setelah user data siap
    renderDashboardProfile();
  }
  
  const scrollContainer = document.querySelector('.workspace-tab-body-scroll');
  if (scrollContainer) {
    scrollContainer.classList.remove('preview-full-mode');
  }

  const sidebarPane = document.getElementById('workspace-sidebar');
  if (sidebarPane) sidebarPane.classList.remove('collapsed');
  
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  if (toggleBtn) toggleBtn.style.setProperty('display', 'flex', 'important');

  let treeData = getLibraryData();

  function forceCollapseAll(nodes) {
    nodes.forEach(node => {
      if (node.type === "folder") {
        node.expanded = false;
        if (node.children) forceCollapseAll(node.children);
      }
    });
  }
  forceCollapseAll(treeData);
  localStorage.setItem('notized_library_tree', JSON.stringify(treeData));

  refreshWorkspaceTree();

  if (!isGuestMode && localStorage.getItem('notizedData')) {
    openSaveModal();
  }
});

window.addEventListener('focus', () => {
  renderDashboardProfile();
  // Sync jika ada perubahan dari tab lain (misal: selesai buat note dari input.html)
  refreshCurrentView();
});

// Real-time sync jika localStorage berubah dari tab lain
window.addEventListener('storage', (e) => {
  if (e.key === 'notized_library_tree') {
    refreshCurrentView();
  }
});

function setupSidebarResizer() {
  const sidebar = document.getElementById('workspace-sidebar');
  if (!sidebar || document.getElementById('sidebar-resizer')) return;

  const resizer = document.createElement('div');
  resizer.id = 'sidebar-resizer';
  resizer.style.cssText = 'width: 6px; cursor: col-resize; position: absolute; right: 0; top: 0; bottom: 0; z-index: 100; transition: background 0.2s;';
  
  resizer.onmouseover = () => resizer.style.background = 'rgba(107, 143, 113, 0.2)';
  resizer.onmouseout = () => resizer.style.background = 'transparent';

  sidebar.style.position = 'relative';
  sidebar.appendChild(resizer);

  let isResizing = false;

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.userSelect = 'none'; 
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    let newWidth = e.clientX - sidebar.getBoundingClientRect().left;
    if (newWidth < 200) newWidth = 200;
    if (newWidth > 600) newWidth = 600;
    sidebar.style.width = newWidth + 'px';
    sidebar.style.minWidth = newWidth + 'px'; 
    sidebar.style.flex = 'none'; 
  });

  document.addEventListener('mouseup', () => {
    isResizing = false;
    document.body.style.userSelect = '';
  });
}

function setupGuestUI() {
  const sidebar = document.getElementById('workspace-sidebar');
  if (sidebar) sidebar.style.display = 'none';
  const hamburger = document.getElementById('sidebar-toggle-btn');
  if (hamburger) hamburger.style.display = 'none';
  const topbarRight = document.querySelector('.topbar-right-cluster');
  if (topbarRight) {
    topbarRight.innerHTML = `
      <button type="button" class="btn-secondary" onclick="window.location.href='landing.html'" style="margin-right: 0.5rem; background: transparent; border: 1px solid var(--border);">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg> Back to Home
      </button>
      <button type="button" class="btn-nav-solid" onclick="window.location.href='landing.html'">Login / Register</button>
    `;
  }
  const mainLayout = document.querySelector('.workspace-layout');
  if (mainLayout) mainLayout.style.display = 'block';
}

function toggleHeaderDropdown(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const drop = document.getElementById('header-action-dropdown');
  if (drop) {
    // Gunakan class 'active' sesuai CSS .dropdown-menu-list.active { display: block }
    drop.classList.toggle('active');
    // Hapus inline style yang mungkin override
    drop.style.removeProperty('display');
  }
}

function toggleDashboardProfileDropdown(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('dashboard-profile-dropdown');
  if (!dropdown) return;
  dropdown.style.display = (dropdown.style.display === 'none' || dropdown.style.display === '') ? 'flex' : 'none';
}

// Cegah ketidaksengajaan menutup saat mengklik bagian dalam komponen dropdown
document.getElementById('dashboard-profile-dropdown')?.addEventListener('click', (e) => {
  e.stopPropagation();
});

function closeDashboardProfileDropdown() {
  const dropdown = document.getElementById('dashboard-profile-dropdown');
  if (dropdown) dropdown.style.display = 'none';
}

function renderDashboardProfile() {
  const user = JSON.parse(localStorage.getItem('notized_currentUser') || localStorage.getItem('currentUser') || 'null');
  const profileBtn = document.getElementById('dashboard-profile-button');
  const initialEl = document.getElementById('profile-initial');
  const nameEl = document.getElementById('dashboard-profile-name');
  const emailEl = document.getElementById('dashboard-profile-email');

  if (user && (user.name || user.email)) {
    const sourceText = user.name || user.email || '';
    const firstChar = sourceText.trim().split(' ')[0].charAt(0).toUpperCase() || '?';
    if (profileBtn) profileBtn.style.display = 'flex';
    if (initialEl) initialEl.textContent = firstChar;
    if (nameEl) nameEl.textContent = user.name || user.email || 'Member';
    if (emailEl) emailEl.textContent = user.email || '';
  } else {
    if (profileBtn) profileBtn.style.display = 'none';
    if (initialEl) initialEl.textContent = '';
    if (nameEl) nameEl.textContent = '';
    if (emailEl) emailEl.textContent = '';
    const dropdown = document.getElementById('dashboard-profile-dropdown');
    if (dropdown) dropdown.style.display = 'none';
  }
}

function handleFolderBack() {
  if (currentViewedFolderId === 'root_root') return;
  const tree = getLibraryData(); const path = findPath(tree, currentViewedFolderId);
  if (path && path.length > 1) viewFolderNode(path[path.length - 2].id); else viewRoot();
}

function handleNoteBack() {
  if (!currentViewedNoteId) return;
  const tree = getLibraryData(); const path = findPath(tree, currentViewedNoteId);
  if (path && path.length > 1) viewFolderNode(path[path.length - 2].id); else viewRoot();
}

function handleCancelInput() {
  if (isNoteEditingActive && noteEditingTargetId) {
    const targetId = noteEditingTargetId; isNoteEditingActive = false; noteEditingTargetId = null;
    const treeData = getLibraryData(); const node = getTargetNode(treeData, targetId);
    if (node) loadSavedFileNode(node.id, node.name); else viewRoot();
  } else {
    isNoteEditingActive = false; noteEditingTargetId = null;
    const targetId = localStorage.getItem('notized_target_folder');
    if (targetId && targetId !== 'root_root') viewFolderNode(targetId); else viewRoot();
  }
}

function customAlert(msg, title = "Notification") {
  return new Promise(resolve => {
    const overlay = document.getElementById('custom-dialog-overlay');
    if (!overlay) { alert(msg); resolve(true); return; }
    document.getElementById('cd-title').textContent = title;
    document.getElementById('cd-msg').textContent = msg;
    document.getElementById('cd-input').style.display = 'none';
    document.getElementById('cd-btn-cancel').style.display = 'none';
    const btnConfirm = document.getElementById('cd-btn-confirm');
    btnConfirm.textContent = 'OK';
    btnConfirm.onclick = () => { overlay.style.display = 'none'; resolve(true); };
    overlay.style.display = 'flex';
  });
}

function customConfirm(msg, title = "Confirm Action") {
  return new Promise(resolve => {
    const overlay = document.getElementById('custom-dialog-overlay');
    if (!overlay) { resolve(confirm(msg)); return; }
    document.getElementById('cd-title').textContent = title;
    document.getElementById('cd-msg').textContent = msg;
    document.getElementById('cd-input').style.display = 'none';
    const btnCancel = document.getElementById('cd-btn-cancel');
    const btnConfirm = document.getElementById('cd-btn-confirm');
    btnCancel.style.display = 'block'; btnConfirm.textContent = 'Confirm';
    btnCancel.onclick = () => { overlay.style.display = 'none'; resolve(false); };
    btnConfirm.onclick = () => { overlay.style.display = 'none'; resolve(true); };
    overlay.style.display = 'flex';
  });
}

function customPrompt(msg, defaultValue = "", title = "Input Required") {
  return new Promise(resolve => {
    const overlay = document.getElementById('custom-dialog-overlay');
    if (!overlay) { resolve(prompt(msg, defaultValue)); return; }
    document.getElementById('cd-title').textContent = title;
    document.getElementById('cd-msg').textContent = msg;
    const inputField = document.getElementById('cd-input');
    inputField.style.display = 'block'; inputField.value = defaultValue;
    inputField.setAttribute('maxlength', '40');
    inputField.oninput = function() { if (this.value.length > 40) this.value = this.value.substring(0, 40); };
    setTimeout(() => inputField.focus(), 50);
    const btnCancel = document.getElementById('cd-btn-cancel');
    const btnConfirm = document.getElementById('cd-btn-confirm');
    btnCancel.style.display = 'block'; btnConfirm.textContent = 'Save';
    btnCancel.onclick = () => { overlay.style.display = 'none'; resolve(null); };
    btnConfirm.onclick = () => { overlay.style.display = 'none'; resolve(inputField.value); };
    overlay.style.display = 'flex';
  });
}

// ⚡ REVISI SIDEBAR TOGGLE: Fungsi untuk membuka-tutup panel navigasi kiri
function toggleSidebar(event) {
  if (event) event.preventDefault();
  const sidebar = document.getElementById('workspace-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('collapsed');
    // Gunakan CSS class 'collapsed' yang sudah ada (width: 0 + overflow: hidden)
    // Jangan paksa display: none karena akan merusak layout flex
  }
}

function hideAllViews() {
  document.getElementById('empty-workspace-state').style.display = 'none';
  document.getElementById('active-project-workspace').style.display = 'none';
  document.getElementById('folder-view-workspace').style.display = 'none';
  document.getElementById('input-form-workspace').style.display = 'none';
}

function viewRoot() {
  currentViewedFolderId = "root_root"; currentViewedNoteId = null; hideAllViews();
  document.getElementById('empty-workspace-state').style.display = 'block';
  renderBreadcrumbs([], 'breadcrumbs-empty');
  const tree = getLibraryData(); const grid = document.getElementById('root-contents-grid'); const emptyHint = document.getElementById('root-empty-hint');
  let html = '';
  if (tree && tree.length > 0) {
    if (emptyHint) emptyHint.style.display = 'none'; 
    grid.style.display = 'grid';
    tree.forEach(child => {
      if (child.type === 'folder') { 
          html += `<div class="folder-grid-item" data-type="folder" data-id="${child.id}" onclick="viewFolderNode('${child.id}')" draggable="true" title="${esc(child.name)}" style="min-width: 0; overflow: hidden;">
              <svg class="tree-svg-icon" style="color: ${child.color || 'var(--primary)'}; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 100%;">${esc(child.name)}</span>
          </div>`; 
      } else { 
          html += `<div class="file-grid-item" data-type="file" data-id="${child.id}" onclick="loadSavedFileNode('${child.id}', '${esc(child.name)}')" draggable="true" title="${esc(child.name)}" style="min-width: 0; overflow: hidden;">
              <svg class="tree-svg-icon" style="color: var(--text-muted); flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 100%;">${esc(child.name)}</span>
          </div>`; 
      }
    });
    grid.innerHTML = html;
  } else { grid.style.display = 'none'; if (emptyHint) emptyHint.style.display = 'flex'; }
  bindDragAndDropEvents();
}

function viewFolderNode(id, event) {
  if (event) event.stopPropagation(); currentViewedFolderId = id; currentViewedNoteId = null; hideAllViews();
  
  let tree = getLibraryData(); 
  let targetFolder = getTargetNode(tree, id);
  if(targetFolder && !targetFolder.expanded) {
      targetFolder.expanded = true;
      localStorage.setItem('notized_library_tree', JSON.stringify(tree));
      refreshWorkspaceTree(); 
      tree = getLibraryData(); 
      targetFolder = getTargetNode(tree, id);
  }
  
  const path = findPath(tree, id);
  document.getElementById('folder-view-workspace').style.display = 'block';
  document.getElementById('active-folder-title').textContent = targetFolder ? targetFolder.name : 'Folder';
  renderBreadcrumbs(path, 'breadcrumbs-folder');
  const grid = document.getElementById('folder-contents-grid');
  let html = '';
  if (targetFolder && targetFolder.children && targetFolder.children.length > 0) {
    targetFolder.children.forEach(child => {
      if (child.type === 'folder') { 
          html += `<div class="folder-grid-item" data-type="folder" data-id="${child.id}" onclick="viewFolderNode('${child.id}')" draggable="true" title="${esc(child.name)}" style="min-width: 0; overflow: hidden;">
              <svg class="tree-svg-icon" style="color: ${child.color || 'var(--primary)'}; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 100%;">${esc(child.name)}</span>
          </div>`; 
      } else { 
          html += `<div class="file-grid-item" data-type="file" data-id="${child.id}" onclick="loadSavedFileNode('${child.id}', '${esc(child.name)}')" draggable="true" title="${esc(child.name)}" style="min-width: 0; overflow: hidden;">
              <svg class="tree-svg-icon" style="color: var(--text-muted); flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 100%;">${esc(child.name)}</span>
          </div>`; 
      }
    });
  } else { html = `<p style="color: var(--text-muted); font-size: 14px; grid-column: 1 / -1; padding: 1.5rem; text-align: center; border: 1px dashed var(--border); border-radius: 12px;">This directory is empty.</p>`; }
  grid.innerHTML = html;
  bindDragAndDropEvents();
}

function loadSavedFileNode(id, name, event) {
  if (event) event.stopPropagation(); currentViewedNoteId = id; hideAllViews();
  let treeData = getLibraryData(); let foundFile = getTargetNode(treeData, id); const path = findPath(treeData, id);
  document.getElementById('active-project-workspace').style.display = 'block';
  document.getElementById('active-project-title').textContent = name;
  renderBreadcrumbs(path, 'breadcrumbs-project');

  // Always show raw notes section - it's now at top level
  const rawSection = document.getElementById('note-section-raw');
  if (rawSection) rawSection.style.display = 'block';
  const rawBody = document.getElementById('raw-notes-body'); 
  const btnHead = document.getElementById('raw-accordion-btn');
  if (rawBody) rawBody.style.display = 'none'; 
  if (btnHead) btnHead.classList.remove('open');

  if (foundFile) {
    if (!foundFile.data) {
      foundFile.data = {
        rawText: "Legacy Note: The original raw text was not saved in older versions. Click 'Edit Content' to overwrite with new content.",
        summary: ["No summary available for legacy notes."], keywords: ["Legacy", "System"], clusters: [], learningPath: [], isRawOnly: false
      };
      localStorage.setItem('notized_library_tree', JSON.stringify(treeData));
    }

    const data = foundFile.data;
    if (rawBody) rawBody.textContent = data.rawText;
    
    if (data.isRawOnly) {
       document.getElementById('unanalyzed-state').style.display = 'block';
       document.getElementById('analyzed-content-state').style.display = 'none';
    } else {
       document.getElementById('unanalyzed-state').style.display = 'none';
       document.getElementById('analyzed-content-state').style.display = 'block';
       renderProjectContent(data);
    }
  }
}

function startNewIntake(targetId) {
  const drop = document.getElementById('header-action-dropdown');
  if (drop) drop.classList.remove('active');
  const folderId = targetId || 'root_root';
  localStorage.setItem('notized_target_folder', folderId);
  window.location.href = `input.html?target=${encodeURIComponent(folderId)}`;
}

function startNewIntakeFromCurrentFolder() { startNewIntake(currentViewedFolderId); }

function updateWordCount() {
  const text = document.getElementById('notes-input').value.trim(); const wordCount = text.length > 0 ? text.split(/\s+/).length : 0;
  const badge = document.getElementById('word-count');
  if (!badge) return;
  if (wordCount === 0) badge.textContent = "Waiting for content"; else if (wordCount < 10) badge.textContent = `${wordCount} words - Too short!`; else badge.textContent = `${wordCount} words detected`;
}

function triggerFileUpload() { document.getElementById('file-input').click(); }

async function handleFileUpload(event) {
  const file = event.target.files[0]; if (!file) return;
  const textarea = document.getElementById('notes-input'); textarea.value = "Extracting document content, please wait...";
  try { 
      if (file.name.toLowerCase().endsWith('.pdf')) textarea.value = await extractTextFromPDF(file); 
      else textarea.value = await file.text(); 
      updateWordCount();
      showToast("Document attached successfully", "info");
  } 
  catch (e) { 
      textarea.value = ""; 
      customAlert("Error reading file. Ensure it's a valid text or PDF.", "System Error"); 
  }
}

async function handleSaveRaw() {
   const notes = document.getElementById('notes-input').value.trim();
   if (!notes) { await customAlert("Notes cannot be empty. Please enter some text.", "Empty Note"); return; }
   const result = { rawText: notes, isRawOnly: true }; localStorage.setItem('notizedData', JSON.stringify(result));
   if (isNoteEditingActive) saveEditedNoteDirectly(result); else openSaveModal();
}

async function handleAnalyze() {
  const notes = document.getElementById('notes-input').value.trim(); const errorMsg = document.getElementById('error-msg');
  if (notes.split(/\s+/).length < 10) { errorMsg.textContent = "Please input at least 10 words to generate meaningful matrices."; errorMsg.style.display = 'block'; return; }
  errorMsg.style.display = 'none'; document.getElementById('loading-view').classList.add('active');
  const barEl = document.getElementById('progress-bar'); const pctEl = document.getElementById('progress-pct');
  barEl.style.width = '40%'; pctEl.textContent = '40%'; await sleep(600); barEl.style.width = '85%'; pctEl.textContent = '85%';
  
  try {
    const result = await analyzeNotes(notes); result.rawText = notes; result.isRawOnly = false;
    barEl.style.width = '100%'; pctEl.textContent = '100%'; await sleep(300); document.getElementById('loading-view').classList.remove('active');
    
    if (isGuestMode) {
        hideAllViews();
        document.getElementById('active-project-workspace').style.display = 'block';
        const projBreadcrumbs = document.getElementById('breadcrumbs-project');
        if (projBreadcrumbs) projBreadcrumbs.style.display = 'none';
        const actionBars = document.querySelectorAll('#active-project-workspace .explicit-action-bar');
        actionBars.forEach(bar => bar.style.display = 'none');
        
        document.getElementById('active-project-title').textContent = "Sample Analysis Result";
        
        let guestMsg = document.getElementById('guest-save-msg');
        if(!guestMsg) {
            guestMsg = document.createElement('div');
            guestMsg.id = 'guest-save-msg';
            guestMsg.style.cssText = "margin-top: 1rem; padding: 1.5rem; background-color: #f8faec; border: 1px dashed #6B8F71; border-radius: 12px; text-align: center; margin-bottom: 2rem;";
            guestMsg.innerHTML = `
              <h3 class="serif" style="color: #0F6E56; margin-bottom: 0.5rem;">Analysis Complete!</h3>
              <p style="color: #1C1A16; margin-bottom: 1rem;">To edit, manage, and save this analysis into your personal directory, you must be signed in to an account.</p>
              <button class="btn-primary" onclick="window.location.href='landing.html'">Login or Register Account</button>
            `;
            const headerWrap = document.querySelector('#active-project-workspace .note-header-wrap');
            if(headerWrap) headerWrap.insertAdjacentElement('afterend', guestMsg);
        }
        
        document.getElementById('unanalyzed-state').style.display = 'none';
        document.getElementById('analyzed-content-state').style.display = 'block';
        const rawBody = document.getElementById('raw-notes-body');
        if(rawBody) { rawBody.style.display = 'none'; rawBody.textContent = result.rawText; }
        renderProjectContent(result);
        showToast("Analysis complete!", "success");
        return;
    }
    
    localStorage.setItem('notizedData', JSON.stringify(result));
    if (isNoteEditingActive) saveEditedNoteDirectly(result); else openSaveModal();
  } catch (e) { document.getElementById('loading-view').classList.remove('active'); errorMsg.textContent = "Analysis failed."; errorMsg.style.display = 'block'; }
}

function triggerViewRawExplicit() {
  const body = document.getElementById('raw-notes-body'); const btn = document.querySelector('.accordion-header');
  if (body && btn) { body.style.display = 'block'; btn.classList.add('open'); btn.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

async function triggerAnalyzeFromRaw() {
   const tree = getLibraryData(); const node = getTargetNode(tree, currentViewedNoteId); const rawText = node.data.rawText;
   if(rawText.split(/\s+/).length < 10) { await customAlert("This raw note is too short to analyze (minimum 10 words). Please edit and add more context.", "Analysis Blocked"); return; }
   document.getElementById('loading-view').classList.add('active');
   const barEl = document.getElementById('progress-bar'); const pctEl = document.getElementById('progress-pct');
   barEl.style.width = '40%'; pctEl.textContent = '40%';
   try {
      const result = await analyzeNotes(rawText); result.rawText = rawText; result.isRawOnly = false;
      barEl.style.width = '100%'; pctEl.textContent = '100%'; await sleep(300); document.getElementById('loading-view').classList.remove('active');
      node.data = result; localStorage.setItem('notized_library_tree', JSON.stringify(tree));
      refreshWorkspaceTree(); loadSavedFileNode(node.id, node.name);
      showToast("Quantum Analysis Complete", "success");
   } catch(e) { document.getElementById('loading-view').classList.remove('active'); await customAlert("Quantum Analysis failed.", "System Error"); }
}

async function triggerEditNoteExplicit() {
  if (!currentViewedNoteId) return;
  const tree = getLibraryData(); const node = getTargetNode(tree, currentViewedNoteId);
  let textToEdit = ""; 
  
  if (node && node.data && node.data.rawText) { 
      textToEdit = node.data.rawText; 
      if (textToEdit === "Legacy Note: The original raw text was not saved in older versions. Click 'Edit Content' to overwrite with new content.") { 
          textToEdit = ""; 
      } 
  }
  
  isNoteEditingActive = true; noteEditingTargetId = currentViewedNoteId; hideAllViews();
  document.getElementById('input-form-workspace').style.display = 'block';
  document.getElementById('intake-form-title').textContent = `Editing Note: ${node.name}`; 
  document.getElementById('notes-input').value = textToEdit; 
  updateWordCount();
}

function saveEditedNoteDirectly(newAnalysisData) {
  let treeData = getLibraryData(); let node = getTargetNode(treeData, noteEditingTargetId);
  if (node) {
    node.data = newAnalysisData; localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); localStorage.removeItem('notizedData');
    isNoteEditingActive = false; noteEditingTargetId = null; refreshWorkspaceTree(); loadSavedFileNode(node.id, node.name);
    showToast("Note content updated successfully!");
  }
}

async function handleContextRename(isFolder) {
  if (!currentRightClickedNodeId) return;
  const tree = getLibraryData();
  const node = getTargetNode(tree, currentRightClickedNodeId);
  if (!node) return;
  
  if (isFolder) {
      isEditMode = true; 
      editingNodeId = currentRightClickedNodeId; 
      const folderModal = document.getElementById('folder-creator-card');
      if (folderModal) {
          document.getElementById('modal-folder-title').textContent = "Rename Folder"; 
          document.getElementById('btn-submit-folder').textContent = "Save Changes";
          const nInput = document.getElementById('new-folder-name-input');
          nInput.value = node.name; 
          nInput.setAttribute('maxlength', '40'); 
          nInput.oninput = function() { if (this.value.length > 40) this.value = this.value.substring(0, 40); };
          folderModal.style.setProperty('display', 'flex', 'important');
      }
  } else {
      const newName = await customPrompt("Enter a new name for this note:", node.name, "Rename Segment");
      if (newName && newName.trim()) { 
          node.name = newName.trim().substring(0, 40); 
          localStorage.setItem('notized_library_tree', JSON.stringify(tree)); 
          refreshWorkspaceTree(); 
          if (currentViewedNoteId === currentRightClickedNodeId) {
              const pTitle = document.getElementById('active-project-title');
              if (pTitle) pTitle.textContent = node.name; 
              renderBreadcrumbs(findPath(tree, currentRightClickedNodeId), 'breadcrumbs-project'); 
          }
          if (currentViewedFolderId !== "root_root") viewFolderNode(currentViewedFolderId); else viewRoot();
          showToast("Note renamed successfully!");
      }
  }
}

async function handleContextDelete(isFolder) {
  if (!currentRightClickedNodeId) return;
  const typeText = isFolder ? "folder and its contents" : "note";
  const isConfirmed = await customConfirm(`Are you sure you want to completely delete this ${typeText}?`, "Delete Folder");
  if (!isConfirmed) return;
  let treeData = getLibraryData(); 
  if (deleteInTree(treeData, currentRightClickedNodeId)) { 
      localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); 
      refreshWorkspaceTree(); 
      if (currentViewedFolderId === currentRightClickedNodeId || currentViewedNoteId === currentRightClickedNodeId) {
          viewRoot();
      } else if (currentViewedFolderId !== "root_root") {
          viewFolderNode(currentViewedFolderId);
      } else { viewRoot(); }
      showToast(isFolder ? "Folder deleted successfully!" : "Note deleted successfully!", "error");
  }
}

async function triggerRenameFolderExplicit() {
  if (currentViewedFolderId === 'root_root') return;
  isEditMode = true; editingNodeId = currentViewedFolderId; const tree = getLibraryData(); const node = getTargetNode(tree, currentViewedFolderId);
  if (node) {
    document.getElementById('modal-folder-title').textContent = "Rename Folder"; document.getElementById('btn-submit-folder').textContent = "Save Changes";
    const nInput = document.getElementById('new-folder-name-input');
    nInput.value = node.name; 
    nInput.setAttribute('maxlength', '40'); 
    nInput.oninput = function() { if (this.value.length > 40) this.value = this.value.substring(0, 40); };
    document.getElementById('folder-creator-card').style.setProperty('display', 'flex', 'important');
  }
}

async function triggerDeleteFolderExplicit() {
  if (currentViewedFolderId === 'root_root') return;
  const isConfirmed = await customConfirm("Are you sure you want to completely delete this folder and its contents?", "Purge Directory"); if (!isConfirmed) return;
  let treeData = getLibraryData(); if (deleteInTree(treeData, currentViewedFolderId)) { 
      localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); refreshWorkspaceTree(); viewRoot(); 
      showToast("Folder deleted successfully!", "error");
  }
}

async function triggerRenameNoteExplicit() {
  if (!currentViewedNoteId) return;
  const treeData = getLibraryData(); const node = getTargetNode(treeData, currentViewedNoteId);
  if (node) {
    const newName = await customPrompt("Enter a new name for this note:", node.name, "Rename Segment");
    if (newName && newName.trim()) { 
        node.name = newName.trim().substring(0, 40); 
        localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); 
        refreshWorkspaceTree(); 
        document.getElementById('active-project-title').textContent = node.name; 
        renderBreadcrumbs(findPath(treeData, currentViewedNoteId), 'breadcrumbs-project'); 
        showToast("Note renamed successfully!");
    }
  }
}

async function triggerDeleteNoteExplicit() {
  if (!currentViewedNoteId) return;
  const isConfirmed = await customConfirm("Delete this note permanently from the ledger?", "Delete Document"); if (!isConfirmed) return;
  let treeData = getLibraryData(); let parentPath = findPath(treeData, currentViewedNoteId);
  let parentFolderId = (parentPath && parentPath.length > 1) ? parentPath[parentPath.length - 2].id : 'root_root';
  if (deleteInTree(treeData, currentViewedNoteId)) { 
      localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); refreshWorkspaceTree(); 
      if(parentFolderId === 'root_root') viewRoot(); else viewFolderNode(parentFolderId); 
      showToast("Note deleted successfully!", "error");
  }
}

function findPath(nodes, targetId, currentPath = []) {
  for (let node of nodes) { let newPath = [...currentPath, {id: node.id, name: node.name, type: node.type}]; if (node.id === targetId) return newPath; if (node.children) { let found = findPath(node.children, targetId, newPath); if (found) return found; } } return null;
}
function getTargetNode(nodes, targetId) {
  for (let node of nodes) { if (node.id === targetId) return node; if (node.children) { let found = getTargetNode(node.children, targetId); if (found) return found; } } return null;
}
function deleteInTree(nodes, id) {
  for (let i = 0; i < nodes.length; i++) { if (nodes[i].id === id) { nodes.splice(i, 1); return true; } if (nodes[i].children && deleteInTree(nodes[i].children, id)) return true; } return false;
}

function renderBreadcrumbs(pathArray, containerId) {
  const container = document.getElementById(containerId); if (!container) return;
  let html = `<span class="crumb" onclick="viewRoot()">Dashboard</span>`;
  if (pathArray && pathArray.length > 0) {
    pathArray.forEach((node, index) => {
      html += `<span class="crumb-sep">/</span>`;
      if (index === pathArray.length - 1) { html += `<span class="crumb active-crumb">${esc(node.name)}</span>`; } else { html += `<span class="crumb" onclick="viewFolderNode('${node.id}')">${esc(node.name)}</span>`; }
    });
  } else { html = `<span class="crumb active-crumb">Dashboard</span>`; } container.innerHTML = html;
}

function bindDragAndDropEvents() {
  const draggables = document.querySelectorAll('.tree-node-row, .folder-grid-item, .file-grid-item');
  draggables.forEach(row => {
    if (row.dataset.dndBound) return;
    row.dataset.dndBound = "true";

    row.addEventListener('dragstart', (e) => { 
        e.stopPropagation(); 
        draggedNodeId = row.getAttribute('data-id'); 
        row.classList.add('dragging'); 
    });
    
    row.addEventListener('dragend', () => { 
        row.classList.remove('dragging'); 
        document.querySelectorAll('.tree-node-row, .folder-grid-item, .file-grid-item').forEach(r => { 
            r.classList.remove('drag-over'); r.style.borderTop = ''; r.style.borderBottom = ''; r.style.borderLeft = ''; r.style.borderRight = '';
        }); 
    });
    
    row.addEventListener('dragover', (e) => {
      e.preventDefault(); e.stopPropagation(); 
      row.style.borderTop = ''; row.style.borderBottom = ''; row.style.borderLeft = ''; row.style.borderRight = ''; 
      const rect = row.getBoundingClientRect(); 
      const y = e.clientY - rect.top; const x = e.clientX - rect.left;
      const isGrid = row.classList.contains('folder-grid-item') || row.classList.contains('file-grid-item');

      if (row.getAttribute('data-type') === 'folder') { 
          if (isGrid) {
              if (x < rect.width * 0.25) row.style.borderLeft = '2px solid var(--primary)';
              else if (x > rect.width * 0.75) row.style.borderRight = '2px solid var(--primary)';
              else row.classList.add('drag-over');
          } else {
              if (y < rect.height * 0.25) row.style.borderTop = '2px solid var(--primary)'; 
              else if (y > rect.height * 0.75) row.style.borderBottom = '2px solid var(--primary)'; 
              else row.classList.add('drag-over'); 
          }
      } else { 
          if (isGrid) {
              if (x < rect.width * 0.5) row.style.borderLeft = '2px solid var(--primary)'; 
              else row.style.borderRight = '2px solid var(--primary)'; 
          } else {
              if (y < rect.height * 0.5) row.style.borderTop = '2px solid var(--primary)'; 
              else row.style.borderBottom = '2px solid var(--primary)'; 
          }
      }
    });
    
    row.addEventListener('dragleave', () => { 
        row.classList.remove('drag-over'); row.style.borderTop = ''; row.style.borderBottom = ''; row.style.borderLeft = ''; row.style.borderRight = ''; 
    });
    
    row.addEventListener('drop', (e) => {
      e.preventDefault(); e.stopPropagation(); 
      const targetId = row.getAttribute('data-id'); 
      if (draggedNodeId === targetId) return;
      
      let treeData = getLibraryData(); 
      let movingNode = null; let sourceArray = null; let sourceIndex = -1;
      
      function extractNode(nodes) { 
          for (let i = 0; i < nodes.length; i++) { 
              if (nodes[i].id === draggedNodeId) { sourceArray = nodes; sourceIndex = i; movingNode = nodes.splice(i, 1)[0]; return true; } 
              if (nodes[i].children && extractNode(nodes[i].children)) return true; 
          } return false; 
      }
      extractNode(treeData); if (!movingNode) return;
      
      let targetArray = null; let targetIndex = -1; let targetNodeRef = null; let targetIsFolder = false;
      function findTarget(nodes) { 
          for (let i = 0; i < nodes.length; i++) { 
              if (nodes[i].id === targetId) { targetArray = nodes; targetIndex = i; targetNodeRef = nodes[i]; targetIsFolder = nodes[i].type === 'folder'; return true; } 
              if (nodes[i].children && findTarget(nodes[i].children)) return true; 
          } return false; 
      }
      findTarget(treeData);
      
      if (!targetArray) { sourceArray.splice(sourceIndex, 0, movingNode); return; }
      
      const rect = row.getBoundingClientRect(); 
      const y = e.clientY - rect.top; const x = e.clientX - rect.left;
      const isGrid = row.classList.contains('folder-grid-item') || row.classList.contains('file-grid-item');

      if (targetIsFolder) { 
          if (isGrid) {
              if (x < rect.width * 0.25) targetArray.splice(targetIndex, 0, movingNode);
              else if (x > rect.width * 0.75) targetArray.splice(targetIndex + 1, 0, movingNode);
              else { 
                  if (!targetNodeRef.children) targetNodeRef.children = []; 
                  targetNodeRef.children.push(movingNode); targetNodeRef.expanded = true; 
              }
          } else {
              if (y < rect.height * 0.25) targetArray.splice(targetIndex, 0, movingNode); 
              else if (y > rect.height * 0.75) targetArray.splice(targetIndex + 1, 0, movingNode); 
              else { 
                  if (!targetNodeRef.children) targetNodeRef.children = []; 
                  targetNodeRef.children.push(movingNode); targetNodeRef.expanded = true; 
              } 
          }
      } else { 
          if (isGrid) {
              if (x < rect.width * 0.5) targetArray.splice(targetIndex, 0, movingNode); 
              else targetArray.splice(targetIndex + 1, 0, movingNode); 
          } else {
              if (y < rect.height * 0.5) targetArray.splice(targetIndex, 0, movingNode); 
              else targetArray.splice(targetIndex + 1, 0, movingNode); 
          }
      }
      localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); 
      refreshWorkspaceTree();
      if(currentViewedFolderId !== "root_root") viewFolderNode(currentViewedFolderId); else viewRoot();
      showToast("Item moved successfully", "info");
    });
  });
}

function refreshWorkspaceTree() { const treeData = getLibraryData(); document.getElementById('nested-directory-root').innerHTML = buildTreeHTML(treeData); bindDragAndDropEvents(); }

// Refresh sidebar tree + main content area sesuai view yang sedang aktif
function refreshCurrentView() {
  refreshWorkspaceTree();
  if (currentViewedNoteId) return; // Sedang buka note, tidak perlu re-render grid
  if (currentViewedFolderId && currentViewedFolderId !== 'root_root') {
    viewFolderNode(currentViewedFolderId);
  } else {
    viewRoot();
  }
}

function buildTreeHTML(nodes) {
  return nodes.map(node => {
    if (node.type === "folder") {
      const caret = node.children && node.children.length > 0 ? (node.expanded ? "▾" : "▸") : " "; const baseColor = node.color || "#6B8F71"; 
      return `
        <div class="tree-folder-block" data-id="${node.id}">
          <div class="tree-folder-header tree-node-row" draggable="true" data-id="${node.id}" data-type="folder" style="background-color: ${hexToRgbaTint(baseColor, 0.12)}; color: ${baseColor};" title="${esc(node.name)}">
            <div style="display: flex; gap: 0.4rem; align-items: center; flex: 1; min-width: 0;">
              <div onmousedown="event.stopPropagation()" onclick="toggleFolderNode('${node.id}', event)" style="cursor: pointer; font-size:14px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; margin-left: -4px;">${caret}</div>
              <div onclick="viewFolderNode('${node.id}', event)" style="display: flex; gap: 0.5rem; align-items: center; flex: 1; cursor: pointer; min-width: 0;">
                <svg class="tree-svg-icon" style="flex-shrink: 0; color: ${baseColor};" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                <strong style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 100%;">${esc(node.name)}</strong>
              </div>
            </div>
            <span class="tree-count" style="flex-shrink: 0;">${node.children ? node.children.length : 0}</span>
          </div>
          <div id="children-${node.id}" class="tree-folder-contents" style="${node.expanded ? 'display:flex;' : 'display:none;'} padding-left: 0.75rem; flex-direction: column; gap: 0.25rem;">
            ${node.children && node.children.length > 0 ? buildTreeHTML(node.children) : ''}
          </div>
        </div>`;
    } else {
      return `
        <div class="tree-file-item tree-node-row" draggable="true" data-id="${node.id}" data-type="file" onclick="loadSavedFileNode('${node.id}', '${esc(node.name)}', event)" title="${esc(node.name)}" style="display: flex; align-items: center; gap: 0.5rem; min-width: 0;">
          <svg class="tree-svg-icon" style="color: var(--text-muted); flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 100%;">${esc(node.name)}</span>
        </div>`;
    }
  }).join('');
}

function toggleFolderNode(nodeId, event) {
  if (event) event.stopPropagation(); let treeData = getLibraryData();
  function findAndToggle(nodes) { for (let node of nodes) { if (node.id === nodeId) { node.expanded = !node.expanded; return true; } if (node.children && findAndToggle(node.children)) return true; } return false; }
  findAndToggle(treeData); localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); refreshWorkspaceTree();
}

async function openFolderCreatorDirect(event) {
  if (event) event.preventDefault();
  const drop = document.getElementById('header-action-dropdown'); if (drop) drop.classList.remove('active');
  isEditMode = false; editingNodeId = null; const folderModal = document.getElementById('folder-creator-card');
  document.getElementById('modal-folder-title').textContent = "Create New Folder"; document.getElementById('btn-submit-folder').textContent = "Create Folder";
  const nInput = document.getElementById('new-folder-name-input');
  nInput.value = ''; 
  nInput.setAttribute('maxlength', '40'); 
  nInput.oninput = function() { if (this.value.length > 40) this.value = this.value.substring(0, 40); };
  const activeDot = document.querySelector('.color-dot.active');
  if (activeDot) {
    selectedFolderColor = activeDot.getAttribute('data-color') || selectedFolderColor;
  } else {
    selectedFolderColor = selectedFolderColor || '#0F6E56';
  }
  folderModal.style.setProperty('display', 'flex', 'important');
}

function handleFolderSubmit() {
  const nameInput = document.getElementById('new-folder-name-input').value.trim().substring(0, 40); 
  if (!nameInput) { customAlert("Please enter a folder name!", "Validation"); return; }
  
  let treeData = getLibraryData();
  if (isEditMode) { 
      let node = getTargetNode(treeData, editingNodeId); 
      if (node) { node.name = nameInput; node.color = selectedFolderColor || "#6B8F71"; } 
      showToast("Folder renamed successfully!");
  } 
  else {
    const newNode = { id: "node_" + Date.now(), name: nameInput, type: "folder", color: selectedFolderColor, expanded: false, children: [] };
    if (currentViewedFolderId === "root_root") treeData.push(newNode);
    else { let parent = getTargetNode(treeData, currentViewedFolderId); if (parent && parent.type === 'folder') { parent.children.push(newNode); parent.expanded = true; } else treeData.push(newNode); }
    showToast("Folder created successfully!");
  }
  localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); closeFolderCreatorCard(); refreshCurrentView();
  if (!isEditMode && currentViewedFolderId !== "root_root") viewFolderNode(currentViewedFolderId); else if (isEditMode) viewFolderNode(editingNodeId);
}

function closeFolderCreatorCard() { document.getElementById('folder-creator-card').style.setProperty('display', 'none', 'important'); isEditMode = false; }
function selectColorDot(el) { document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active')); el.classList.add('active'); selectedFolderColor = el.getAttribute('data-color'); }

function openSaveModal() {
  const incoming = localStorage.getItem('notizedData'); if (!incoming) return;
  document.getElementById('save-modal').style.display = 'flex'; 
  const sName = document.getElementById('save-notes-name');
  sName.value = JSON.parse(incoming).title || '';
  sName.setAttribute('maxlength', '40');
  sName.oninput = function() { if (this.value.length > 40) this.value = this.value.substring(0, 40); };
  
  const selectEl = document.getElementById('save-folder-select'); let optionsArray = [`<option value="root_root">Save to Root (Luar Folder)</option>`];
  function injectFolderOptions(nodes, depth = 0) { nodes.forEach(node => { if (node.type === "folder") { optionsArray.push(`<option value="${node.id}">${"&nbsp;&nbsp;".repeat(depth)}Folder: ${node.name}</option>`); if (node.children) injectFolderOptions(node.children, depth + 1); } }); }
  injectFolderOptions(getLibraryData()); 
  const padNames = ["Archive Branch", "Sandbox Vault", "Shared Node Stack", "Backup Matrix Index", "External Sync Stack"];
  let padIdx = 0; while (optionsArray.length < 5 && padIdx < padNames.length) { optionsArray.push(`<option value="mock_pad_${padIdx}">Folder: ${padNames[padIdx]}</option>`); padIdx++; }
  if (optionsArray.length > 9) optionsArray = optionsArray.slice(0, 9);
  selectEl.innerHTML = optionsArray.join(''); selectEl.value = localStorage.getItem('notized_target_folder') || 'root_root';
}

function closeSaveModal() { document.getElementById('save-modal').style.display = 'none'; }

async function confirmSaveNotes() {
  const titleInput = document.getElementById('save-notes-name').value.trim().substring(0, 40); 
  const folderTargetId = document.getElementById('save-folder-select').value;
  if (!titleInput) { await customAlert('Please enter a project name.', "Validation"); return; }
  
  const incomingData = JSON.parse(localStorage.getItem('notizedData')); let treeData = getLibraryData();
  const newFileNode = { id: "node_" + Date.now(), name: titleInput, type: "file", data: incomingData };
  if (folderTargetId === "root_root" || folderTargetId.startsWith("mock_pad_")) treeData.push(newFileNode);
  else { let parent = getTargetNode(treeData, folderTargetId); if (parent) { if (!parent.children) parent.children = []; parent.children.push(newFileNode); parent.expanded = true; } }
  localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); localStorage.removeItem('notizedData'); localStorage.removeItem('notized_target_folder');
  closeSaveModal(); refreshCurrentView(); loadSavedFileNode(newFileNode.id, titleInput);
  showToast("Note created successfully!");
}

function renderProjectContent(data) {
  if (!data) return;
  if (document.getElementById('summary-list')) document.getElementById('summary-list').innerHTML = (data.summary || []).map(point => `<li class="summary-item"><span class="summary-arrow">→</span> <span>${point}</span></li>`).join('');
  if (document.getElementById('keyword-chips')) document.getElementById('keyword-chips').innerHTML = (data.keywords || []).map((kw, i) => `<span class="chip c${i % 3}">${esc(kw)}</span>`).join('');
  if (document.getElementById('stat-keywords')) document.getElementById('stat-keywords').textContent = (data.keywords || []).length;
  if (document.getElementById('stat-clusters')) document.getElementById('stat-clusters').textContent = data.clusters ? data.clusters.length : "0";
  if (document.getElementById('stat-steps')) document.getElementById('stat-steps').textContent = (data.learningPath || []).length;
  if (document.getElementById('clusters-grid') && data.clusters) { document.getElementById('clusters-grid').innerHTML = data.clusters.map(cluster => `
    <div class="cluster-card">
      <div class="cluster-header"><span class="cluster-icon ${cluster.color || 'sage'}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg></span><span class="cluster-name">${esc(cluster.name)}</span></div>
      <div class="cluster-topics">${(cluster.topics || []).map(topic => `<div class="cluster-topic">${esc(topic)}</div>`).join('')}</div>
    </div>`).join(''); }
  if (document.getElementById('path-list')) {
    document.getElementById('path-list').innerHTML = (data.learningPath || []).map((step, i) => `
      <div class="path-item">
        <div class="path-num ${i === 0 ? 'first' : ''}">${step.step}</div>
        <div class="path-card">
          <div class="path-card-header"><span class="path-card-title">${esc(step.title)}</span><span class="path-duration">15 min</span></div>
          <p class="path-tip"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--amber); flex-shrink: 0; display: inline-block; vertical-align: text-top; margin-right: 4px;"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5.5 5.5 0 0 0 7 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"></path><line x1="9" y1="18" x2="15" y2="18"></line><line x1="10" y1="22" x2="14" y2="22"></line></svg><span>${esc(step.tip)}</span></p>
        </div>
      </div>`).join('');
  }
}

/* ==========================================================================
   PATCH — Fallbacks + One-page note view helpers
   ========================================================================== */

if (typeof hexToRgbaTint === 'undefined') {
  function hexToRgbaTint(hex, alpha) {
    hex = (hex || '#6B8F71').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0,2), 16);
    const g = parseInt(hex.substring(2,4), 16);
    const b = parseInt(hex.substring(4,6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}

if (typeof handleLogout === 'undefined') {
  function handleLogout() {
    // Clear ONLY auth data, preserve notes library
    localStorage.removeItem('notized_currentUser');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('notized_greeted');
    sessionStorage.clear();
    
    // Force reload landing page with cache buster to ensure fresh render
    setTimeout(() => {
      window.location.href = 'landing.html?logout=' + Date.now();
    }, 50);
  }
}

if (typeof analyzeNotes === 'undefined') {
  async function analyzeNotes(text) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `You are a study notes analyzer. Given the following raw notes, respond ONLY with a valid JSON object (no markdown, no backticks) in this exact format:
{
  "summary": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"],
  "clusters": [
    { "name": "Cluster Name", "color": "sage", "topics": ["topic1", "topic2", "topic3"] }
  ],
  "learningPath": [
    { "step": 1, "title": "Step Title", "duration": "15 min", "tip": "Study tip here." }
  ]
}

Raw notes:
${text}`
        }]
      })
    });
    const data = await response.json();
    const raw = data.content.map(i => i.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  }
}

function toggleRawNotesView() {
  const body = document.getElementById('raw-notes-body');
  const btn  = document.getElementById('raw-accordion-btn');
  const hint = document.getElementById('raw-accordion-hint');
  if (!body || !btn) return;
  const isNowOpen = body.style.display === 'none';
  body.style.display = isNowOpen ? 'block' : 'none';
  btn.classList.toggle('open', isNowOpen);
  if (hint) hint.textContent = isNowOpen ? 'click to collapse' : 'click to expand';
}

// ── CHANGE PASSWORD ──────────────────────────────────────────────────────────

function handleChangePassword() {
  // Reset semua field dan state setiap kali dibuka
  ['cp-current', 'cp-new', 'cp-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.type = 'password'; }
  });
  const errEl = document.getElementById('cp-error');
  const okEl  = document.getElementById('cp-success');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  if (okEl)  okEl.style.display = 'none';

  // Tutup dropdown profil dulu
  const profileDrop = document.getElementById('dashboard-profile-dropdown');
  if (profileDrop) profileDrop.style.display = 'none';

  // Buka modal ganti password
  const card = document.getElementById('change-password-card');
  if (card) card.style.display = 'flex';
}

function closeChangePasswordCard() {
  const card = document.getElementById('change-password-card');
  if (card) card.style.display = 'none';
}

function toggleCPVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.innerHTML = isHidden
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

function confirmChangePassword() {
  const currentVal = (document.getElementById('cp-current')?.value || '').trim();
  const newVal     = (document.getElementById('cp-new')?.value || '').trim();
  const confirmVal = (document.getElementById('cp-confirm')?.value || '').trim();
  const errEl = document.getElementById('cp-error');
  const okEl  = document.getElementById('cp-success');

  const showErr = (msg) => {
    errEl.textContent = msg;
    errEl.style.display = 'block';
    okEl.style.display = 'none';
  };

  errEl.style.display = 'none';
  okEl.style.display  = 'none';

  if (!currentVal || !newVal || !confirmVal) return showErr('Please fill in all fields.');
  if (newVal.length < 6)                      return showErr('New password must be at least 6 characters.');
  if (newVal !== confirmVal)                  return showErr('New passwords do not match.');

  // const currentUser = JSON.parse(localStorage.getItem('notized_currentUser') || 'null');
  // if (!currentUser) return showErr('Session expired. Please log in again.');

  // if (currentUser.password !== currentVal) return showErr('Current password is incorrect.');
  // if (newVal === currentVal)               return showErr('New password must be different from your current password.');
  const currentUser = JSON.parse(localStorage.getItem('notized_currentUser') || 'null');
  if (!currentUser) return showErr('Session expired. Please log in again.');

  const users = JSON.parse(localStorage.getItem('notized_users') || '[]');
  const userRecord = users.find(u => u.id === currentUser.id || u.email === currentUser.email);
  const storedPassword = currentUser.password !== undefined ? currentUser.password : (userRecord ? userRecord.password : undefined);

  if (storedPassword === undefined) return showErr('Password data not found. Please log out and log in again.');
  if (storedPassword !== currentVal) return showErr('Current password is incorrect.');
  if (newVal === currentVal)         return showErr('New password must be different from your current password.');

  // Update di array notized_users
  const idx   = users.findIndex(u => u.id === currentUser.id);
  if (idx !== -1) {
    users[idx].password = newVal;
    localStorage.setItem('notized_users', JSON.stringify(users));
  }

  // Update sesi aktif
  currentUser.password = newVal;
  localStorage.setItem('notized_currentUser', JSON.stringify(currentUser));

  // Tampilkan sukses, bersihkan field, tutup otomatis setelah 1.8 detik
  okEl.style.display = 'block';
  ['cp-current', 'cp-new', 'cp-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  setTimeout(() => closeChangePasswordCard(), 1800);
}

// ── LOGOUT ALIAS (handleLogOut dengan kapital O) ─────────────────────────────
// Dashboard HTML menggunakan handleLogOut() — alias ke handleLogout()
function handleLogOut() {
  if (typeof handleLogout === 'function') {
    handleLogout();
  } else {
    // Fallback logout
    localStorage.removeItem('notized_currentUser');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('notized_library_tree');
    localStorage.removeItem('notized_library');
    sessionStorage.removeItem('notized_greeted');
    sessionStorage.clear();
    setTimeout(() => {
      window.location.href = 'landing.html?logout=' + Date.now();
    }, 50);
  }
}

(function() {
  const _origLoad = window.loadSavedFileNode;
  window.loadSavedFileNode = function(id, name, event) {
    _origLoad(id, name, event);
    setTimeout(() => {
      document.querySelectorAll('.note-tab').forEach((b, i) => b.classList.toggle('active', i === 0));
      const mainPane = document.querySelector('.workspace-main-pane');
      if (mainPane) mainPane.scrollTo({ top: 0, behavior: 'instant' });
    }, 50);
  };
})();
