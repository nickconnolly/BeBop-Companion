// renderer.js

// Variables
let notes = [];
let notesDirectory = '';
let currentNoteId = null; // Keep track of the current note being edited
let editor; // Reference to the contenteditable div
let isNewNote = false; // Flag to indicate if the note is new
let linkPopup; // Reference to the link popup
let hoveredLink = null; // Currently hovered link element
let isMouseOverLink = false; // Flag to track mouse over link
let isMouseOverPopup = false; // Flag to track mouse over popup

// Initialize the editor
function initializeEditor() {
  editor = document.getElementById('editor');

  // Handle keydown events for auto-linking and '--' processing
  editor.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      // Wait for the input event to finish
      setTimeout(() => {
        linkifyLastWord();
      }, 0);
    }
  });

  // Handle mouseover on links to show the popup
  editor.addEventListener('mouseover', (event) => {
    const target = event.target;
    if (target.tagName === 'A') {
      isMouseOverLink = true;
      hoveredLink = target;
      showLinkPopup(target); // Pass the link element
    }
  });

  // Handle mouseout to hide the popup
  editor.addEventListener('mouseout', (event) => {
    if (event.target.tagName === 'A') {
      isMouseOverLink = false;

      setTimeout(() => {
        if (!isMouseOverLink && !isMouseOverPopup) {
          hideLinkPopup();
          hoveredLink = null;
        }
      }, 50); // Small delay to allow event propagation
    }
  });

  // Create the link popup element
  createLinkPopup();
}

// Function to create the link popup
function createLinkPopup() {
  linkPopup = document.createElement('div');
  linkPopup.id = 'link-popup';
  linkPopup.textContent = 'Open Link';
  linkPopup.style.position = 'absolute';
  linkPopup.style.padding = '5px 10px';
  linkPopup.style.backgroundColor = '#333';
  linkPopup.style.color = '#fff';
  linkPopup.style.borderRadius = '5px';
  linkPopup.style.cursor = 'pointer';
  linkPopup.style.display = 'none';
  linkPopup.style.zIndex = '1000';
  linkPopup.style.textAlign = 'center'; // Center the text
  document.body.appendChild(linkPopup);

  // Handle mouseover on the popup to prevent it from hiding
  linkPopup.addEventListener('mouseover', () => {
    isMouseOverPopup = true;
  });

  // Handle mouseout from the popup to hide it
  linkPopup.addEventListener('mouseout', () => {
    isMouseOverPopup = false;
    setTimeout(() => {
      if (!isMouseOverLink && !isMouseOverPopup) {
        hideLinkPopup();
        hoveredLink = null;
      }
    }, 50); // Small delay to allow event propagation
  });

  // Handle click on the popup
  linkPopup.addEventListener('click', () => {
    if (hoveredLink) {
      const url = hoveredLink.getAttribute('href');
      window.electronAPI.openExternalLink(url);
      hideLinkPopup();
    }
  });
}

// Function to show the link popup
function showLinkPopup(linkElement) {
  positionLinkPopup(linkElement);
  linkPopup.style.display = 'block';
}

// Function to position the popup with the same width as the link
function positionLinkPopup(linkElement) {
  const rects = linkElement.getClientRects();
  if (rects.length === 0) return;

  // Calculate the total bounding rectangle
  let top = rects[0].top;
  let bottom = rects[0].bottom;
  let left = rects[0].left;
  let right = rects[0].right;

  for (let i = 1; i < rects.length; i++) {
    const rect = rects[i];
    top = Math.min(top, rect.top);
    bottom = Math.max(bottom, rect.bottom);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
  }

  // Adjust for scrolling
  const popupX = left + window.scrollX;
  const popupY = bottom + window.scrollY + 5; // Slight offset below the link

  // Set the width to match the link's total width
  const linkWidth = right - left;

  linkPopup.style.left = `${popupX}px`;
  linkPopup.style.top = `${popupY}px`;
  linkPopup.style.width = `${linkWidth}px`;
}

