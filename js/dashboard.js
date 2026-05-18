pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let selectedFolderColor = "#0284c7"; 
let currentRightClickedNodeId = null; 
let draggedNodeId = null;             
let isEditMode = false;      
let editingNodeId = null;    

let currentViewedFolderId = "root_root"; 
let currentViewedNoteId = null;

let isNoteEditingActive = false;
let noteEditingTargetId = null;

let isGuestMode = false;

window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  isGuestMode = urlParams.get('loadExample') === 'true';

  if (isGuestMode) {
    localStorage.removeItem('notized_currentUser');
    setupGuestUI();
    startNewIntake('root_root');
    
    const notesInput = document.getElementById('notes-input');
    if (notesInput) {
      notesInput.value = `Web Development: Laravel & React Integration\n\nWhen building modern web applications, combining Laravel as a backend API and React as a dynamic frontend yields high performance. Laravel handles routing, database ORM, and authentication smoothly. React consumes these APIs to render interactive UI components using Tailwind CSS for styling.`;
      updateWordCount();
    }
  } else {
    refreshWorkspaceTree();
    viewRoot();
    
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) {
      const user = JSON.parse(localStorage.getItem('notized_currentUser'));
      if (user && user.name) {
        greetingEl.textContent = `Hello, ${user.name}`;
      }
    }
  }

  document.addEventListener('click', () => {
    const drop = document.getElementById('header-action-dropdown');
    if (drop) drop.classList.remove('active');
  });
});

function setupGuestUI() {
  const sidebar = document.getElementById('workspace-sidebar');
  if (sidebar) sidebar.style.display = 'none';
  
  const hamburger = document.getElementById('sidebar-toggle-btn');
  if (hamburger) hamburger.style.display = 'none';

  const topbarRight = document.querySelector('.topbar-right-cluster');
  if (topbarRight) {
    topbarRight.innerHTML = `
      <button type="button" class="btn-secondary" onclick="window.location.href='index.html'" style="margin-right: 0.5rem; background: transparent; border: 1px solid var(--border);">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg> Back to Home
      </button>
      <button type="button" class="btn-primary" onclick="window.location.href='index.html'">
         Login / Register
      </button>
    `;
  }

  const mainLayout = document.querySelector('.workspace-layout');
  if (mainLayout) {
      mainLayout.style.display = 'block';
  }
}

function toggleHeaderDropdown(event) {
  event.preventDefault();
  event.stopPropagation();
  const drop = document.getElementById('header-action-dropdown');
  if (drop) drop.classList.toggle('active');
}

function handleFolderBack() {
  if (currentViewedFolderId === 'root_root') return;
  const tree = getLibraryData();
  const path = findPath(tree, currentViewedFolderId);
  if (path && path.length > 1) {
    viewFolderNode(path[path.length - 2].id);
  } else {
    viewRoot();
  }
}

function handleNoteBack() {
  if (!currentViewedNoteId) return;
  const tree = getLibraryData();
  const path = findPath(tree, currentViewedNoteId);
  if (path && path.length > 1) {
    viewFolderNode(path[path.length - 2].id);
  } else {
    viewRoot();
  }
}

function handleCancelInput() {
  if (isNoteEditingActive && noteEditingTargetId) {
    const targetId = noteEditingTargetId;
    isNoteEditingActive = false;
    noteEditingTargetId = null;
    const treeData = getLibraryData();
    const node = getTargetNode(treeData, targetId);
    if (node) loadSavedFileNode(node.id, node.name); else viewRoot();
  } else {
    isNoteEditingActive = false;
    noteEditingTargetId = null;
    const targetId = localStorage.getItem('notized_target_folder');
    if (targetId && targetId !== 'root_root') viewFolderNode(targetId); else viewRoot();
  }
}

function customAlert(msg, title = "Notification") {
  return new Promise(resolve => {
    const overlay = document.getElementById('custom-dialog-overlay');
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
    document.getElementById('cd-title').textContent = title;
    document.getElementById('cd-msg').textContent = msg;
    document.getElementById('cd-input').style.display = 'none';
    
    const btnCancel = document.getElementById('cd-btn-cancel');
    const btnConfirm = document.getElementById('cd-btn-confirm');
    
    btnCancel.style.display = 'block';
    btnConfirm.textContent = 'Confirm';
    
    btnCancel.onclick = () => { overlay.style.display = 'none'; resolve(false); };
    btnConfirm.onclick = () => { overlay.style.display = 'none'; resolve(true); };
    
    overlay.style.display = 'flex';
  });
}

