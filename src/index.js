// index.js
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let store; // We'll assign this after dynamic import

// Function to dynamically import modules and initialize the app
(async () => {
  // Dynamically import 'electron-store'
  const { default: Store } = await import('electron-store');
  store = new Store();

  // Dynamically import 'node-fetch' and 'metascraper' modules
  const { default: fetch } = await import('node-fetch');
  const metascraper = (await import('metascraper')).default;
  const metascraperUrl = (await import('metascraper-url')).default;
  const metascraperTitle = (await import('metascraper-title')).default;
  const metascraperYoutube = (await import('metascraper-youtube')).default;
  const metascraperTwitter = (await import('metascraper-twitter')).default;
  const metascraperInstagram = (await import('metascraper-instagram')).default;
  // Removed metascraper-facebook as it's no longer available

  // Initialize metascraper with plugins
  const metascraperInstance = metascraper([
    metascraperUrl(),
    metascraperTitle(),
    metascraperYoutube(),
    metascraperTwitter(),
    metascraperInstagram(),
    // Add more metascraper modules as needed
  ]);

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
            const filePath = path.join(directoryPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const stats = fs.statSync(filePath);
            notes.push({
              id: index + 1,
              title: path.basename(file, ext),
              content: content,
              extension: ext,
              modifiedTime: stats.mtime,
            });
          }
        });

        // Sort the notes by modified time, newest first
        notes.sort((a, b) => b.modifiedTime - a.modifiedTime);

        // Reassign IDs after sorting
        notes.forEach((note, index) => {
          note.id = index + 1;
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

    // Save a new note to file
    ipcMain.handle('save-new-note-to-file', async (event, directoryPath, note) => {
      console.log('IPC: save-new-note-to-file called with note:', note);
      try {
        const filePath = path.join(directoryPath, note.title + note.extension);

        // Check if a file with the same name already exists
        if (fs.existsSync(filePath)) {
          console.error('File already exists:', filePath);
          return false;
        }

        fs.writeFileSync(filePath, note.content, 'utf8');
        console.log('New note saved to file:', filePath);
        return true;
      } catch (error) {
        console.error('Error saving new note:', error);
        return false;
      }
    });

    // Delete a note file
    ipcMain.handle('delete-note-file', async (event, directoryPath, note) => {
      console.log('IPC: delete-note-file called with note:', note);
      try {
        const filePath = path.join(directoryPath, note.title + note.extension);
        fs.unlinkSync(filePath);
        console.log('Note deleted from file system:', filePath);
        return true;
      } catch (error) {
        console.error('Error deleting note:', error);
        return false;
      }
    });

    // Open external link
    ipcMain.handle('open-external-link', async (event, url) => {
      console.log('IPC: open-external-link called with URL:', url);
      shell.openExternal(url);
    });

    // Fetch metadata for a URL
    ipcMain.handle('fetch-url-metadata', async (event, url) => {
      console.log('IPC: fetch-url-metadata called with URL:', url);
      try {
        const response = await fetch(url);
        const html = await response.text();
        const metadata = await metascraperInstance({ html, url });

        console.log('Metadata fetched:', metadata);

        if (metadata.title) {
          return { title: metadata.title };
        } else {
          return { title: null };
        }
      } catch (error) {
        console.error('Error fetching metadata:', error);
        return { title: null };
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
