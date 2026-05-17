// ─── COMMON UTILITIES & SHARED FUNCTIONS ────────────────────────────────────

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ─── ESCAPE UTILITY ──────────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── SLEEP UTILITY ───────────────────────────────────────────────────────────
function sleep(ms) { 
  return new Promise(r => setTimeout(r, ms)); 
}

// ─── STORAGE MANAGEMENT ──────────────────────────────────────────────────────
function getLibraryData() {
  const data = localStorage.getItem('notized_library');
  if (data) return JSON.parse(data);

  const freshLibrary = {
    "root_files": {},
    "folders": {}
  };
  localStorage.setItem('notized_library', JSON.stringify(freshLibrary));
  return freshLibrary;
}

// ─── PDF EXTRACTION ──────────────────────────────────────────────────────────
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageStrings = content.items.map(item => item.str);
    fullText += pageStrings.join(" ") + "\n\n";
  }
  return fullText;
}