function customPrompt(msg, defaultValue = "", title = "Input Required") {
  return new Promise(resolve => {
    const overlay = document.getElementById('custom-dialog-overlay');
    document.getElementById('cd-title').textContent = title;
    document.getElementById('cd-msg').textContent = msg;
    
    const inputField = document.getElementById('cd-input');
    inputField.style.display = 'block';
    inputField.value = defaultValue;
    setTimeout(() => inputField.focus(), 50);
    
    const btnCancel = document.getElementById('cd-btn-cancel');
    const btnConfirm = document.getElementById('cd-btn-confirm');
    
    btnCancel.style.display = 'block';
    btnConfirm.textContent = 'Save';
    
    btnCancel.onclick = () => { overlay.style.display = 'none'; resolve(null); };
    btnConfirm.onclick = () => { overlay.style.display = 'none'; resolve(inputField.value); };
    
    overlay.style.display = 'flex';
  });
}

function getLibraryData() {
  const data = localStorage.getItem('notized_library_tree');
  if (data) return JSON.parse(data);

  const defaultTree = [
    {
      id: "node_uiux", name: "UI/UX Design", type: "folder", expanded: true, color: "#f59e0b",
      children: [
        {
          id: "node_glowdiary", name: "GlowDiary Case Study", type: "file",
          data: {
            rawText: "GlowDiary Skincare Application UX Research.\n\nTarget market analysis indicates that users of skincare products encompass all genders, not just women. The interactive prototype built in Figma must reflect an inclusive interface. Key features include daily tracking, product matching, and personalized routines.",
            summary: ["Target market is inclusive of all genders.","Interactive prototyping executed in Figma.","Focuses on inclusive interface and daily routine tracking."],
            keywords: ["UX Research", "Figma", "Skincare App", "Inclusive"],
            clusters: [{ name: "User Demographics", color: "indigo", topics: ["All Genders", "Inclusive"] },{ name: "Prototyping", color: "sage", topics: ["Figma", "Interactive"] }],
            learningPath: [{ step: 1, title: "Define Target Market", duration: "10 min", tip: "Ensure gender-neutral copy." },{ step: 2, title: "Figma Prototyping", duration: "25 min", tip: "Create user flows." }],
            isRawOnly: false
          }
        }
      ]
    },
    {
      id: "node_dismath", name: "Discrete Math", type: "folder", expanded: true, color: "#6366f1",
      children: [
        {
          id: "node_graph", name: "Graph Theory: Kamp Layout", type: "file",
          data: {
            rawText: "Graph theory application on the kamp layout project. A graph consists of vertices and edges. Based on the latest mapping constraints, the Kamp Layout requires exactly 13 edges to connect all critical nodes efficiently without overlapping paths.",
            summary: ["Graph theory applied to kamp layout.","The layout structure consists of exactly 13 edges."],
            keywords: ["Graph Theory", "Kamp Layout", "13 Edges", "Vertices"],
            clusters: [{ name: "Graph Properties", color: "amber", topics: ["Edges", "Vertices", "Constraints"] }],
            learningPath: [{ step: 1, title: "Node Mapping", duration: "15 min", tip: "Identify all critical vertices first." },{ step: 2, title: "Edge Connection", duration: "10 min", tip: "Draw exactly 13 edges." }],
            isRawOnly: false
          }
        }
      ]
    }
  ];
  localStorage.setItem('notized_library_tree', JSON.stringify(defaultTree));
  return defaultTree;
}

function hexToRgbaTint(hex, opacity = 0.15) {
  let c;
  if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
    c= hex.substring(1).split('');
    if(c.length== 3){ c= [c[0], c[0], c[1], c[1], c[2], c[2]]; }
    c= '0x'+c.join('');
    return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+opacity+')';
  }
  return 'rgba(107, 143, 113, 0.15)';
}

