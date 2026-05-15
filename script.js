  // ─── STATE ──────────────────────────────────────────────────────────────────
  let appData       = null;
  let quizState     = { current: 0, score: 0, revealed: false, answers: [] };

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
        generateMockData(notes),
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
      console.error('Analysis error:', e);
      resetInputView();
      errEl.textContent = 'Processing failed: ' + (e.message || 'Unknown error');
      errEl.style.display = 'block';
    }
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ─── MOCK DATA GENERATOR ────────────────────────────────────────────────────
  function generateMockData(notes) {
    const lowerNotes = notes.toLowerCase();
    const isNervousSystem = lowerNotes.includes('nervous') || lowerNotes.includes('neuron') || lowerNotes.includes('synap');

    if (isNervousSystem) {
      return Promise.resolve({
        title: "Nervous System & Neurons",
        summary: [
          "<strong>The Big Picture (Organization)</strong><br>The nervous system is your body's command center. It is split into two main teams:<br><strong>Central (<span class='highlight-indigo'>CNS</span>):</strong> The Brain and Spinal Cord. This is the \"CPU\" that makes decisions.<br><strong>Peripheral (<span class='highlight-indigo'>PNS</span>):</strong> All the nerves that branch out to your limbs.<br><strong><span class='highlight-amber'>Sympathetic</span>:</strong> \"Fight or Flight\" (Speeds you up for stress).<br><strong><span class='highlight-amber'>Parasympathetic</span>:</strong> \"Rest and Digest\" (Slows you down for recovery).",
          "<strong>The Hardware (Neuron Anatomy)</strong><br>Think of a neuron as a one-way street for electricity:<br><strong><span class='highlight-sage'>Dendrites</span>:</strong> The \"Antennas\" that catch incoming signals.<br><strong><span class='highlight-sage'>Soma (Cell Body)</span>:</strong> The \"Engine\" that processes the info.<br><strong><span class='highlight-sage'>Axon</span>:</strong> The \"Highway\" the signal travels down.<br><strong><span class='highlight-sage'>Myelin Sheath</span>:</strong> The \"Insulation\" that keeps the electricity from leaking and speeds up the signal.",
          "<strong>The Signal (Action Potential)</strong><br>Neurons aren't always \"on.\" They follow an <span class='highlight-rose'>All-or-Nothing</span> rule:<br><strong>Resting State (<span class='highlight-indigo'>-70mV</span>):</strong> The cell is charged and ready (like a loaded spring). It stays ready by pumping 3 <span class='highlight-amber'>Sodium (Na+)</span> out and 2 <span class='highlight-amber'>Potassium (K+)</span> in.<br><strong>The Trigger (<span class='highlight-indigo'>-55mV</span>):</strong> If the signal isn't strong enough to hit this \"Threshold,\" nothing happens.<br><strong>The Fire (<span class='highlight-rose'>Depolarization</span>):</strong> Sodium rushes in, flipping the charge to positive.<br><strong>The Reset (<span class='highlight-rose'>Repolarization</span>):</strong> Potassium rushes out to bring the charge back down.",
          "<strong>The Hand-off (The Synapse)</strong><br>Neurons never actually touch each other. They leave a tiny gap called a <span class='highlight-indigo'>Synaptic Cleft</span>.<br>When the electricity hits the end of the axon, it releases <span class='highlight-sage'>Neurotransmitters</span> (chemical keys).<br>These chemicals float across the gap and \"unlock\" the next neuron to start the process over again."
        ],
        keywords: ["neurons", "synapse", "action potential", "neurotransmitters", "CNS", "PNS", "myelin", "dendrites"],
        clusters: [
          {
            name: "System Organization",
            color: "indigo",
            topics: ["Central Nervous System", "Peripheral Nervous System", "Autonomic vs Somatic"]
          },
          {
            name: "Neuron Structure",
            color: "sage",
            topics: ["Dendrites", "Cell Body", "Axon", "Myelin Sheath"]
          },
          {
            name: "Signal Transmission",
            color: "amber",
            topics: ["Action Potential", "Depolarization", "Repolarization", "Synaptic Transmission"]
          }
        ],
        learningPath: [
          { step: 1, title: "Nervous System Organization", tip: "Start with the big picture: CNS vs PNS divisions" },
          { step: 2, title: "Neuron Anatomy & Function", tip: "Understand the hardware before the signals" },
          { step: 3, title: "Action Potential Mechanism", tip: "Focus on ion movement: Na+ in, K+ out" },
          { step: 4, title: "Synaptic Transmission", tip: "Learn how neurons communicate chemically" }
        ],
        quizQuestions: []
      });
    }

    return Promise.resolve({
      title: "Study Notes Analysis",
      summary: [
        "Your notes cover key concepts and foundational knowledge",
        "Multiple interconnected topics identified for structured learning",
        "Important terms and definitions extracted for review",
        "Learning path organized from basics to advanced concepts"
      ],
      keywords: ["concept", "definition", "process", "structure", "function", "relationship", "application", "example"],
      clusters: [
        {
          name: "Core Concepts",
          color: "sage",
          topics: ["Fundamental principles", "Key definitions", "Basic structures"]
        },
        {
          name: "Processes & Mechanisms",
          color: "indigo",
          topics: ["How things work", "Step-by-step procedures", "Cause and effect"]
        },
        {
          name: "Applications",
          color: "amber",
          topics: ["Real-world examples", "Practical uses", "Case studies"]
        }
      ],
      learningPath: [
        { step: 1, title: "Foundation Concepts", tip: "Master the basics first" },
        { step: 2, title: "Core Mechanisms", tip: "Understand how things work" },
        { step: 3, title: "Advanced Topics", tip: "Build on your foundation" },
        { step: 4, title: "Integration & Application", tip: "Connect all concepts together" }
      ],
      quizQuestions: []
    });
  }

  // ─── RENDER DASHBOARD ───────────────────────────────────────────────────────
  function renderDashboard(data) {
    // Summary
    const summaryList = document.getElementById('summary-list');
    summaryList.innerHTML = (data.summary || []).map(point =>
      `<li class="summary-item">${point}</li>`
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