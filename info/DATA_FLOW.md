# Notized Data Flow & Architecture

## Complete User Journey

### 1. Landing Page (index.html)
**Purpose:** Introduction and navigation hub

**User Actions:**
- Click "Start Free" → Navigate to input.html
- Click "See Example" → Navigate to input.html?loadExample=true
- Click "Dashboard" → Navigate to dashboard.html

**Data Flow:** None (static page)

---

### 2. Input Page (input.html)
**Purpose:** Capture and process student notes

#### User Actions:
1. **Input Methods:**
   - Type/paste text into textarea
   - Upload .txt file
   - Upload .pdf file (extracted via pdf.js)
   - Click "See Example" (auto-loads sample notes)

2. **Word Count:**
   - Live counter updates as user types
   - Shows word count or hint message

3. **Analyze Notes:**
   - Validates minimum 10 words
   - Shows loading animation with progress
   - Processes notes through AI service
   - Redirects to dashboard.html

#### Data Flow:
```
User Input (text/file)
    ↓
Validation (min 10 words)
    ↓
AI Service Layer (js/ai-service.js)
    ├─ HARDCODED mode (current)
    ├─ API mode (future)
    └─ LOCAL_MODEL mode (future ML integration)
    ↓
Structured Analysis Result
    ↓
localStorage['notizedData'] (temporary)
    ↓
Redirect to dashboard.html
```

#### Analysis Output Format:
```javascript
{
  title: "Concise topic title",
  summary: ["bullet 1", "bullet 2", ...],
  keywords: ["keyword1", "keyword2", ...],
  clusters: [
    {
      name: "Cluster Name",
      color: "sage|indigo|amber|rose",
      topics: ["topic1", "topic2", ...]
    }
  ],
  learningPath: [
    {
      step: 1,
      title: "Step title",
      duration: "15 min",
      tip: "Study tip"
    }
  ]
}
```

---

### 3. Dashboard Page (dashboard.html)
**Purpose:** View, manage, and organize analyzed notes

#### On Page Load:
1. Check for `localStorage['notizedData']` (fresh analysis)
   - If exists: Show preview with "Save Analysis" button
   - If not: Show empty state or last viewed note

2. Render workspace tree (sidebar)
   - Load `localStorage['notized_library']`
   - Display standalone notes
   - Display folders with nested notes

#### User Actions:

**A. Save Fresh Analysis:**
1. Click "Save Analysis" button
2. Modal opens with:
   - Input: Note name
   - Dropdown: Destination (standalone or folder)
3. Click "Save Document"
4. Data moves from `notizedData` → `notized_library`
5. Preview becomes permanent saved note

**B. Create New Folder:**
1. Click "New Folder" button
2. Modal opens with:
   - Input: Folder name
   - Color picker: Visual theme
3. Click "Create Folder"
4. Folder added to `notized_library.folders`

**C. View Saved Note:**
1. Click note name in sidebar
2. Main pane displays:
   - Smart Summary
   - Keyword Radar
   - Statistics (keywords, clusters, steps)
   - Learning Path

**D. View Folder Overview:**
1. Click folder name in sidebar
2. Main pane displays:
   - Folder description
   - Aggregated statistics
   - Master curriculum path

**E. Create New Note:**
1. Click "New Note" button
2. Redirects to input.html

#### Data Flow:
```
localStorage['notizedData'] (temporary)
    ↓
User clicks "Save Analysis"
    ↓
Modal: Enter name + select folder
    ↓
localStorage['notized_library']
    ├─ root_files: { "Note Name": {analysis data} }
    └─ folders: {
         "Folder Name": {
           color: "#6B8F71",
           path: ["Global step 1", ...],
           files: { "Note Name": {analysis data} }
         }
       }
    ↓
Sidebar refreshes
    ↓
Note displayed in main pane
```

---

## Data Storage Structure

### Temporary Storage (notizedData)
**Key:** `notizedData`  
**Lifetime:** Until saved or page refresh  
**Purpose:** Hold fresh analysis before user decides where to save

