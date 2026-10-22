from pathlib import Path
import json

from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import GPT2LMHeadModel, GPT2Tokenizer

app = Flask(__name__)
CORS(app)  # Allows the browser frontend to call this local Flask API.

NOTES_FILE = Path(__file__).with_name("notes.json")
MODEL_NAME = "gpt2"

# Load GPT-2 and its tokenizer once when the server starts.
tokenizer = GPT2Tokenizer.from_pretrained(MODEL_NAME)
model = GPT2LMHeadModel.from_pretrained(MODEL_NAME)


def read_notes():
    if not NOTES_FILE.exists():
        return []
    try:
        return json.loads(NOTES_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def write_notes(notes):
    NOTES_FILE.write_text(json.dumps(notes, indent=2), encoding="utf-8")


@app.get("/fetch_notes")
def fetch_notes():
    return jsonify(read_notes())


@app.post("/save_note")
def save_note():
    data = request.get_json(silent=True) or {}
    if "id" not in data or not data.get("title"):
        return jsonify({"error": "A note id and title are required."}), 400

    notes = read_notes()
    updated = False
    for index, note in enumerate(notes):
        if note.get("id") == data["id"]:
            notes[index] = {
                "id": data["id"],
                "title": data["title"],
                "content": data.get("content", "")
            }
            updated = True
            break

    if not updated:
        notes.append({
            "id": data["id"],
            "title": data["title"],
            "content": data.get("content", "")
        })

    write_notes(notes)
    return jsonify({"message": "Note saved successfully."})


@app.delete("/delete_note/<int:note_id>")
def delete_note(note_id):
    notes = read_notes()
    remaining = [note for note in notes if note.get("id") != note_id]
    if len(remaining) == len(notes):
        return jsonify({"error": "Note not found."}), 404
    write_notes(remaining)
    return jsonify({"message": "Note deleted successfully."})


@app.post("/generate")
def generate():
    data = request.get_json(silent=True) or {}
    prompt = data.get("prompt", "").strip()
    if not prompt:
        return jsonify({"error": "Prompt is required."}), 400

    inputs = tokenizer.encode(prompt, return_tensors="pt")
    outputs = model.generate(
        inputs,
        max_length=min(inputs.shape[1] + 100, 1024),
        num_return_sequences=1,
        pad_token_id=tokenizer.eos_token_id
    )
    generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return jsonify({"response": generated_text})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
