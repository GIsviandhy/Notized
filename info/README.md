# Notized - AI Study Companion

## How to Run

1. Start Apache server (XAMPP)
2. Open browser and navigate to: `http://localhost/Notized/`

**Alternative:** Use any HTTP server (Python, Node.js, VS Code Live Server)

## Quick Start

1. **Landing Page** - Click "Start Free" or "See Example"
2. **Input Page** - Paste your notes or upload a file
3. **Analyze** - Click "Analyze Notes" button
4. **Dashboard** - View results and save to your library

## Project Structure

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
│   └── ai-service.js       # AI abstraction layer
├── DATA_FLOW.md            # Complete architecture documentation
├── REFACTORING.md          # Refactoring changes log
└── README.md               # This file
```

## Features

- ✅ Text and PDF file upload
- ✅ Smart note analysis (currently hardcoded)
- ✅ Keyword extraction
- ✅ Topic clustering
- ✅ Learning path generation
- ✅ Folder organization
- ✅ LocalStorage persistence
- 🔄 Custom ML model integration (ready for implementation)

## Current AI Implementation

**Mode:** Hardcoded text processing  
**Location:** `js/ai-service.js`

The analyze button currently works using basic text processing:
- Keyword extraction via word frequency
- Summary from first sentences
- Generic learning path generation

## Future ML Integration

The project is structured to easily integrate your custom ML model:

1. **API-based:** Deploy your model as REST API
2. **Browser-based:** Use TensorFlow.js or ONNX.js

See `DATA_FLOW.md` for complete integration guide.

## Documentation

- **DATA_FLOW.md** - Complete user journey, data flow, and ML integration guide
- **REFACTORING.md** - Recent changes and improvements

## Technology Stack

- HTML5, CSS3, JavaScript (Vanilla)
- PDF.js for PDF text extraction
- LocalStorage for data persistence
- No backend required (currently)

## Browser Requirements

- Modern browser with ES6+ support
- LocalStorage enabled
- JavaScript enabled