function toggleSidebar(event) {
  if (event) event.preventDefault();
  const sidebar = document.getElementById('workspace-sidebar');
  if (sidebar) sidebar.classList.toggle('collapsed');
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
    emptyHint.style.display = 'none'; grid.style.display = 'grid';
    tree.forEach(child => {
      if (child.type === 'folder') { html += `<div class="folder-grid-item" onclick="viewFolderNode('${child.id}')"><svg class="tree-svg-icon" style="color: ${child.color || 'var(--primary)'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg><span>${esc(child.name)}</span></div>`; } 
      else { html += `<div class="file-grid-item" onclick="loadSavedFileNode('${child.id}', '${esc(child.name)}')"><svg class="tree-svg-icon" style="color: var(--text-muted)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><span>${esc(child.name)}</span></div>`; }
    });
    grid.innerHTML = html;
  } else { grid.style.display = 'none'; emptyHint.style.display = 'flex'; }
}

function viewFolderNode(id, event) {
  if (event) event.stopPropagation(); currentViewedFolderId = id; currentViewedNoteId = null; hideAllViews();
  const tree = getLibraryData(); const path = findPath(tree, id); const targetFolder = getTargetNode(tree, id);
  document.getElementById('folder-view-workspace').style.display = 'block';
  document.getElementById('active-folder-title').textContent = targetFolder ? targetFolder.name : 'Folder';
  renderBreadcrumbs(path, 'breadcrumbs-folder');
  const grid = document.getElementById('folder-contents-grid');
  let html = '';
  if (targetFolder && targetFolder.children && targetFolder.children.length > 0) {
    targetFolder.children.forEach(child => {
      if (child.type === 'folder') { html += `<div class="folder-grid-item" onclick="viewFolderNode('${child.id}')"><svg class="tree-svg-icon" style="color: ${child.color || 'var(--primary)'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg><span>${esc(child.name)}</span></div>`; } 
      else { html += `<div class="file-grid-item" onclick="loadSavedFileNode('${child.id}', '${esc(child.name)}')"><svg class="tree-svg-icon" style="color: var(--text-muted)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><span>${esc(child.name)}</span></div>`; }
    });
  } else { html = `<p style="color: var(--text-muted); font-size: 14px; grid-column: 1 / -1; padding: 1.5rem; text-align: center; border: 1px dashed var(--border); border-radius: 12px;">This directory is empty.</p>`; }
  grid.innerHTML = html;
}

