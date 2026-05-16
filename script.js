// Set the worker source for PDF.js (uses the CDN version to match your HTML)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ─── STATE MANAGEMENT ────────────────────────────────────────────────────────
let appData = null;
let selectedFolderColor = "#6B8F71"; // Default warna koordinasi: Sage

const EXAMPLE_NOTES = `Nervous System, Neurons, and Synaptic Transmission - Biology Notes

The nervous system is the body's command center, coordinating all voluntary and involuntary actions. It consists of two main divisions: the Central Nervous System (CNS) and the Peripheral Nervous System (PNS).

The CNS includes:
- Brain: The control center for processing information, memory, emotions, and decision-making. Major regions include the cerebrum (higher functions), cerebellum (coordination), and brainstem (vital functions).
- Spinal Cord: Acts as the information highway between the brain and the rest of the body. It also controls reflex actions.

The PNS includes:
- Sensory (Afferent) Division: Carries signals from sensory receptors to the CNS
- Motor (Efferent) Division: Carries signals from CNS to muscles and glands
  - Somatic Nervous System: Controls voluntary movements (skeletal muscles)
  - Autonomic Nervous System: Controls involuntary functions (heart rate, digestion)
    - Sympathetic: "Fight or flight" response
    - Parasympathetic: "Rest and digest" response

Neurons are the functional units of the nervous system. A typical neuron has three main parts:
1. Dendrites: Receive signals from other neurons
2. Cell Body (Soma): Contains the nucleus and organelles; integrates incoming signals
3. Axon: Long fiber that transmits electrical signals away from the cell body. Many axons are covered with myelin sheath (produced by Schwann cells in PNS or oligodendrocytes in CNS) which speeds up signal transmission through saltatory conduction.

Action Potential is the electrical signal that travels down the axon:
- Resting State: Neuron is polarized at -70mV (more negative inside)
- Depolarization: Sodium channels open, Na+ rushes in, membrane potential becomes positive (+30mV)
- Repolarization: Potassium channels open, K+ flows out, restoring negative charge
- Refractory Period: Brief period where neuron cannot fire again

Synaptic Transmission occurs at the synapse (gap between neurons):
1. Action potential reaches axon terminal
2. Voltage-gated calcium channels open, Ca2+ enters
3. Calcium triggers vesicles containing neurotransmitters to fuse with membrane
4. Neurotransmitters are released into synaptic cleft
5. Neurotransmitters bind to receptors on postsynaptic neuron
6. This can cause excitation (EPSP) or inhibition (IPSP) of the next neuron
7. Neurotransmitters are removed by reuptake, enzymatic breakdown, or diffusion

Key Neurotransmitters:
- Acetylcholine: Muscle contraction, memory, learning
- Dopamine: Reward, motivation, motor control
- Serotonin: Mood regulation, sleep, appetite
- GABA: Main inhibitory neurotransmitter
- Glutamate: Main excitatory neurotransmitter

Clinical Connections:
- Parkinson's Disease: Loss of dopamine-producing neurons
- Alzheimer's Disease: Loss of acetylcholine and neuronal death
- Multiple Sclerosis: Destruction of myelin sheath
- Depression: Often linked to serotonin and norepinephrine imbalances`;

// ─── INITIALIZATION ON LOAD ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const isDashboard = document.getElementById('folders-root-container');
  if (!isDashboard) return;

  // Render list folder & file standalone dari database lokal ke sidebar kiri
  refreshWorkspaceTree();

  // Cek apakah ada data fresh yang baru dikirim setelah klik "Analyze" dari index.html
  const incomingData = localStorage.getItem('notizedData');
  if (incomingData) {
    document.getElementById('btn-trigger-save').style.display = 'block';
    const parsed = JSON.parse(incomingData);
    
    // Tampilkan preview data sementara sebelum di-save permanen oleh user
    document.getElementById('empty-workspace-state').style.display = 'none';
    document.getElementById('active-project-workspace').style.display = 'block';
    renderProjectContent(parsed);
    document.getElementById('active-project-title').textContent = "Preview: " + (parsed.title || "Unsaved Note");
  }
});

// ─── NAVIGATION (index.html) ─────────────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).className = 'screen active';
  window.scrollTo(0, 0);

  if (name === 'input') {
    resetInputView();
    setTimeout(() => document.getElementById('notes-input').focus(), 100);
  }
}

