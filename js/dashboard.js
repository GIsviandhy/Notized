// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ─── STATE MANAGEMENT ────────────────────────────────────────────────────────
let selectedFolderColor = "#6B8F71"; 
let currentRightClickedNodeId = null; // Menyimpan ID item yang di-klik kanan
let draggedNodeId = null;             // Menyimpan ID item yang sedang di-drag
let isEditMode = false;      // Untuk mendeteksi apakah modal sedang dipakai untuk Create atau Edit
let editingNodeId = null;    // Menyimpan ID folder yang sedang diedit

// ─── INITIALIZATION ON LOAD ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  refreshWorkspaceTree();

  const incomingData = localStorage.getItem('notizedData');
  if (incomingData) {
    document.getElementById('btn-trigger-save').style.display = 'block';
    const parsed = JSON.parse(incomingData);
    
    const sessionRawText = localStorage.getItem('current_raw_text');
    if (sessionRawText) {
      parsed.rawText = sessionRawText; // Paksa suntik ke object parsed preview
    }
    
    document.getElementById('empty-workspace-state').style.display = 'none';
    document.getElementById('active-project-workspace').style.display = 'flex'; // Paksa pakai flex
    
    renderProjectContent(parsed);
    document.getElementById('active-project-title').textContent = "Preview: " + (parsed.title || "Unsaved Note");
    
    // Otomatis arahkan ke tab pertama
    switchWorkspaceTab('tab-raw');
  }
});