// Function to hide the link popup
function hideLinkPopup() {
  linkPopup.style.display = 'none';
  linkPopup.style.width = ''; // Reset the width
}

// Function to parse the content and convert links, emails, and handle '--'
function parseContent() {
  // Save the current selection
  const selection = window.getSelection();
  const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  // Create a TreeWalker to traverse text nodes
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);

  let node;
  while ((node = walker.nextNode())) {
    // Skip if the parent is an <a> or has class 'dash'
    if (node.parentNode && (node.parentNode.tagName === 'A' || node.parentNode.classList.contains('dash'))) {
      continue;
    }

    let text = node.nodeValue;

    // Regular expression for URLs
    const urlRegex = /(\b(https?|ftp|file):\/\/[^\s<]+)/gi;

    // Regular expression for email addresses
    const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

    // Regular expression for '--'
    const dashRegex = /--/g;

    // Check if the text contains '--', a URL, or email
    if (dashRegex.test(text) || urlRegex.test(text) || emailRegex.test(text)) {
      // Create a temporary div to hold the new HTML
      const tempDiv = document.createElement('div');

      // Replace '--' with two line breaks and '--' wrapped in a span
      let newHTML = text.replace(dashRegex, '<br><br><span class="dash">--</span>');

      // Replace URLs and emails with anchor tags
      newHTML = newHTML
        .replace(urlRegex, '<a href="$1" class="external-link">$1</a>')
        .replace(emailRegex, '<a href="mailto:$&" class="external-link">$&</a>');

      tempDiv.innerHTML = newHTML;

      // Replace the text node with the new nodes
      while (tempDiv.firstChild) {
        node.parentNode.insertBefore(tempDiv.firstChild, node);
      }
      node.parentNode.removeChild(node);
    }
  }

  // Restore the selection
  if (range) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

