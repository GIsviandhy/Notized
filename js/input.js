// ─── INPUT PAGE (input.html) SCRIPT ─────────────────────────────────────────

const EXAMPLE_NOTES = `Bio 101 - Lecture 6: Nervous System & Cell Signaling (10/14)

Nervous System (NS) = body's master controller, coordinates basically everything vol and invol. Split into CNS and PNS. CNS is just brain + spinal cord. Brain does all the heavy lifting—info processing, memory, emotions, executive decisions. Main structures: cerebrum (cortex, higher functions/thinking), cerebellum (motor patterns, balance, coordination—prof says think of a drunk person, that's cerebellum malfunction), and brainstem (autonomic vital stuff like breathing, heart rate, sleep cycles). Spinal cord is the main data highway, plugs brain into the rest of physical body. Crucial: spinal cord also handles reflex arcs on its own to save time, doesn't even wait for the brain to look at the signal.

PNS is literally everything else branching off the CNS. Splits into two pathways: Sensory (Afferent) and Motor (Efferent). Memory trick: Afferent arrives at CNS, Efferent exits CNS. Afferent is input from receptors (skin, eyes, etc.). Efferent is output to effectors like muscles and glands. Efferent splits again into Somatic NS (voluntary control over skeletal muscles) and Autonomic NS (ANS - involuntary smooth muscle, cardiac muscle, glands, GI tract). Then ANS splits one more time into Sympathetic vs Parasympathetic. Sympathetic = Fight or Flight response (high heart rate, bronchodilation, stops digestion, shoots adrenaline). Parasympathetic = Rest and Digest (lowers heart rate, stimulates salivation and digestion, energy conservation). They work in opposition to maintain homeostasis.

Cellular level: Functional units are NEURONS (excitable cells). Anatomy of standard multipolar neuron: Dendrites look like tree branches, they receive incoming chemical signals from upstream cells. Signals move into the Cell Body (Soma) which contains nucleus, mitochondria, rough ER (Nissl bodies, prof mentioned this fast, look up later). Soma integrates all incoming graded potentials to decide if it fires. Axon is the long wire carrying electrical output away from soma down to terminal. Axons insulated by Myelin Sheath. Myelin is just fatty layers made by glial cells: Schwann cells do it in the PNS, Oligodendrocytes do it in the CNS. EXAM ALERT: Multiple Sclerosis is an autoimmune condition where the body attacks its own myelin. Myelin speeds up signal propagation down the axon like crazy because the charge jumps from gap to gap (Nodes of Ranvier)—this is called Saltatory Conduction (from Latin "saltare" meaning to leap).

Action Potential (AP) = the electrical impulse down the axon. All-or-none phenomenon, either hits threshold and fires completely or doesn't fire at all.

Resting Membrane Potential (RMP): Cell is polarized at rest, sitting at -70mV. More negative inside than outside. Maintained by Na+/K+ ATPase pump (pumps 3 Na+ out for every 2 K+ in, costs ATP) and leaky K+ channels.

Depolarization: Stimulus causes graded potential. If it hits threshold (-55mV), voltage-gated Na+ channels snap open. Na+ rushes into the cell down its electrochemical gradient. Inside becomes highly positive, spiking up to about +30mV.

Repolarization: At peak (+30mV), Na+ channels inactivate (close up). Voltage-gated K+ channels open. K+ rushes out of the cell, taking positive charge away, bringing membrane potential back down toward negative.

Hyperpolarization / Refractory Period: K+ channels stay open a bit too long, causing overshoot down past -70mV (hyperpolarized state). This is the refractory period. Absolute refractory = sodium gates inactivated, impossible to fire another AP no matter what. Relative refractory = can fire but needs a massive stimulus. Keeps the action potential traveling in one direction only (can't go backwards).

Synaptic Transmission: communication between neurons happens at the Synapse (tiny physical gap called synaptic cleft).
AP travels down axon -> hits axon terminal (presynaptic side). This depolarization opens voltage-gated Calcium (Ca2+) channels. Ca2+ floods into terminal. Ca2+ influx acts as an intracellular trigger causing synaptic vesicles (sacks full of neurotransmitters) to move to and fuse with the presynaptic membrane via exocytosis. Neurotransmitters (NTs) get dumped into cleft, diffuse across the gap, and bind specifically to matching receptors on the postsynaptic membrane (dendrite of next cell).
Binding triggers ion channels to open on the postsynaptic side. Can cause an EPSP (Excitatory Postsynaptic Potential—depolarizes cell closer to threshold) or an IPSP (Inhibitory Postsynaptic Potential—hyperpolarizes cell further from threshold, usually by letting Cl- in or K+ out).
Crucial step: NTs can't just sit in the cleft forever or the signal never stops. Cleared out by 3 mechanisms: Reuptake pumps (sucked back into presynaptic terminal), Enzymatic degradation (chewed up by enzymes, e.g., Acetylcholinesterase breaks down ACh), or simple diffusion away from the cleft into surrounding interstitial fluid.

Major Neurotransmitters to memorize for test:

Acetylcholine (ACh): major for neuromuscular junctions (causes skeletal muscle contraction), also heavily involved in CNS memory and learning.

Dopamine (DA): reward pathways, motivation, pleasure, fine motor control circuits.

Serotonin (5-HT): regulates mood, sleep architecture, appetite, emotional processing.

GABA: the primary inhibitory NT in the mature brain. Calms down neural activity. Alcohol and benzos potentiate GABA.

Glutamate: the primary excitatory NT. Involved in long-term potentiation (learning/memory). Too much causes excitotoxicity (floods cell with calcium, kills it).

Clinical Correlations from end of slides:

Parkinson’s: progressive degradation of dopamine-producing neurons in the substantia nigra area of basal ganglia. Results in resting tremors, rigidity, bradykinesia.

Alzheimer’s: massive loss of cholinergic (ACh) neurons, cortical atrophy, beta-amyloid plaques, neurofibrillary tau tangles. Leads to severe dementia.

Multiple Sclerosis (MS): demyelination of CNS axons. Disrupts saltatory conduction, signals get delayed or lost entirely. Causes motor/sensory deficits.

Depression: widely associated with monoamine hypothesis, specifically functional deficits/imbalances in serotonin and norepinephrine systems in synaptic clefts. Treated with SSRIs to block reuptake.`;

