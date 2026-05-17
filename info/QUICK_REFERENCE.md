# Quick Reference Card

## 🚀 Getting Started

```bash
# Start Apache
# Open: http://localhost/Notized/
```

## 📂 Project Structure

```
Notized/
├── index.html          # Landing
├── input.html          # Input
├── dashboard.html      # Dashboard
├── style.css           # Styles
└── js/
    ├── common.js       # Utils
    ├── ai-service.js   # AI ⭐
    ├── landing.js      # Landing
    ├── input.js        # Input
    └── dashboard.js    # Dashboard
```

## 🔧 Key Functions

### Common (common.js)
```javascript
esc(str)              // HTML escape
sleep(ms)             // Async delay
getLibraryData()      // Load library
extractTextFromPDF()  // PDF → text
```

### AI Service (ai-service.js)
```javascript
analyzeNotes(text)    // Main entry ⭐
AI_CONFIG.mode        // Switch mode
```

### Input (input.js)
```javascript
handleAnalyze()       // Process notes
updateWordCount()     // Live counter
handleFileUpload()    // File upload
```

### Dashboard (dashboard.js)
```javascript
refreshWorkspaceTree() // Render sidebar
confirmSaveNotes()     // Save to library
loadSavedFile()        // Display note
renderProjectContent() // Show results
```

## 🎯 AI Service Modes

```javascript
// Current (works now)
AI_CONFIG.mode = 'HARDCODED';

// Future (your API)
AI_CONFIG.mode = 'API';
AI_CONFIG.endpoint = 'http://localhost:5000/api/analyze';

// Future (browser model)
AI_CONFIG.mode = 'LOCAL_MODEL';
```

## 📊 Data Flow

```
Input → Validate → Analyze → Save → Display
         (10w)     (AI)     (LS)    (UI)
```

## 💾 Storage Keys

```javascript
localStorage['notizedData']      // Temporary
localStorage['notized_library']  // Permanent
```

## 🔍 Output Format

```javascript
{
  title: "...",
  summary: ["...", "..."],
  keywords: ["...", "..."],
  clusters: [{name, color, topics}],
  learningPath: [{step, title, duration, tip}]
}
```

## 🧪 Quick Test

```javascript
// 1. Open input.html
// 2. Paste text (>10 words)
// 3. Click "Analyze Notes"
// 4. Should redirect to dashboard
// 5. Results should display
```

## 📚 Documentation

| File | Purpose |
|------|---------|
| README.md | Quick start |
| DATA_FLOW.md | Architecture |
| ML_INTEGRATION.md | ML guide |
| ARCHITECTURE.md | Diagrams |
| TESTING_CHECKLIST.md | Tests |

## 🐛 Debug Checklist

- [ ] Check browser console (F12)
- [ ] Verify file paths
- [ ] Check localStorage
- [ ] Clear cache
- [ ] Check Network tab

## 🔄 ML Integration (3 Steps)

```javascript
// 1. Implement function
async function analyzeWithAPI(text) {
  const res = await fetch(AI_CONFIG.endpoint, {
    method: 'POST',
    body: JSON.stringify({notes: text})
  });
  return await res.json();
}

// 2. Update config
AI_CONFIG.mode = 'API';
AI_CONFIG.endpoint = 'http://your-api.com/analyze';

// 3. Test
// Done!
```

## ⚡ Performance Targets

- Analysis: < 3s
- Page load: < 1s
- File upload: < 2s

## 🎨 Color Scheme

```css
--sage:   #6B8F71  /* Primary */
--indigo: #4A5586  /* Secondary */
--amber:  #C9883A  /* Accent */
--rose:   #B85C6E  /* Alert */
--cream:  #F6F4EF  /* Background */
--ink:    #1C1A16  /* Text */
```

## 🔐 Security Notes

- No API keys in code ✅
- LocalStorage only ✅
- No backend (yet) ✅
- CORS ready for API ✅

## 📞 Need Help?

1. Check DATA_FLOW.md
2. Check ML_INTEGRATION.md
3. Check browser console
4. Check TESTING_CHECKLIST.md

## ✅ Status

- [x] Navigation unified
- [x] JS separated
- [x] Data flow documented
- [x] API key removed
- [x] Analyze button works
- [x] ML structure ready

## 🎯 Current Mode

```
HARDCODED ✅ (Working)
API       ⏳ (Ready)
LOCAL     ⏳ (Ready)
```

---

**Quick Start:** Open `http://localhost/Notized/` → Click "Start Free" → Paste notes → Click "Analyze Notes" → Done! 🎉
