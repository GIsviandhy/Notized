  // ─── STATE ──────────────────────────────────────────────────────────────────
  let appData       = null;
  let quizState     = { current: 0, score: 0, revealed: false, answers: [] };

  const EXAMPLE_NOTES = `Mitosis and the Cell Cycle - Biology Notes

The cell cycle is the series of events that cells go through as they grow and divide. It consists of two major phases: Interphase and Mitotic phase (M phase).

Interphase is the longest part of the cycle and includes:
- G1 phase (Gap 1): Cell grows and synthesizes proteins. The cell increases in size and makes the organelles needed for DNA synthesis.
- S phase (Synthesis): DNA replication occurs. Each chromosome is duplicated so the cell now has twice the normal amount of DNA.
- G2 phase (Gap 2): Cell continues to grow and prepares for division. Organelles and cytoplasm increase.

Mitosis (M phase) has four main stages:
1. Prophase: Chromatin condenses into visible chromosomes. The mitotic spindle begins to form. Nuclear envelope breaks down.
2. Metaphase: Chromosomes align at the cell's equator (metaphase plate). Spindle fibers attach to centromeres.
3. Anaphase: Sister chromatids are pulled to opposite poles of the cell by spindle fibers. Cell elongates.
4. Telophase: Nuclear envelope reforms around each set of chromosomes. Chromosomes begin to decondense.

Cytokinesis follows mitosis and divides the cytoplasm, producing two genetically identical daughter cells.

Key concepts:
- Sister chromatids: Identical copies of a chromosome held together at the centromere
- Centromere: Region where sister chromatids are joined and spindle fibers attach
- Spindle fibers: Made of microtubules; responsible for chromosome movement
- Checkpoints: G1, G2, and M checkpoints ensure the cell is ready to proceed. Errors here can lead to cancer.

Cancer connection: When checkpoint controls fail, cells can divide uncontrollably. Oncogenes promote cell division while tumor suppressor genes (like p53) inhibit it.`;

  // ─── NAVIGATION ─────────────────────────────────────────────────────────────
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
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
    el.textContent = words > 0 ? words + ' words' : 'Tip: Longer notes = richer insights';
  }

  // ─── FILE UPLOAD ────────────────────────────────────────────────────────────
  function triggerFileUpload() {
    document.getElementById('file-input').click();
  }
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById('notes-input').value = ev.target.result;
      updateWordCount();
    };
    reader.readAsText(file);
  }

  // ─── EXAMPLE LOADER ─────────────────────────────────────────────────────────
  function loadExample() {
    showScreen('input');
    setTimeout(() => {
      document.getElementById('notes-input').value = EXAMPLE_NOTES;
      updateWordCount();
    }, 100);
  }

  // ─── API KEY ─────────────────────────────────────────────────────────────────
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
    // Resume analyze if it was waiting
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

  // ─── API CALL ───────────────────────────────────────────────────────────────
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

  // ─── ANALYZE ────────────────────────────────────────────────────────────────
  async function handleAnalyze() {
    const notes = document.getElementById('notes-input').value.trim();
    const errEl = document.getElementById('error-msg');

    if (!notes || notes.split(/\s+/).filter(Boolean).length < 10) {
      errEl.textContent = 'Please paste at least a paragraph of notes to process.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';

    // Show loading
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
    {"name":"Cluster Name 2","color":"sage|indigo|amber|rose","topics":["topic1","topic2"]},
    {"name":"Cluster Name 3","color":"sage|indigo|amber|rose","topics":["topic1","topic2","topic3"]}
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

      // 1. Simpan data hasil analisis ke LocalStorage (memori browser)
      localStorage.setItem('notizedData', JSON.stringify(result));

      // 2. Lempar user ke halaman dashboard.html
      window.location.href = 'dashboard.html';
    } catch (e) {
      resetInputView();
      errEl.textContent = 'Processing failed. Please check your connection and try again.';
      errEl.style.display = 'block';
    }
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ─── RENDER DASHBOARD ───────────────────────────────────────────────────────
  function renderDashboard(data) {
    document.getElementById('dash-title-tag').textContent = data.title || '';

    // Summary
    const summaryList = document.getElementById('summary-list');
    summaryList.innerHTML = (data.summary || []).map(point =>
      `<li class="summary-item">
        <span class="summary-arrow">→</span>
        <span>${esc(point)}</span>
      </li>`
    ).join('');

    // Keywords
    const chipsEl = document.getElementById('keyword-chips');
    chipsEl.innerHTML = (data.keywords || []).map((kw, i) =>
      `<span class="chip c${i % 3}">${esc(kw)}</span>`
    ).join('');

    // Stats
    document.getElementById('stat-keywords').textContent = (data.keywords || []).length;
    document.getElementById('stat-clusters').textContent = (data.clusters || []).length;
    document.getElementById('stat-steps').textContent    = (data.learningPath || []).length;

    // Clusters
    const clustersGrid = document.getElementById('clusters-grid');
    const validColors = ['sage','indigo','amber','rose'];
    clustersGrid.innerHTML = (data.clusters || []).map((cluster, i) => {
      const color = validColors.includes(cluster.color) ? cluster.color : 'sage';
      return `<div class="cluster-card cluster-${color} slide-up" style="animation-delay:${i*0.08}s;opacity:0"
                onclick="toggleCluster(this)">
        <div class="cluster-header">
          <span class="cluster-name">⬡ ${esc(cluster.name)}</span>
          <span class="cluster-count">${cluster.topics.length} topics</span>
        </div>
        <ul class="cluster-topics">
          ${(cluster.topics || []).map(t =>
            `<li class="cluster-topic"><span class="cluster-dot">·</span><span>${esc(t)}</span></li>`
          ).join('')}
        </ul>
      </div>`;
    }).join('');

    // Learning Path
    const pathList = document.getElementById('path-list');
    const pathItems = data.learningPath || [];
    pathList.innerHTML = pathItems.map((step, i) => {
      const isFirst = i === 0;
      const isLast  = i === pathItems.length - 1;
      const numClass = isFirst ? 'first' : isLast ? 'last' : '';
      return `<div class="path-item slide-up" style="animation-delay:${i*0.1}s;opacity:0">
        <div class="path-num ${numClass}">${step.step}</div>
        <div class="path-card">
          <div class="path-card-header">
            <span class="path-card-title">${esc(step.title)}</span>
            <span class="path-duration">${esc(step.duration)}</span>
          </div>
          <p class="path-tip">💡 ${esc(step.tip)}</p>
        </div>
      </div>`;
    }).join('');
  }

  // ─── TABS ────────────────────────────────────────────────────────────────────
  function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`[data-tab="${name}"]`).classList.add('active');
    document.getElementById('tab-' + name).classList.add('active');

    // Re-trigger animations
    document.querySelectorAll(`#tab-${name} .slide-up`).forEach(el => {
      el.style.animation = 'none';
      el.offsetHeight; // reflow
      el.style.animation = '';
    });
  }

  // ─── CLUSTER TOGGLE ─────────────────────────────────────────────────────────
  function toggleCluster(el) {
    const wasActive = el.classList.contains('active');
    document.querySelectorAll('.cluster-card').forEach(c => c.classList.remove('active'));
    if (!wasActive) el.classList.add('active');
  }

  // ─── UTILITY ─────────────────────────────────────────────────────────────────
  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

    // Tambahkan ini di paling bawah file script.js
window.addEventListener('DOMContentLoaded', () => {
    // Cek apakah kita sedang berada di halaman dashboard
    const dashboardCheck = document.getElementById('screen-dashboard');
    
    if (dashboardCheck) {
        const savedData = localStorage.getItem('notizedData');
        if (savedData) {
            const data = JSON.parse(savedData);
            renderDashboard(data); // Memanggil fungsi render yang sudah ada
        }
    }
});