// ─── DASHBOARD PAGE (dashboard.html) SCRIPT ─────────────────────────────────

let selectedFolderColor = "#6B8F71"; // Default color: Sage

// ─── INITIALIZATION ──────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  refreshWorkspaceTree();

  // Check for fresh data from analyze
  const incomingData = localStorage.getItem('notizedData');
  if (incomingData) {
    document.getElementById('btn-trigger-save').style.display = 'block';
    const parsed = JSON.parse(incomingData);
    
    document.getElementById('empty-workspace-state').style.display = 'none';
    document.getElementById('active-project-workspace').style.display = 'block';
    renderProjectContent(parsed);
    document.getElementById('active-project-title').textContent = "Preview: " + (parsed.title || "Unsaved Note");
  }
});

// ─── FOLDER MANAGEMENT ──────────────────────────────────────────────────────
function openFolderCreatorDirect(event) {
  if (event) event.preventDefault();
  const folderModal = document.getElementById('folder-creator-card');
  if (folderModal) {
    folderModal.style.setProperty('display', 'flex', 'important');
    
    setTimeout(() => {
      const inputForm = document.getElementById('new-folder-name-input');
      if (inputForm) inputForm.focus();
    }, 50);
  }
}

function closeFolderCreatorCard() {
  const folderModal = document.getElementById('folder-creator-card');
  if (folderModal) {
    folderModal.style.setProperty('display', 'none', 'important');
    
    const inputForm = document.getElementById('new-folder-name-input');
    if (inputForm) inputForm.value = '';
  }
}

function saveFolderFromCard() {
  const nameInput = document.getElementById('new-folder-name-input').value.trim();
  if (!nameInput) return alert("Please enter a subject name!");

  let library = getLibraryData();
  if (!library.folders) library.folders = {};

  if (library.folders[nameInput]) return alert("This folder already exists!");

  const finalColor = (typeof selectedFolderColor !== 'undefined' && selectedFolderColor) ? selectedFolderColor : "#6B8F71";

  library.folders[nameInput] = {
    color: finalColor,
    path: [],
    files: {}
  };

  localStorage.setItem('notized_library', JSON.stringify(library));
  
  closeFolderCreatorCard();
  refreshWorkspaceTree();
}

function goToNewNoteDirect(event) {
  if (event) event.preventDefault();
  window.location.href = 'input.html';
}

function selectColorDot(element) {
  if (!element) return;
  document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));
  element.classList.add('active');
  selectedFolderColor = element.getAttribute('data-color') || "#6B8F71";
}

// ─── SIDEBAR TREE RENDERING ─────────────────────────────────────────────────
function refreshWorkspaceTree() {
  let library = getLibraryData();
  if (!library.folders) library.folders = {};
  if (!library.root_files) library.root_files = {};

  const standaloneSection = document.querySelector('.root-files-section');
  const looseContainer = document.getElementById('loose-files-container');
  const foldersSection = document.querySelector('.folders-section');
  const folderContainer = document.getElementById('folders-root-container');

  // Standalone notes
  const rootFiles = Object.keys(library.root_files);
  if (rootFiles.length === 0) {
    if (standaloneSection) standaloneSection.style.display = 'none';
  } else {
    if (standaloneSection) standaloneSection.style.display = 'block';
    if (looseContainer) {
      looseContainer.innerHTML = rootFiles.map(fileName => `
        <div class="tree-file-item" onclick="loadSavedFile('root_standalone', '${esc(fileName)}')">
          📄 ${esc(fileName)}
        </div>
      `).join('');
    }
  }

  // Subject folders
  const folders = Object.keys(library.folders);
  if (folders.length === 0) {
    if (foldersSection) foldersSection.style.display = 'none';
  } else {
    if (foldersSection) foldersSection.style.display = 'block';
    if (folderContainer) {
      folderContainer.innerHTML = '';
      
      folders.forEach(fName => {
        const folderData = library.folders[fName];
        const color = folderData.color || '#6B8F71';
        const fileKeys = Object.keys(folderData.files || {});

        let internalFilesHTML = fileKeys.map(fileKey => `
          <div class="tree-file-item" onclick="loadSavedFile('${esc(fName)}', '${esc(fileKey)}')">
            📄 ${esc(fileKey)}
          </div>
        `).join('');

        let folderHTML = `
          <div class="tree-folder-block" style="margin-bottom: 0.5rem;">
            <div class="tree-folder-header">
              <div onclick="viewFolderLevelPath('${esc(fName)}')" style="cursor:pointer; display:flex; gap:0.5rem; align-items:center;">
                <span style="background:${color}; width:14px; height:16px; border-radius:4px; display:inline-block;"></span>
                <strong>${esc(fName)}</strong>
              </div>
              <span class="tree-count">${fileKeys.length}</span>
            </div>
            <div class="tree-folder-contents" style="margin-top: 0.25rem;">
              ${internalFilesHTML || '<div class="tree-empty-hint">No projects inside</div>'}
            </div>
          </div>
        `;
        folderContainer.insertAdjacentHTML('beforeend', folderHTML);
      });
    }
  }
}

