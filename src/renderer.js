const STORAGE_KEY = "typewriter-notes-state-v1";

const themes = [
  { id: "classic", name: "Classic Paper", className: "theme-classic" },
  { id: "night", name: "Night Desk", className: "theme-night" },
  { id: "manuscript", name: "Manuscript", className: "theme-manuscript" },
  { id: "terminal", name: "Terminal Draft", className: "theme-terminal" }
];

const notebooks = [
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
    goal: 750,
    createdAt: "2026-07-10T08:15:00.000Z",
    modifiedAt: "2026-07-18T09:20:00.000Z",
    body: "The desk is quiet except for the keys. I want this page to stay simple: one thought after another, no bright badges, no stream of notifications, just ink finding its place.\n\nToday I am collecting loose fragments before the day gets noisy. A grocery list can wait. The chapter can wait. The important thing is to keep the carriage moving.",
    history: ["Opened with coffee", "Trimmed first paragraph", "Added daily tag"]
  },
  {
    id: "chapter-draft",
    title: "Chapter Draft",
    notebook: "drafts",
    tags: ["fiction", "chapter"],
    goal: 1800,
    createdAt: "2026-07-04T16:44:00.000Z",
    modifiedAt: "2026-07-17T22:08:00.000Z",
    body: "Mara found the letter folded behind the drawer label, the paper gone soft at the corners. Whoever typed it had used a tired ribbon; every other line faded into gray, then returned with sudden force.\n\nShe read the date twice. It was impossible, which meant it was probably true.",
    history: ["Version 3 saved", "Changed opening image", "Added drawer detail"]
  },
  {
    id: "meeting-notes",
    title: "Meeting Notes",
    notebook: "work",
    tags: ["meeting", "planning"],
    goal: 400,
    createdAt: "2026-07-12T14:00:00.000Z",
    modifiedAt: "2026-07-16T15:12:00.000Z",
    body: "Agenda\n- Confirm launch copy\n- Review export behavior\n- Decide whether sound defaults on\n\nDecisions\nThe writing surface should open immediately. Settings can remain compact. Export should feel like a small desktop command, not a wizard.",
    history: ["Captured decisions", "Added export note", "Initial meeting draft"]
  },
  {
    id: "essay-outline",
    title: "Essay Outline",
    notebook: "school",
    tags: ["essay", "outline"],
    goal: 1200,
    createdAt: "2026-07-02T11:10:00.000Z",
    modifiedAt: "2026-07-13T18:35:00.000Z",
    body: "Thesis: Tools shape writing by changing the amount of friction between thought and page.\n\nI. Mechanical rhythm\nII. Revision as a visible act\nIII. Digital speed and attention\nIV. A useful middle ground",
    history: ["Added thesis", "Reordered sections", "First outline"]
  },
  {
    id: "ideas-to-revisit",
    title: "Ideas to Revisit",
    notebook: "archive",
    tags: ["ideas", "later"],
    goal: 300,
    createdAt: "2026-06-29T19:05:00.000Z",
    modifiedAt: "2026-07-11T10:27:00.000Z",
    body: "Index-card mode for shuffling scenes.\nCorrection tape animation for deleted lines.\nA small margin bell when a writing goal is reached.\nExport templates for manuscript pages.",
    history: ["Added margin bell idea", "Moved to archive", "Initial list"]
  }
];

const defaultState = {
  notes: sampleNotes,
  selectedNoteId: "morning-pages",
  selectedNotebookId: "all",
  searchTerm: "",
  settings: {
    themeId: "classic",
    soundEnabled: false,
    defaultNotebook: "drafts",
    paperWidth: 740,
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
const goalInput = document.getElementById("goalInput");
const goalMeter = document.getElementById("goalMeter");
const createdDate = document.getElementById("createdDate");
const modifiedDate = document.getElementById("modifiedDate");
const historyStack = document.getElementById("historyStack");
const exportDialog = document.getElementById("exportDialog");
const settingsDialog = document.getElementById("settingsDialog");
const defaultNotebook = document.getElementById("defaultNotebook");
const paperWidth = document.getElementById("paperWidth");
const showInspector = document.getElementById("showInspector");
const autoSave = document.getElementById("autoSave");

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return structuredClone(defaultState);
    const parsed = JSON.parse(stored);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      settings: { ...defaultState.settings, ...parsed.settings }
    };
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
  }, immediate ? 0 : 320);
}

function selectedNote() {
  return state.notes.find((note) => note.id === state.selectedNoteId) || state.notes[0];
}