// ─── STORAGE ENGINE (MULTILEVEL NESTED SYSTEM) ───────────────────────────────
function getLibraryData() {
  const data = localStorage.getItem('notized_library_tree');
  if (data) return JSON.parse(data);

  const defaultTree = [
    {
      id: "node_bio", name: "Biology", type: "folder", expanded: true,
      children: [
        {
          id: "node_lec3", name: "Lecture 3", type: "folder", expanded: true,
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

// ─── SIDEBAR RETRACTABLE CONTROLLER (BUKA TUTUP PANEL) ──────────────────────
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
  const treeData = getLibraryData();
  const rootContainer = document.getElementById('nested-directory-root');
  if (!rootContainer) return;

  rootContainer.innerHTML = buildTreeHTML(treeData);
  bindDragAndDropEvents();
  bindContextMenuEvents();
}

// ─── RECURSIVE ENGINE: FULL BACKGROUND TINT ACCORDING TO USER COLOR ───
function buildTreeHTML(nodes) {
  return nodes.map(node => {
    if (node.type === "folder") {
      const caretIcon = node.children && node.children.length > 0 ? (node.expanded ? "▾" : "▸") : " ";
      const displayStyle = node.expanded ? "display: flex;" : "display: none;";
      const baseColor = node.color || selectedFolderColor || "#6B8F71";
      const backgroundColorBlock = hexToRgbaTint(baseColor, 0.15);
      const textColorSolid = baseColor;

      return `
        <div class="tree-folder-block" data-id="${node.id}">
          <div class="tree-folder-header tree-node-row" draggable="true" data-id="${node.id}" data-type="folder" 
               style="background-color: ${backgroundColorBlock} !important; color: ${textColorSolid} !important; border-color: ${hexToRgbaTint(baseColor, 0.1)} !important;">
            
            <div onclick="toggleFolderNode('${node.id}', event)" style="display: flex; gap: 0.5rem; align-items: center; flex: 1;">
              <span style="font-size: 11px; width: 10px; display: inline-block; text-align: center;">${caretIcon}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <strong>${esc(node.name)}</strong>
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
        <div class="tree-file-item tree-node-row" draggable="true" data-id="${node.id}" data-type="file" onclick="loadSavedFileNode('${node.id}', '${esc(node.name)}', event)" style="padding: 0.5rem 0.75rem; font-size: 13px; color: var(--ink); border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; text-align: left;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--ink-muted); flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          <span>${esc(node.name)}</span>
        </div>
      `;
    }
  }).join('');
}

// Buka tutup folder lokal node
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
    // ⚡ FIX UTAMA: Paksa teks modal & tombol kembali ke status default pembuatan baru
    document.getElementById('modal-folder-title').textContent = "Create New Folder";
    document.getElementById('btn-submit-folder').textContent = "Create Folder";
    document.getElementById('new-folder-name-input').value = '';
    
    folderModal.style.setProperty('display', 'flex', 'important');
    setTimeout(() => document.getElementById('new-folder-name-input').focus(), 50);
  }
}

function handleFolderSubmit() {
  const nameInput = document.getElementById('new-folder-name-input').value.trim();
  if (!nameInput) return alert("Please enter a folder name!");

  let treeData = getLibraryData();

  if (isEditMode) {
    // === JALUR AKSI EDIT FOLDER ===
    function updateFolderInTree(nodes) {
      for (let node of nodes) {
        if (node.id === editingNodeId) {
          node.name = nameInput;
          node.color = selectedFolderColor || "#6B8F71";
          return true;
        }
        if (node.children && updateFolderInTree(node.children)) return true;
      }
      return false;
    }
    updateFolderInTree(treeData);
  } else {
    // === JALUR AKSI CREATE NEW FOLDER (Bawaan Lama) ===
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

// ─── REAL-TIME DRAG & DROP API ENGINE ───
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
      document.querySelectorAll('.tree-node-row').forEach(r => r.classList.remove('drag-over'));
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      row.classList.add('drag-over');
    });

    row.addEventListener('dragleave', () => {
      row.classList.remove('drag-over');
    });

    row.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      row.classList.remove('drag-over');
      
      const targetId = row.getAttribute('data-id');
      const targetType = row.getAttribute('data-type');
      
      if (draggedNodeId === targetId) return;

      let treeData = getLibraryData();
      let movingNode = null;

      function removeNode(nodes) {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === draggedNodeId) {
            movingNode = nodes.splice(i, 1)[0];
            return true;
          }
          if (nodes[i].children && removeNode(nodes[i].children)) return true;
        }
        return false;
      }
      removeNode(treeData);

      if (!movingNode) return;

      function insertNode(nodes) {
        for (let node of nodes) {
          if (node.id === targetId) {
            if (node.type === "folder") {
              if (!node.children) node.children = [];
              node.children.push(movingNode);
              node.expanded = true;
            } else {
              nodes.push(movingNode);
            }
            return true;
          }
          if (node.children && insertNode(node.children)) return true;
        }
        return false;
      }

      if (targetType === "folder") {
        insertNode(treeData);
      } else {
        treeData.push(movingNode);
      }

      localStorage.setItem('notized_library_tree', JSON.stringify(treeData));
      refreshWorkspaceTree();
    });
  });
}

// ─── RIGHT-CLICK CONTEXT MENU CONTROLLER ────────────────────────────────────
function bindContextMenuEvents() {
  const rows = document.querySelectorAll('.tree-node-row');
  const menu = document.getElementById('custom-context-menu');
  if (!menu) return;

  rows.forEach(row => {
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();

      currentRightClickedNodeId = row.getAttribute('data-id');
      
      menu.style.left = `${e.pageX}px`;
      menu.style.top = `${e.pageY}px`;
      menu.style.display = 'block';
    });
  });

  document.addEventListener('click', () => {
    menu.style.display = 'none';
  });
}

