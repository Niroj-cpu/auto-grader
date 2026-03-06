import os
import io
import requests
import pdfplumber
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # 32 MB upload limit

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


def extract_text(filename: str, file_bytes: bytes) -> str:
    """Return plain text from a file, handling PDFs specially."""
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pdf":
        text_parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for i, page in enumerate(pdf.pages, 1):
                page_text = page.extract_text() or ""
                if page_text.strip():
                    text_parts.append(f"[Page {i}]\n{page_text}")
        result = "\n\n".join(text_parts)
        if not result.strip():
            raise ValueError(
                f"Could not extract any text from PDF '{filename}'. "
                "It may be a scanned image-only PDF."
            )
        return result

    # Plain text fallback — try common encodings
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            return file_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Could not decode '{filename}' as text.")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/grade", methods=["POST"])
def grade():
    # Files arrive as multipart/form-data
    api_key = request.form.get("api_key", "").strip()
    if not api_key:
        return jsonify({"error": "No API key provided."}), 400

    # --- Rubric ---
    rubric_file = request.files.get("rubric")
    if not rubric_file:
        return jsonify({"error": "No rubric file provided."}), 400
    try:
        rubric_text = extract_text(rubric_file.filename, rubric_file.read())
    except ValueError as e:
        return jsonify({"error": str(e)}), 422

    # --- Student work files ---
    work_uploads = request.files.getlist("work_files")
    if not work_uploads:
        return jsonify({"error": "No student work files provided."}), 400

    work_blocks = []
    for f in work_uploads:
        try:
            content = extract_text(f.filename, f.read())
            work_blocks.append(f"=== FILE: {f.filename} ===\n{content}")
        except ValueError as e:
            return jsonify({"error": str(e)}), 422

    work_block = "\n\n".join(work_blocks)

    # --- Build prompt ---
    prompt = f"""You are an expert autograder. Grade the student's work based on the rubric provided.

RUBRIC:
{rubric_text}

STUDENT WORK:
{work_block}

Respond ONLY with a JSON object in this exact format (no markdown, no backticks):
{{
  "score": <number 0-100>,
  "letter": "<A/B/C/D/F>",
  "criteria": [
    {{
      "name": "<criterion name>",
      "points_earned": <number>,
      "points_possible": <number>,
      "status": "<pass|partial|fail>",
      "feedback": "<specific feedback>"
    }}
  ],
  "strengths": "<paragraph about what the student did well>",
  "improvements": "<paragraph about what needs work>",
  "summary": "<overall 2-3 sentence summary>"
}}"""

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }

    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 1500,
        "messages": [{"role": "user", "content": prompt}],
    }

    try:
        resp = requests.post(ANTHROPIC_API_URL, json=payload,
                             headers=headers, timeout=60)
        resp.raise_for_status()
        result = resp.json()
        text = "".join(
            block.get("text", "") for block in result.get("content", [])
        )
        return jsonify({"result": text})
    except requests.exceptions.HTTPError as e:
        return jsonify({
            "error": f"Anthropic API error: {e.response.status_code} — {e.response.text}"
        }), 502
    except requests.exceptions.Timeout:
        return jsonify({"error": "Request to Anthropic timed out."}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
