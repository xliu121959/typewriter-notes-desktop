const { app, BrowserWindow } = require("electron");
const path = require("path");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "src", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.webContents.session.clearStorageData({ storages: ["localstorage"] });
  await win.loadFile(path.join(__dirname, "..", "src", "index.html"));

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      const checks = [];
      const pass = (name, condition) => checks.push({ name, condition: Boolean(condition) });
      const click = (selector) => document.querySelector(selector).click();
      const input = (el, value) => {
        el.value = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      };

      pass("initial sample notes", document.querySelectorAll("[data-note]").length >= 5);

      document.querySelector('[data-note="chapter-draft"]').click();
      pass("note selection", document.querySelector("#titleInput").value === "Chapter Draft");

      const beforeNew = document.querySelectorAll("[data-note]").length;
      click('[data-command="new"]');
      pass("new note", document.querySelectorAll("[data-note]").length === beforeNew + 1);

      input(document.querySelector("#editor"), "hello typed world");
      pass("word count", document.querySelector("#wordCount").textContent.includes("3 words"));
      pass("character count", document.querySelector("#charCount").textContent.includes("17 characters"));

      click('[data-command="focus"]');
      pass("focus mode", document.querySelector("#app").classList.contains("focus-mode"));

      const theme = document.querySelector("#themeSelect");
      theme.value = "night";
      theme.dispatchEvent(new Event("change", { bubbles: true }));
      pass("theme switching", document.querySelector("#app").classList.contains("theme-night"));

      click('[data-command="export"]');
      pass("export dialog", document.querySelector("#exportDialog").open);
      document.querySelector("#exportDialog").close("close");

      document.querySelector("#app").classList.remove("focus-mode");
      click('[data-command="settings"]');
      pass("settings dialog", document.querySelector("#settingsDialog").open);
      document.querySelector("#settingsDialog").close("close");

      return checks;
    })();
  `);

  result.forEach((item) => assert(item.condition, item.name));

  win.setSize(760, 700);
  const narrowResult = await win.webContents.executeJavaScript(`
    (() => {
      const editor = document.querySelector("#editor");
      const title = document.querySelector("#titleInput");
      return {
        editorFits: editor.getBoundingClientRect().width <= window.innerWidth,
        titleFits: title.getBoundingClientRect().right <= window.innerWidth
      };
    })();
  `);

  assert(narrowResult.editorFits, "narrow editor fits");
  assert(narrowResult.titleFits, "narrow title fits");

  await win.close();
  app.quit();
}

app.whenReady().then(run).catch((error) => {
  console.error(error);
  app.exit(1);
});