// Function to linkify the last word typed
function linkifyLastWord() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);

  let node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) {
    return;
  }

  const text = node.textContent;
  const lastSpaceIndex = text.lastIndexOf(' ');
  const lastWord = text.substring(lastSpaceIndex + 1);

  const urlRegex = /(\b(https?|ftp|file):\/\/[^\s<]+)/gi;
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  const dashRegex = /--/g;

  if (dashRegex.test(lastWord) || urlRegex.test(lastWord) || emailRegex.test(lastWord)) {
    const beforeText = text.substring(0, lastSpaceIndex + 1);
    const afterText = text.substring(lastSpaceIndex + 1);

    // Create a temporary div to hold the new HTML
    const tempDiv = document.createElement('div');

    // Replace '--' with two line breaks and '--' wrapped in a span
    let newHTML = afterText.replace(dashRegex, '<br><br><span class="dash">--</span>');

    // Replace URLs and emails with anchor tags
    newHTML = newHTML
      .replace(urlRegex, '<a href="$1" class="external-link">$1</a>')
      .replace(emailRegex, '<a href="mailto:$&" class="external-link">$&</a>');

    tempDiv.innerHTML = newHTML;

    // Replace the text node with the new nodes
    const beforeNode = document.createTextNode(beforeText);
    node.parentNode.insertBefore(beforeNode, node);

    while (tempDiv.firstChild) {
      node.parentNode.insertBefore(tempDiv.firstChild, node);
    }

    node.parentNode.removeChild(node);

    // Move the cursor to the end
    const newRange = document.createRange();
    newRange.setStartAfter(beforeNode.nextSibling || beforeNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
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

// Create a new note
function newNote() {
  console.log('Creating a new note...');
  currentNoteId = null; // Deselect any current note
  isNewNote = true; // Set the flag to indicate a new note
  editor.innerHTML = ''; // Clear the editor

  // Remove 'active' class from all list items
  document.querySelectorAll('#note-list li').forEach((item) => item.classList.remove('active'));
}

// Load notes from the selected directory
function loadNotesFromDirectory() {
  console.log('Loading notes from directory:', notesDirectory);
  window.electronAPI
    .readNotesDirectory(notesDirectory)
    .then((loadedNotes) => {
      console.log('Notes loaded:', loadedNotes);
      notes = loadedNotes;
      loadNotes();
    })
    .catch((error) => {
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
    // Display title and formatted modified date
    li.textContent = `${note.title} (${formatDate(note.modifiedTime)})`;
    li.onclick = () => {
      openNote(note.id);
      // Remove 'active' class from all list items
      document.querySelectorAll('#note-list li').forEach((item) => item.classList.remove('active'));
      // Add 'active' class to the clicked item
      li.classList.add('active');
    };
    // If this note is the current note, add 'active' class
    if (note.id === currentNoteId) {
      li.classList.add('active');
    }
    noteList.appendChild(li);
  });
  console.log('Notes displayed in sidebar.');
}

// Helper function to format the date
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleString();
}

// Open a note in the editor
function openNote(id) {
  const note = notes.find((n) => n.id === id);
  currentNoteId = id;
  isNewNote = false; // Reset the new note flag

  // Set the editor content
  editor.innerHTML = note.content;

  // Parse content to handle links, emails, and '--'
  parseContent();
}

// Save the current note
function saveNote() {
  if (isNewNote) {
    // Save as a new note
    const noteTitle = prompt('Enter a title for your new note:');
    if (noteTitle) {
      const newNote = {
        id: notes.length + 1, // Temporary ID, will be reset after loading notes
        title: noteTitle,
        content: editor.innerHTML,
        extension: '.txt',
        modifiedTime: new Date(),
      };

      // Save the note to the file system
      window.electronAPI.saveNewNoteToFile(notesDirectory, newNote).then((success) => {
        if (success) {
          alert('New note saved successfully!');
          isNewNote = false;
          currentNoteId = null;
          // Reload notes to update the list and IDs
          loadNotesFromDirectory();
        } else {
          alert('Failed to save new note.');
        }
      });
    } else {
      alert('Note title cannot be empty.');
    }
  } else if (currentNoteId !== null) {
    // Save existing note
    const note = notes.find((n) => n.id === currentNoteId);

    // Get content from the editor
    const newContent = editor.innerHTML;

    // Update the note content
    note.content = newContent;

    // Save the note back to the file
    window.electronAPI.saveNoteToFile(notesDirectory, note).then((success) => {
      if (success) {
        alert('Note saved successfully!');
        // Update the modified time and reload notes
        loadNotesFromDirectory();
      } else {
        alert('Failed to save note.');
      }
    });
  } else {
    alert('No note selected or new note created.');
  }
}

// Delete the current note
function deleteNote() {
  if (currentNoteId !== null) {
    const note = notes.find((n) => n.id === currentNoteId);
    if (confirm(`Are you sure you want to delete this note? This action cannot be undone.`)) {
      // Remove the note from the array
      notes = notes.filter((n) => n.id !== currentNoteId);

      // Delete the file
      window.electronAPI.deleteNoteFile(notesDirectory, note).then((success) => {
        if (success) {
          alert('Note deleted successfully!');
          currentNoteId = null;
          editor.innerHTML = '';
          loadNotesFromDirectory();
        } else {
          alert('Failed to delete note.');
        }
      });
    }
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
  window.electronAPI
    .getNotesDirectory()
    .then((storedDirectory) => {
      if (storedDirectory) {
        notesDirectory = storedDirectory;
        console.log('Stored directory found:', notesDirectory);
        loadNotesFromDirectory();
      } else {
        console.log('No stored directory found. Prompting user to select one.');
        // Prompt the user to select a directory
        openSettings();
      }
    })
    .catch((error) => {
      console.error('Error getting stored directory:', error);
    });
};
