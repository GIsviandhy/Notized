// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ─── STATE MANAGEMENT ────────────────────────────────────────────────────────
let selectedFolderColor = "#6B8F71"; 
let currentRightClickedNodeId = null; // Menyimpan ID item aktif untuk modal bawaan
let draggedNodeId = null;              // Menyimpan ID item yang sedang di-drag
let isEditMode = false;      // Untuk mendeteksi apakah modal sedang dipakai untuk Create atau Edit
let editingNodeId = null;    // Menyimpan ID folder yang sedang diedit
let currentSelectedNodeId = null; // Menyimpan ID item yang sedang dipilih untuk preview
let currentAccountTreeData = []; // Tempat menampung data hasil tarikan MySQL phpMyAdmin

// ─── INITIALIZATION ON LOAD ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const greetingEl = document.getElementById('user-greeting');
  if (greetingEl) {
    if (currentUser && currentUser.name) {
      greetingEl.textContent = `Halo, ${currentUser.name}`;
    } else {
      greetingEl.textContent = ""; 
    }
  }

  const incomingData = localStorage.getItem('notizedData');
  
  if (incomingData) {
    const saveBtn = document.getElementById('btn-trigger-save');
    if (saveBtn) {
      saveBtn.style.setProperty('display', 'flex', 'important');
    }

    const navButtons = document.querySelectorAll('.dashboard-nav button');
    navButtons.forEach(btn => {
      if (btn.textContent.includes('New Note') || (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('input.html'))) {
        btn.style.setProperty('display', 'none', 'important');
      }
    });
    
    const parsed = JSON.parse(incomingData);
    
    const sessionRawText = localStorage.getItem('current_raw_text');
    if (sessionRawText) {
      parsed.rawText = sessionRawText;
      parsed.notes = sessionRawText;
    }
    
    document.getElementById('empty-workspace-state').style.display = 'none';
    document.getElementById('active-project-workspace').style.display = 'flex';
    
    const overviewActions = document.getElementById('overview-actions');
    if (overviewActions) {
      overviewActions.innerHTML = ""; 
    }

    const sidebarPane = document.getElementById('workspace-sidebar');
    if (sidebarPane) sidebarPane.style.setProperty('display', 'none', 'important');
    
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    if (toggleBtn) toggleBtn.style.setProperty('display', 'none', 'important');

    const scrollContainer = document.querySelector('.workspace-tab-body-scroll');
    if (scrollContainer) {
      scrollContainer.classList.add('preview-full-mode');
    }

    renderProjectContent(parsed);
    
    const masterNoteBox = document.getElementById('master-note-view-box');
    if (masterNoteBox) masterNoteBox.style.setProperty('display', 'block', 'important');
    
    const folderWrapper = document.getElementById('folder-overview-wrapper');
    if (folderWrapper) folderWrapper.style.setProperty('none', 'important');

    const stickyHeader = document.querySelector('.workspace-header-sticky');
    if (stickyHeader) {
      stickyHeader.innerHTML = `
        <div id="workspace-breadcrumbs" class="breadcrumbs-bar"><span style="color: var(--ink-muted);">Preview Mode</span></div>
        <div class="folder-header-aligner" style="max-width: 100% !important; width: 100% !important;">
          <h1 id="active-project-title" class="serif" style="margin: 0; font-size: 2.5rem; font-weight: 600; color: var(--ink); line-height: 1.2;">Preview: ${esc(parsed.title || "Unsaved Note")}</h1>
          <div id="overview-actions" style="display: flex; gap: 0.5rem; align-items: center;"></div>
        </div>
        <div class="workspace-tabs-container" style="display: flex !important; gap: 0.5rem; margin-top: 1rem;">
          <button type="button" class="tab-trigger active" onclick="switchWorkspaceTab('tab-raw')">Notes</button>
          <button type="button" class="tab-trigger" onclick="switchWorkspaceTab('tab-summary')">Smart Summary</button>
          <button type="button" class="tab-trigger" onclick="switchWorkspaceTab('tab-clusters')">Topic Clusters</button>
          <button type="button" class="tab-trigger" onclick="switchWorkspaceTab('tab-path')">Learning Path</button>
        </div>
      `;
    }

    document.querySelectorAll('.tab-trigger').forEach(btn => btn.classList.remove('active'));
    const initialActiveBtn = document.querySelector(`[onclick="switchWorkspaceTab('tab-raw')"]`);
    if (initialActiveBtn) initialActiveBtn.classList.add('active');

    if (scrollContainer) scrollContainer.scrollTop = 0;
    return; 
  }

  const scrollContainer = document.querySelector('.workspace-tab-body-scroll');
  if (scrollContainer) {
    scrollContainer.classList.remove('preview-full-mode');
  }

  const sidebarPane = document.getElementById('workspace-sidebar');
  if (sidebarPane) sidebarPane.style.setProperty('display', 'flex', 'important');
  
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  if (toggleBtn) toggleBtn.style.setProperty('display', 'flex', 'important');

  await loadLibraryFromDatabase();

  function forceCollapseAll(nodes) {
    nodes.forEach(node => {
      if (node.type === "folder") {
        node.expanded = false;
        if (node.children) forceCollapseAll(node.children);
      }
    });
  }
  forceCollapseAll(currentAccountTreeData);

  refreshWorkspaceTree();
  currentSelectedNodeId = null;
  resetToEmptyState();
});

