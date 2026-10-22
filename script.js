const API_BASE = "http://localhost:5000";

let notes = [];
let selectedNoteId = null;

document.addEventListener("DOMContentLoaded", () => {
  fetchNotes();
});

function renderNotes() {
  const noteList = document.getElementById("note-list");
  noteList.replaceChildren();

  notes.forEach((note) => {
    const box = document.createElement("div");
    box.className = "note-box";
    if (note.id === selectedNoteId) box.classList.add("selected");
    box.textContent = note.title || "Untitled note";
    box.addEventListener("click", () => loadNote(note.id));
    noteList.appendChild(box);
  });
}

function loadNote(noteId) {
  const note = notes.find((item) => item.id === noteId);
  if (!note) return;

  selectedNoteId = noteId;
  document.getElementById("note-title").value = note.title || "";
  document.getElementById("note-content").value = note.content || "";
  renderNotes();
}

async function saveNote() {
  const title = document.getElementById("note-title").value.trim();
  const content = document.getElementById("note-content").value;

  if (!title) {
    alert("Please enter a note title.");
    return;
  }

  let note;
  if (selectedNoteId !== null) {
    note = notes.find((item) => item.id === selectedNoteId);
    if (!note) {
      alert("Selected note was not found.");
      return;
    }
    note.title = title;
    note.content = content;
  } else {
    note = {
      id: notes.length ? Math.max(...notes.map((item) => item.id)) + 1 : 1,
      title,
      content
    };
    notes.push(note);
    selectedNoteId = note.id;
  }

  try {
    const response = await fetch(`${API_BASE}/save_note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note)
    });
    if (!response.ok) throw new Error("Could not save note on server.");
    renderNotes();
    alert("Note saved!");
  } catch (error) {
    console.error(error);
    alert("Could not connect to the server. Make sure app.py is running.");
  }
}

function addNewNote() {
  selectedNoteId = null;
  document.getElementById("note-title").value = "";
  document.getElementById("note-content").value = "";
  renderNotes();
  document.getElementById("note-title").focus();
}

async function deleteCurrentNote() {
  if (selectedNoteId === null) {
    alert("Please select a note to delete.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/delete_note/${selectedNoteId}`, {
      method: "DELETE"
    });
    if (!response.ok) throw new Error("Could not delete note.");
    notes = notes.filter((note) => note.id !== selectedNoteId);
    selectedNoteId = null;
    document.getElementById("note-title").value = "";
    document.getElementById("note-content").value = "";
    renderNotes();
    alert("Note deleted!");
  } catch (error) {
    console.error(error);
    alert("Could not delete note. Make sure the server is running.");
  }
}

async function fetchNotes() {
  try {
    const response = await fetch(`${API_BASE}/fetch_notes`);
    if (!response.ok) throw new Error("Could not fetch notes.");
    notes = await response.json();
    renderNotes();
    if (notes.length) loadNote(notes[0].id);
  } catch (error) {
    console.error(error);
    // The editor remains usable, but server-backed notes need app.py running.
  }
}

function openModal() {
  document.getElementById("gpt2-modal").style.display = "block";
}

function closeModal() {
  document.getElementById("gpt2-modal").style.display = "none";
}

window.addEventListener("click", (event) => {
  const modal = document.getElementById("gpt2-modal");
  if (event.target === modal) closeModal();
});

async function generateText() {
  const prompt = document.getElementById("gpt2-input").value.trim();
  const output = document.getElementById("gpt2-output");
  if (!prompt) {
    output.textContent = "Please enter a prompt.";
    return;
  }

  output.textContent = "Generating...";
  try {
    const response = await fetch(`${API_BASE}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Text generation failed.");
    output.textContent = data.response;
  } catch (error) {
    console.error(error);
    output.textContent = "Error generating text. Make sure app.py is running.";
  }
}
