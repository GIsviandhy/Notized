// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ─── STATE MANAGEMENT ────────────────────────────────────────────────────────
let selectedFolderColor = "#6B8F71"; 
let currentRightClickedNodeId = null; // Menyimpan ID item aktif untuk modal bawaan
let draggedNodeId = null;              // Menyimpan ID item yang sedang di-drag
let isEditMode = false;      // Untuk mendeteksi apakah modal sedang dipakai untuk Create atau Edit
let editingNodeId = null;    // Menyimpan ID folder yang sedang diedit
let currentSelectedNodeId = null; // Menyimpan ID item yang sedang dipilih untuk preview

// ─── INITIALIZATION ON LOAD ──────────────────────────────────────────────────
// ─── 🔒 LOCK INITIAL LOAD: SEMBUNYIKAN TOMBOL ACTION PAS PREVIEW ───
window.addEventListener('DOMContentLoaded', () => {
  // 1. Suntikkan teks user secara dinamis (tanpa nama default)
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const greetingEl = document.getElementById('user-greeting');
  if (greetingEl) {
    if (currentUser && currentUser.name) {
      greetingEl.textContent = `Halo, ${currentUser.name}`;
    } else {
      greetingEl.textContent = ""; 
    }
  }

  // 2. Ambil data operan sementara jika ada data baru hasil input dari page sebelah
  const incomingData = localStorage.getItem('notizedData');
  
  if (incomingData) {
    document.getElementById('btn-trigger-save').style.display = 'block';
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

    renderProjectContent(parsed);
    document.getElementById('active-project-title').textContent = "Preview: " + (parsed.title || "Unsaved Note");
    switchWorkspaceTab('tab-raw');
    return; 
  }

  // Lipat semua folder default biar masuk ke root overview
  let savedTree = localStorage.getItem('notized_library_tree');
  if (savedTree) {
    let parsedTree = JSON.parse(savedTree);
    function forceCollapseAll(nodes) {
      nodes.forEach(node => {
        if (node.type === "folder") {
          node.expanded = false;
          if (node.children) forceCollapseAll(node.children);
        }
      });
    }
    forceCollapseAll(parsedTree);
    localStorage.setItem('notized_library_tree', JSON.stringify(parsedTree));
  }

  refreshWorkspaceTree();
  currentSelectedNodeId = null;
  resetToEmptyState();
});