async function loadLibraryFromDatabase() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser || !currentUser.email) {
    currentAccountTreeData = [];
    return;
  }
  try {
    const response = await fetch(`api.php?action=get_tree&email=${encodeURIComponent(currentUser.email)}`);
    const data = await response.json();
    currentAccountTreeData = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Gagal sinkronisasi database MySQL XAMPP:", error);
    currentAccountTreeData = [];
  }
}

function getLibraryData() {
  return currentAccountTreeData;
}

async function saveLibraryData(updatedTree) {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser || !currentUser.email) return;
  currentAccountTreeData = updatedTree;
  try {
    const response = await fetch('api.php?action=save_tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUser.email,
        tree_data: updatedTree
      })
    });
    const result = await response.json();
    console.log("MySQL Engine Response:", result.message);
  } catch (error) {
    console.error("Gagal menyuntikkan update data ke MySQL database:", error);
  }
}

function findNodeById(nodes, id) {
  for (let node of nodes) {
    if (node.id === id) return node;
    if (node.children && node.children.length > 0) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function renderProjectContent(data) {
  if (!data) return;
  
  const rawNotesArea = document.getElementById('raw-notes-content-area');
  if (rawNotesArea) {
    rawNotesArea.innerHTML = data.rawText || data.notes || "No raw text content available.";
  }  

  const keywordChips = document.getElementById('keyword-chips');
  if (keywordChips) {
    if (data.keywords && data.keywords.length > 0) {
      keywordChips.innerHTML = data.keywords.map((kw, i) => `
        <span class="chip c${i % 3}">
          ${esc(kw)}
        </span>`).join('');
    } else {
      keywordChips.innerHTML = `<span style="color: var(--ink-muted); font-size: 13px; font-style: italic;">No key concepts extracted.</span>`;
    }
  }

  const summaryList = document.getElementById('summary-list');
  if (summaryList) {
    if (data.summary && data.summary.length > 0) {
      summaryList.innerHTML = data.summary.map(point => `
        <li class="summary-item" style="font-size: 14px; line-height: 1.8; display: flex; gap: 0.5rem; align-items: flex-start;">
          <span class="summary-arrow">→</span> 
          <span>${point}</span>
        </li>`).join('');
    } else {
      summaryList.innerHTML = `<li style="color: var(--ink-muted); font-size: 13px; font-style: italic;">No summary points available.</li>`;
    }
  }

  if (document.getElementById('stat-keywords')) document.getElementById('stat-keywords').textContent = (data.keywords || []).length;
  if (document.getElementById('stat-clusters')) document.getElementById('stat-clusters').textContent = data.clusters ? data.clusters.length : "0";
  if (document.getElementById('stat-steps')) document.getElementById('stat-steps').textContent = (data.learningPath || []).length;

  const clustersGrid = document.getElementById('clusters-grid');
  if (clustersGrid) {
    if (data.clusters && data.clusters.length > 0) {
      clustersGrid.innerHTML = data.clusters.map(cluster => `
        <div class="cluster-card" style="width: 100%;">
          <div class="cluster-header"><span class="cluster-name">${esc(cluster.name)}</span></div>
          <div class="cluster-topics">${(cluster.topics || []).map(topic => `<div class="cluster-topic">${esc(topic)}</div>`).join('')}</div>
        </div>`).join('');
    } else {
      clustersGrid.innerHTML = `<div style="grid-column: 1/-1; color: var(--ink-muted); font-size: 13px; font-style: italic; padding: 1rem;">No topic clusters analyzed.</div>`;
    }
  }

  const pathList = document.getElementById('path-list');
  if (pathList) {
    if (data.learningPath && data.learningPath.length > 0) {
      pathList.innerHTML = data.learningPath.map((step) => `
        <div class="path-item" style="width: 100%;">
          <div class="path-num">${step.step}</div>
          <div class="path-card" style="width: 100%;">
            <div class="path-card-header"><span class="path-card-title">${esc(step.title || step.step)}</span></div>
            <p class="path-tip">💡 ${esc(step.tip || '')}</p>
          </div>
        </div>`).join('');
    } else {
      pathList.innerHTML = `<div style="color: var(--ink-muted); font-size: 13px; font-style: italic; padding: 1rem;">No learning path generated.</div>`;
    }
  }
}

function isNodeChildOf(nodes, folderId, targetId) {
  const folderNode = findNodeById(nodes, folderId);
  if (!folderNode || !folderNode.children) return false;
  function checkDeep(children) {
    for (let child of children) {
      if (child.id === targetId) return true;
      if (child.children && checkDeep(child.children)) return true;
    }
    return false;
  }
  return checkDeep(folderNode.children);
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
  const scrollContainer = document.querySelector('.workspace-tab-body-scroll');
  if (!sidebar) return;

  if (sidebar.style.display === 'none') {
    sidebar.style.setProperty('display', 'flex', 'important');
    if (scrollContainer) {
      scrollContainer.classList.remove('sidebar-closed-mode');
    }
  } else {
    sidebar.style.setProperty('display', 'none', 'important');
    if (scrollContainer) {
      scrollContainer.classList.add('sidebar-closed-mode');
    }
  }
}

function refreshWorkspaceTree() {
  const treeContainer = document.getElementById('nested-directory-root');
  if (!treeContainer) return;
  const treeData = getLibraryData();
  treeContainer.innerHTML = buildTreeHTML(treeData);
  if (typeof bindDragAndDropEvents === 'function') { bindDragAndDropEvents(); }
}

function selectFolderWorkspace(folderId, event) {
  if (event) event.stopPropagation();
  currentSelectedNodeId = folderId;
  currentRightClickedNodeId = folderId; 

  const saveBtn = document.getElementById('btn-trigger-save');
  if (saveBtn) saveBtn.style.setProperty('display', 'none', 'important');

  const navButtons = document.querySelectorAll('.dashboard-nav button');
  navButtons.forEach(btn => {
    if (btn.textContent.includes('New Note') || (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('input.html'))) {
      btn.style.setProperty('display', 'inline-block', 'important');
    }
  });

  document.getElementById('empty-workspace-state').style.display = 'none';
  document.getElementById('active-project-workspace').style.display = 'flex';

  const treeData = getLibraryData();
  const folderNode = findNodeById(treeData, folderId);
  
  if (folderNode) {
    const stickyHeader = document.querySelector('.workspace-header-sticky');
    if (stickyHeader) {
      stickyHeader.innerHTML = `
        <div id="workspace-breadcrumbs" class="breadcrumbs-bar"></div>
        <div class="folder-header-aligner">
          <h1 id="active-project-title" class="serif" style="margin: 0; font-size: 2.5rem; font-weight: 600; color: var(--ink); line-height: 1.2;">${esc(folderNode.name)}</h1>
          <div id="overview-actions" style="display: flex; gap: 0.5rem; align-items: center;">
            <button type="button" class="btn-overview-action rename" onclick="handleOverviewRename()" style="display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.75rem; font-size: 13px; border-radius: 6px; background: rgba(201,136,58,0.1); color: #C9883A; border: 1px solid rgba(201,136,58,0.2); cursor: pointer; font-weight: 500;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
              Rename
            </button>
            <button type="button" class="btn-overview-action delete" onclick="handleOverviewDelete()" style="display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.75rem; font-size: 13px; border-radius: 6px; background: rgba(184,92,110,0.1); color: #B85C6E; border: 1px solid rgba(184,92,110,0.2); cursor: pointer; font-weight: 500;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              Delete
            </button>
          </div>
        </div>
      `;
    }
    
    const children = folderNode.children || [];
    if (children.length === 0) {
      document.getElementById('folder-overview-wrapper').innerHTML = `
        <div style="color: var(--ink-muted); padding: 4rem 2rem; text-align: center; font-size: 14px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem;">
          <span style="color: var(--ink-muted); opacity: 0.5; display: inline-flex; align-items: center;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </span>
          <span style="font-style: italic; font-weight: 500;">Folder ini kosong.</span>
        </div>`;
    } else {
      let folderOverviewHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; width: 100%;">`;
      children.forEach(child => {
        if (child.type === "folder") {
          const folderColor = child.color || "#6B8F71";
          folderOverviewHTML += `
            <div onclick="selectFolderWorkspace('${child.id}', event)" style="background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem 1rem; display: flex; align-items: center; gap: 0.75rem; cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-sm);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)';">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${folderColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span style="font-weight: 600; font-size: 14px; color: var(--ink); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${esc(child.name)}</span>
            </div>`;
        } else {
          folderOverviewHTML += `
            <div onclick="selectFileWorkspace('${child.id}', '${esc(child.name)}', event)" style="background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem 1rem; display: flex; align-items: center; gap: 0.75rem; cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-sm);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)';">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--ink-muted); flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="17" y1="17" x2="8" y2="17"></line></svg>
              <span style="font-size: 14px; color: var(--ink); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${esc(child.name)}</span>
            </div>`;
        }
      });
      folderOverviewHTML += `</div>`;
      document.getElementById('folder-overview-wrapper').innerHTML = folderOverviewHTML;
    }
  }
  
  const masterNoteBox = document.getElementById('master-note-view-box');
  if (masterNoteBox) masterNoteBox.style.setProperty('display', 'none', 'important');
  
  const folderWrapper = document.getElementById('folder-overview-wrapper');
  if (folderWrapper) folderWrapper.style.setProperty('display', 'block', 'important');

  const scrollContainer = document.querySelector('.workspace-tab-body-scroll');
  if (scrollContainer) scrollContainer.scrollTop = 0;

  updateBreadcrumbs(folderId);
}

function selectFileWorkspace(fileId, fileName, event) {
  if (event) event.stopPropagation();
  currentSelectedNodeId = fileId;
  currentRightClickedNodeId = fileId; 
  const saveBtn = document.getElementById('btn-trigger-save');
  if (saveBtn) saveBtn.style.setProperty('display', 'none', 'important');

  const navButtons = document.querySelectorAll('.dashboard-nav button');
  navButtons.forEach(btn => {
    if (btn.textContent.includes('New Note') || (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('input.html'))) {
      btn.style.setProperty('display', 'inline-block', 'important');
    }
  });
  openCardNoteDirect(fileId, event);
}

function buildTreeHTML(nodes) {
  return nodes.map(node => {
    if (node.type === "folder") {
      const caretIcon = node.children && node.children.length > 0 ? (node.expanded ? "▾" : "▸") : " ";
      const displayStyle = node.expanded ? "display: flex;" : "display: none;";
      const baseColor = node.color || "#6B8F71";
      const backgroundColorBlock = hexToRgbaTint(baseColor, 0.15);
      const textColorSolid = baseColor;
      return `
        <div class="tree-folder-block" data-id="${node.id}">
          <div class="tree-folder-header tree-node-row" draggable="true" data-id="${node.id}" data-type="folder" 
               onclick="selectFolderWorkspace('${node.id}', event)"
               style="background-color: ${backgroundColorBlock} !important; color: ${textColorSolid} !important; border-color: ${hexToRgbaTint(baseColor, 0.1)} !important; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 0.5rem; align-items: center; flex: 1; overflow: hidden;">
              <span onclick="event.stopPropagation(); toggleFolderNode('${node.id}', event);" style="font-size: 14px; width: 16px; display: inline-block; text-align: center; cursor: pointer; font-weight: bold; padding: 2px 4px; border-radius: 4px;">${caretIcon}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <strong style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; cursor: pointer;">${esc(node.name)}</strong>
            </div>
            <span class="tree-count">${node.children ? node.children.length : 0}</span>
          </div>
          <div id="children-${node.id}" class="tree-folder-contents" style="${displayStyle} padding-left: 0.75rem; flex-direction: column; gap: 0.25rem; margin-bottom: 0.5rem;">
            ${node.children && node.children.length > 0 ? buildTreeHTML(node.children) : '<div class="tree-empty-hint">No projects inside</div>'}
          </div>
        </div>`;
    } else {
      return `
        <div class="tree-file-item tree-node-row" draggable="true" data-id="${node.id}" data-type="file" onclick="selectFileWorkspace('${node.id}', '${esc(node.name)}', event)" style="padding: 0.5rem 0.75rem; font-size: 13px; color: var(--ink); border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; text-align: left;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--ink-muted); flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span>${esc(node.name)}</span>
        </div>`;
    }
  }).join('');
}

function toggleFolderNode(nodeId, event) {
  if (event) event.stopPropagation();
  let treeData = getLibraryData();
  function findAndToggle(nodes) {
    for (let node of nodes) {
      if (node.id === nodeId) { node.expanded = !node.expanded; return true; }
      if (node.children && findAndToggle(node.children)) return true;
    }
    return false;
  }
  findAndToggle(treeData);
  saveLibraryData(treeData); 
  refreshWorkspaceTree();
}

function openFolderCreatorDirect(event) {
  if (event) event.preventDefault();
  
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser || !currentUser.email || !currentUser.name) {
    showCustomAlert("You need to log in first to create a new workspace folder!");
    return; 
  }

  isEditMode = false;
  editingNodeId = null;
  const folderModal = document.getElementById('folder-creator-card');
  if (folderModal) {
    document.getElementById('modal-folder-title').textContent = "Create New Folder";
    document.getElementById('btn-submit-folder').textContent = "Create Folder";
    document.getElementById('new-folder-name-input').value = '';
    
    const colorPickerLabel = document.querySelector('.color-picker-label');
    const colorOptions = document.querySelectorAll('.color-palette-options');
    if (colorPickerLabel) colorPickerLabel.style.setProperty('display', 'block', 'important');
    if (colorOptions) colorOptions.forEach(opt => opt.style.setProperty('display', 'flex', 'important'));

    folderModal.style.setProperty('display', 'flex', 'important');
    setTimeout(() => document.getElementById('new-folder-name-input').focus(), 50);
  }
}

function handleFolderSubmit() {
  const nameInput = document.getElementById('new-folder-name-input').value.trim();
  if (!nameInput) return alert("Name cannot be empty!");
  let treeData = getLibraryData();
  if (isEditMode) {
    function updateNodeInTree(nodes) {
      for (let node of nodes) {
        if (node.id === editingNodeId) {
          node.name = nameInput;
          if (node.type === "folder") { node.color = selectedFolderColor || "#6B8F71"; }
          return true;
        }
        if (node.children && updateNodeInTree(node.children)) return true;
      }
      return false;
    }
    updateNodeInTree(treeData);
  } else {
    treeData.push({
      id: "node_" + Date.now(),
      name: nameInput,
      type: "folder",
      color: selectedFolderColor || "#6B8F71",
      expanded: false,
      children: []
    });
  }
  saveLibraryData(treeData); 
  closeFolderCreatorCard();
  refreshWorkspaceTree(); 
  if (isEditMode && currentSelectedNodeId === editingNodeId) {
    document.getElementById('active-project-title').innerText = nameInput;
    updateBreadcrumbs(editingNodeId);
  }
}

function closeFolderCreatorCard() {
  const folderModal = document.getElementById('folder-creator-card');
  if (folderModal) {
    folderModal.style.setProperty('display', 'none', 'important');
    document.getElementById('new-folder-name-input').value = '';
    isEditMode = false;
    editingNodeId = null;
  }
}

function selectColorDot(element) {
  if (!element) return;
  document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));
  element.classList.add('active');
  selectedFolderColor = element.getAttribute('data-color') || "#6B8F71";
}