function resetInputView() {
  document.getElementById('input-form-view').style.display = 'block';
  document.getElementById('loading-view').classList.remove('active');
  document.getElementById('error-msg').style.display = 'none';
}

// ─── WORD COUNT ─────────────────────────────────────────────────────────────
function updateWordCount() {
  const val = document.getElementById('notes-input').value.trim();
  const words = val ? val.split(/\s+/).filter(Boolean).length : 0;
  const el = document.getElementById('word-count');
  if (el) el.textContent = words > 0 ? words + ' words' : 'Tip: Longer notes = richer insights';
}

// ─── FILE UPLOAD & PDF EXTRACTOR ─────────────────────────────────────────────
function triggerFileUpload() {
  document.getElementById('file-input').click();
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.type === "application/pdf") {
    const text = await extractTextFromPDF(file);
    document.getElementById('notes-input').value = text;
    updateWordCount();
  } else {
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById('notes-input').value = ev.target.result;
      updateWordCount();
    };
    reader.readAsText(file);
  }
}

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

function loadExample() {
  const inputArea = document.getElementById('notes-input');
  if (inputArea) {
    inputArea.value = EXAMPLE_NOTES;
    updateWordCount();
  }
}

// ─── API KEY MANAGEMENT ──────────────────────────────────────────────────────
let _apiKey = '';
function getApiKey() { return _apiKey; }

function saveApiKey() {
  const val = document.getElementById('apikey-input').value.trim();
  if (!val.startsWith('sk-')) {
    document.getElementById('apikey-error').textContent = 'Key must start with sk-';
    return;
  }
  _apiKey = val;
  document.getElementById('apikey-modal').style.display = 'none';
  document.getElementById('apikey-badge').textContent   = 'API key set ✓';
  document.getElementById('apikey-badge').style.color   = 'var(--sage)';
  if (_pendingAnalyze) { _pendingAnalyze = false; handleAnalyze(); }
}

let _pendingAnalyze = false;
function openApiKeyModal(fromAnalyze = false) {
  _pendingAnalyze = fromAnalyze;
  document.getElementById('apikey-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('apikey-input').focus(), 50);
}

function closeApiKeyModal() {
  _pendingAnalyze = false;
  document.getElementById('apikey-modal').style.display = 'none';
}

// ─── API CALL (CLAUDE ANTHROPIC) ─────────────────────────────────────────────
async function callClaude(systemPrompt, userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'API error');
  const text = (data.content || []).map(b => b.text || '').join('');
  const clean = text.replace(/```json\n?|```/g, '').trim();
  return JSON.parse(clean);
}

