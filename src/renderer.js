const STORAGE_KEY = "typewriter-notes-state-v2";
const LEGACY_STORAGE_KEY = "typewriter-notes-state-v1";

const themes = [
  { id: "classic", name: "Classic", className: "theme-classic" },
  { id: "dark-classic", name: "Dark Classic", className: "theme-dark-classic" }
];

const editorFonts = [
  { id: "courier", name: "Courier New", value: '"Courier New", Courier, monospace' },
  { id: "georgia", name: "Georgia", value: 'Georgia, "Times New Roman", serif' },
  { id: "system", name: "System Sans", value: '"MS Sans Serif", Tahoma, "Segoe UI", system-ui, sans-serif' },
  { id: "mono", name: "System Mono", value: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace' }
];

const defaultNotebooks = [
  { id: "journal", name: "Journal" },
  { id: "drafts", name: "Drafts" },
  { id: "school", name: "School" },
  { id: "work", name: "Work" },
  { id: "archive", name: "Archive" }
];

const sampleNotes = [
  {
    id: "morning-pages",
    title: "Morning Pages",
    notebook: "journal",
    tags: ["journal", "daily"],
    createdAt: "2026-07-10T08:15:00.000Z",
    modifiedAt: "2026-07-18T09:20:00.000Z",
    body: "The desk is quiet except for the keys. I want this page to stay simple: one thought after another, no bright badges, no stream of notifications, just ink finding its place.\n\nToday I am collecting loose fragments before the day gets noisy. A grocery list can wait. The chapter can wait. The important thing is to keep the carriage moving.",
    versions: []
  },
  {
    id: "chapter-draft",
    title: "Chapter Draft",
    notebook: "drafts",
    tags: ["fiction", "chapter"],
    createdAt: "2026-07-04T16:44:00.000Z",
    modifiedAt: "2026-07-17T22:08:00.000Z",
    body: "Mara found the letter folded behind the drawer label, the paper gone soft at the corners. Whoever typed it had used a tired ribbon; every other line faded into gray, then returned with sudden force.\n\nShe read the date twice. It was impossible, which meant it was probably true.",
    versions: []
  },
  {
    id: "meeting-notes",
    title: "Meeting Notes",
    notebook: "work",
    tags: ["meeting", "planning"],
    createdAt: "2026-07-12T14:00:00.000Z",
    modifiedAt: "2026-07-16T15:12:00.000Z",
    body: "Agenda\n- Confirm launch copy\n- Review export behavior\n- Decide whether sound defaults on\n\nDecisions\nThe writing surface should open immediately. Settings can remain compact. Export should feel like a small desktop command, not a wizard.",
    versions: []
  },
  {
    id: "essay-outline",
    title: "Essay Outline",
    notebook: "school",
    tags: ["essay", "outline"],
    createdAt: "2026-07-02T11:10:00.000Z",
    modifiedAt: "2026-07-13T18:35:00.000Z",
    body: "Thesis: Tools shape writing by changing the amount of friction between thought and page.\n\nI. Mechanical rhythm\nII. Revision as a visible act\nIII. Digital speed and attention\nIV. A useful middle ground",
    versions: []
  },
  {
    id: "ideas-to-revisit",
    title: "Ideas to Revisit",
    notebook: "archive",
    tags: ["ideas", "later"],
    createdAt: "2026-06-29T19:05:00.000Z",
    modifiedAt: "2026-07-11T10:27:00.000Z",
    body: "Index-card mode for shuffling scenes.\nCorrection tape animation for deleted lines.\nA small margin bell when a writing goal is reached.\nExport templates for manuscript pages.",
    versions: []
  }
];

const defaultState = {
  notebooks: defaultNotebooks,
  notes: sampleNotes.map(seedVersions),
  selectedNoteId: "morning-pages",
  selectedNotebookId: "all",
  searchTerm: "",
  settings: {
    themeId: "classic",
    soundEnabled: false,
    defaultNotebook: "drafts",
    paperWidth: 740,
    editorTextSize: 17,
    editorFontId: "courier",
    editorTextColor: "#000000",
    showInspector: true,
    autoSave: true
  },
  savedState: "Saved"
};

let state = loadState();
let saveTimer = null;
let audioContext = null;

const app = document.getElementById("app");
const themeSelect = document.getElementById("themeSelect");
const importInput = document.getElementById("importInput");
const searchInput = document.getElementById("searchInput");
const notebookList = document.getElementById("notebookList");
const noteList = document.getElementById("noteList");
const noteCount = document.getElementById("noteCount");
const titleInput = document.getElementById("titleInput");
const noteMeta = document.getElementById("noteMeta");
const editor = document.getElementById("editor");
const soundToggle = document.getElementById("soundToggle");
const wordCount = document.getElementById("wordCount");
const charCount = document.getElementById("charCount");
const themeStatus = document.getElementById("themeStatus");
const savedState = document.getElementById("savedState");
const tagCloud = document.getElementById("tagCloud");
const createdDate = document.getElementById("createdDate");
const modifiedDate = document.getElementById("modifiedDate");
const historyStack = document.getElementById("historyStack");
const exportDialog = document.getElementById("exportDialog");
const settingsDialog = document.getElementById("settingsDialog");
const defaultNotebook = document.getElementById("defaultNotebook");
const paperWidth = document.getElementById("paperWidth");
const editorTextSize = document.getElementById("editorTextSize");
const editorFont = document.getElementById("editorFont");
const editorTextColor = document.getElementById("editorTextColor");
const showInspector = document.getElementById("showInspector");
const autoSave = document.getElementById("autoSave");

function seedVersions(note) {
  const createdAt = note.createdAt || new Date().toISOString();
  return {
    ...note,
    versions: [
      {
        id: `${note.id}-initial`,
        title: note.title,
        body: note.body,
        savedAt: createdAt,
        label: "Initial draft"
      }
    ]
  };
}

function migrateState(raw) {
  const migrated = {
    ...structuredClone(defaultState),
    ...raw,
    notebooks: Array.isArray(raw.notebooks) ? raw.notebooks : defaultNotebooks,
    settings: { ...defaultState.settings, ...raw.settings }
  };

  if (!themes.some((theme) => theme.id === migrated.settings.themeId)) {
    migrated.settings.themeId = migrated.settings.themeId === "night" || migrated.settings.themeId === "terminal" ? "dark-classic" : "classic";
  }
  if (!editorFonts.some((font) => font.id === migrated.settings.editorFontId)) migrated.settings.editorFontId = "courier";
  if (!/^#[0-9a-f]{6}$/i.test(migrated.settings.editorTextColor || "")) {
    migrated.settings.editorTextColor = migrated.settings.themeId === "dark-classic" ? "#00ff00" : "#000000";
  }
  migrated.settings.editorTextSize = Math.min(24, Math.max(14, Number(migrated.settings.editorTextSize) || 17));

  migrated.notes = (migrated.notes || []).map((note) => {
    const versions = Array.isArray(note.versions) && note.versions.length
      ? note.versions
      : Array.isArray(note.history)
        ? note.history.map((label, index) => ({
            id: `${note.id}-legacy-${index}`,
            title: note.title,
            body: note.body,
            savedAt: note.modifiedAt || note.createdAt || new Date().toISOString(),
            label
          }))
        : [];
    return {
      ...note,
      tags: Array.isArray(note.tags) ? note.tags : [],
      versions,
      notebook: migrated.notebooks.some((book) => book.id === note.notebook) ? note.notebook : migrated.settings.defaultNotebook
    };
  });

  if (!migrated.notes.length) migrated.notes = structuredClone(defaultState.notes);
  if (!migrated.notes.some((note) => note.id === migrated.selectedNoteId)) migrated.selectedNoteId = migrated.notes[0].id;
  return migrated;
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    return stored ? migrateState(JSON.parse(stored)) : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

function persist(immediate = false) {
  state.savedState = immediate ? "Saved" : "Saving...";
  savedState.textContent = state.savedState;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    state.savedState = "Saved";
    savedState.textContent = "Saved";
  }, immediate ? 0 : 280);
}

