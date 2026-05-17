# Notized Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NOTIZED SYSTEM                              │
│                     AI Study Companion                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│  │ index.html   │    │ input.html   │    │dashboard.html│        │
│  │              │    │              │    │              │        │
│  │ Landing Page │───▶│ Note Input   │───▶│  Workspace   │        │
│  │              │    │              │    │              │        │
│  └──────────────┘    └──────────────┘    └──────────────┘        │
│         │                   │                    │                 │
│         └───────────────────┴────────────────────┘                 │
│                             │                                       │
│                    ┌────────▼────────┐                            │
│                    │   style.css     │                            │
│                    │ Unified Styles  │                            │
│                    └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│  │ landing.js   │    │  input.js    │    │dashboard.js  │        │
│  │              │    │              │    │              │        │
│  │ Navigation   │    │ File Upload  │    │ Workspace    │        │
│  │              │    │ Word Count   │    │ Save/Load    │        │
│  │              │    │ Validation   │    │ Folders      │        │
│  └──────────────┘    └──────┬───────┘    └──────────────┘        │
│                              │                                      │
│                              │                                      │
│                    ┌─────────▼─────────┐                          │
│                    │  ai-service.js    │                          │
│                    │                   │                          │
│                    │  ┌─────────────┐  │                          │
│                    │  │ AI_CONFIG   │  │                          │
│                    │  │ mode: ...   │  │                          │
│                    │  └─────────────┘  │                          │
│                    │                   │                          │
│                    │  analyzeNotes()   │                          │
│                    └─────────┬─────────┘                          │
│                              │                                      │
│              ┌───────────────┼───────────────┐                    │
│              │               │               │                    │
│    ┌─────────▼────────┐ ┌───▼────────┐ ┌───▼────────────┐       │
│    │ HARDCODED        │ │    API     │ │ LOCAL_MODEL    │       │
│    │ (Current)        │ │  (Future)  │ │   (Future)     │       │
│    │                  │ │            │ │                │       │
│    │ Word frequency   │ │ REST API   │ │ TensorFlow.js  │       │
│    │ Sentence extract │ │ Python ML  │ │ ONNX.js        │       │
│    └──────────────────┘ └────────────┘ └────────────────┘       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐        │
│  │                   common.js                          │        │
│  │                                                       │        │
│  │  • esc()           - HTML escape                     │        │
│  │  • sleep()         - Async delay                     │        │
│  │  • getLibraryData()- Storage management              │        │
│  │  • extractTextFromPDF() - PDF processing             │        │
│  └──────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Browser LocalStorage                           │  │
│  │                                                             │  │
│  │  ┌──────────────────────┐    ┌──────────────────────┐     │  │
│  │  │   notizedData        │    │  notized_library     │     │  │
│  │  │   (Temporary)        │    │  (Permanent)         │     │  │
│  │  │                      │    │                      │     │  │
│  │  │  Fresh analysis      │───▶│  root_files: {}      │     │  │
│  │  │  from input page     │    │  folders: {          │     │  │
│  │  │                      │    │    "Biology": {...}  │     │  │
│  │  │  Cleared after save  │    │    "Math": {...}     │     │  │
│  │  │                      │    │  }                   │     │  │
│  │  └──────────────────────┘    └──────────────────────┘     │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL DEPENDENCIES                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│  │   PDF.js     │    │  Google      │    │   Future:    │        │
│  │   (CDN)      │    │  Fonts       │    │   Your ML    │        │
│  │              │    │  (CDN)       │    │   API/Model  │        │
│  │ Text extract │    │  DM Sans     │    │              │        │
│  │              │    │  DM Serif    │    │              │        │
│  └──────────────┘    └──────────────┘    └──────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────┐
│   USER      │
└──────┬──────┘
       │
       │ 1. Opens app
       ▼
┌─────────────────┐
│  index.html     │
│  Landing Page   │
└──────┬──────────┘
       │
       │ 2. Clicks "Start Free"
       ▼
┌─────────────────┐
│  input.html     │
│  Note Input     │
└──────┬──────────┘
       │
       │ 3. Pastes notes
       │ 4. Clicks "Analyze"
       ▼
┌─────────────────┐
│  input.js       │
│  handleAnalyze()│
└──────┬──────────┘
       │
       │ 5. Validates input
       ▼
┌─────────────────┐
│ ai-service.js   │
│ analyzeNotes()  │
└──────┬──────────┘
       │
       │ 6. Process text
       ▼
