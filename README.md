# AutoGrader

AI-powered assignment grader. Upload a rubric + student work, get instant structured feedback via Claude.

## File Structure

```
autograder/
├── app.py                  ← Flask backend / API proxy
├── requirements.txt        ← Python dependencies
├── Procfile                ← Render.com start command
├── templates/
│   └── index.html          ← Main HTML page
└── static/
    ├── css/
    │   └── style.css       ← All styles
    └── js/
        └── main.js         ← All frontend logic
```

## Local Development

```bash
pip install -r requirements.txt
python app.py
# Visit http://localhost:5000
```

## Deploy to Render.com

1. Push this repo to GitHub
2. Go to https://render.com → **New → Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`
5. Click **Deploy**

## Usage

1. Enter your [Anthropic API key](https://console.anthropic.com/) (never stored)
2. Upload your rubric file (.txt, .md, etc.)
3. Upload student work (one or more files)
4. Click **Grade Submission**

## Tips for Best Results

- Write rubrics with **named criteria and point values**
  - Example: `Correctness – 40pts: Code produces correct output for all test cases`
- Supports any plain-text file format: `.py`, `.js`, `.java`, `.txt`, `.md`, `.html`, `.css`, `.json`