function bindDragAndDropEvents() {
  const rows = document.querySelectorAll('.tree-node-row');
  rows.forEach(row => {
    row.addEventListener('dragstart', (e) => { e.stopPropagation(); draggedNodeId = row.getAttribute('data-id'); row.classList.add('dragging'); });
    row.addEventListener('dragend', () => { row.classList.remove('dragging'); document.querySelectorAll('.tree-node-row').forEach(r => r.classList.remove('drag-over')); });
    row.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); row.classList.add('drag-over'); });
    row.addEventListener('dragleave', () => { row.classList.remove('drag-over'); });
    row.addEventListener('drop', (e) => {
      e.preventDefault(); e.stopPropagation();
      const targetId = row.getAttribute('data-id'); if (draggedNodeId === targetId) return;
      let treeData = getLibraryData();
      if (typeof isNodeChildOf === 'function' && isNodeChildOf(treeData, draggedNodeId, targetId)) { refreshWorkspaceTree(); return; }
      let movingNode = null;
      function extractNode(nodes) {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === draggedNodeId) { movingNode = nodes.splice(i, 1)[0]; return true; }
          if (nodes[i].children && extractNode(nodes[i].children)) return true;
        }
        return false;
      }
      extractNode(treeData); if (!movingNode) return;
      let targetNodeRef = null;
      function findTarget(nodes) {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === targetId) { targetNodeRef = nodes[i]; return true; }
          if (nodes[i].children && findTarget(nodes[i].children)) return true;
        }
        return false;
      }
      findTarget(treeData);
      if (targetNodeRef && targetNodeRef.type === 'folder') {
        if (!targetNodeRef.children) targetNodeRef.children = [];
        targetNodeRef.children.push(movingNode);
        targetNodeRef.expanded = true;
      } else {
        treeData.push(movingNode);
      }
      saveLibraryData(treeData); 
      refreshWorkspaceTree();
    });
  });
}

