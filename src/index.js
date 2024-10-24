// index.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let store; // We'll assign this after dynamic import

// Function to dynamically import 'electron-store' and initialize the app
(async () => {
  // Dynamically import 'electron-store'
  const { default: Store } = await import('electron-store');
  store = new Store();

  const createWindow = () => {
    const mainWindow = new BrowserWindow({
      width: 1024,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Open the DevTools (optional).
    // mainWindow.webContents.openDevTools();
  };

  // This method will be called when Electron has finished initialization.
  app.whenReady().then(() => {
    createWindow();

    // IPC Handlers

    // Open directory dialog and save selected directory
    ipcMain.handle('open-directory-dialog', async () => {
      console.log('IPC: open-directory-dialog called');
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      });

      if (canceled) {
        console.log('Directory selection canceled.');
        return null;
      } else {
        const selectedDirectory = filePaths[0];
        console.log('Directory selected:', selectedDirectory);
        store.set('notesDirectory', selectedDirectory);
        return selectedDirectory;
      }
    });

    // Get the stored notes directory
    ipcMain.handle('get-notes-directory', async () => {
      console.log('IPC: get-notes-directory called');
      return store.get('notesDirectory', null);
    });

    // Read notes from the selected directory
    ipcMain.handle('read-notes-directory', async (event, directoryPath) => {
      console.log('IPC: read-notes-directory called with path:', directoryPath);
      try {
        const files = fs.readdirSync(directoryPath);
        const notes = [];

        files.forEach((file, index) => {
          const ext = path.extname(file);
          if (ext === '.txt') {
            const content = fs.readFileSync(path.join(directoryPath, file), 'utf8');
            notes.push({
              id: index + 1,
              title: path.basename(file, ext),
              content: content,
              extension: ext, // Store the file extension
            });
          }
        });

        console.log('Notes read from directory:', notes);
        return notes;
      } catch (error) {
        console.error('Error reading notes directory:', error);
        return [];
      }
    });

    // Save the current note to file
    ipcMain.handle('save-note-to-file', async (event, directoryPath, note) => {
      console.log('IPC: save-note-to-file called with note:', note);
      try {
        const filePath = path.join(directoryPath, note.title + note.extension);
        fs.writeFileSync(filePath, note.content, 'utf8');
        console.log('Note saved to file:', filePath);
        return true;
      } catch (error) {
        console.error('Error saving note:', error);
        return false;
      }
    });

    // Re-create a window in the app when the dock icon is clicked (macOS).
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  // Quit when all windows are closed (except on macOS).
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
})().catch((err) => {
  console.error('Failed to initialize application:', err);
  app.quit();
});
