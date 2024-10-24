// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectoryDialog: () => ipcRenderer.invoke('open-directory-dialog'),
  getNotesDirectory: () => ipcRenderer.invoke('get-notes-directory'),
  readNotesDirectory: (directoryPath) => ipcRenderer.invoke('read-notes-directory', directoryPath),
  saveNoteToFile: (directoryPath, note) => ipcRenderer.invoke('save-note-to-file', directoryPath, note),
  saveNewNoteToFile: (directoryPath, note) => ipcRenderer.invoke('save-new-note-to-file', directoryPath, note),
  deleteNoteFile: (directoryPath, note) => ipcRenderer.invoke('delete-note-file', directoryPath, note),
  openExternalLink: (url) => ipcRenderer.invoke('open-external-link', url),
});