// ─── ANALYZE PROCESSOR ───────────────────────────────────────────────────────
async function handleAnalyze() {
  const notes = document.getElementById('notes-input').value.trim();
  const errEl = document.getElementById('error-msg');

  if (!notes || notes.split(/\s+/).filter(Boolean).length < 10) {
    errEl.textContent = 'Please paste at least a paragraph of notes to process.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';

  document.getElementById('input-form-view').style.display = 'none';
  document.getElementById('loading-view').classList.add('active');

  const stages = [
    'Reading your notes…',
    'Extracting key concepts…',
    'Building topic clusters…',
    'Generating learning path…',
  ];

  const stageEl = document.getElementById('loading-stage');
  const barEl   = document.getElementById('progress-bar');
  const pctEl   = document.getElementById('progress-pct');

  async function animateStages() {
    for (let i = 0; i < stages.length; i++) {
      stageEl.textContent = stages[i];
      const pct = Math.round((i + 1) / stages.length * 85);
      barEl.style.width = pct + '%';
      pctEl.textContent = pct + '%';
      await sleep(700);
    }
  }

  try {
    const [result] = await Promise.all([
      callClaude(
        `You are an expert educational AI. Given raw student notes, return ONLY a valid JSON object (no markdown, no preamble) with this exact structure:
{
  "title": "concise topic title (max 6 words)",
  "summary": ["bullet point 1","bullet point 2","bullet point 3","bullet point 4","bullet point 5"],
  "keywords": ["keyword1","keyword2","keyword3","keyword4","keyword5","keyword6","keyword7","keyword8"],
  "clusters": [
    {"name":"Cluster Name","color":"sage|indigo|amber|rose","topics":["topic1","topic2","topic3"]},
    {"name":"Cluster Name 2","color":"sage|indigo|amber|rose","topics":["topic1","topic2"]}
  ],
  "learningPath": [
    {"step":1,"title":"Foundation concept","duration":"15 min","tip":"short tip"},
    {"step":2,"title":"Core concept","duration":"20 min","tip":"short tip"},
    {"step":3,"title":"Applied concept","duration":"25 min","tip":"short tip"},
    {"step":4,"title":"Integration","duration":"15 min","tip":"short tip"}
  ]
}`,
        notes
      ),
      animateStages(),
    ]);

    barEl.style.width = '100%';
    pctEl.textContent = '100%';
    await sleep(400);

    localStorage.setItem('notizedData', JSON.stringify(result));
    window.location.href = 'dashboard.html';
  } catch (e) {
    console.error('Analysis error:', e);
    resetInputView();
    errEl.textContent = 'Processing failed: ' + (e.message || 'Unknown error');
    errEl.style.display = 'block';
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── STORAGE MANAGEMENT (LOCALSTORAGE ENGINE) ────────────────────────────────
// 🆕 FIX ENGINE: Inisialisasi struktur database kosong yang aman & clean
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

// ─── SIDEBAR DIRECT ACTION TRIGGER CONTROLLERS ───────────────────────────────
function openFolderCreatorDirect(event) {
  if (event) event.preventDefault();
  const folderModal = document.getElementById('folder-creator-card');
  if (folderModal) {
    // Gunakan setProperty 'important' agar browser wajib menampilkan flex center di layar luar
    folderModal.style.setProperty('display', 'flex', 'important');
    
    // Auto-focus ke kolom input nama folder
    setTimeout(() => {
      const inputForm = document.getElementById('new-folder-name-input');
      if (inputForm) inputForm.focus();
    }, 50);
  }
}

function closeFolderCreatorCard() {
  const folderModal = document.getElementById('folder-creator-card');
  if (folderModal) {
    // Paksa browser menutup dan menyembunyikan overlay modal secara mutlak
    folderModal.style.setProperty('display', 'none', 'important');
    
    // Reset isi ketikan di dalam input text
    const inputForm = document.getElementById('new-folder-name-input');
    if (inputForm) inputForm.value = '';
  }
}

// ─── UPDATE FUNGSI SAVE FOLDER DENGAN LOGIKA FAIL-SAFE ───
function saveFolderFromCard() {
  const nameInput = document.getElementById('new-folder-name-input').value.trim();
  if (!nameInput) return alert("Please enter a subject name!");

  let library = getLibraryData();
  if (!library.folders) library.folders = {};

  if (library.folders[nameInput]) return alert("This folder already exists!");

  // Definisikan warna aman (default Sage #6B8F71) jika dot warna belum sempat diklik
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

// ─── RENDERING SIDEBAR KONDISIONAL (MUNCUL HANYA JIKA ADA DATA) ───
function refreshWorkspaceTree() {
  let library = getLibraryData();
  if (!library.folders) library.folders = {};
  if (!library.root_files) library.root_files = {};

  const standaloneSection = document.querySelector('.root-files-section');
  const looseContainer = document.getElementById('loose-files-container');
  const foldersSection = document.querySelector('.folders-section');
  const folderContainer = document.getElementById('folders-root-container');

  // === A. HANDLING STANDALONE NOTES ===
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

  // === B. HANDLING SUBJECT FOLDERS ===
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

// ─── SAVE MODAL SYSTEM ───────────────────────────────────────────────────────
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

// Tutup modal save
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

// ─── RENDERING CONTENT CORE VIEW ─────────────────────────────────────────────
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
      `<li class="summary-item"><span class="summary-arrow">→</span><span>${point}</span></li>`
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

  const pathList = document.getElementById('path-list');
  if (pathList) {
    pathList.innerHTML = (data.learningPath || []).map((step, i) => `
      <div class="path-item">
        <div class="path-num">${step.step}</div>
        <div class="path-card">
          <div class="path-card-header">
            <span class="path-card-title">${esc(step.title)}</span>
            <span class="path-duration">${esc(step.duration)}</span>
          </div>
          <p class="path-tip">💡 ${esc(step.tip)}</p>
        </div>
      </div>
    `).join(''); // <─── SUDAH DITAMBAHKAN .join('') BIAR GA ERROR LAGI
  }
}

// Escape utility
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}