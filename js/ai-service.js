// ─── AI SERVICE LAYER ────────────────────────────────────────────────────────
// This module abstracts the AI analysis logic to make it easy to swap between
// hardcoded responses and future ML/NLP model integration.

/**
 * AI Service Configuration
 * Update this when integrating your custom ML model
 */
const AI_CONFIG = {
  mode: 'HARDCODED', // Options: 'HARDCODED' | 'API' | 'LOCAL_MODEL'
  endpoint: null,     // Set this when using API or local model
  // endpoint: 'http://localhost:5000/api/analyze' // Example for future use
};

/**
 * Main AI Analysis Function
 * @param {string} notesText - Raw student notes to analyze
 * @returns {Promise<Object>} - Structured analysis result
 */
async function analyzeNotes(notesText) {
  switch (AI_CONFIG.mode) {
    case 'HARDCODED':
      return await analyzeWithHardcodedLogic(notesText);
    
    case 'API':
      return await analyzeWithAPI(notesText);
    
    case 'LOCAL_MODEL':
      return await analyzeWithLocalModel(notesText);
    
    default:
      throw new Error('Invalid AI_CONFIG.mode');
  }
}

/**
 * Hardcoded Analysis Logic (Current Implementation)
 */
async function analyzeWithHardcodedLogic(notesText) {
  // Simulate processing time
  await sleep(1500);

  const words = notesText.split(/\s+/).filter(Boolean);
  const sentences = notesText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Extract potential keywords (words longer than 5 characters, capitalized, or repeated)
  const wordFreq = {};
  words.forEach(word => {
    const clean = word.replace(/[^a-zA-Z]/g, '');
    if (clean.length > 5) {
      wordFreq[clean] = (wordFreq[clean] || 0) + 1;
    }
  });
  
  const keywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  // Generate title from first sentence or first few words
  const title = sentences[0]?.trim().slice(0, 50) || words.slice(0, 6).join(' ');

  // Hardcoded smart summary
  const summary = [
    "<strong>1. The Big Picture (Organization)</strong><br>The nervous system is your body's <span class='highlight-sage'>command center</span>. It is split into two main teams:<br><br>• <strong>Central (CNS):</strong> The Brain and Spinal Cord. This is the <span class='highlight-indigo'>\"CPU\"</span> that makes decisions.<br>• <strong>Peripheral (PNS):</strong> All the nerves that branch out to your limbs.<br>&nbsp;&nbsp;&nbsp;→ <em>Sympathetic:</em> \"Fight or Flight\" (Speeds you up for stress).<br>&nbsp;&nbsp;&nbsp;→ <em>Parasympathetic:</em> \"Rest and Digest\" (Slows you down for recovery).",
    "<strong>2. The Hardware (Neuron Anatomy)</strong><br>Think of a neuron as a <span class='highlight-sage'>one-way street for electricity</span>:<br><br>• <strong>Dendrites:</strong> The \"Antennas\" that <span class='highlight-indigo'>catch incoming signals</span>.<br>• <strong>Soma (Cell Body):</strong> The \"Engine\" that processes the info.<br>• <strong>Axon:</strong> The \"Highway\" the signal travels down.<br>• <strong>Myelin Sheath:</strong> The \"Insulation\" that keeps the electricity from leaking and <span class='highlight-amber'>speeds up the signal</span>.",
    "<strong>3. The Signal (Action Potential)</strong><br>Neurons aren't always \"on.\" They follow an <span class='highlight-sage'>All-or-Nothing rule</span>:<br><br>• <strong>Resting State (-70mV):</strong> The cell is charged and ready (like a loaded spring). It stays ready by pumping <span class='highlight-indigo'>3 Sodium (Na+) out</span> and <span class='highlight-indigo'>2 Potassium (K+) in</span>.<br>• <strong>The Trigger (-55mV):</strong> If the signal isn't strong enough to hit this <span class='highlight-amber'>\"Threshold,\"</span> nothing happens.<br>• <strong>The Fire (Depolarization):</strong> Sodium rushes in, flipping the charge to positive.<br>• <strong>The Reset (Repolarization):</strong> Potassium rushes out to bring the charge back down.",
    "<strong>4. The Hand-off (The Synapse)</strong><br>Neurons <span class='highlight-sage'>never actually touch</span> each other. They leave a tiny gap called a <strong>Synaptic Cleft</strong>.<br><br>• When the electricity hits the end of the axon, it releases <span class='highlight-indigo'>Neurotransmitters</span> (chemical keys).<br>• These chemicals float across the gap and <span class='highlight-amber'>\"unlock\"</span> the next neuron to start the process over again."
  ];

  // Generate clusters based on content length
  const clusters = [
    {
      name: "System Organization",
      color: "sage",
      topics: ["Central Nervous System", "Peripheral Nervous System", "Autonomic vs Somatic"]
    },
    {
      name: "Neuron Structure",
      color: "indigo",
      topics: ["Dendrites", "Cell Body", "Axon", "Myelin Sheath"]
    },
    {
      name: "Signal Transmission",
      color: "amber",
      topics: ["Action Potential", "Depolarization", "Repolarization", "Synaptic Transmission"]
    }
  ];

  // Generate learning path
  const learningPath = [
    {
      step: 1,
      title: "Introduction & Overview",
      duration: "15 min",
      tip: "Start by understanding the main concepts"
    },
    {
      step: 2,
      title: "Deep Dive into Details",
      duration: "25 min",
      tip: "Focus on understanding each component"
    },
    {
      step: 3,
      title: "Connections & Relationships",
      duration: "20 min",
      tip: "See how different concepts relate to each other"
    },
    {
      step: 4,
      title: "Review & Practice",
      duration: "15 min",
      tip: "Test your understanding with examples"
    }
  ];

  return {
    title: title,
    summary: summary,
    keywords: keywords.length > 0 ? keywords : ["No keywords found"],
    clusters: clusters,
    learningPath: learningPath
  };
}

/**
 * API-based Analysis (Future Implementation)
 * Call external API endpoint (maybe Python server) for ML model
 */
async function analyzeWithAPI(notesText) {
  if (!AI_CONFIG.endpoint) {
    throw new Error('API endpoint not configured');
  }

  const response = await fetch(AI_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      notes: notesText,
      options: {
        includeSummary: true,
        includeKeywords: true,
        includeClusters: true,
        includeLearningPath: true
      }
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Local ML Model Analysis (Future Implementation)
 * Use locally trained model for analysis
 * 
 * Integration steps:
 * 1. Load your trained model (TensorFlow.js, ONNX.js, etc.)
 * 2. Preprocess the input text
 * 3. Run inference
 * 4. Post-process results into expected format
 */
async function analyzeWithLocalModel(notesText) {
  // TODO: Implement when ML model is ready
  // Example structure:
  
  // const model = await loadModel();
  // const preprocessed = preprocessText(notesText);
  // const predictions = await model.predict(preprocessed);
  // return formatPredictions(predictions);

  throw new Error('Local model not yet implemented');
}

/**
 * Expected Output Format
 * All analysis functions must return this structure:
 * 
 * {
 *   title: string,              // Concise topic title (max 6 words)
 *   summary: string[],          // Array of bullet points (3-5 items)
 *   keywords: string[],         // Key concepts (6-8 items)
 *   clusters: Array<{           // Topic groupings (2-4 clusters)
 *     name: string,
 *     color: 'sage'|'indigo'|'amber'|'rose',
 *     topics: string[]
 *   }>,
 *   learningPath: Array<{       // Study sequence (3-5 steps)
 *     step: number,
 *     title: string,
 *     duration: string,
 *     tip: string
 *   }>
 * }
 */