// ─── SAVE MODAL ──────────────────────────────────────────────────────────────
function openSaveModal() {
  const incoming = localStorage.getItem('notizedData');
  if (!incoming) return;

  document.getElementById('save-modal').style.display = 'flex';
  const parsed = JSON.parse(incoming);
  document.getElementById('save-notes-name').value = parsed.title || '';
  
  const library = getLibraryData();
  const selectEl = document.getElementById('save-folder-select');
  
  let optionsHTML = `<option value="root_standalone">📄 Save Outside Folder (Standalone Note)</option>`;
  optionsHTML += Object.keys(library.folders || {}).map(f => `<option value="${f}">📁 Folder: ${f}</option>`).join('');
  selectEl.innerHTML = optionsHTML;
}

function closeSaveModal() {
  document.getElementById('save-modal').style.display = 'none';
}

function confirmSaveNotes() {
  const titleInput = document.getElementById('save-notes-name').value.trim();
  const folderTarget = document.getElementById('save-folder-select').value;
  
  if (!titleInput) return alert('Please enter a valid project name.');

  const incoming = localStorage.getItem('notizedData');
  if (!incoming) return;
  
  const incomingData = JSON.parse(incoming);
  let library = getLibraryData();

  if (!library.folders) library.folders = {};
  if (!library.root_files) library.root_files = {};

  if (folderTarget === "root_standalone") {
    library.root_files[titleInput] = incomingData;
  } else {
    if (!library.folders[folderTarget]) {
      library.folders[folderTarget] = { color: "#6B8F71", path: [], files: {} };
    }
    library.folders[folderTarget].files[titleInput] = incomingData;

    if ((!library.folders[folderTarget].path || library.folders[folderTarget].path.length === 0) && incomingData.learningPath) {
      library.folders[folderTarget].path = incomingData.learningPath.map(p => `Global Core: ${p.title}`);
    }
  }

  localStorage.setItem('notized_library', JSON.stringify(library));
  localStorage.removeItem('notizedData');
  
  document.getElementById('btn-trigger-save').style.display = 'none';
  closeSaveModal();
  refreshWorkspaceTree();
  loadSavedFile(folderTarget, titleInput);
}

// ─── CONTENT RENDERING ──────────────────────────────────────────────────────
function loadSavedFile(folder, fileKey) {
  let library = getLibraryData();
  let fileData = null;

  if (folder === "root_standalone") {
    fileData = library.root_files[fileKey];
  } else {
    fileData = library.folders[folder]?.files[fileKey];
  }

  if (!fileData) return;

  document.getElementById('empty-workspace-state').style.display = 'none';
  document.getElementById('active-project-workspace').style.display = 'block';
  document.getElementById('active-project-title').textContent = fileKey;

  renderProjectContent(fileData);
}

function viewFolderLevelPath(folderName) {
  const library = getLibraryData();
  const folderData = library.folders[folderName];
  if (!folderData) return;

  document.getElementById('empty-workspace-state').style.display = 'none';
  document.getElementById('active-project-workspace').style.display = 'block';
  document.getElementById('active-project-title').textContent = `${folderName} — Master Curriculum Guide`;

  document.getElementById('summary-list').innerHTML = `<li>📁 This interface aggregates all structured sub-units inside the <strong>${folderName}</strong> subject category.</li>`;
  document.getElementById('keyword-chips').innerHTML = `<span class="chip c0">${folderName} Grid</span>`;

  document.getElementById('stat-keywords').textContent = "-";
  document.getElementById('stat-clusters').textContent = "-";
  document.getElementById('stat-steps').textContent = folderData.path ? folderData.path.length : "0";

  const pathList = document.getElementById('path-list');
  if (folderData.path && folderData.path.length > 0) {
    pathList.innerHTML = folderData.path.map((stepTitle, i) => `
      <div class="path-item">
        <div class="path-num first">${i+1}</div>
        <div class="path-card">
          <div class="path-card-header"><span class="path-card-title">${esc(stepTitle)}</span></div>
          <p class="path-tip">🎯 Global integration milestone requirement for the ${folderName} cluster matrix.</p>
        </div>
      </div>
    `).join('');
  } else {
    pathList.innerHTML = `<p class="path-intro">No integrated master paths recorded yet. Populate this area by saving your first analyzed note session.</p>`;
  }
}

function renderProjectContent(data) {
  if (!data) return;
  
  const summaryList = document.getElementById('summary-list');
  if (summaryList) {
    summaryList.innerHTML = (data.summary || []).map(point =>
      `<li class="summary-item">${point}</li>`
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
          <span class="cluster-icon ${cluster.color}">⬡</span>
          <span class="cluster-name">${esc(cluster.name)}</span>
        </div>
        <div class="cluster-topics">
          ${cluster.topics.map(topic => `<div class="cluster-topic">${esc(topic)}</div>`).join('')}
        </div>
      </div>
    `).join('');
  }

  const pathList = document.getElementById('path-list');
  if (pathList) {
    pathList.innerHTML = (data.learningPath || []).map((step, i) => `
      <div class="path-item">
        <div class="path-num">${step.step}</div>
        <div class="path-card">
          <div class="path-card-header">
            <span class="path-card-title">${esc(step.title)}</span>
          </div>
          <p class="path-tip">💡 ${esc(step.tip)}</p>
        </div>
      </div>
    `).join('');
  }
}
