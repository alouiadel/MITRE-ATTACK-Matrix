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

function init(data) {
  const { gradient, techniques } = data;
  const [c1, c2, c3] = gradient.colors.map((c) => c.slice(0, 7));
  const minVal = gradient.minValue;
  const maxVal = gradient.maxValue;

  const byTactic = {};
  for (const t of techniques) {
    if (!t.enabled) continue;
    (byTactic[t.tactic] = byTactic[t.tactic] || []).push(t);
  }

  const sortedTactics = TACTIC_ORDER.filter(
    (t) => byTactic[t] && byTactic[t].length > 0,
  );
  const container = document.getElementById("matrix");
  container.innerHTML = "";

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
      const bg = scoreColor(tech.score, minVal, maxVal, c1, c2, c3);
      el.style.background = bg;
      el.style.color = textColor(bg);

      const idSpan = document.createElement("span");
      idSpan.className = "id";
      idSpan.textContent = tech.techniqueID;
      el.appendChild(idSpan);

      const scoreSpan = document.createElement("span");
      scoreSpan.className = "score";
      scoreSpan.textContent = tech.score;
      el.appendChild(scoreSpan);

      el.addEventListener("click", () =>
        openModal(tech, tactic, minVal, maxVal, c1, c2, c3),
      );
      body.appendChild(el);
    }

    col.appendChild(body);
    container.appendChild(col);
  }

  document.getElementById("totalCount").textContent =
    techniques.filter((t) => t.enabled).length + " techniques";
}

function openModal(tech, tactic, minVal, maxVal, c1, c2, c3) {
  const modal = document.getElementById("modal");
  document.getElementById("modalId").textContent = tech.techniqueID;
  document.getElementById("modalTactic").textContent =
    TACTIC_LABELS[tactic] || tactic;

  const bg = scoreColor(tech.score, minVal, maxVal, c1, c2, c3);
  const badge = document.getElementById("modalScore");
  badge.textContent = "Score: " + tech.score;
  badge.style.background = bg;
  badge.style.color = textColor(bg);

  document.getElementById("modalLink").href =
    "https://attack.mitre.org/techniques/" + tech.techniqueID.replace(".", "/");

  modal.classList.add("active");
}

fetch("mitre_matrix_financial_sector.json")
  .then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  })
  .then((data) => init(data))
  .catch((err) => {
    document.getElementById("matrix").innerHTML =
      '<div class="error">Failed to load layer data: ' + err.message + "</div>";
  });

document.addEventListener("DOMContentLoaded", () => {
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