// ─── INITIALIZATION ──────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetFolder = urlParams.get('target');
  if (targetFolder) {
    localStorage.setItem('notized_target_folder', targetFolder);
  }

  if (urlParams.get('loadExample') === 'true') {
    loadExample();
  } else {
    if (typeof renderGlobalNavAuth === 'function') {
      renderGlobalNavAuth();
    }
  }
});

// ─── INTERACTIVE PROFILE DROPDOWN FOR INPUT PAGE ──────────────────────────────
function toggleProfileDropdown(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('profile-dropdown-card');
  if (!dropdown) return;

  if (dropdown.style.display === 'none' || dropdown.style.display === '') {
    dropdown.style.display = 'flex';
  } else {
    dropdown.style.display = 'none';
  }
}

// Tutup dropdown otomatis di input.html jika klik area bebas di luar kartu
window.addEventListener('click', () => {
  const dropdown = document.getElementById('profile-dropdown-card');
  if (dropdown) dropdown.style.display = 'none';
});

// Mencegah penutupan paksa saat bagian dalam dropdown di-klik
document.addEventListener('DOMContentLoaded', () => {
  const profileDropdownCard = document.getElementById('profile-dropdown-card');
  if (profileDropdownCard) {
    profileDropdownCard.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
});

// ─── WORD COUNT ──────────────────────────────────────────────────────────────
function updateWordCount() {
  const val = document.getElementById('notes-input').value.trim();
  const words = val ? val.split(/\s+/).filter(Boolean).length : 0;
  const el = document.getElementById('word-count');
  if (el) el.textContent = words > 0 ? words + ' words' : 'Tip: Longer notes = richer insights';
}

// ─── FILE UPLOAD ─────────────────────────────────────────────────────────────
function triggerFileUpload() {
  document.getElementById('file-input').click();
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.type === "application/pdf") {
    if (typeof extractTextFromPDF === 'function') {
      try {
        const text = await extractTextFromPDF(file);
        document.getElementById('notes-input').value = text;
        updateWordCount();
      } catch (err) {
        console.error("PDF Extraction error:", err);
        const errEl = document.getElementById('error-msg');
        if (errEl) {
          errEl.textContent = 'Failed to extract text from PDF file.';
          errEl.style.display = 'block';
        }
      }
    } else {
      console.warn("extractTextFromPDF function is missing in common.js");
    }
  } else {
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById('notes-input').value = ev.target.result;
      updateWordCount();
    };
    reader.readAsText(file);
  }
}

function loadExample() {
  const inputArea = document.getElementById('notes-input');
  if (inputArea) {
    inputArea.value = EXAMPLE_NOTES;
    updateWordCount();
  }
  
  if (typeof renderGlobalNavAuth === 'function') {
    renderGlobalNavAuth();
  }
}

// ─── ANALYZE PROCESSOR ───────────────────────────────────────────────────────
async function handleAnalyze() {
  const notes = document.getElementById('notes-input').value.trim();
  const errEl = document.getElementById('error-msg');

  // Validasi awal kata
  if (!notes || notes.split(/\s+/).filter(Boolean).length < 10) {
    if (errEl) {
      errEl.textContent = 'Please paste at least a paragraph of notes to process.';
      errEl.style.display = 'block';
    }
    return;
  }
  if (errEl) errEl.style.display = 'none';

  // Kunci dan simpan teks asli dari textarea ke localStorage
  localStorage.setItem('current_raw_text', notes);

  const screenInput = document.getElementById('screen-input');
  if (screenInput) {
    screenInput.classList.add('loading-active');
  }

  const formView = document.getElementById('input-form-view');
  if (formView) formView.style.display = 'none';
  
  const loadingView = document.getElementById('loading-view');
  if (loadingView) loadingView.classList.add('active');

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
      if (stageEl) stageEl.textContent = stages[i];
      const pct = Math.round((i + 1) / stages.length * 85);
      if (barEl) barEl.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';
      await sleep(700);
    }
  }

  try {
    const [result] = await Promise.all([
      analyzeNotes(notes),
      animateStages(),
    ]);

    if (barEl) barEl.style.width = '100%';
    if (pctEl) pctEl.textContent = '100%';
    await sleep(400);

    localStorage.setItem('notizedData', JSON.stringify(result));
    window.location.href = 'dashboard.html';
  } catch (e) {
    console.error('Analysis error:', e);
    if (formView) formView.style.display = 'block';
    if (loadingView) loadingView.classList.remove('active');
    
    const screenInput = document.getElementById('screen-input');
    if (screenInput) {
      screenInput.classList.remove('loading-active');
    }
    
    if (errEl) {
      errEl.textContent = 'Processing failed: ' + (e.message || 'Unknown error');
      errEl.style.display = 'block';
    }
    
    localStorage.removeItem('current_raw_text');
  }
}

// Helper utility sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}