```javascript
localStorage.setItem('notizedData', JSON.stringify({
  title: "...",
  summary: [...],
  keywords: [...],
  clusters: [...],
  learningPath: [...]
}));
```

### Permanent Storage (notized_library)
**Key:** `notized_library`  
**Lifetime:** Persistent until manually deleted  
**Purpose:** Store all saved notes and folder structure

```javascript
{
  "root_files": {
    "Note Name 1": { /* analysis data */ },
    "Note Name 2": { /* analysis data */ }
  },
  "folders": {
    "Biology": {
      "color": "#6B8F71",
      "path": ["Global Core: Intro", "Global Core: Advanced"],
      "files": {
        "Chapter 1": { /* analysis data */ },
        "Chapter 2": { /* analysis data */ }
      }
    },
    "Math": {
      "color": "#4A5586",
      "path": [],
      "files": {}
    }
  }
}
```

---

## AI Service Integration Points

### Current Implementation (HARDCODED)
**File:** `js/ai-service.js`  
**Mode:** `AI_CONFIG.mode = 'HARDCODED'`

**How it works:**
1. Extracts keywords using word frequency analysis
2. Generates summary from first sentences
3. Creates generic learning path
4. Returns structured JSON

**Limitations:**
- Basic text processing only
- No semantic understanding
- Generic learning paths
- Limited keyword extraction

### Future Integration: Custom ML Model

#### Option 1: API-based Model
**Mode:** `AI_CONFIG.mode = 'API'`

**Setup Steps:**
1. Train your NLP model (Python/TensorFlow/PyTorch)
2. Deploy as REST API (Flask/FastAPI)
3. Update `AI_CONFIG.endpoint` in `js/ai-service.js`:
   ```javascript
   const AI_CONFIG = {
     mode: 'API',
     endpoint: 'http://localhost:5000/api/analyze'
   };
   ```
4. Implement `analyzeWithAPI()` function (already scaffolded)

**API Contract:**
```
POST /api/analyze
Content-Type: application/json

Request:
{
  "notes": "raw text...",
  "options": {
    "includeSummary": true,
    "includeKeywords": true,
    "includeClusters": true,
    "includeLearningPath": true
  }
}

Response:
{
  "title": "...",
  "summary": [...],
  "keywords": [...],
  "clusters": [...],
  "learningPath": [...]
}
```

#### Option 2: Browser-based Model
**Mode:** `AI_CONFIG.mode = 'LOCAL_MODEL'`

**Setup Steps:**
1. Train model and export to TensorFlow.js or ONNX.js format
2. Load model in browser:
   ```javascript
   const model = await tf.loadLayersModel('/models/notized-model.json');
   ```
3. Implement `analyzeWithLocalModel()` function
4. Process text entirely client-side (no server needed)

**Benefits:**
- No API calls (faster, private)
- Works offline
- No server costs

**Challenges:**
- Model size (must be small enough for browser)
- Browser performance limitations
- Requires WebAssembly or WebGL support

---

## File Structure

```
Notized/
├── index.html              # Landing page
├── input.html              # Note input interface
├── dashboard.html          # Workspace & management
├── style.css               # Unified styles
├── js/
│   ├── common.js           # Shared utilities
│   ├── landing.js          # Landing page logic
│   ├── input.js            # Input page logic
│   ├── dashboard.js        # Dashboard logic
│   └── ai-service.js       # AI abstraction layer ⭐
├── script.js               # DEPRECATED (old monolithic file)
├── .env                    # Environment config (for future use)
└── README.md               # How to run
```

---

## Navigation Map

```
┌─────────────┐
│ index.html  │ Landing Page
│ (Home)      │
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ↓                 ↓
┌─────────────┐   ┌─────────────┐
│ input.html  │   │dashboard.html│
│ (New Note)  │   │ (Workspace) │
└──────┬──────┘   └──────┬──────┘
       │                 │
       │    Analyze      │
       └────────→────────┘
                │
                ↓
         Save to Library
                │
                ↓
         View/Manage Notes
```

