# ML Integration Quick Start Guide

## Overview

Notized is ready for your custom ML/NLP model integration. The AI service layer (`js/ai-service.js`) provides a clean abstraction that makes swapping implementations easy.

## Current State

**Mode:** `HARDCODED`  
**Function:** `analyzeWithHardcodedLogic()`  
**Behavior:** Basic text processing (word frequency, sentence extraction)

## Integration Options

### Option 1: REST API (Recommended for Python Models)

**Best for:** TensorFlow, PyTorch, scikit-learn models

#### Backend Setup (Python Example)

```python
# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import your_model_module

app = Flask(__name__)
CORS(app)  # Enable CORS for browser requests

@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.json
    notes_text = data.get('notes', '')
    
    # Your ML model inference
    result = your_model_module.analyze(notes_text)
    
    # Return in expected format
    return jsonify({
        'title': result['title'],
        'summary': result['summary'],
        'keywords': result['keywords'],
        'clusters': result['clusters'],
        'learningPath': result['learning_path']
    })

if __name__ == '__main__':
    app.run(port=5000)
```

#### Frontend Configuration

```javascript
// js/ai-service.js
const AI_CONFIG = {
  mode: 'API',
  endpoint: 'http://localhost:5000/api/analyze'
};
```

#### Test Your Integration

```bash
# Start your API server
python app.py

# Test with curl
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"notes": "Your test notes here..."}'
```

---

### Option 2: Browser-based Model (TensorFlow.js)

**Best for:** Lightweight models, offline functionality

#### Model Conversion

```bash
# Convert your trained model to TensorFlow.js format
tensorflowjs_converter \
  --input_format=keras \
  path/to/model.h5 \
  path/to/tfjs_model
```

#### Frontend Implementation

```javascript
// js/ai-service.js
const AI_CONFIG = {
  mode: 'LOCAL_MODEL',
  endpoint: null
};

let model = null;

async function analyzeWithLocalModel(notesText) {
  // Load model (cache after first load)
  if (!model) {
    model = await tf.loadLayersModel('/models/notized-model.json');
  }
  
  // Preprocess text
  const tokens = preprocessText(notesText);
  const tensor = tf.tensor2d([tokens]);
  
  // Run inference
  const predictions = await model.predict(tensor);
  
  // Post-process results
  const result = formatPredictions(predictions);
  
  return result;
}

function preprocessText(text) {
  // Your tokenization logic
  // Return array of token IDs
}

function formatPredictions(predictions) {
  // Convert model output to expected format
  return {
    title: "...",
    summary: [...],
    keywords: [...],
    clusters: [...],
    learningPath: [...]
  };
}
```

---

## Expected Output Format

Your model MUST return this exact structure:

```javascript
{
  // Concise topic title (max 6 words)
  "title": "Nervous System and Neurons",
  
  // Summary bullet points (3-5 items)
  "summary": [
    "The nervous system coordinates body functions",
    "Neurons are the functional units",
    "Synaptic transmission enables communication"
  ],
  
  // Key concepts (6-8 items)
  "keywords": [
    "Neurons",
    "Synapses",
    "Action Potential",
    "Neurotransmitters",
    "Central Nervous System",
    "Peripheral Nervous System"
  ],
  
  // Topic clusters (2-4 groups)
  "clusters": [
    {
      "name": "Nervous System Structure",
      "color": "sage",  // Options: sage, indigo, amber, rose
      "topics": ["CNS", "PNS", "Brain", "Spinal Cord"]
    },
    {
      "name": "Neural Communication",
      "color": "indigo",
      "topics": ["Action Potential", "Synapses", "Neurotransmitters"]
    }
  ],
  
  // Learning path (3-5 steps)
  "learningPath": [
    {
      "step": 1,
      "title": "Nervous System Overview",
      "duration": "15 min",
      "tip": "Start with the big picture structure"
    },
    {
      "step": 2,
      "title": "Neuron Structure and Function",
      "duration": "20 min",
      "tip": "Understand the basic building blocks"
    },
    {
      "step": 3,
      "title": "Action Potentials",
      "duration": "25 min",
      "tip": "Focus on the electrical signaling mechanism"
    },
    {
      "step": 4,
      "title": "Synaptic Transmission",
      "duration": "20 min",
      "tip": "Learn how neurons communicate"
    }
  ]
}
```

