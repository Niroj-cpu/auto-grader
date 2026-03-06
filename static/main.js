/* ── State ── */
let rubricFile = null;
let workFiles  = [];

/* ── DOM refs ── */
const apiKeyInput   = document.getElementById("apiKey");
const rubricInput   = document.getElementById("rubricInput");
const rubricZone    = document.getElementById("rubricZone");
const rubricHint    = document.getElementById("rubricHint");
const rubricPill    = document.getElementById("rubricPill");
const rubricName    = document.getElementById("rubricName");
const rubricRemove  = document.getElementById("rubricRemove");

const workZone      = document.getElementById("workZone");
const workInput     = document.getElementById("workInput");
const workEmpty     = document.getElementById("workEmpty");
const workList      = document.getElementById("workList");
const addMoreBtn    = document.getElementById("addMoreBtn");
const addMoreInput  = document.getElementById("addMoreInput");

const gradeBtn      = document.getElementById("gradeBtn");
const statusBar     = document.getElementById("statusBar");
const statusDot     = document.getElementById("statusDot");
const statusText    = document.getElementById("statusText");
const errorBox      = document.getElementById("errorBox");
const loadingBox    = document.getElementById("loadingBox");
const resultsBox    = document.getElementById("resultsBox");

/* ── Helpers ── */
function readAsText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = e => res(e.target.result);
    r.onerror = rej;
    r.readAsText(file);
  });
}

function updateGradeBtn() {
  gradeBtn.disabled = !(rubricFile && workFiles.length > 0);
}

function setStatus(type, message) {
  /* type: 'active' | 'done' | 'error' | 'hidden' */
  if (type === "hidden") {
    statusBar.classList.add("hidden");
    return;
  }
  statusBar.classList.remove("hidden");
  statusDot.className = "dot " + type;
  statusText.textContent = message;
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.classList.add("hidden");
}

/* ── Rubric handling ── */
function setRubric(file) {
  rubricFile = file;
  rubricName.textContent = file.name;
  rubricHint.classList.add("hidden");
  rubricPill.classList.remove("hidden");
  updateGradeBtn();
}

function clearRubric() {
  rubricFile = null;
  rubricHint.classList.remove("hidden");
  rubricPill.classList.add("hidden");
  rubricInput.value = "";
  updateGradeBtn();
}

rubricInput.addEventListener("change", e => {
  if (e.target.files[0]) setRubric(e.target.files[0]);
});

rubricRemove.addEventListener("click", e => {
  e.stopPropagation();
  clearRubric();
});

/* ── Drag & drop — rubric ── */
rubricZone.addEventListener("dragover",  e => { e.preventDefault(); rubricZone.classList.add("drag"); });
rubricZone.addEventListener("dragleave", () => rubricZone.classList.remove("drag"));
rubricZone.addEventListener("drop", e => {
  e.preventDefault();
  rubricZone.classList.remove("drag");
  const f = e.dataTransfer.files[0];
  if (f) setRubric(f);
});

/* ── Work files handling ── */
function renderWorkList() {
  workList.innerHTML = "";
  workFiles.forEach(f => {
    const pill = document.createElement("div");
    pill.className = "file-pill";
    pill.innerHTML = `<span>${f.name}</span><button data-name="${f.name}">✕</button>`;
    workList.appendChild(pill);
  });

  if (workFiles.length > 0) {
    workEmpty.classList.add("hidden");
    workList.classList.remove("hidden");
    addMoreBtn.classList.remove("hidden");
    /* stop the zone from triggering the hidden file input */
    workZone.style.cursor = "default";
    workInput.style.pointerEvents = "none";
  } else {
    workEmpty.classList.remove("hidden");
    workList.classList.add("hidden");
    addMoreBtn.classList.add("hidden");
    workZone.style.cursor = "pointer";
    workInput.style.pointerEvents = "auto";
  }
  updateGradeBtn();
}

function addWorkFiles(files) {
  for (const f of files) {
    if (!workFiles.find(x => x.name === f.name)) workFiles.push(f);
  }
  renderWorkList();
}