function loadSavedFileNode(id, name, event) {
  if (event) event.stopPropagation(); currentViewedNoteId = id; hideAllViews();
  let treeData = getLibraryData(); let foundFile = getTargetNode(treeData, id); const path = findPath(treeData, id);
  document.getElementById('active-project-workspace').style.display = 'block';
  document.getElementById('active-project-title').textContent = name;
  renderBreadcrumbs(path, 'breadcrumbs-project');

  const rawBody = document.getElementById('raw-notes-body'); 
  const btnHead = document.querySelector('.accordion-header');
  rawBody.style.display = 'none'; if(btnHead) btnHead.classList.remove('open');

  if (foundFile) {
    if (!foundFile.data) {
      foundFile.data = {
        rawText: "Legacy Note: The original raw text was not saved in older versions. Click 'Edit Content' to overwrite with new content.",
        summary: ["No summary available for legacy notes."], keywords: ["Legacy", "System"], clusters: [], learningPath: [], isRawOnly: false
      };
      localStorage.setItem('notized_library_tree', JSON.stringify(treeData));
    } else if (!foundFile.data.rawText) {
      foundFile.data.rawText = "Legacy Note: The original raw text was not saved in older versions. Click 'Edit Content' to overwrite with new content.";
      localStorage.setItem('notized_library_tree', JSON.stringify(treeData));
    }

    const data = foundFile.data;
    rawBody.textContent = data.rawText;
    
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

  localStorage.setItem('notized_target_folder', targetId || 'root_root'); currentViewedFolderId = targetId || 'root_root';
  isNoteEditingActive = false; noteEditingTargetId = null; hideAllViews();
  document.getElementById('input-form-workspace').style.display = 'block';
  
  document.getElementById('notes-input').value = '';
  updateWordCount(); 
  
  if (isGuestMode) {
      document.getElementById('intake-form-title').textContent = "Try Sample Concept";
      const subtitle = document.querySelector('#input-form-workspace .entry-subtitle');
      if (subtitle) subtitle.textContent = "Experience Quantum Analysis instantly without an account.";
      
      const formActionBar = document.querySelector('#input-form-workspace .explicit-action-bar');
      if (formActionBar) formActionBar.style.display = 'none';
      
      const saveRawBtn = document.querySelector('button[onclick="handleSaveRaw()"]');
      if (saveRawBtn) saveRawBtn.style.display = 'none';
      
      const breadcrumbs = document.getElementById('breadcrumbs-input');
      if (breadcrumbs) breadcrumbs.style.display = 'none';
  } else {
      document.getElementById('intake-form-title').textContent = "Transform New Material";
      const subtitle = document.querySelector('#input-form-workspace .entry-subtitle');
      if (subtitle) subtitle.textContent = "Feed in lecture transcripts, notes, drafts, or full book chapters into the current directory.";
      
      const formActionBar = document.querySelector('#input-form-workspace .explicit-action-bar');
      if (formActionBar) formActionBar.style.display = 'flex';
      
      const saveRawBtn = document.querySelector('button[onclick="handleSaveRaw()"]');
      if (saveRawBtn) saveRawBtn.style.display = 'inline-flex';
      
      const tree = getLibraryData(); const path = targetId === 'root_root' ? [] : findPath(tree, targetId);
      let intakePath = path ? [...path] : []; intakePath.push({ id: 'new', name: 'New Note Session', type: 'file' });
      
      const breadcrumbs = document.getElementById('breadcrumbs-input');
      if (breadcrumbs) {
          breadcrumbs.style.display = 'flex';
          renderBreadcrumbs(intakePath, 'breadcrumbs-input');
      }
  }
}

function startNewIntakeFromCurrentFolder() { startNewIntake(currentViewedFolderId); }

function updateWordCount() {
  const text = document.getElementById('notes-input').value.trim(); const wordCount = text.length > 0 ? text.split(/\s+/).length : 0;
  const badge = document.getElementById('word-count');
  if (wordCount === 0) badge.textContent = "Waiting for content"; else if (wordCount < 10) badge.textContent = `${wordCount} words - Too short!`; else badge.textContent = `${wordCount} words detected`;
}

function triggerFileUpload() { document.getElementById('file-input').click(); }

async function handleFileUpload(event) {
  const file = event.target.files[0]; if (!file) return;
  const textarea = document.getElementById('notes-input'); textarea.value = "Extracting document content, please wait...";
  try { if (file.name.toLowerCase().endsWith('.pdf')) textarea.value = await extractTextFromPDF(file); else textarea.value = await file.text(); updateWordCount(); } 
  catch (e) { textarea.value = ""; customAlert("Error reading file. Ensure it's a valid text or PDF.", "System Error"); }
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
            guestMsg.style.cssText = "margin-top: 1rem; padding: 1.5rem; background-color: #f0f9ff; border: 1px dashed #0284c7; border-radius: 12px; text-align: center; margin-bottom: 2rem;";
            guestMsg.innerHTML = `
              <h3 class="serif" style="color: #0284c7; margin-bottom: 0.5rem;">Analysis Complete!</h3>
              <p style="color: #334155; margin-bottom: 1rem;">To edit, manage, and save this analysis into your personal directory, you must be signed in to an account.</p>
              <button class="btn-primary" onclick="window.location.href='index.html'">Login or Register Account</button>
            `;
            const headerWrap = document.querySelector('#active-project-workspace .note-header-wrap');
            if(headerWrap) headerWrap.insertAdjacentElement('afterend', guestMsg);
        }
        
        document.getElementById('unanalyzed-state').style.display = 'none';
        document.getElementById('analyzed-content-state').style.display = 'block';
        
        const rawBody = document.getElementById('raw-notes-body');
        if(rawBody) { rawBody.style.display = 'none'; rawBody.textContent = result.rawText; }
        renderProjectContent(result);
        return;
    }
    
    localStorage.setItem('notizedData', JSON.stringify(result));
    if (isNoteEditingActive) saveEditedNoteDirectly(result); else openSaveModal();
  } catch (e) { document.getElementById('loading-view').classList.remove('active'); errorMsg.textContent = "Analysis failed."; errorMsg.style.display = 'block'; }
}

function toggleRawNotesView() {
  const body = document.getElementById('raw-notes-body'); const btn = document.querySelector('.accordion-header');
  if (body.style.display === 'none') { body.style.display = 'block'; btn.classList.add('open'); } else { body.style.display = 'none'; btn.classList.remove('open'); }
}