function triggerRenameNode() {
  if (!currentRightClickedNodeId) return;
  let treeData = getLibraryData();
  let targetNode = findNodeById(treeData, currentRightClickedNodeId);
  if (!targetNode) return;
  isEditMode = true; 
  editingNodeId = currentRightClickedNodeId;
  const folderModal = document.getElementById('folder-creator-card');
  if (folderModal) {
    const colorPickerLabel = document.querySelector('.color-picker-label');
    const colorOptions = document.querySelector('.color-palette-options');
    const modalDesc = folderModal.querySelector('p');
    if (targetNode.type === "file") {
      document.getElementById('modal-folder-title').textContent = "Rename Note";
      document.getElementById('btn-submit-folder').textContent = "Save Name";
      if (modalDesc) modalDesc.textContent = "Give your document note a clear and concise new name.";
      if (colorPickerLabel) colorPickerLabel.style.display = 'none';
      if (colorOptions) colorOptions.style.setProperty('display', 'none', 'important');
    } else {
      document.getElementById('modal-folder-title').textContent = "Rename Folder";
      document.getElementById('btn-submit-folder').textContent = "Save Changes";
      if (modalDesc) modalDesc.textContent = "Give your new folder a name and choose a color theme.";
      if (colorPickerLabel) colorPickerLabel.style.display = 'block';
      if (colorOptions) colorOptions.style.setProperty('display', 'flex', 'important');
      const oldColor = targetNode.color || "#6B8F71";
      selectedFolderColor = oldColor; 
      document.querySelectorAll('.color-dot').forEach(dot => {
        dot.classList.remove('active');
        if (dot.getAttribute('data-color') === oldColor) { dot.classList.add('active'); }
      });
    }
    document.getElementById('new-folder-name-input').value = targetNode.name;
    folderModal.style.setProperty('display', 'flex', 'important');
    setTimeout(() => document.getElementById('new-folder-name-input').focus(), 50);
  }
}

