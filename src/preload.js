const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("typewriterDesktop", {
  onMenuCommand(callback) {
    ipcRenderer.on("menu-command", (_, command) => callback(command));
  }
});