function triggerViewRawExplicit() {
  const body = document.getElementById('raw-notes-body'); const btn = document.querySelector('.accordion-header');
  if (body && btn) { body.style.display = 'block'; btn.classList.add('open'); btn.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

async function triggerAnalyzeFromRaw() {
   const tree = getLibraryData(); const node = getTargetNode(currentViewedNoteId); const rawText = node.data.rawText;
   if(rawText.split(/\s+/).length < 10) { await customAlert("This raw note is too short to analyze (minimum 10 words). Please edit and add more context.", "Analysis Blocked"); return; }
   document.getElementById('loading-view').classList.add('active');
   const barEl = document.getElementById('progress-bar'); const pctEl = document.getElementById('progress-pct');
   barEl.style.width = '40%'; pctEl.textContent = '40%';
   try {
      const result = await analyzeNotes(rawText); result.rawText = rawText; result.isRawOnly = false;
      barEl.style.width = '100%'; pctEl.textContent = '100%'; await sleep(300); document.getElementById('loading-view').classList.remove('active');
      node.data = result; localStorage.setItem('notized_library_tree', JSON.stringify(tree));
      refreshWorkspaceTree(); loadSavedFileNode(node.id, node.name);
   } catch(e) { document.getElementById('loading-view').classList.remove('active'); await customAlert("Quantum Analysis failed.", "System Error"); }
}

async function triggerEditNoteExplicit() {
  if (!currentViewedNoteId) return;
  const tree = getLibraryData(); const node = getTargetNode(tree, currentViewedNoteId);
  let textToEdit = ""; if (node && node.data && node.data.rawText) { textToEdit = node.data.rawText; if (textToEdit.includes("Legacy Note: The original raw text was not saved")) { textToEdit = ""; } }
  isNoteEditingActive = true; noteEditingTargetId = currentViewedNoteId; hideAllViews();
  document.getElementById('input-form-workspace').style.display = 'block';
  document.getElementById('intake-form-title').textContent = `Editing Note: ${node.name}`; document.getElementById('notes-input').value = textToEdit; updateWordCount();
}

function saveEditedNoteDirectly(newAnalysisData) {
  let treeData = getLibraryData(); let node = getTargetNode(treeData, noteEditingTargetId);
  if (node) {
    node.data = newAnalysisData; localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); localStorage.removeItem('notizedData');
    isNoteEditingActive = false; noteEditingTargetId = null; refreshWorkspaceTree(); loadSavedFileNode(node.id, node.name);
  }
}

async function triggerRenameFolderExplicit() {
  if (currentViewedFolderId === 'root_root') return;
  isEditMode = true; editingNodeId = currentViewedFolderId; const tree = getLibraryData(); const node = getTargetNode(tree, currentViewedFolderId);
  if (node) {
    document.getElementById('modal-folder-title').textContent = "Rename Folder"; document.getElementById('btn-submit-folder').textContent = "Save Changes";
    document.getElementById('new-folder-name-input').value = node.name; document.getElementById('folder-creator-card').style.setProperty('display', 'flex', 'important');
  }
}

async function triggerDeleteFolderExplicit() {
  if (currentViewedFolderId === 'root_root') return;
  const isConfirmed = await customConfirm("Are you sure you want to completely delete this folder and its contents?", "Purge Directory"); if (!isConfirmed) return;
  let treeData = getLibraryData(); if (deleteInTree(treeData, currentViewedFolderId)) { localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); refreshWorkspaceTree(); viewRoot(); }
}

async function triggerRenameNoteExplicit() {
  if (!currentViewedNoteId) return;
  const treeData = getLibraryData(); const node = getTargetNode(treeData, currentViewedNoteId);
  if (node) {
    const newName = await customPrompt("Enter a new name for this note:", node.name, "Rename Segment");
    if (newName && newName.trim()) { node.name = newName.trim(); localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); refreshWorkspaceTree(); document.getElementById('active-project-title').textContent = node.name; renderBreadcrumbs(findPath(treeData, currentViewedNoteId), 'breadcrumbs-project'); }
  }
}