function removeWorkFile(name) {
  workFiles = workFiles.filter(f => f.name !== name);
  renderWorkList();
}

workList.addEventListener("click", e => {
  const btn = e.target.closest("button[data-name]");
  if (btn) removeWorkFile(btn.dataset.name);
});

workInput.addEventListener("change",   e => addWorkFiles(e.target.files));
addMoreInput.addEventListener("change", e => addWorkFiles(e.target.files));

/* ── Drag & drop — work ── */
workZone.addEventListener("dragover",  e => { e.preventDefault(); workZone.classList.add("drag"); });
workZone.addEventListener("dragleave", () => workZone.classList.remove("drag"));
workZone.addEventListener("drop", e => {
  e.preventDefault();
  workZone.classList.remove("drag");
  addWorkFiles(e.dataTransfer.files);
});

/* ── Score colour ── */
function scoreColor(score) {
  if (score >= 80) return "#44ff88";
  if (score >= 60) return "#E8FF47";
  return "#ff6644";
}

/* ── Render results ── */
function renderResults(data) {
  /* score */
  const scoreEl = document.getElementById("scoreDisplay");
  scoreEl.textContent = data.score + "/100";
  scoreEl.style.color = scoreColor(data.score);

  document.getElementById("letterGrade").textContent = data.letter || "";

  /* criteria */
  const criteriaList = document.getElementById("criteriaList");
  criteriaList.innerHTML = "";
  if (Array.isArray(data.criteria) && data.criteria.length) {
    document.getElementById("criteriaSection").classList.remove("hidden");
    data.criteria.forEach(c => {
      const statusClass =
        c.status === "pass"    ? "status-pass"
        : c.status === "partial" ? "status-partial"
        : "status-fail";

      const row = document.createElement("div");
      row.className = "criteria-row";
      row.innerHTML = `
        <div class="criteria-score ${statusClass}">${c.points_earned}/${c.points_possible}</div>
        <div>
          <div class="criteria-name">${c.name}</div>
          <div class="criteria-feedback">${c.feedback}</div>
        </div>`;
      criteriaList.appendChild(row);
    });
  } else {
    document.getElementById("criteriaSection").classList.add("hidden");
  }

  /* text sections */
  const sections = [
    ["strengthsText",    "strengthsSection",    data.strengths],
    ["improvementsText", "improvementsSection",  data.improvements],
    ["summaryText",      "summarySection",       data.summary],
  ];
  sections.forEach(([textId, sectionId, content]) => {
    if (content) {
      document.getElementById(textId).textContent = content;
      document.getElementById(sectionId).classList.remove("hidden");
    } else {
      document.getElementById(sectionId).classList.add("hidden");
    }
  });

  loadingBox.classList.add("hidden");
  resultsBox.classList.remove("hidden");
}

/* ── Grade ── */
gradeBtn.addEventListener("click", async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) { showError("Please enter your Anthropic API key."); return; }

  hideError();
  gradeBtn.disabled = true;
  loadingBox.classList.remove("hidden");
  resultsBox.classList.add("hidden");
  setStatus("active", "Analyzing submission...");

  try {
    /* Send as multipart/form-data so the backend receives raw bytes
       and can extract text from PDFs server-side with pdfplumber.    */
    const form = new FormData();
    form.append("api_key", apiKey);
    form.append("rubric", rubricFile, rubricFile.name);
    workFiles.forEach(f => form.append("work_files", f, f.name));

    const resp = await fetch("/grade", { method: "POST", body: form });
    const json = await resp.json();

    if (!resp.ok || json.error) {
      throw new Error(json.error || `Server error ${resp.status}`);
    }

    /* strip possible markdown fences */
    const raw    = json.result.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);

    setStatus("done", `Graded ${workFiles.length} file(s) against rubric`);
    renderResults(parsed);

  } catch (err) {
    loadingBox.classList.add("hidden");
    setStatus("error", "Error occurred");
    showError("Grading failed: " + (err.message || "Unknown error"));
  } finally {
    gradeBtn.disabled = false;
    updateGradeBtn();
  }
});