---

## Testing Your Integration

### 1. Unit Test Your Model Output

```javascript
// test-ai-service.js
async function testAnalysis() {
  const testNotes = "Your test notes here...";
  
  try {
    const result = await analyzeNotes(testNotes);
    
    console.assert(typeof result.title === 'string', 'Title must be string');
    console.assert(Array.isArray(result.summary), 'Summary must be array');
    console.assert(Array.isArray(result.keywords), 'Keywords must be array');
    console.assert(Array.isArray(result.clusters), 'Clusters must be array');
    console.assert(Array.isArray(result.learningPath), 'Learning path must be array');
    
    console.log('✅ All tests passed!');
    console.log(result);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAnalysis();
```

### 2. Integration Test in Browser

1. Open `input.html`
2. Paste test notes
3. Click "Analyze Notes"
4. Check browser console for errors
5. Verify dashboard displays correctly

### 3. Performance Test

```javascript
async function benchmarkAnalysis() {
  const testNotes = "Your test notes...";
  
  const start = performance.now();
  await analyzeNotes(testNotes);
  const end = performance.now();
  
  console.log(`Analysis took ${end - start}ms`);
}
```

**Target:** < 3000ms for good UX

---

## Common Issues & Solutions

### Issue: CORS Error (API mode)

**Error:** `Access to fetch at 'http://localhost:5000' has been blocked by CORS policy`

**Solution:** Enable CORS in your API server
```python
from flask_cors import CORS
CORS(app)
```

### Issue: Model Too Large (Local mode)

**Error:** Slow loading or browser crashes

**Solution:** 
- Quantize your model
- Use model pruning
- Consider API mode instead

### Issue: Wrong Output Format

**Error:** Dashboard displays incorrectly

**Solution:** Validate your output matches expected format exactly
```javascript
function validateOutput(result) {
  const required = ['title', 'summary', 'keywords', 'clusters', 'learningPath'];
  for (const field of required) {
    if (!(field in result)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  return true;
}
```

---

## Deployment Checklist

- [ ] Model trained and tested
- [ ] Output format validated
- [ ] API endpoint configured (if using API mode)
- [ ] CORS enabled (if using API mode)
- [ ] Error handling implemented
- [ ] Performance acceptable (< 3s)
- [ ] Browser compatibility tested
- [ ] Update `AI_CONFIG.mode` in `js/ai-service.js`
- [ ] Update documentation
- [ ] Test complete user flow

---

## Example: Simple Keyword Extraction Model

Here's a minimal example to get started:

```python
# simple_model.py
import re
from collections import Counter

def analyze(notes_text):
    # Simple keyword extraction
    words = re.findall(r'\b[a-zA-Z]{5,}\b', notes_text.lower())
    word_freq = Counter(words)
    keywords = [word for word, _ in word_freq.most_common(8)]
    
    # Simple summary (first 3 sentences)
    sentences = re.split(r'[.!?]+', notes_text)
    summary = [s.strip() for s in sentences[:3] if s.strip()]
    
    # Generate title
    title = ' '.join(notes_text.split()[:6])
    
    return {
        'title': title,
        'summary': summary,
        'keywords': keywords,
        'clusters': [
            {
                'name': 'Main Concepts',
                'color': 'sage',
                'topics': keywords[:4]
            }
        ],
        'learningPath': [
            {
                'step': 1,
                'title': 'Overview',
                'duration': '15 min',
                'tip': 'Start with the basics'
            }
        ]
    }
```

---

## Next Steps

1. **Train your model** with educational text data
2. **Choose integration method** (API or Local)
3. **Implement the integration** following this guide
4. **Test thoroughly** with various inputs
5. **Deploy and monitor** performance

## Need Help?

- Check `DATA_FLOW.md` for complete architecture
- Review `js/ai-service.js` for implementation details
- Test with hardcoded mode first to understand data flow

Good luck with your ML integration! 🚀