// ─── STORAGE ENGINE (MULTILEVEL NESTED SYSTEM) ───────────────────────────────
function getLibraryData() {
  const data = localStorage.getItem('notized_library_tree');
  if (data) return JSON.parse(data);

  const defaultTree = [
    {
      id: "node_bio", name: "Biology", type: "folder", expanded: false,
      children: [
        {
          id: "node_lec3", name: "Lecture 3", type: "folder", expanded: false,
          children: [
            { 
              id: "node_mitosis", 
              name: "Mitosis", 
              type: "file",
              data: {
                rawText: "Mitosis is a process of cell duplication, or reproduction, during which one cell gives rise to two genetically identical daughter cells. Strictly applied, the term mitosis is used to describe the duplication and distribution of chromosomes, the structures that carry the genetic information.",
                summary: ["Mitosis results in two identical daughter cells.", "Core checkpoint processes align chromatids perfectly.", "Crucial for growth and tissue repair."],
                keywords: ["Mitosis", "Cell Division", "Chromatids", "Chromosomes"],
                clusters: [{ name: "Core Cycles", color: "sage", topics: ["Prophase", "Metaphase", "Anaphase", "Telophase"] }],
                learningPath: [{ step: 1, title: "Replication Baseline", tip: "Understand G1/S phases before moving to M phase." }]
              }
            },
            { 
              id: "node_meiosis", 
              name: "Meiosis", 
              type: "file",
              data: {
                rawText: "Meiosis is a special type of cell division of germ cells in sexually-reproducing organisms used to produce the gametes, such as sperm or egg cells. It involves two rounds of division that ultimately result in four cells with only one copy of each chromosome.",
                summary: ["Meiosis creates genetic diversity via 4 haploid gametes.", "Involves two successive nuclear divisions (Meiosis I and II).", "Essential for sexual reproduction."],
                keywords: ["Meiosis", "Gametes", "Haploid", "Genetic Diversity"],
                clusters: [{ name: "Reduction Division", color: "indigo", topics: ["Crossing Over", "Homologous Pairs"] }],
                learningPath: [{ step: 1, title: "Meiotic Stages", tip: "Study the critical crossing-over phase in Prophase I." }]
              }
            }
          ]
        },
        { id: "node_lec5", name: "Lecture 5", type: "folder", expanded: false, children: [] }
      ]
    },
    {
      id: "node_phys", name: "Physics", type: "folder", expanded: false,
      children: [
        { 
          id: "node_optics", 
          name: "Optics", 
          type: "file",
          data: {
            rawText: "Optics is the branch of physics that studies the behaviour and properties of light, including its interactions with matter and the construction of instruments that use or detect it. Optics usually describes the behaviour of visible, ultraviolet, and infrared light.",
            summary: ["Studies the behavior and properties of light waves.", "Covers reflection, refraction, and diffraction phenomena.", "Governs the build of lenses and microscopes."],
            keywords: ["Optics", "Light Waves", "Refraction", "Lenses"],
            clusters: [{ name: "Wave Phenomena", color: "amber", topics: ["Geometric Optics", "Physical Optics"] }],
            learningPath: [{ step: 1, title: "Light Fundamentals", tip: "Master Snell's Law before calculating lens matrix focal points." }]
          }
        }
      ]
    }
  ];

  localStorage.setItem('notized_library_tree', JSON.stringify(defaultTree));
  return defaultTree;
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

// Menghindari eror "isNodeChildOf is not defined" pas drop folder
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
    if(c.length== 3){
      c= [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c= '0x'+c.join('');
    return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+opacity+')';
  }
  return 'rgba(107, 143, 113, 0.15)'; 
}

// ─── SIDEBAR RETRACTABLE CONTROLLER ──────────────────────────────────────────
function toggleSidebar(event) {
  if (event) event.preventDefault();
  const sidebar = document.getElementById('workspace-sidebar');
  if (!sidebar) return;
  if (sidebar.classList.contains('collapsed')) {
    sidebar.classList.remove('collapsed');
  } else {
    sidebar.classList.add('collapsed');
  }
}

// ─── RECURSIVE SIDEBAR TREE RENDERING ────────────────────────────────────────
function refreshWorkspaceTree() {
  const treeContainer = document.getElementById('nested-directory-root');
  if (!treeContainer) return;

  const treeData = getLibraryData();
  treeContainer.innerHTML = buildTreeHTML(treeData);

  if (typeof bindDragAndDropEvents === 'function') {
    bindDragAndDropEvents();
  }
}

// ─── RECURSIVE ENGINE: MARKUP BUILDER (FIX PANAH SIDEBAR & OVERVIEW SPLIT) ───
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
              <span onclick="event.stopPropagation(); toggleFolderNode('${node.id}', event);" 
                    style="font-size: 14px; width: 16px; display: inline-block; text-align: center; cursor: pointer; font-weight: bold; padding: 2px 4px; border-radius: 4px;" 
                    onmouseover="this.style.background='rgba(0,0,0,0.08)'" 
                    onmouseout="this.style.background='transparent'">
                ${caretIcon}
              </span>
              
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <strong style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; cursor: pointer;">${esc(node.name)}</strong>
            </div>
            <span class="tree-count">${node.children ? node.children.length : 0}</span>
          </div>
          <div id="children-${node.id}" class="tree-folder-contents" style="${displayStyle} padding-left: 0.75rem; flex-direction: column; gap: 0.25rem; margin-bottom: 0.5rem;">
            ${node.children && node.children.length > 0 ? buildTreeHTML(node.children) : '<div class="tree-empty-hint">No projects inside</div>'}
          </div>
        </div>
      `;
    } else {
      return `
        <div class="tree-file-item tree-node-row" draggable="true" data-id="${node.id}" data-type="file" onclick="selectFileWorkspace('${node.id}', '${esc(node.name)}', event)" style="padding: 0.5rem 0.75rem; font-size: 13px; color: var(--ink); border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; text-align: left;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--ink-muted); flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span>${esc(node.name)}</span>
        </div>
      `;
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
  localStorage.setItem('notized_library_tree', JSON.stringify(treeData));
  refreshWorkspaceTree();
}

// ─── MODAL CONTROLLERS ───────────────────────────────────────────────────────
function openFolderCreatorDirect(event) {
  if (event) event.preventDefault();
  isEditMode = false;
  editingNodeId = null;
  const folderModal = document.getElementById('folder-creator-card');
  if (folderModal) {
    document.getElementById('modal-folder-title').textContent = "Create New Folder";
    document.getElementById('btn-submit-folder').textContent = "Create Folder";
    document.getElementById('new-folder-name-input').value = '';
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
          if (node.type === "folder") {
            node.color = selectedFolderColor || "#6B8F71";
          }
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

  localStorage.setItem('notized_library_tree', JSON.stringify(treeData));
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
  const colorPickerLabel = document.querySelector('.color-picker-label');
  const colorOptions = document.querySelectorAll('.color-palette-options');
  if (colorPickerLabel) colorPickerLabel.style.display = 'block';
  if (colorOptions) colorOptions.forEach(opt => opt.style.display = 'flex');
}

function selectColorDot(element) {
  if (!element) return;
  document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));
  element.classList.add('active');
  selectedFolderColor = element.getAttribute('data-color') || "#6B8F71";
}

// ─── 🛡️ ADAPTASI LOGIKA DRAG & DROP TEMAN (SUDAH SINKRON) ────────────────────
function bindDragAndDropEvents() {
  const rows = document.querySelectorAll('.tree-node-row');
  rows.forEach(row => {
    row.addEventListener('dragstart', (e) => { 
      e.stopPropagation(); 
      draggedNodeId = row.getAttribute('data-id'); 
      row.classList.add('dragging'); 
    });

    row.addEventListener('dragend', () => { 
      row.classList.remove('dragging'); 
      document.querySelectorAll('.tree-node-row').forEach(r => { 
        r.classList.remove('drag-over'); 
        r.style.borderTop = ''; 
        r.style.borderBottom = ''; 
      }); 
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault(); 
      e.stopPropagation(); 
      row.style.borderTop = ''; 
      row.style.borderBottom = ''; 
      
      const rect = row.getBoundingClientRect(); 
      const y = e.clientY - rect.top;
      
      if (row.getAttribute('data-type') === 'folder') { 
        if (y < rect.height * 0.25) row.style.borderTop = '2px solid var(--sage)'; 
        else if (y > rect.height * 0.75) row.style.borderBottom = '2px solid var(--sage)'; 
        else row.classList.add('drag-over'); 
      } else { 
        if (y < rect.height * 0.5) row.style.borderTop = '2px solid var(--sage)'; 
        else row.style.borderBottom = '2px solid var(--sage)'; 
      }
    });

    row.addEventListener('dragleave', () => { 
      row.classList.remove('drag-over'); 
      row.style.borderTop = ''; 
      row.style.borderBottom = ''; 
    });

    row.addEventListener('drop', (e) => {
      e.preventDefault(); 
      e.stopPropagation(); 
      
      const targetId = row.getAttribute('data-id'); 
      if (draggedNodeId === targetId) return;

      let treeData = getLibraryData(); 
      
      if (typeof isNodeChildOf === 'function' && isNodeChildOf(treeData, draggedNodeId, targetId)) {
        refreshWorkspaceTree(); 
        return;
      }

      let movingNode = null; 
      let sourceArray = null; 
      let sourceIndex = -1;
      
      function extractNode(nodes) { 
        for (let i = 0; i < nodes.length; i++) { 
          if (nodes[i].id === draggedNodeId) { 
            sourceArray = nodes; 
            sourceIndex = i; 
            movingNode = nodes.splice(i, 1)[0]; 
            return true; 
          } 
          if (nodes[i].children && extractNode(nodes[i].children)) return true; 
        } 
        return false; 
      } 
      
      extractNode(treeData); 
      if (!movingNode) return;

      let targetArray = null; 
      let targetIndex = -1; 
      let targetNodeRef = null; 
      let targetIsFolder = false;
      
      function findTarget(nodes) { 
        for (let i = 0; i < nodes.length; i++) { 
          if (nodes[i].id === targetId) { 
            targetArray = nodes; 
            targetIndex = i; 
            targetNodeRef = nodes[i]; 
            targetIsFolder = nodes[i].type === 'folder'; 
            return true; 
          } 
          if (nodes[i].children && findTarget(nodes[i].children)) return true; 
        } 
        return false; 
      } 
      
      findTarget(treeData);
      
      if (!targetArray) { 
        sourceArray.splice(sourceIndex, 0, movingNode); 
        localStorage.setItem('notized_library_tree', JSON.stringify(treeData));
        refreshWorkspaceTree();
        return; 
      }
      
      const rect = row.getBoundingClientRect(); 
      const y = e.clientY - rect.top;
      
      if (targetIsFolder) { 
        if (y < rect.height * 0.25) {
          targetArray.splice(targetIndex, 0, movingNode); 
        } else if (y > rect.height * 0.75) {
          targetArray.splice(targetIndex + 1, 0, movingNode); 
        } else { 
          if (!targetNodeRef.children) targetNodeRef.children = []; 
          targetNodeRef.children.push(movingNode); 
          targetNodeRef.expanded = true; 
        } 
      } else { 
        if (y < rect.height * 0.5) targetArray.splice(targetIndex, 0, movingNode); 
        else targetArray.splice(targetIndex + 1, 0, movingNode); 
      }
      
      localStorage.setItem('notized_library_tree', JSON.stringify(treeData)); 
      refreshWorkspaceTree();
      
      if (currentSelectedNodeId) updateBreadcrumbs(currentSelectedNodeId);
    });
  });
}

// ─── OVERVIEW ACTION HANDLERS (MODAL RENAME & DELETE INTEGRATION) ────────────
function triggerRenameNode() {
  if (!currentRightClickedNodeId) return;
  
  let treeData = getLibraryData();
  let targetNode = findNodeById(treeData, currentRightClickedNodeId);

  if (!targetNode) return;

  isEditMode = true;
  editingNodeId = currentRightClickedNodeId;

  const folderModal = document.getElementById('folder-creator-card');
  if (folderModal) {
    if (targetNode.type === "file") {
      document.getElementById('modal-folder-title').textContent = "Rename Note";
      document.getElementById('btn-submit-folder').textContent = "Save Name";
      const colorPickerLabel = document.querySelector('.color-picker-label');
      const colorOptions = document.querySelectorAll('.color-palette-options');
      if (colorPickerLabel) colorPickerLabel.style.display = 'none';
      if (colorOptions) colorOptions.forEach(opt => opt.style.display = 'none');
    } else {
      document.getElementById('modal-folder-title').textContent = "Rename Folder";
      document.getElementById('btn-submit-folder').textContent = "Save Changes";
      
      const colorPickerLabel = document.querySelector('.color-picker-label');
      const colorOptions = document.querySelectorAll('.color-palette-options');
      if (colorPickerLabel) colorPickerLabel.style.display = 'block';
      if (colorOptions) colorOptions.forEach(opt => opt.style.display = 'flex');
      
      document.querySelectorAll('.color-dot').forEach(dot => {
        dot.classList.remove('active');
        if (dot.getAttribute('data-color') === targetNode.color) {
          dot.classList.add('active');
          selectedFolderColor = targetNode.color;
        }
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
  if (deleteModal) {
    deleteModal.style.setProperty('display', 'flex', 'important');
  }
}

function closeDeleteModal() {
  const deleteModal = document.getElementById('delete-confirm-modal');
  if (deleteModal) {
    deleteModal.style.setProperty('display', 'none', 'important');
  }
}

function confirmDeleteNode() {
  if (!currentRightClickedNodeId) return;

  let treeData = getLibraryData();

  function deleteInTree(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === currentRightClickedNodeId) { 
        nodes.splice(i, 1); 
        return true; 
      }
      if (nodes[i].children && deleteInTree(nodes[i].children)) return true;
    }
    return false;
  }

  deleteInTree(treeData);
  localStorage.setItem('notized_library_tree', JSON.stringify(treeData));
  
  closeDeleteModal();
  refreshWorkspaceTree();
  
  if (currentSelectedNodeId === currentRightClickedNodeId) {
    resetToEmptyState();
  }
}

function handleOverviewRename() {
  const incomingData = localStorage.getItem('notizedData');

  if (incomingData && !currentSelectedNodeId) {
    showCustomAlert("You need to save this preview note to a project folder first before you can rename it!");
    return;
  }

  if (!currentSelectedNodeId) {
    showCustomAlert("Select a folder or file first!");
    return;
  }

  currentRightClickedNodeId = currentSelectedNodeId; 
  triggerRenameNode();
}

// ─── RE-LINK PREVIEW FILES MECHANISM ─────────────────────────────────────────
function loadSavedFileNode(id, name, event) {
  if (event) event.stopPropagation();
  
  let treeData = getLibraryData();
  let foundFile = null;

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

// ─── SAVE PARSED NOTE TO CHOSEN NODE RECURSIVE ENGINE ───
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
        const indent = "&nbsp;&nbsp;".repeat(depth);
        optionsHTML += `<option value="${node.id}">${indent}📁 Folder: ${node.name}</option>`;
        if (node.children) injectFolderOptions(node.children, depth + 1);
      }
    });
  }
  
  injectFolderOptions(treeData);
  selectEl.innerHTML = optionsHTML;
}

function closeSaveModal() {
  document.getElementById('save-modal').style.display = 'none';
}

function confirmSaveNotes() {
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

  const newFileNode = {
    id: "node_" + Date.now(),
    name: titleInput,
    type: "file",
    data: incomingData
  };

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

  localStorage.setItem('notized_library_tree', JSON.stringify(treeData));
  localStorage.removeItem('notizedData');
  localStorage.removeItem('current_raw_text'); 
  
  document.getElementById('btn-trigger-save').style.display = 'none';
  closeSaveModal();
  refreshWorkspaceTree();
  resetToEmptyState();
}

function handleOverviewDelete() {
  const incomingData = localStorage.getItem('notizedData');

  if (incomingData && !currentSelectedNodeId) {
    localStorage.removeItem('notizedData');
    localStorage.removeItem('current_raw_text');
    resetToEmptyState();
    showCustomAlert("Preview note cleared successfully.");
    return;
  }

  if (!currentSelectedNodeId) {
    showCustomAlert("Select a folder or file first!");
    return;
  }

  currentRightClickedNodeId = currentSelectedNodeId; 
  triggerDeleteNode();
}

// ─── CONTENT RENDERING PANEL CORE ────────────────────────────────────────────
function renderProjectContent(data) {
  if (!data) return;

  const rawNotesArea = document.getElementById('raw-notes-content-area');
  if (rawNotesArea) {
    rawNotesArea.textContent = data.rawText || data.notes || "No raw text content available for this session.";
  }  
  const summaryList = document.getElementById('summary-list');
  if (summaryList) {
    summaryList.innerHTML = (data.summary || []).map(point =>
      `<li class="summary-item"><span class="summary-arrow">→</span> <span>${point}</span></li>`
    ).join('');
  }

  const keywordChips = document.getElementById('keyword-chips');
  if (keywordChips) {
    keywordChips.innerHTML = (data.keywords || []).map((kw, i) =>
      `<span class="chip c${i % 3}">${esc(kw)}</span>`
    ).join('');
  }

  if (document.getElementById('stat-keywords')) document.getElementById('stat-keywords').textContent = (data.keywords || []).length;
  if (document.getElementById('stat-clusters')) document.getElementById('stat-clusters').textContent = data.clusters ? data.clusters.length : "0";
  if (document.getElementById('stat-steps')) document.getElementById('stat-steps').textContent = (data.learningPath || []).length;

  const clustersGrid = document.getElementById('clusters-grid');
  if (clustersGrid && data.clusters) {
    clustersGrid.innerHTML = data.clusters.map(cluster => `
      <div class="cluster-card">
        <div class="cluster-header">
          <span class="cluster-icon ${cluster.color || 'sage'}" style="display: inline-flex; align-items: center; justify-content: center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          </span>
          <span class="cluster-name">${esc(cluster.name)}</span>
        </div>
        <div class="cluster-topics">
          ${(cluster.topics || []).map(topic => `<div class="cluster-topic">${esc(topic)}</div>`).join('')}
        </div>
      </div>
    `).join('');
  }

  const pathList = document.getElementById('path-list');
  if (pathList) {
    pathList.innerHTML = (data.learningPath || []).map((step, i) => `
      <div class="path-item">
        <div class="path-num ${i === 0 ? 'first' : ''}">${step.step}</div>
        <div class="path-card">
          <div class="path-card-header">
            <span class="path-card-title">${esc(step.title)}</span>
            <span class="path-duration">15 min</span>
          </div>
          <p class="path-tip">💡 ${esc(step.tip)}</p>
        </div>
      </div>
    `).join('');
  }
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── BREADCRUMBS LOGIC (FIX ACCURATE RECURSIVE) ──────────────────────────────
function findNodePath(nodes, targetId) {
  for (let node of nodes) {
    if (node.id === targetId) {
      return [node.name];
    }
    if (node.children && node.children.length > 0) {
      const childPath = findNodePath(node.children, targetId);
      if (childPath) {
        return [node.name, ...childPath];
      }
    }
  }
  return null;
}

// ─── 🔗 BREADCRUMBS CLICKABLE ROUTING SYSTEM ─────────────────────────────────
function updateBreadcrumbs(nodeId) {
  const container = document.getElementById('workspace-breadcrumbs');
  if (!container) return;

  let html = `
    <span onclick="resetToEmptyState()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--ink)'" onmouseout="this.style.color='var(--ink-muted)'">
      Dashboard
    </span>
  `;

  if (!nodeId) {
    container.innerHTML = html;
    return;
  }

  const treeData = getLibraryData();
  const nodePathObjects = findNodePathWithIds(treeData, nodeId);

  if (nodePathObjects && nodePathObjects.length > 0) {
    nodePathObjects.forEach((crumb, index) => {
      html += ` <span style="margin: 0 0.25rem; color: var(--border); font-size: 11px;">/</span> `;
      const isLast = index === nodePathObjects.length - 1;
      
      if (isLast) {
        html += `<span style="font-weight: 600; color: var(--ink);">${esc(crumb.name)}</span>`;
      } else {
        html += `
          <span onclick="selectFolderWorkspace('${crumb.id}', event)" 
                style="cursor: pointer; transition: color 0.2s;" 
                onmouseover="this.style.color='var(--ink)'" 
                onmouseout="this.style.color='var(--ink-muted)'">
            ${esc(crumb.name)}
          </span>
        `;
      }
    });
  }

  container.innerHTML = html;
}

function findNodePathWithIds(nodes, targetId) {
  for (let node of nodes) {
    if (node.id === targetId) {
      return [{ id: node.id, name: node.name }];
    }
    if (node.children && node.children.length > 0) {
      const childPath = findNodePathWithIds(node.children, targetId);
      if (childPath) {
        return [{ id: node.id, name: node.name }, ...childPath];
      }
    }
  }
  return null;
}

// ─── 📂 RENDER FOLDER: SEMBUNYIKAN TAB ANALISIS, HANYA TAMPILKAN ISI ───
function selectFolderWorkspace(folderId, event) {
  if (event) event.stopPropagation();
  
  currentSelectedNodeId = folderId;
  currentRightClickedNodeId = folderId; 

  // 🎯 AMANKAN: Sembunyikan tombol Save Note karena ini folder lama
  const saveBtn = document.getElementById('btn-trigger-save');
  if (saveBtn) saveBtn.style.setProperty('display', 'none', 'important');

  document.getElementById('empty-workspace-state').style.display = 'none';
  document.getElementById('active-project-workspace').style.display = 'flex';
  
  const overviewActions = document.getElementById('overview-actions');
  if (overviewActions) {
    overviewActions.innerHTML = `
      <button type="button" class="btn-overview-action rename" onclick="handleOverviewRename()" style="display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.75rem; font-size: 13px; border-radius: 6px; background: rgba(201,136,58,0.1); color: #C9883A; border: 1px solid rgba(201,136,58,0.2); cursor: pointer; font-weight: 500;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
        Rename
      </button>
      <button type="button" class="btn-overview-action delete" onclick="handleOverviewDelete()" style="display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.75rem; font-size: 13px; border-radius: 6px; background: rgba(184,92,110,0.1); color: #B85C6E; border: 1px solid rgba(184,92,110,0.2); cursor: pointer; font-weight: 500;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        Delete
      </button>
    `;
  }
  
  const tabsContainer = document.querySelector('.workspace-tabs-container');
  if (tabsContainer) tabsContainer.style.setProperty('display', 'none', 'important');
  
  if (document.getElementById('note-card-wrapper')) document.getElementById('note-card-wrapper').style.display = 'none';
  if (document.getElementById('folder-overview-wrapper')) document.getElementById('folder-overview-wrapper').style.display = 'block';

  const treeData = getLibraryData();
  const folderNode = findNodeById(treeData, folderId);
  
  if (folderNode) {
    const titleEl = document.getElementById('active-project-title');
    if (titleEl) {
      titleEl.innerText = folderNode.name;
      titleEl.style.setProperty('margin-bottom', '1.5rem', 'important'); 
    }
    
    const children = folderNode.children || [];
    if (children.length === 0) {
      document.getElementById('folder-overview-wrapper').innerHTML = `
        <div style="color: var(--ink-muted); font-style: italic; padding: 3rem; text-align: center; font-size: 14px; width: 100%;">
          📁 Folder ini kosong.
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--ink-muted); flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span style="font-size: 14px; color: var(--ink); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${esc(child.name)}</span>
            </div>`;
        }
      });
      folderOverviewHTML += `</div>`;
      document.getElementById('folder-overview-wrapper').innerHTML = folderOverviewHTML;
    }
  }
  document.querySelectorAll('.tab-content-panel').forEach(panel => panel.classList.remove('active'));
  document.getElementById('tab-raw').classList.add('active');
  updateBreadcrumbs(folderId);
}

function selectFileWorkspace(fileId, fileName, event) {
  if (event) event.stopPropagation();
  currentSelectedNodeId = fileId;
  currentRightClickedNodeId = fileId; 
  
  // 🎯 AMANKAN: Sembunyikan tombol Save Note karena file ini sudah tersimpan lama di library
  const saveBtn = document.getElementById('btn-trigger-save');
  if (saveBtn) saveBtn.style.setProperty('display', 'none', 'important');

  const overviewActions = document.getElementById('overview-actions');
  if (overviewActions) {
    overviewActions.innerHTML = `
      <button type="button" class="btn-overview-action rename" onclick="handleOverviewRename()" style="display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.75rem; font-size: 13px; border-radius: 6px; background: rgba(201,136,58,0.1); color: #C9883A; border: 1px solid rgba(201,136,58,0.2); cursor: pointer; font-weight: 500;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
        Rename
      </button>
      <button type="button" class="btn-overview-action delete" onclick="handleOverviewDelete()" style="display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.75rem; font-size: 13px; border-radius: 6px; background: rgba(184,92,110,0.1); color: #B85C6E; border: 1px solid rgba(184,92,110,0.2); cursor: pointer; font-weight: 500;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        Delete
      </button>
    `;
  }

  const tabsContainer = document.querySelector('.workspace-tabs-container');
  if (tabsContainer) tabsContainer.style.setProperty('display', 'flex', 'important');
  
  if (document.getElementById('note-card-wrapper')) document.getElementById('note-card-wrapper').style.display = 'block';
  if (document.getElementById('folder-overview-wrapper')) document.getElementById('folder-overview-wrapper').style.display = 'none';
  
  if (typeof loadSavedFileNode === 'function') {
    loadSavedFileNode(fileId, fileName, event);
  } else {
    document.getElementById('empty-workspace-state').style.display = 'none';
    document.getElementById('active-project-workspace').style.display = 'flex';
    document.getElementById('active-project-title').innerText = fileName;
  }
  updateBreadcrumbs(fileId);
}

function resetToEmptyState() {
  currentSelectedNodeId = null;
  currentRightClickedNodeId = null;
  
  // 🎯 AMANKAN: Sembunyikan tombol Save Note pas balik ke halaman depan root overview
  const saveBtn = document.getElementById('btn-trigger-save');
  if (saveBtn) saveBtn.style.setProperty('display', 'none', 'important');

  document.getElementById('empty-workspace-state').style.display = 'none';
  document.getElementById('active-project-workspace').style.display = 'flex';
  document.getElementById('active-project-title').innerText = "Root Workspace";
  
  const overviewActions = document.getElementById('overview-actions');
  if (overviewActions) {
    overviewActions.style.setProperty('display', 'none', 'important');
  }
  
  const tabsContainer = document.querySelector('.workspace-tabs-container');
  if (tabsContainer) tabsContainer.style.setProperty('display', 'none', 'important');
  
  const notesCard = document.querySelector('#tab-raw .card');
  if (notesCard) {
    notesCard.style.background = 'transparent';
    notesCard.style.border = 'none';
    notesCard.style.boxShadow = 'none';
    notesCard.style.padding = '0';
  }
  const notesCardHeader = document.querySelector('#tab-raw .card-header');
  if (notesCardHeader) notesCardHeader.style.setProperty('display', 'none', 'important');
  
  if (document.getElementById('note-card-wrapper')) document.getElementById('note-card-wrapper').style.display = 'none';
  if (document.getElementById('folder-overview-wrapper')) document.getElementById('folder-overview-wrapper').style.display = 'block';
  
  const treeData = getLibraryData();
  if (treeData.length === 0) {
    document.getElementById('empty-workspace-state').style.display = 'flex';
    document.getElementById('active-project-workspace').style.display = 'none';
    return;
  }
  
  let rootOverviewHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; width: 100%;">`;
  treeData.forEach(node => {
    if (node.type === "folder") {
      const folderColor = node.color || "#6B8F71";
      rootOverviewHTML += `
        <div onclick="selectFolderWorkspace('${node.id}', event)" style="background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem 1rem; display: flex; align-items: center; gap: 0.75rem; cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-sm);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)';">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${folderColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          <span style="font-weight: 600; font-size: 14px; color: var(--ink); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${esc(node.name)}</span>
        </div>`;
    } else {
      rootOverviewHTML += `
        <div onclick="selectFileWorkspace('${node.id}', '${esc(node.name)}', event)" style="background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem 1rem; display: flex; align-items: center; gap: 0.75rem; cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-sm);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)';">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--ink-muted); flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span style="font-size: 14px; color: var(--ink); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${esc(node.name)}</span>
        </div>`;
    }
  });
  rootOverviewHTML += `</div>`;
  
  document.querySelectorAll('.tab-content-panel').forEach(panel => panel.classList.remove('active'));
  document.getElementById('tab-raw').classList.add('active');
  document.getElementById('folder-overview-wrapper').innerHTML = rootOverviewHTML;
  
  const breadcrumbsContainer = document.getElementById('workspace-breadcrumbs');
  if (breadcrumbsContainer) breadcrumbsContainer.innerHTML = `<span style="font-weight: 600; color: var(--ink);">Dashboard</span>`;
}

// Fungsi Tab Navigation Bawaan Lama
function switchWorkspaceTab(targetTabId) {
  document.querySelectorAll('.tab-trigger').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content-panel').forEach(panel => panel.classList.remove('active'));
  const clickedBtn = document.querySelector(`[onclick="switchWorkspaceTab('${targetTabId}')"]`);
  if (clickedBtn) clickedBtn.classList.add('active');
  const targetPanel = document.getElementById(targetTabId);
  if (targetPanel) targetPanel.classList.add('active');
}