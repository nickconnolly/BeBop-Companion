// renderer.js

// Variables
let notes = [];
let notesDirectory = ''; // Ensure this is declared before use
let currentNoteId = null; // Keep track of the current note being edited
let editor; // Reference to the textarea element

// Initialize the editor
function initializeEditor() {
  editor = document.getElementById('editor');

  // Handle changes in the editor
  editor.addEventListener('input', () => {
    // You can handle autosave or other actions here
  });
}

// Open the settings dialog to select a directory
async function openSettings() {
  console.log('Opening settings dialog...');
  const selectedDirectory = await window.electronAPI.openDirectoryDialog();
  if (selectedDirectory) {
    notesDirectory = selectedDirectory;
    console.log('Selected directory:', notesDirectory);
    loadNotesFromDirectory();
  } else {
    console.log('No directory selected.');
  }
}

// Load notes from the selected directory
function loadNotesFromDirectory() {
  console.log('Loading notes from directory:', notesDirectory);
  window.electronAPI.readNotesDirectory(notesDirectory).then((loadedNotes) => {
    console.log('Notes loaded:', loadedNotes);
    notes = loadedNotes;
    loadNotes();
  }).catch((error) => {
    console.error('Error loading notes:', error);
  });
}

// Load notes into the sidebar
function loadNotes() {
  console.log('Loading notes into sidebar...');
  const noteList = document.getElementById('note-list');
  noteList.innerHTML = ''; // Clear existing notes

  notes.forEach((note) => {
    const li = document.createElement('li');
    li.textContent = note.title;
    li.onclick = () => openNote(note.id);
    noteList.appendChild(li);
  });
  console.log('Notes displayed in sidebar.');
}

// Open a note in the editor
function openNote(id) {
  const note = notes.find((n) => n.id === id);
  currentNoteId = id;

  // Set the editor content
  editor.value = note.content;
}

// Save the current note
function saveNote() {
  if (currentNoteId !== null) {
    const note = notes.find((n) => n.id === currentNoteId);

    // Get content from the editor
    const newContent = editor.value;

    // Update the note content
    note.content = newContent;

    // Save the note back to the file
    window.electronAPI.saveNoteToFile(notesDirectory, note).then((success) => {
      if (success) {
        alert('Note saved successfully!');
      } else {
        alert('Failed to save note.');
      }
    });
  } else {
    alert('No note selected.');
  }
}

// Initialize the app
window.onload = () => {
  console.log('Window loaded.');

  // Initialize the editor
  initializeEditor();

  // Check if a notes directory is already stored
  console.log('Checking for stored notes directory...');
  window.electronAPI.getNotesDirectory().then((storedDirectory) => {
    if (storedDirectory) {
      notesDirectory = storedDirectory;
      console.log('Stored directory found:', notesDirectory);
      loadNotesFromDirectory();
    } else {
      console.log('No stored directory found. Prompting user to select one.');
      // Prompt the user to select a directory
      openSettings();
    }
  }).catch((error) => {
    console.error('Error getting stored directory:', error);
  });
};
