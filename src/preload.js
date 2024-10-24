// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectoryDialog: () => ipcRenderer.invoke('open-directory-dialog'),
  getNotesDirectory: () => ipcRenderer.invoke('get-notes-directory'),
  readNotesDirectory: (directoryPath) => ipcRenderer.invoke('read-notes-directory', directoryPath),
  saveNoteToFile: (directoryPath, note) => ipcRenderer.invoke('save-note-to-file', directoryPath, note),
});