---

## Key Functions Reference

### Common (common.js)
- `esc(str)` - HTML escape
- `sleep(ms)` - Async delay
- `getLibraryData()` - Load library from localStorage
- `extractTextFromPDF(file)` - Extract text from PDF

### AI Service (ai-service.js)
- `analyzeNotes(text)` - Main analysis entry point
- `analyzeWithHardcodedLogic(text)` - Current implementation
- `analyzeWithAPI(text)` - Future API integration
- `analyzeWithLocalModel(text)` - Future ML integration

### Input (input.js)
- `updateWordCount()` - Live word counter
- `handleFileUpload(e)` - File upload handler
- `loadExample()` - Load sample notes
- `handleAnalyze()` - Process notes and redirect

### Dashboard (dashboard.js)
- `refreshWorkspaceTree()` - Render sidebar
- `openSaveModal()` - Show save dialog
- `confirmSaveNotes()` - Save to library
- `loadSavedFile(folder, key)` - Display saved note
- `renderProjectContent(data)` - Render analysis results
- `openFolderCreatorDirect()` - Create new folder
- `viewFolderLevelPath(name)` - View folder overview

---

## Testing Checklist

### Input Flow
- [ ] Type text → word count updates
- [ ] Upload .txt file → text appears
- [ ] Upload .pdf file → text extracted
- [ ] Click "See Example" → sample loads
- [ ] Analyze with <10 words → error shown
- [ ] Analyze with valid text → loading animation
- [ ] Analysis completes → redirects to dashboard

### Dashboard Flow
- [ ] Fresh analysis shows preview
- [ ] "Save Analysis" button appears
- [ ] Save modal opens with options
- [ ] Save to standalone → appears in sidebar
- [ ] Save to folder → appears under folder
- [ ] Click note → displays content
- [ ] Click folder → shows overview
- [ ] Create folder → appears in sidebar
- [ ] "New Note" → redirects to input

### Navigation
- [ ] All "Home" buttons → index.html
- [ ] All "Dashboard" buttons → dashboard.html
- [ ] All "New Note" buttons → input.html
- [ ] All "Start Free" buttons → input.html

---

## Future ML Integration Guide

### Step 1: Prepare Your Model
Train a model that accepts text input and outputs:
- Title (string)
- Summary (array of strings)
- Keywords (array of strings)
- Clusters (array of objects)
- Learning path (array of objects)

### Step 2: Choose Integration Method
- **API:** Deploy model as REST service
- **Local:** Convert to TensorFlow.js/ONNX.js

### Step 3: Update Configuration
Edit `js/ai-service.js`:
```javascript
const AI_CONFIG = {
  mode: 'API', // or 'LOCAL_MODEL'
  endpoint: 'http://your-server.com/api/analyze'
};
```

### Step 4: Implement Integration Function
Complete either:
- `analyzeWithAPI()` - for API integration
- `analyzeWithLocalModel()` - for browser-based model

### Step 5: Test
1. Ensure output matches expected format
2. Test with various note lengths
3. Verify error handling
4. Check performance

### Step 6: Deploy
1. Update `AI_CONFIG.mode`
2. Remove hardcoded logic (optional)
3. Update documentation
4. Test in production environment

---

## Environment Variables (.env)

Currently unused, but prepared for future configuration:

```env
# AI Model Configuration
AI_MODE=HARDCODED              # HARDCODED | API | LOCAL_MODEL
AI_API_URL=http://localhost:5000/api/analyze
AI_MODEL_PATH=/models/notized-model.json

# Feature Flags
ENABLE_PDF_UPLOAD=true
ENABLE_EXAMPLE_NOTES=true
MIN_WORD_COUNT=10

# Storage
STORAGE_KEY_LIBRARY=notized_library
STORAGE_KEY_TEMP=notizedData
```

To use: Load with a library like `dotenv` or parse manually in JavaScript.