function selectedNote() {
  return state.notes.find((note) => note.id === state.selectedNoteId) || state.notes[0];
}

function countWords(text) {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "note";
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function filteredNotes() {
  const query = state.searchTerm.trim().toLowerCase();
  return state.notes.filter((note) => {
    const inNotebook = state.selectedNotebookId === "all" || note.notebook === state.selectedNotebookId;
    const haystack = [note.title, note.body, note.tags.join(" ")].join(" ").toLowerCase();
    return inNotebook && (!query || haystack.includes(query));
  });
}

function notebookName(id) {
  return state.notebooks.find((book) => book.id === id)?.name || "Notebook";
}

function renderThemeOptions() {
  themeSelect.innerHTML = themes.map((theme) => `<option value="${theme.id}">${theme.name}</option>`).join("");
  themeSelect.value = state.settings.themeId;
}

function renderFontOptions() {
  editorFont.innerHTML = editorFonts.map((font) => `<option value="${font.id}">${font.name}</option>`).join("");
  editorFont.value = state.settings.editorFontId;
}

function renderNotebookOptions() {
  const counts = Object.fromEntries(state.notebooks.map((notebook) => [notebook.id, 0]));
  state.notes.forEach((note) => {
    counts[note.notebook] = (counts[note.notebook] || 0) + 1;
  });

  const items = [{ id: "all", name: "All Notes", count: state.notes.length }, ...state.notebooks.map((notebook) => ({ ...notebook, count: counts[notebook.id] || 0 }))];
  notebookList.innerHTML = items
    .map(
      (item) => `
        <button class="notebook-button ${state.selectedNotebookId === item.id ? "active" : ""}" data-notebook="${item.id}">
          <span>${escapeHtml(item.name)}</span>
          <span>${item.count}</span>
        </button>
      `
    )
    .join("");

  defaultNotebook.innerHTML = state.notebooks.map((notebook) => `<option value="${notebook.id}">${escapeHtml(notebook.name)}</option>`).join("");
  defaultNotebook.value = state.settings.defaultNotebook;
}

function renderNoteList() {
  const notes = filteredNotes();
  noteCount.textContent = `${notes.length}`;
  noteList.innerHTML = notes
    .map(
      (note) => `
        <button class="note-card ${note.id === state.selectedNoteId ? "active" : ""}" data-note="${note.id}">
          <span class="note-card-title">${escapeHtml(note.title || "Untitled Note")}</span>
          <span class="note-card-meta">
            <span>${formatDate(note.modifiedAt)}</span>
            <span>${countWords(note.body)} words</span>
          </span>
          <span class="note-card-tags">${note.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</span>
        </button>
      `
    )
    .join("");
}

function renderEditor() {
  const note = selectedNote();
  if (!note) return;

  titleInput.value = note.title;
  editor.value = note.body;
  noteMeta.textContent = `${notebookName(note.notebook)} / modified ${formatTime(note.modifiedAt)}`;
  tagCloud.innerHTML = note.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  createdDate.textContent = formatDate(note.createdAt);
  modifiedDate.textContent = formatTime(note.modifiedAt);
  renderHistory();
  updateCounts();
}

function renderHistory() {
  const note = selectedNote();
  const versions = [...(note?.versions || [])].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  historyStack.innerHTML = versions.length
    ? versions
        .map(
          (version) => `
            <div class="history-item">
              <span>${escapeHtml(version.label || "Saved version")}</span>
              <small>${formatTime(version.savedAt)}</small>
              <button class="mini-button" data-version="${version.id}">Restore</button>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">No saved versions yet.</div>`;
}

function renderSettings() {
  const theme = themes.find((item) => item.id === state.settings.themeId) || themes[0];
  const font = editorFonts.find((item) => item.id === state.settings.editorFontId) || editorFonts[0];
  app.className = `app-shell ${theme.className} ${app.classList.contains("focus-mode") ? "focus-mode" : ""}`;
  app.style.setProperty("--paper-width", `${state.settings.paperWidth}px`);
  app.style.setProperty("--editor-font-size", `${state.settings.editorTextSize}px`);
  app.style.setProperty("--editor-font-family", font.value);
  app.style.setProperty("--editor-text-color", state.settings.editorTextColor);
  soundToggle.checked = state.settings.soundEnabled;
  themeSelect.value = theme.id;
  themeStatus.textContent = theme.name;
  paperWidth.value = state.settings.paperWidth;
  editorTextSize.value = state.settings.editorTextSize;
  editorFont.value = font.id;
  editorTextColor.value = state.settings.editorTextColor;
  showInspector.checked = state.settings.showInspector;
  autoSave.checked = state.settings.autoSave;
  document.querySelector(".inspector-panel").style.display = state.settings.showInspector ? "" : "none";
}

function renderAll() {
  renderThemeOptions();
  renderFontOptions();
  renderNotebookOptions();
  renderNoteList();
  renderEditor();
  renderSettings();
}

function updateCounts() {
  const text = editor.value;
  const words = countWords(text);
  const chars = text.length;
  wordCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;
  charCount.textContent = `${chars} ${chars === 1 ? "character" : "characters"}`;
}

function renderEditorDetailsOnly() {
  const note = selectedNote();
  noteMeta.textContent = `${notebookName(note.notebook)} / modified ${formatTime(note.modifiedAt)}`;
  modifiedDate.textContent = formatTime(note.modifiedAt);
}

function updateNote(mutator) {
  const note = selectedNote();
  if (!note) return;
  mutator(note);
  note.modifiedAt = new Date().toISOString();
  updateCounts();
  renderNoteList();
  renderEditorDetailsOnly();
  if (state.settings.autoSave) persist();
}

function newNote(body = "", title = "Untitled Note", notebook = state.settings.defaultNotebook) {
  const now = new Date().toISOString();
  const id = `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const note = {
    id,
    title,
    notebook,
    tags: ["draft"],
    createdAt: now,
    modifiedAt: now,
    body,
    versions: []
  };
  state.notes.unshift(note);
  state.selectedNoteId = id;
  state.selectedNotebookId = "all";
  state.searchTerm = "";
  searchInput.value = "";
  saveVersion("Created draft", note);
  renderAll();
  titleInput.focus();
  titleInput.select();
  persist();
}

function selectNote(id) {
  state.selectedNoteId = id;
  renderNoteList();
  renderEditor();
  editor.focus();
}

function setNotebook(id) {
  state.selectedNotebookId = id;
  const notes = filteredNotes();
  if (notes.length && !notes.some((note) => note.id === state.selectedNoteId)) state.selectedNoteId = notes[0].id;
  renderNotebookOptions();
  renderNoteList();
  renderEditor();
}

function newNotebook() {
  const name = window.prompt("New notebook name");
  if (!name?.trim()) return;
  const idBase = slugify(name);
  let id = idBase;
  let count = 2;
  while (state.notebooks.some((book) => book.id === id)) id = `${idBase}-${count++}`;
  state.notebooks.push({ id, name: name.trim() });
  state.selectedNotebookId = id;
  state.settings.defaultNotebook = id;
  renderAll();
  persist();
}

function renameNotebook() {
  if (state.selectedNotebookId === "all") return;
  const notebook = state.notebooks.find((book) => book.id === state.selectedNotebookId);
  if (!notebook) return;
  const name = window.prompt("Rename notebook", notebook.name);
  if (!name?.trim()) return;
  notebook.name = name.trim();
  renderAll();
  persist();
}

function toggleFocus(force) {
  const enabled = typeof force === "boolean" ? force : !app.classList.contains("focus-mode");
  app.classList.toggle("focus-mode", enabled);
  renderSettings();
  if (enabled) editor.focus();
}

function openExport() {
  exportDialog.showModal();
}

function openSettings() {
  settingsDialog.showModal();
}

function saveVersion(label = "Manual version", targetNote = selectedNote()) {
  if (!targetNote) return;
  targetNote.versions.unshift({
    id: `version-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: targetNote.title,
    body: targetNote.body,
    savedAt: new Date().toISOString(),
    label
  });
  targetNote.versions = targetNote.versions.slice(0, 20);
  renderHistory();
  persist();
}