function triggerDeleteNode() {
  if (!currentRightClickedNodeId) return;
  const deleteModal = document.getElementById('delete-confirm-modal');
  if (deleteModal) { deleteModal.style.setProperty('display', 'flex', 'important'); }
}

function closeDeleteModal() {
  const deleteModal = document.getElementById('delete-confirm-modal');
  if (deleteModal) { deleteModal.style.setProperty('display', 'none', 'important'); }
}

function confirmDeleteNode() {
  if (!currentRightClickedNodeId) return;
  let treeData = getLibraryData();
  function deleteInTree(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === currentRightClickedNodeId) { nodes.splice(i, 1); return true; }
      if (nodes[i].children && deleteInTree(nodes[i].children)) return true;
    }
    return false;
  }
  deleteInTree(treeData);
  saveLibraryData(treeData); 
  closeDeleteModal();
  refreshWorkspaceTree();
  if (currentSelectedNodeId === currentRightClickedNodeId) { resetToEmptyState(); }
}

function handleOverviewRename() {
  if (!currentSelectedNodeId) { showCustomAlert("Select a folder or file first!"); return; }
  currentRightClickedNodeId = currentSelectedNodeId; 
  triggerRenameNode();
}

function loadSavedFileNode(id, name, event) {
  if (event) event.stopPropagation();
  let treeData = getLibraryData(); let foundFile = null;
  function findFile(nodes) {
    for (let node of nodes) {
      if (node.id === id && node.type === "file") { foundFile = node; return true; }
      if (node.children && findFile(node.children)) return true;
    }
    return false;
  }
  findFile(treeData);
  if (foundFile && foundFile.data) {
    document.getElementById('empty-workspace-state').style.display = 'none';
    document.getElementById('active-project-workspace').style.display = 'flex'; 
    document.getElementById('active-project-title').textContent = name;
    renderProjectContent(foundFile.data);
    switchWorkspaceTab('tab-raw'); 
  }
}

function openSaveModal() {
  const incoming = localStorage.getItem('notizedData');
  if (!incoming) return;
  document.getElementById('save-modal').style.display = 'flex';
  const parsed = JSON.parse(incoming);
  document.getElementById('save-notes-name').value = parsed.title || '';
  let treeData = getLibraryData();
  const selectEl = document.getElementById('save-folder-select');
  let optionsHTML = `<option value="root_root">📁 Save to Root (Luar Folder)</option>`;
  function injectFolderOptions(nodes, depth = 0) {
    nodes.forEach(node => {
      if (node.type === "folder") {
        optionsHTML += `<option value="${node.id}">&nbsp;&nbsp;`.repeat(depth) + `📁 Folder: ${node.name}</option>`;
        if (node.children) injectFolderOptions(node.children, depth + 1);
      }
    });
  }
  injectFolderOptions(treeData); selectEl.innerHTML = optionsHTML;
}