async function triggerDeleteNoteExplicit() {
  if (!currentViewedNoteId) return;
  const isConfirmed = await customConfirm("Delete this note permanently from the ledger?", "Purge Document"); if (!isConfirmed) return;
  let treeData = getLibraryData(); let parentPath = findPath(treeData, currentViewedNoteId);
  let parentFolderId = (parentPath && parentPath.length > 1) ? parentPath[parentPath.length - 2].id : 'root_root';
  if (deleteInTree(treeData, currentViewedNoteId)) { localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); refreshWorkspaceTree(); if(parentFolderId === 'root_root') viewRoot(); else viewFolderNode(parentFolderId); }
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
  const rows = document.querySelectorAll('.tree-node-row');
  rows.forEach(row => {
    row.addEventListener('dragstart', (e) => { e.stopPropagation(); draggedNodeId = row.getAttribute('data-id'); row.classList.add('dragging'); });
    row.addEventListener('dragend', () => { row.classList.remove('dragging'); document.querySelectorAll('.tree-node-row').forEach(r => { r.classList.remove('drag-over'); r.style.borderTop = ''; r.style.borderBottom = ''; }); });
    row.addEventListener('dragover', (e) => {
      e.preventDefault(); e.stopPropagation(); row.style.borderTop = ''; row.style.borderBottom = ''; const rect = row.getBoundingClientRect(); const y = e.clientY - rect.top;
      if (row.getAttribute('data-type') === 'folder') { if (y < rect.height * 0.25) row.style.borderTop = '2px solid var(--primary)'; else if (y > rect.height * 0.75) row.style.borderBottom = '2px solid var(--primary)'; else row.classList.add('drag-over'); }
      else { if (y < rect.height * 0.5) row.style.borderTop = '2px solid var(--primary)'; else row.style.borderBottom = '2px solid var(--primary)'; }
    });
    row.addEventListener('dragleave', () => { row.classList.remove('drag-over'); row.style.borderTop = ''; row.style.borderBottom = ''; });
    row.addEventListener('drop', (e) => {
      e.preventDefault(); e.stopPropagation(); const targetId = row.getAttribute('data-id'); if (draggedNodeId === targetId) return;
      let treeData = getLibraryData(); let movingNode = null; let sourceArray = null; let sourceIndex = -1;
      function extractNode(nodes) { for (let i = 0; i < nodes.length; i++) { if (nodes[i].id === draggedNodeId) { sourceArray = nodes; sourceIndex = i; movingNode = nodes.splice(i, 1)[0]; return true; } if (nodes[i].children && extractNode(nodes[i].children)) return true; } return false; }
      extractNode(treeData); if (!movingNode) return;
      let targetArray = null; let targetIndex = -1; let targetNodeRef = null; let targetIsFolder = false;
      function findTarget(nodes) { for (let i = 0; i < nodes.length; i++) { if (nodes[i].id === targetId) { targetArray = nodes; targetIndex = i; targetNodeRef = nodes[i]; targetIsFolder = nodes[i].type === 'folder'; return true; } if (nodes[i].children && findTarget(nodes[i].children)) return true; } return false; }
      findTarget(treeData);
      if (!targetArray) { sourceArray.splice(sourceIndex, 0, movingNode); return; }
      const rect = row.getBoundingClientRect(); const y = e.clientY - rect.top;
      if (targetIsFolder) { if (y < rect.height * 0.25) targetArray.splice(targetIndex, 0, movingNode); else if (y > rect.height * 0.75) targetArray.splice(targetIndex + 1, 0, movingNode); else { if (!targetNodeRef.children) targetNodeRef.children = []; targetNodeRef.children.push(movingNode); targetNodeRef.expanded = true; } }
      else { if (y < rect.height * 0.5) targetArray.splice(targetIndex, 0, movingNode); else targetArray.splice(targetIndex + 1, 0, movingNode); }
      localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); refreshWorkspaceTree();
      if(currentViewedFolderId !== "root_root") viewFolderNode(currentViewedFolderId); else viewRoot();
    });
  });
}

function refreshWorkspaceTree() { const treeData = getLibraryData(); document.getElementById('nested-directory-root').innerHTML = buildTreeHTML(treeData); bindDragAndDropEvents(); }