function restoreVersion(id) {
  const note = selectedNote();
  const version = note?.versions.find((item) => item.id === id);
  if (!note || !version) return;
  saveVersion("Before restore", note);
  note.title = version.title;
  note.body = version.body;
  note.modifiedAt = new Date().toISOString();
  renderAll();
  persist();
}

function playKeyClick() {
  if (!state.settings.soundEnabled) return;
  audioContext ||= new AudioContext();
  const osc = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  osc.type = "square";
  osc.frequency.value = 110 + Math.random() * 90;
  filter.type = "lowpass";
  filter.frequency.value = 900;
  gain.gain.setValueAtTime(0.045, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.028);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + 0.03);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportNote(format) {
  const note = selectedNote();
  if (!note || format === "close") return;
  const filename = slugify(note.title || "untitled-note");
  if (format === "txt") {
    downloadFile(`${filename}.txt`, `${note.title}\n\n${note.body}`, "text/plain;charset=utf-8");
  }
  if (format === "md") {
    downloadFile(`${filename}.md`, `# ${note.title}\n\n${note.body}`, "text/markdown;charset=utf-8");
  }
  if (format === "pdf") {
    window.print();
  }
  state.savedState = format === "pdf" ? "Print dialog opened" : "Exported";
  savedState.textContent = state.savedState;
  setTimeout(() => {
    savedState.textContent = "Saved";
  }, 1400);
}

async function importFiles(files) {
  const validFiles = [...files].filter((file) => /\.(txt|md|markdown)$/i.test(file.name));
  for (const file of validFiles) {
    const text = await file.text();
    const title = file.name.replace(/\.(txt|md|markdown)$/i, "").replace(/[-_]+/g, " ").trim() || "Imported Note";
    newNote(text, title, state.settings.defaultNotebook);
  }
  if (validFiles.length) {
    state.savedState = `Imported ${validFiles.length}`;
    savedState.textContent = state.savedState;
  }
}

document.addEventListener("click", (event) => {
  const commandButton = event.target.closest("[data-command]");
  if (commandButton) {
    const command = commandButton.dataset.command;
    if (command === "new") newNote();
    if (command === "import") importInput.click();
    if (command === "export") openExport();
    if (command === "save-version") saveVersion();
    if (command === "new-notebook") newNotebook();
    if (command === "rename-notebook") renameNotebook();
    if (command === "focus") toggleFocus();
    if (command === "settings") openSettings();
  }

  const noteButton = event.target.closest("[data-note]");
  if (noteButton) selectNote(noteButton.dataset.note);

  const notebookButton = event.target.closest("[data-notebook]");
  if (notebookButton) setNotebook(notebookButton.dataset.notebook);

  const versionButton = event.target.closest("[data-version]");
  if (versionButton) restoreVersion(versionButton.dataset.version);
});

titleInput.addEventListener("input", () => {
  updateNote((note) => {
    note.title = titleInput.value;
  });
});

editor.addEventListener("input", () => {
  playKeyClick();
  updateNote((note) => {
    note.body = editor.value;
  });
});

searchInput.addEventListener("input", () => {
  state.searchTerm = searchInput.value;
  renderNoteList();
});

themeSelect.addEventListener("change", () => {
  state.settings.themeId = themeSelect.value;
  if (state.settings.themeId === "dark-classic" && state.settings.editorTextColor === "#000000") state.settings.editorTextColor = "#00ff00";
  if (state.settings.themeId === "classic" && state.settings.editorTextColor === "#00ff00") state.settings.editorTextColor = "#000000";
  renderSettings();
  persist();
});

soundToggle.addEventListener("change", () => {
  state.settings.soundEnabled = soundToggle.checked;
  renderSettings();
  persist();
});

defaultNotebook.addEventListener("change", () => {
  state.settings.defaultNotebook = defaultNotebook.value;
  persist();
});

paperWidth.addEventListener("input", () => {
  state.settings.paperWidth = Number(paperWidth.value);
  renderSettings();
  persist();
});

editorTextSize.addEventListener("input", () => {
  state.settings.editorTextSize = Number(editorTextSize.value);
  renderSettings();
  persist();
});

editorFont.addEventListener("change", () => {
  state.settings.editorFontId = editorFont.value;
  renderSettings();
  persist();
});

editorTextColor.addEventListener("input", () => {
  state.settings.editorTextColor = editorTextColor.value;
  renderSettings();
  persist();
});

showInspector.addEventListener("change", () => {
  state.settings.showInspector = showInspector.checked;
  renderSettings();
  persist();
});

autoSave.addEventListener("change", () => {
  state.settings.autoSave = autoSave.checked;
  persist(true);
});

importInput.addEventListener("change", () => {
  importFiles(importInput.files);
  importInput.value = "";
});

exportDialog.addEventListener("close", () => exportNote(exportDialog.returnValue));

document.addEventListener("keydown", (event) => {
  const mod = event.metaKey || event.ctrlKey;
  if (mod && event.key.toLowerCase() === "n") {
    event.preventDefault();
    newNote();
  }
  if (mod && event.key.toLowerCase() === "f") {
    event.preventDefault();
    searchInput.focus();
  }
  if (mod && event.key.toLowerCase() === "s") {
    event.preventDefault();
    persist(true);
  }
  if (mod && event.key.toLowerCase() === "e") {
    event.preventDefault();
    openExport();
  }
  if (event.key === "Escape" && app.classList.contains("focus-mode")) {
    toggleFocus(false);
  }
});

window.typewriterDesktop?.onMenuCommand((command) => {
  if (command === "new-note") newNote();
  if (command === "save") persist(true);
  if (command === "export") openExport();
  if (command === "find") searchInput.focus();
  if (command === "focus") toggleFocus();
});

renderAll();
persist(true);