function handleSaveNote() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  
  if (!currentUser || !currentUser.email || !currentUser.name) {
    showCustomAlert("You need to log in first to save your analyzed study notes to a project folder!");
    return; 
  }
  
  openSaveModal();
}

function closeSaveModal() { document.getElementById('save-modal').style.display = 'none'; }

function confirmSaveNotes() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  
  if (!currentUser || !currentUser.email) {
    showCustomAlert("Session expired! Please log in again to save your notes.");
    return;
  }

  const titleInput = document.getElementById('save-notes-name').value.trim();
  const folderTargetId = document.getElementById('save-folder-select').value;
  if (!titleInput) return alert('Please enter a valid project name.');
  
  const incoming = localStorage.getItem('notizedData'); 
  if (!incoming) return;
  
  let incomingData = JSON.parse(incoming);
  let treeData = getLibraryData();
  const savedRawText = localStorage.getItem('current_raw_text') || "";
  incomingData.rawText = savedRawText; 
  incomingData.notes = savedRawText; 

  const newFileNode = { id: "node_" + Date.now(), name: titleInput, type: "file", data: incomingData };

  if (folderTargetId === "root_root") {
    treeData.push(newFileNode);
  } else {
    function insertToTargetFolder(nodes) {
      for (let node of nodes) {
        if (node.id === folderTargetId && node.type === "folder") {
          if (!node.children) node.children = [];
          node.children.push(newFileNode); 
          node.expanded = true; 
          return true;
        }
        if (node.children && insertToTargetFolder(node.children)) return true;
      }
      return false;
    }
    insertToTargetFolder(treeData);
  }

  saveLibraryData(treeData); 
  localStorage.removeItem('notizedData'); 
  localStorage.removeItem('current_raw_text'); 
  
  if (document.getElementById('btn-trigger-save')) {
    document.getElementById('btn-trigger-save').style.display = 'none';
  }
  
  closeSaveModal(); 
  
  const scrollContainer = document.querySelector('.workspace-tab-body-scroll');
  if (scrollContainer) {
    scrollContainer.classList.remove('preview-full-mode');
  }

  const sidebarPane = document.getElementById('workspace-sidebar');
  if (sidebarPane) {
    sidebarPane.style.setProperty('display', 'flex', 'important');
  }

  refreshWorkspaceTree(); 
  resetToEmptyState();
}

function handleOverviewDelete() {
  if (!currentSelectedNodeId) { showCustomAlert("Select a folder or file first!"); return; }
  currentRightClickedNodeId = currentSelectedNodeId; 
  triggerDeleteNode();
}

function handleNewNoteClick(event) {
  if (event) event.preventDefault();
  
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  
  if (!currentUser || !currentUser.email || !currentUser.name) {
    showCustomAlert("You need to log in first to create or type a new study note!");
    return; 
  }
  
  location.href = 'input.html';
}