function triggerRenameNode() {
  if (!currentRightClickedNodeId) return;
  
  let treeData = getLibraryData();
  let targetNode = null;

  function findNode(nodes) {
    for (let node of nodes) {
      if (node.id === currentRightClickedNodeId) { targetNode = node; return true; }
      if (node.children && findNode(node.children)) return true; // Typo findFile sudah diganti ke findNode secara rekursif
    }
    return false;
  }
  findNode(treeData);

  if (!targetNode) return;

  if (targetNode.type === "file") {
    const newFileName = prompt("Enter new note name:", targetNode.name);
    if (newFileName && newFileName.trim()) {
      targetNode.name = newFileName.trim();
      localStorage.setItem('notized_library_tree', JSON.stringify(treeData));
      refreshWorkspaceTree();
    }
    return;
  }

  isEditMode = true;
  editingNodeId = currentRightClickedNodeId;

  const folderModal = document.getElementById('folder-creator-card');
  if (folderModal) {
    document.getElementById('modal-folder-title').textContent = "Edit Folder";
    document.getElementById('btn-submit-folder').textContent = "Save Changes";
    document.getElementById('new-folder-name-input').value = targetNode.name;
    
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.classList.remove('active');
      if (dot.getAttribute('data-color') === targetNode.color) {
        dot.classList.add('active');
        selectedFolderColor = targetNode.color;
      }
    });

    folderModal.style.setProperty('display', 'flex', 'important');
    setTimeout(() => document.getElementById('new-folder-name-input').focus(), 50);
  }
}

function triggerDeleteNode() {
  if (!currentRightClickedNodeId) return;
  if (!confirm("Are you sure you want to delete this item?")) return;

  let treeData = getLibraryData();

  function deleteInTree(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === currentRightClickedNodeId) { nodes.splice(i, 1); return true; }
      if (nodes[i].children && deleteInTree(nodes[i].children)) return true;
    }
    return false;
  }

  deleteInTree(treeData);
  localStorage.setItem('notized_library_tree', JSON.stringify(treeData));
  refreshWorkspaceTree();
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
  
  if (id === "node_mitosis" || id === "node_meiosis" || id === "node_optics") {
    document.getElementById('empty-workspace-state').style.display = 'none';
    document.getElementById('active-project-workspace').style.display = 'flex'; 
    document.getElementById('active-project-title').textContent = name;
    
    findFile(treeData);
    if (foundFile && foundFile.data) {
      renderProjectContent(foundFile.data);
    }
    
    switchWorkspaceTab('tab-raw'); 
    return;
  }

  findFile(treeData);
  if (foundFile && foundFile.data) {
    document.getElementById('empty-workspace-state').style.display = 'none';
    document.getElementById('active-project-workspace').style.display = 'flex'; // Wajib flex
    document.getElementById('active-project-title').textContent = name;
    
    // Render data asli hasil simpanan (termasuk .rawText di dalamnya)
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
  
  // Fungsi pembantu rekursif untuk menyuntikkan daftar folder bersarang ke dalam select tag
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

  // Simpan database permanen dan bersihkan cache operan sementara
  localStorage.setItem('notized_library_tree', JSON.stringify(treeData));
  localStorage.removeItem('notizedData');
  localStorage.removeItem('current_raw_text'); // Bersihkan memori operan
  
  document.getElementById('btn-trigger-save').style.display = 'none';
  closeSaveModal();
  refreshWorkspaceTree();
  loadSavedFileNode(newFileNode.id, titleInput);
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

// Escape HTML utility helper
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function switchWorkspaceTab(targetTabId) {
  // 1. Matikan status aktif di seluruh tombol tab header atas
  document.querySelectorAll('.tab-trigger').forEach(btn => btn.classList.remove('active'));
  
  // 2. Sembunyikan seluruh isi panel konten tab body
  document.querySelectorAll('.tab-content-panel').forEach(panel => panel.classList.remove('active'));
  
  // 3. Nyalakan tombol tab yang sedang di-klik user
  const clickedBtn = document.querySelector(`[onclick="switchWorkspaceTab('${targetTabId}')"]`);
  if (clickedBtn) clickedBtn.classList.add('active');
  
  // 4. Munculkan isi panel target secara instan
  const targetPanel = document.getElementById(targetTabId);
  if (targetPanel) targetPanel.classList.add('active');
}