┌─────────────────┐
│  HARDCODED      │
│  Analysis       │
└──────┬──────────┘
       │
       │ 7. Returns JSON
       ▼
┌─────────────────┐
│  localStorage   │
│  notizedData    │
└──────┬──────────┘
       │
       │ 8. Redirect
       ▼
┌─────────────────┐
│ dashboard.html  │
│ Preview Results │
└──────┬──────────┘
       │
       │ 9. User clicks "Save"
       ▼
┌─────────────────┐
│ dashboard.js    │
│ confirmSave()   │
└──────┬──────────┘
       │
       │ 10. Move data
       ▼
┌─────────────────┐
│  localStorage   │
│ notized_library │
└──────┬──────────┘
       │
       │ 11. Display saved
       ▼
┌─────────────────┐
│ dashboard.html  │
│ Saved Note View │
└─────────────────┘
```

## AI Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI SERVICE LAYER                         │
│                   (js/ai-service.js)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────┐    │
│  │              AI_CONFIG                            │    │
│  │  {                                                │    │
│  │    mode: 'HARDCODED' | 'API' | 'LOCAL_MODEL'    │    │
│  │    endpoint: 'http://...' or null                │    │
│  │  }                                                │    │
│  └───────────────────────────────────────────────────┘    │
│                          │                                  │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────┐    │
│  │         analyzeNotes(notesText)                   │    │
│  │         Main entry point                          │    │
│  └───────────────┬───────────────────────────────────┘    │
│                  │                                          │
│     ┌────────────┼────────────┐                           │
│     │            │            │                           │
│     ▼            ▼            ▼                           │
│  ┌──────┐   ┌──────┐   ┌──────────┐                     │
│  │HARD  │   │ API  │   │  LOCAL   │                     │
│  │CODED │   │      │   │  MODEL   │                     │
│  └──┬───┘   └──┬───┘   └────┬─────┘                     │
│     │          │            │                            │
│     │          │            │                            │
│     ▼          ▼            ▼                            │
│  ┌─────────────────────────────────────┐               │
│  │     Structured JSON Output          │               │
│  │  {                                  │               │
│  │    title: string,                   │               │
│  │    summary: string[],               │               │
│  │    keywords: string[],              │               │
│  │    clusters: object[],              │               │
│  │    learningPath: object[]           │               │
│  │  }                                  │               │
│  └─────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

## File Dependencies

```
index.html
  ├── style.css
  ├── js/common.js
  └── js/landing.js

input.html
  ├── style.css
  ├── js/common.js
  ├── js/ai-service.js
  └── js/input.js

dashboard.html
  ├── style.css
  ├── js/common.js
  └── js/dashboard.js
```

## Module Responsibilities

```
┌──────────────────────────────────────────────────────────┐
│ common.js                                                │
│ • Utility functions used across all pages                │
│ • PDF extraction                                         │
│ • Storage management                                     │
│ • HTML escaping                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ai-service.js                                            │
│ • AI abstraction layer                                   │
│ • Mode switching (HARDCODED/API/LOCAL_MODEL)            │
│ • Analysis logic                                         │
│ • Future ML integration point                            │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ landing.js                                               │
│ • Landing page logic (minimal)                           │
│ • Navigation only                                        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ input.js                                                 │
│ • File upload handling                                   │
│ • Word count tracking                                    │
│ • Input validation                                       │
│ • Analysis trigger                                       │
│ • Loading animation                                      │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ dashboard.js                                             │
│ • Workspace tree rendering                               │
│ • Folder management                                      │
│ • Save/load operations                                   │
│ • Content display                                        │
│ • Modal management                                       │
└──────────────────────────────────────────────────────────┘
```

## Future ML Integration Points

```
                    ┌─────────────────┐
                    │  Your ML Model  │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌──────────────────┐        ┌──────────────────┐
    │   API Server     │        │  Browser Model   │
    │   (Python/Node)  │        │  (TensorFlow.js) │
    └────────┬─────────┘        └────────┬─────────┘
             │                           │
             │                           │
             └───────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  ai-service.js   │
              │  analyzeNotes()  │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  Structured JSON │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   Dashboard      │
              │   Display        │
              └──────────────────┘
```

## Legend

```
┌─────┐
│ Box │  = Component/Module
└─────┘

  │
  ▼     = Data/Control Flow

  ───▶  = Navigation/Redirect

  ┬     = Branch/Split
  
  ├──   = Dependency
```