function countWords(text) {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
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

function renderThemeOptions() {
  themeSelect.innerHTML = themes.map((theme) => `<option value="${theme.id}">${theme.name}</option>`).join("");
  themeSelect.value = state.settings.themeId;
}

function renderNotebookOptions() {
  const counts = Object.fromEntries(notebooks.map((notebook) => [notebook.id, 0]));
  state.notes.forEach((note) => {
    counts[note.notebook] = (counts[note.notebook] || 0) + 1;
  });

  const items = [{ id: "all", name: "All Notes", count: state.notes.length }, ...notebooks.map((notebook) => ({ ...notebook, count: counts[notebook.id] || 0 }))];
  notebookList.innerHTML = items
    .map(
      (item) => `
        <button class="notebook-button ${state.selectedNotebookId === item.id ? "active" : ""}" data-notebook="${item.id}">
          <span>${item.name}</span>
          <span>${item.count}</span>
        </button>
      `
    )
    .join("");

  defaultNotebook.innerHTML = notebooks.map((notebook) => `<option value="${notebook.id}">${notebook.name}</option>`).join("");
  defaultNotebook.value = state.settings.defaultNotebook;
}

function renderNoteList() {
  const notes = filteredNotes();
  noteCount.textContent = `${notes.length}`;
  noteList.innerHTML = notes
    .map(
      (note) => `
        <button class="note-card ${note.id === state.selectedNoteId ? "active" : ""}" data-note="${note.id}">
          <span class="note-card-title">${note.title || "Untitled Note"}</span>
          <span class="note-card-meta">
            <span>${formatDate(note.modifiedAt)}</span>
            <span>${countWords(note.body)} words</span>
          </span>
          <span class="note-card-tags">${note.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</span>
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
  goalInput.value = note.goal;
  noteMeta.textContent = `${notebooks.find((book) => book.id === note.notebook)?.name || "Notebook"} / modified ${formatTime(note.modifiedAt)}`;
  tagCloud.innerHTML = note.tags.map((tag) => `<span class="tag">${tag}</span>`).join("");
  createdDate.textContent = formatDate(note.createdAt);
  modifiedDate.textContent = formatTime(note.modifiedAt);
  historyStack.innerHTML = note.history.map((item) => `<div class="history-item">${item}</div>`).join("");
  updateCounts();
}

function renderSettings() {
  const theme = themes.find((item) => item.id === state.settings.themeId) || themes[0];
  app.className = `app-shell ${theme.className} ${app.classList.contains("focus-mode") ? "focus-mode" : ""}`;
  app.style.setProperty("--paper-width", `${state.settings.paperWidth}px`);
  soundToggle.checked = state.settings.soundEnabled;
  themeSelect.value = state.settings.themeId;
  themeStatus.textContent = theme.name;
  paperWidth.value = state.settings.paperWidth;
  showInspector.checked = state.settings.showInspector;
  autoSave.checked = state.settings.autoSave;
  document.querySelector(".inspector-panel").style.display = state.settings.showInspector ? "" : "none";
}

function renderAll() {
  renderThemeOptions();
  renderNotebookOptions();
  renderNoteList();
  renderEditor();
  renderSettings();
}

function updateCounts() {
  const text = editor.value;
  const words = countWords(text);
  const chars = text.length;
  const note = selectedNote();
  wordCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;
  charCount.textContent = `${chars} ${chars === 1 ? "character" : "characters"}`;
  if (note) {
    const progress = note.goal > 0 ? Math.min(100, Math.round((words / note.goal) * 100)) : 0;
    goalMeter.style.width = `${progress}%`;
  }
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

function renderEditorDetailsOnly() {
  const note = selectedNote();
  noteMeta.textContent = `${notebooks.find((book) => book.id === note.notebook)?.name || "Notebook"} / modified ${formatTime(note.modifiedAt)}`;
  modifiedDate.textContent = formatTime(note.modifiedAt);
}

function newNote() {
  const now = new Date().toISOString();
  const id = `note-${Date.now()}`;
  const note = {
    id,
    title: "Untitled Note",
    notebook: state.settings.defaultNotebook,
    tags: ["draft"],
    goal: 500,
    createdAt: now,
    modifiedAt: now,
    body: "",
    history: ["Created new draft"]
  };
  state.notes.unshift(note);
  state.selectedNoteId = id;
  state.selectedNotebookId = "all";
  state.searchTerm = "";
  searchInput.value = "";
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
  if (notes.length && !notes.some((note) => note.id === state.selectedNoteId)) {
    state.selectedNoteId = notes[0].id;
  }
  renderNotebookOptions();
  renderNoteList();
  renderEditor();
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

function playKeyClick() {
  if (!state.settings.soundEnabled) return;
  audioContext ||= new AudioContext();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "square";
  osc.frequency.value = 90 + Math.random() * 45;
  gain.gain.setValueAtTime(0.025, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.035);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + 0.04);
}

function fakeExport(format) {
  const note = selectedNote();
  if (!note || format === "close") return;
  const label = format === "txt" ? "TXT" : format === "md" ? "Markdown" : "PDF";
  state.savedState = `${label} export ready`;
  savedState.textContent = state.savedState;
  setTimeout(() => {
    state.savedState = "Saved";
    savedState.textContent = "Saved";
  }, 1400);
}

document.addEventListener("click", (event) => {
  const commandButton = event.target.closest("[data-command]");
  if (commandButton) {
    const command = commandButton.dataset.command;
    if (command === "new") newNote();
    if (command === "export") openExport();
    if (command === "focus") toggleFocus();
    if (command === "settings") openSettings();
  }

  const noteButton = event.target.closest("[data-note]");
  if (noteButton) selectNote(noteButton.dataset.note);

  const notebookButton = event.target.closest("[data-notebook]");
  if (notebookButton) setNotebook(notebookButton.dataset.notebook);
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

goalInput.addEventListener("input", () => {
  updateNote((note) => {
    note.goal = Number(goalInput.value) || 0;
  });
});

searchInput.addEventListener("input", () => {
  state.searchTerm = searchInput.value;
  renderNoteList();
});

themeSelect.addEventListener("change", () => {
  state.settings.themeId = themeSelect.value;
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

showInspector.addEventListener("change", () => {
  state.settings.showInspector = showInspector.checked;
  renderSettings();
  persist();
});

autoSave.addEventListener("change", () => {
  state.settings.autoSave = autoSave.checked;
  persist(true);
});

exportDialog.addEventListener("close", () => fakeExport(exportDialog.returnValue));

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