function esc(str) { if (!str) return ''; return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function resetToEmptyState() {
  currentSelectedNodeId = null; currentRightClickedNodeId = null;
  const saveBtn = document.getElementById('btn-trigger-save');
  if (saveBtn) saveBtn.style.setProperty('display', 'none', 'important');
  const navButtons = document.querySelectorAll('.dashboard-nav button');
  navButtons.forEach(btn => {
    if (btn.textContent.includes('New Note') || (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('input.html'))) {
      btn.style.setProperty('display', 'inline-block', 'important');
    }
  });
  document.getElementById('empty-workspace-state').style.display = 'block';
  document.getElementById('active-project-workspace').style.display = 'none';
  const overviewActions = document.getElementById('overview-actions');
  if (overviewActions) overviewActions.innerHTML = "";
  renderDashboardCards();
}

function switchWorkspaceTab(targetTabId) {
  document.querySelectorAll('.tab-trigger').forEach(btn => btn.classList.remove('active'));
  const clickedBtn = document.querySelector(`[onclick="switchWorkspaceTab('${targetTabId}')"]`);
  if (clickedBtn) clickedBtn.classList.add('active');
  const targetPanel = document.getElementById(targetTabId);
  if (targetPanel) {
    targetPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderDashboardCards() {
  const cardsGrid = document.getElementById('dashboard-cards-grid');
  if (!cardsGrid) return;

  const treeData = getLibraryData() || [];
  const rootItems = treeData; 

  const rootTitle = document.querySelector('#empty-workspace-state h2');
  if (rootTitle) {
    rootTitle.textContent = "Project Workspace";
    rootTitle.className = "serif";
    rootTitle.style.setProperty('font-size', '32px', 'important');
    rootTitle.style.setProperty('color', 'var(--ink)', 'important');
  }

  if (rootItems.length === 0) {
    cardsGrid.innerHTML = `
      <div class="empty-placeholder-card" style="grid-column: 1 / -1; background: rgba(247, 245, 240, 0.6); border: 2px dashed var(--border); border-radius: 12px; padding: 4rem 2rem; text-align: center; width: 100%;">
        <p style="color: var(--ink-muted); font-size: 14px; margin-bottom: 1rem;">Your Project Workspace is empty.</p>
        <button class="btn-primary" onclick="openFolderCreatorDirect(event)" style="font-size: 12px; padding: 0.5rem 1rem;">+ Create First Folder</button>
      </div>`;
    return;
  }

  cardsGrid.innerHTML = rootItems.map(item => {
    if (item.type === "folder") {
      const folderColor = item.color || "#6B8F71"; 
      return `
        <div onclick="selectFolderWorkspace('${item.id}', event)" 
             style="background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem 1.25rem; display: flex; align-items: center; gap: 0.85rem; cursor: pointer; transition: all 0.2s ease; box-shadow: var(--shadow-sm);" 
             onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)'; this.style.borderColor='${folderColor}';" 
             onmouseout="this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)'; this.style.borderColor='var(--border)';">
          
          <div style="background: ${hexToRgbaTint(folderColor, 0.15)}; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${folderColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          
          <span style="font-weight: 600; font-size: 15px; color: var(--ink); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${esc(item.name)}
          </span>
        </div>
      `;
    } else {
      return `
        <div onclick="selectFileWorkspace('${item.id}', '${esc(item.name)}', event)" 
             style="background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem 1.25rem; display: flex; align-items: center; gap: 0.85rem; cursor: pointer; transition: all 0.2s ease; box-shadow: var(--shadow-sm);" 
             onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)'; this.style.borderColor='var(--indigo)';" 
             onmouseout="this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)'; this.style.borderColor='var(--border)';">
          
          <div style="background: rgba(74, 85, 134, 0.1); width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--indigo)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          
          <span style="font-size: 15px; color: var(--ink); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${esc(item.name)}
          </span>
        </div>
      `;
    }
  }).join('');
}

function openCardNoteDirect(fileId, event) {
  if (event) event.stopPropagation();
  let treeData = getLibraryData();
  let foundFile = null;
  function findFile(nodes) {
    for (let node of nodes) {
      if (node.id === fileId && node.type === "file") { foundFile = node; return true; }
      if (node.children && findFile(node.children)) return true;
    }
    return false;
  }
  findFile(treeData);
  if (foundFile && foundFile.data) {
    currentSelectedNodeId = fileId;
    currentRightClickedNodeId = fileId;
    document.getElementById('empty-workspace-state').style.display = 'none';
    document.getElementById('active-project-workspace').style.display = 'flex'; 
    
    const stickyHeader = document.querySelector('.workspace-header-sticky');
    if (stickyHeader) {
      stickyHeader.innerHTML = `
        <div id="workspace-breadcrumbs" class="breadcrumbs-bar"></div>
        <div class="folder-header-aligner">
          <h1 id="active-project-title" class="serif" style="margin: 0; font-size: 2.5rem; font-weight: 600; color: var(--ink); line-height: 1.2;">${esc(foundFile.name)}</h1>
          <div id="overview-actions" style="display: flex; gap: 0.5rem; align-items: center;">
            <button type="button" class="btn-overview-action rename" onclick="handleOverviewRename()" style="display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.75rem; font-size: 13px; border-radius: 6px; background: rgba(201,136,58,0.1); color: #C9883A; border: 1px solid rgba(201,136,58,0.2); cursor: pointer; font-weight: 500;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
              Rename
            </button>
            <button type="button" class="btn-overview-action delete" onclick="handleOverviewDelete()" style="display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.75rem; font-size: 13px; border-radius: 6px; background: rgba(184,92,110,0.1); color: #B85C6E; border: 1px solid rgba(184,92,110,0.2); cursor: pointer; font-weight: 500;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              Delete
            </button>
          </div>
        </div>
        <div class="workspace-tabs-container" style="display: flex !important; gap: 0.5rem; margin-top: 1rem;">
          <button type="button" class="tab-trigger active" onclick="switchWorkspaceTab('tab-raw')">Notes</button>
          <button type="button" class="tab-trigger" onclick="switchWorkspaceTab('tab-summary')">Smart Summary</button>
          <button type="button" class="tab-trigger" onclick="switchWorkspaceTab('tab-clusters')">Topic Clusters</button>
          <button type="button" class="tab-trigger" onclick="switchWorkspaceTab('tab-path')">Learning Path</button>
        </div>`;
    }

    renderProjectContent(foundFile.data);
    
    const masterNoteBox = document.getElementById('master-note-view-box');
    if (masterNoteBox) masterNoteBox.style.setProperty('display', 'block', 'important');
    
    const folderWrapper = document.getElementById('folder-overview-wrapper');
    if (folderWrapper) folderWrapper.style.setProperty('display', 'none', 'important');
    
    document.querySelectorAll('.tab-trigger').forEach(btn => btn.classList.remove('active'));
    const initialActiveBtn = document.querySelector(`[onclick="switchWorkspaceTab('tab-raw')"]`);
    if (initialActiveBtn) initialActiveBtn.classList.add('active');

    const scrollContainer = document.querySelector('.workspace-tab-body-scroll');
    if (scrollContainer) scrollContainer.scrollTop = 0;
    updateBreadcrumbs(fileId);
  } else {
    alert("Error: Data catatan tidak ditemukan di database.");
  }
}

function updateBreadcrumbs(nodeId) {
  const container = document.getElementById('workspace-breadcrumbs');
  if (!container) return;
  let html = `<span onclick="resetToEmptyState()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--ink)'" onmouseout="this.style.color='var(--ink-muted)'">Dashboard</span>`;
  if (!nodeId) { container.innerHTML = html; return; }
  const treeData = getLibraryData() || [];
  const nodePathObjects = findNodePathWithIds(treeData, nodeId);
  if (nodePathObjects && nodePathObjects.length > 0) {
    nodePathObjects.forEach((crumb, index) => {
      html += ` <span style="margin: 0 0.25rem; color: var(--border); font-size: 11px;">/</span> `;
      if (index === nodePathObjects.length - 1) {
        html += `<span style="font-weight: 600; color: var(--ink);">${esc(crumb.name)}</span>`;
      } else {
        html += `<span onclick="selectFolderWorkspace('${crumb.id}', event)" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--ink)'" onmouseout="this.style.color='var(--ink-muted)'">${esc(crumb.name)}</span>`;
      }
    });
  } else {
    let singleNode = findNodeById(treeData, nodeId);
    if (singleNode) {
      html += ` <span style="margin: 0 0.25rem; color: var(--border); font-size: 11px;">/</span> `;
      html += `<span style="font-weight: 600; color: var(--ink);">${esc(singleNode.name)}</span>`;
    }
  }
  container.innerHTML = html;
}

function findNodePathWithIds(nodes, targetId) {
  if (!nodes || !Array.isArray(nodes)) return null;
  for (let node of nodes) {
    if (node.id === targetId) { return [{ id: node.id, name: node.name }]; }
    if (node.children && node.children.length > 0) {
      const childPath = findNodePathWithIds(node.children, targetId);
      if (childPath) { return [{ id: node.id, name: node.name }, ...childPath]; }
    }
  }
  return null;
}

function renderProjectContent(data) {
  if (!data) return;
  
  const rawNotesArea = document.getElementById('raw-notes-content-area');
  if (rawNotesArea) {
    rawNotesArea.innerHTML = data.rawText || data.notes || "No raw text content available.";
  }  

  const keywordChips = document.getElementById('keyword-chips');
  if (keywordChips) {
    if (data.keywords && data.keywords.length > 0) {
      keywordChips.innerHTML = data.keywords.map((kw, i) => `
        <span class="chip c${i % 3}" style="padding: 0.45rem 1.1rem; border-radius: 20px; font-size: 13px; font-weight: 500; display: inline-block;">
          ${esc(kw)}
        </span>`).join('');
    } else {
      keywordChips.innerHTML = `<span style="color: var(--ink-muted); font-size: 13px; font-style: italic;">No key concepts extracted.</span>`;
    }
  }

  const summaryList = document.getElementById('summary-list');
  if (summaryList) {
    if (data.summary && data.summary.length > 0) {
      summaryList.innerHTML = data.summary.map(point => `
        <li class="summary-item" style="font-size: 14px; line-height: 1.8; display: flex; gap: 0.5rem; align-items: flex-start; width: 100%;">
          <span class="summary-arrow" style="color: var(--sage); font-weight: bold; flex-shrink: 0;">→</span> 
          <span>${point}</span>
        </li>`).join('');
    } else {
      summaryList.innerHTML = `<li style="color: var(--ink-muted); font-size: 13px; font-style: italic;">No summary points available.</li>`;
    }
  }

  if (document.getElementById('stat-keywords')) document.getElementById('stat-keywords').textContent = (data.keywords || []).length;
  if (document.getElementById('stat-clusters')) document.getElementById('stat-clusters').textContent = data.clusters ? data.clusters.length : "0";
  if (document.getElementById('stat-steps')) document.getElementById('stat-steps').textContent = (data.learningPath || []).length;

  const clustersGrid = document.getElementById('clusters-grid');
  if (clustersGrid) {
    if (data.clusters && data.clusters.length > 0) {
      clustersGrid.innerHTML = data.clusters.map(cluster => `
        <div class="cluster-card" style="width: 100%;">
          <div class="cluster-header"><span class="cluster-name">${esc(cluster.name)}</span></div>
          <div class="cluster-topics">${(cluster.topics || []).map(topic => `<div class="cluster-topic">${esc(topic)}</div>`).join('')}</div>
        </div>`).join('');
    } else {
      clustersGrid.innerHTML = `<div style="grid-column: 1/-1; color: var(--ink-muted); font-size: 13px; font-style: italic; padding: 1rem;">No topic clusters analyzed.</div>`;
    }
  }

  const pathList = document.getElementById('path-list');
  if (pathList) {
    if (data.learningPath && data.learningPath.length > 0) {
      pathList.innerHTML = data.learningPath.map((step) => `
        <div class="path-item" style="width: 100%;">
          <div class="path-num">${step.step}</div>
          <div class="path-card" style="width: 100%;">
            <div class="path-card-header"><span class="path-card-title">${esc(step.title || step.step)}</span></div>
            <p class="path-tip">💡 ${esc(step.tip || '')}</p>
          </div>
        </div>`).join('');
    } else {
      pathList.innerHTML = `<div style="color: var(--ink-muted); font-size: 13px; font-style: italic; padding: 1rem;">No learning path generated.</div>`;
    }
  }
}

function showCustomAlert(message) {
  const alertModal = document.getElementById('custom-alert-modal');
  const alertMsg = document.getElementById('custom-alert-message');
  if (alertModal && alertMsg) {
    alertMsg.textContent = message;
    alertModal.style.setProperty('display', 'flex', 'important');
  } else {
    // Fallback jika elemen DOM HTML belum siap
    alert(message);
  }
}

function closeCustomAlert() {
  const alertModal = document.getElementById('custom-alert-modal');
  if (alertModal) {
    alertModal.style.setProperty('display', 'none', 'important');
  }
}