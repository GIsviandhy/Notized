// ─── INPUT PAGE (input.html) SCRIPT ─────────────────────────────────────────

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

// ─── INITIALIZATION ──────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('loadExample') === 'true') {
    loadExample();
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

function loadExample() {
  const inputArea = document.getElementById('notes-input');
  if (inputArea) {
    inputArea.value = EXAMPLE_NOTES;
    updateWordCount();
  }
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
    // Use AI service layer (currently hardcoded, ready for ML integration)
    const [result] = await Promise.all([
      analyzeNotes(notes),
      animateStages(),
    ]);

    barEl.style.width = '100%';
    pctEl.textContent = '100%';
    await sleep(400);

    localStorage.setItem('notizedData', JSON.stringify(result));
    window.location.href = 'dashboard.html';
  } catch (e) {
    console.error('Analysis error:', e);
    document.getElementById('input-form-view').style.display = 'block';
    document.getElementById('loading-view').classList.remove('active');
    errEl.textContent = 'Processing failed: ' + (e.message || 'Unknown error');
    errEl.style.display = 'block';
  }
}
