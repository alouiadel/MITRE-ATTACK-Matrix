const TACTIC_ORDER = [
  "reconnaissance",
  "resource-development",
  "initial-access",
  "execution",
  "persistence",
  "privilege-escalation",
  "defense-evasion",
  "credential-access",
  "discovery",
  "lateral-movement",
  "collection",
  "command-and-control",
  "exfiltration",
  "impact",
];

const TACTIC_LABELS = {
  reconnaissance: "Reconnaissance",
  "resource-development": "Resource Development",
  "initial-access": "Initial Access",
  execution: "Execution",
  persistence: "Persistence",
  "privilege-escalation": "Privilege Escalation",
  "defense-evasion": "Defense Evasion",
  "credential-access": "Credential Access",
  discovery: "Discovery",
  "lateral-movement": "Lateral Movement",
  collection: "Collection",
  "command-and-control": "Command & Control",
  exfiltration: "Exfiltration",
  impact: "Impact",
};

function scoreColor(score, minVal, maxVal, c1, c2, c3) {
  const t = Math.max(0, Math.min(1, (score - minVal) / (maxVal - minVal)));
  const r1 = parseInt(c1.slice(1, 3), 16),
    g1 = parseInt(c1.slice(3, 5), 16),
    b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16),
    g2 = parseInt(c2.slice(3, 5), 16),
    b2 = parseInt(c2.slice(5, 7), 16);
  const r3 = parseInt(c3.slice(1, 3), 16),
    g3 = parseInt(c3.slice(3, 5), 16),
    b3 = parseInt(c3.slice(5, 7), 16);
  let r, g, b;
  if (t < 0.5) {
    const p = t * 2;
    r = Math.round(r1 + (r2 - r1) * p);
    g = Math.round(g1 + (g2 - g1) * p);
    b = Math.round(b1 + (b2 - b1) * p);
  } else {
    const p = (t - 0.5) * 2;
    r = Math.round(r2 + (r3 - r2) * p);
    g = Math.round(g2 + (g3 - g2) * p);
    b = Math.round(b2 + (b3 - b2) * p);
  }
  return `rgb(${r},${g},${b})`;
}

function textColor(bgRgb) {
  const m = bgRgb.match(/\d+/g);
  if (!m) return "#f0f6fc";
  const lum =
    parseInt(m[0]) * 0.299 + parseInt(m[1]) * 0.587 + parseInt(m[2]) * 0.114;
  return lum > 160 ? "#0d1117" : "#f0f6fc";
}

function renderMatrix(layerData, lookup, filterText) {
  const { gradient, techniques } = layerData;
  const [c1, c2, c3] = gradient.colors.map((c) => c.slice(0, 7));
  const minVal = gradient.minValue;
  const maxVal = gradient.maxValue;

  const lower = filterText.toLowerCase();

  const byTactic = {};
  for (const t of techniques) {
    if (!t.enabled) continue;
    const info = lookup[t.techniqueID] || {};
    const name = info.name || "";
    const matches =
      !filterText ||
      t.techniqueID.toLowerCase().includes(lower) ||
      name.toLowerCase().includes(lower);
    if (filterText && !matches) continue;
    (byTactic[t.tactic] = byTactic[t.tactic] || []).push({ ...t, name });
  }

  const sortedTactics = TACTIC_ORDER.filter(
    (t) => byTactic[t] && byTactic[t].length > 0,
  );

  const container = document.getElementById("matrix");
  container.innerHTML = "";

  if (sortedTactics.length === 0) {
    container.innerHTML =
      '<div class="empty-search">No techniques match your search.</div>';
    return;
  }

  for (const tactic of sortedTactics) {
    const items = byTactic[tactic];
    const col = document.createElement("div");
    col.className = "tactic-column";

    const header = document.createElement("div");
    header.className = "tactic-header";
    header.textContent = TACTIC_LABELS[tactic] || tactic;
    const countSpan = document.createElement("span");
    countSpan.className = "count";
    countSpan.textContent = `(${items.length})`;
    header.appendChild(countSpan);
    col.appendChild(header);

    const body = document.createElement("div");
    body.className = "tactic-body";

    for (const tech of items) {
      const el = document.createElement("div");
      el.className = "technique";
      el.dataset.techId = tech.techniqueID;
      const bg = scoreColor(tech.score, minVal, maxVal, c1, c2, c3);
      el.style.background = bg;
      el.style.color = textColor(bg);

      const nameSpan = document.createElement("span");
      nameSpan.className = "tech-name";
      nameSpan.textContent = tech.name || tech.techniqueID;
      el.appendChild(nameSpan);

      const meta = document.createElement("div");
      meta.className = "tech-meta";

      const idSpan = document.createElement("span");
      idSpan.className = "tech-id";
      idSpan.textContent = tech.techniqueID;
      meta.appendChild(idSpan);

      const scoreSpan = document.createElement("span");
      scoreSpan.className = "tech-score";
      scoreSpan.textContent = tech.score;
      meta.appendChild(scoreSpan);

      el.appendChild(meta);

      el.addEventListener("click", () =>
        openModal(tech, tactic, minVal, maxVal, c1, c2, c3, lookup),
      );
      body.appendChild(el);
    }

    col.appendChild(body);
    container.appendChild(col);
  }

  document.getElementById("totalCount").textContent =
    techniques.filter((t) => t.enabled).length + " techniques";
}

function openModal(tech, tactic, minVal, maxVal, c1, c2, c3, lookup) {
  const modal = document.getElementById("modal");
  const info = lookup[tech.techniqueID] || {};

  document.getElementById("modalId").textContent = tech.techniqueID;
  document.getElementById("modalName").textContent =
    info.name || tech.techniqueID;
  document.getElementById("modalTactic").textContent =
    TACTIC_LABELS[tactic] || tactic;
  document.getElementById("modalDesc").textContent =
    info.description || "No description available.";

  const bg = scoreColor(tech.score, minVal, maxVal, c1, c2, c3);
  const badge = document.getElementById("modalScore");
  badge.textContent = "Score: " + tech.score;
  badge.style.background = bg;
  badge.style.color = textColor(bg);

  document.getElementById("modalLink").href =
    "https://attack.mitre.org/techniques/" + tech.techniqueID.replace(".", "/");

  modal.classList.add("active");
}

// Theme
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
}

// Init
let layerData = null;
let lookupData = null;
let currentFilter = "";

function onFilterChange() {
  currentFilter = document.getElementById("searchInput").value;
  if (layerData && lookupData) {
    renderMatrix(layerData, lookupData, currentFilter);
  }
}

Promise.all([
  fetch("mitre_matrix_financial_sector.json").then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }),
  fetch("technique_lookup.json").then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }),
])
  .then(([layer, lookup]) => {
    layerData = layer;
    lookupData = lookup;
    renderMatrix(layer, lookup, currentFilter);
  })
  .catch((err) => {
    document.getElementById("matrix").innerHTML =
      '<div class="error">Failed to load data: ' + err.message + "</div>";
  });

document.addEventListener("DOMContentLoaded", () => {
  // Theme
  const saved = localStorage.getItem("theme") || "dark";
  applyTheme(saved);
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  // Search
  const input = document.getElementById("searchInput");
  let debounceTimer;
  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(onFilterChange, 200);
  });

  // Modal
  document.getElementById("modalClose").addEventListener("click", () => {
    document.getElementById("modal").classList.remove("active");
  });
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget)
      e.currentTarget.classList.remove("active");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      document.getElementById("modal").classList.remove("active");
  });
});