// ─── PENGHAPUSAN TEKS "EMPTY" PADA SIDEBAR ───
function buildTreeHTML(nodes) {
  return nodes.map(node => {
    if (node.type === "folder") {
      const caret = node.children && node.children.length > 0 ? (node.expanded ? "▾" : "▸") : " "; const baseColor = node.color || "#0284c7"; 
      return `
        <div class="tree-folder-block" data-id="${node.id}">
          <div class="tree-folder-header tree-node-row" draggable="true" data-id="${node.id}" data-type="folder" style="background-color: ${hexToRgbaTint(baseColor, 0.14)}; color: ${baseColor};">
            <div style="display: flex; gap: 0.4rem; align-items: center; flex: 1;">
              <div onclick="toggleFolderNode('${node.id}', event)" style="padding: 0 2px; cursor: pointer; font-size:11px;">${caret}</div>
              <div onclick="viewFolderNode('${node.id}', event)" style="display: flex; gap: 0.5rem; align-items: center; flex: 1; cursor: pointer;"><svg class="tree-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg><strong>${esc(node.name)}</strong></div>
            </div>
            <span class="tree-count">${node.children ? node.children.length : 0}</span>
          </div>
          <div id="children-${node.id}" class="tree-folder-contents" style="${node.expanded ? 'display:flex;' : 'display:none;'} padding-left: 0.75rem; flex-direction: column; gap: 0.25rem;">
            ${node.children && node.children.length > 0 ? buildTreeHTML(node.children) : ''}
          </div>
        </div>`;
    } else {
      return `
        <div class="tree-file-item tree-node-row" draggable="true" data-id="${node.id}" data-type="file" onclick="loadSavedFileNode('${node.id}', '${esc(node.name)}', event)">
          <svg class="tree-svg-icon" style="color: var(--text-muted);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><span>${esc(node.name)}</span>
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
  document.getElementById('new-folder-name-input').value = ''; folderModal.style.setProperty('display', 'flex', 'important');
}

function handleFolderSubmit() {
  const nameInput = document.getElementById('new-folder-name-input').value.trim(); if (!nameInput) { customAlert("Please enter a folder name!", "Validation"); return; }
  let treeData = getLibraryData();
  if (isEditMode) { let node = getTargetNode(treeData, editingNodeId); if (node) { node.name = nameInput; node.color = selectedFolderColor || "#0284c7"; } } 
  else {
    const newNode = { id: "node_" + Date.now(), name: nameInput, type: "folder", color: selectedFolderColor, expanded: false, children: [] };
    if (currentViewedFolderId === "root_root") treeData.push(newNode);
    else { let parent = getTargetNode(treeData, currentViewedFolderId); if (parent && parent.type === 'folder') { parent.children.push(newNode); parent.expanded = true; } else treeData.push(newNode); }
  }
  localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); closeFolderCreatorCard(); refreshWorkspaceTree();
  if (!isEditMode && currentViewedFolderId !== "root_root") viewFolderNode(currentViewedFolderId); else if (isEditMode) viewFolderNode(editingNodeId);
}

function closeFolderCreatorCard() { document.getElementById('folder-creator-card').style.setProperty('display', 'none', 'important'); isEditMode = false; }
function selectColorDot(el) { document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active')); el.classList.add('active'); selectedFolderColor = el.getAttribute('data-color'); }

function openSaveModal() {
  const incoming = localStorage.getItem('notizedData'); if (!incoming) return;
  document.getElementById('save-modal').style.display = 'flex'; document.getElementById('save-notes-name').value = JSON.parse(incoming).title || '';
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
  const titleInput = document.getElementById('save-notes-name').value.trim(); const folderTargetId = document.getElementById('save-folder-select').value;
  if (!titleInput) { await customAlert('Please enter a project name.', "Validation"); return; }
  const incomingData = JSON.parse(localStorage.getItem('notizedData')); let treeData = getLibraryData();
  const newFileNode = { id: "node_" + Date.now(), name: titleInput, type: "file", data: incomingData };
  if (folderTargetId === "root_root" || folderTargetId.startsWith("mock_pad_")) treeData.push(newFileNode);
  else { let parent = getTargetNode(treeData, folderTargetId); if (parent) { if (!parent.children) parent.children = []; parent.children.push(newFileNode); parent.expanded = true; } }
  localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); localStorage.removeItem('notizedData'); localStorage.removeItem('notized_target_folder');
  closeSaveModal(); refreshWorkspaceTree(); loadSavedFileNode(newFileNode.id, titleInput);
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
function esc(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }