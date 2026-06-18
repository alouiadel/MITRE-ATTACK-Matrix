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

const TACTIC_COLORS = {
  reconnaissance: "#4e79a7",
  "resource-development": "#f28e2b",
  "initial-access": "#e15759",
  execution: "#76b7b2",
  persistence: "#59a14f",
  "privilege-escalation": "#edc948",
  "defense-evasion": "#b07aa1",
  "credential-access": "#ff9da7",
  discovery: "#9c755f",
  "lateral-movement": "#bab0ac",
  collection: "#86bcf9",
  "command-and-control": "#d4a6c8",
  exfiltration: "#a1c9f4",
  impact: "#f9b4b4",
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

// --- D3 Force Graph ---

let simulation = null;
let nodeData = [];
let nodeElements = null;
let linkElements = null;
let labelElements = null;
let currentFilter = "";
let layerData = null;
let lookupData = null;
let graphSvg = null;
let graphG = null;
let activeTacticFilter = null;
let resizeObserver = null;

function buildGraph(layer, lookup) {
  const container = document.getElementById("graphContainer");
  container.innerHTML = "";

  const rect = container.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  const techMap = new Map();
  for (const t of layer.techniques) {
    if (!t.enabled) continue;
    const key = t.techniqueID + "|" + t.tactic;
    techMap.set(key, t);
  }

  const allEntries = Array.from(techMap.values());
  const scores = allEntries.map((t) => t.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  const radiusScale = d3
    .scaleSqrt()
    .domain([minScore, maxScore])
    .range([5, 24]);

  const nodeIds = new Set();
  const nodes = [];
  for (const t of allEntries) {
    const uid = t.techniqueID + "|" + t.tactic;
    if (nodeIds.has(uid)) continue;
    nodeIds.add(uid);
    const info = lookup[t.techniqueID] || {};
    nodes.push({
      id: uid,
      techId: t.techniqueID,
      tactic: t.tactic,
      score: t.score,
      name: info.name || t.techniqueID,
      shortName: (info.name || t.techniqueID).slice(0, 22),
      description: info.description || "",
      radius: radiusScale(t.score),
    });
  }

  nodeData = nodes;

  // Build links
  const nodeByTechId = {};
  for (const n of nodes) {
    if (!nodeByTechId[n.tactic]) nodeByTechId[n.tactic] = {};
    nodeByTechId[n.tactic][n.techId] = n;
  }

  const links = [];
  for (const n of nodes) {
    const parts = n.techId.split(".");
    if (parts.length === 2) {
      const parentId = parts[0];
      const parent = nodeByTechId[n.tactic]?.[parentId];
      if (parent) {
        links.push({ source: parent.id, target: n.id });
      }
    }
  }

  // SVG
  graphSvg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const defs = graphSvg.append("defs");

  // Drop shadow
  defs
    .append("filter")
    .attr("id", "node-shadow")
    .attr("x", "-20%")
    .attr("y", "-20%")
    .attr("width", "140%")
    .attr("height", "140%")
    .append("feDropShadow")
    .attr("dx", 0)
    .attr("dy", 1)
    .attr("stdDeviation", 2)
    .attr("flood-opacity", 0.3);

  // Arrowhead marker
  const marker = defs
    .append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 18)
    .attr("refY", 0)
    .attr("markerWidth", 7)
    .attr("markerHeight", 7)
    .attr("orient", "auto");

  marker
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "var(--text-dim)")
    .attr("class", "arrow-head");

  graphG = graphSvg.append("g");

  // Zoom
  const zoom = d3
    .zoom()
    .scaleExtent([0.15, 6])
    .on("zoom", (event) => {
      graphG.attr("transform", event.transform);
    });
  graphSvg.call(zoom);

  graphSvg.call(
    zoom.transform,
    d3.zoomIdentity.translate(width / 2, height / 2),
  );

  // --- Pre-compute grouped positions ---
  const tacticList = TACTIC_ORDER.filter((t) =>
    nodes.some((n) => n.tactic === t),
  );
  const tacticCount = tacticList.length;
  const baseRadius = Math.min(width, height) * 0.3;

  for (const n of nodes) {
    const idx = tacticList.indexOf(n.tactic);
    const sliceAngle = (2 * Math.PI) / tacticCount;
    const angle = idx * sliceAngle + sliceAngle / 2;
    const r = baseRadius + (idx % 3) * 50;
    n._tx = Math.cos(angle) * r;
    n._ty = Math.sin(angle) * r;
    n.fx = n._tx;
    n.fy = n._ty;
  }

  // Links
  linkElements = graphG
    .append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class", "link")
    .attr("marker-end", "url(#arrow)");

  // Nodes
  nodeElements = graphG
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("class", "node")
    .attr("r", (d) => d.radius)
    .attr("fill", (d) => TACTIC_COLORS[d.tactic] || "#888")
    .attr("filter", "url(#node-shadow)")
    .call(drag(simulation));

  // Score ring (simulated via stroke)
  const [c1, c2, c3] = layer.gradient.colors.map((c) => c.slice(0, 7));
  nodeElements
    .attr("stroke", (d) => scoreColor(d.score, minScore, maxScore, c1, c2, c3))
    .attr("stroke-width", (d) => 2 + (d.score / maxScore) * 5);

  // Labels
  labelElements = graphG
    .append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("class", "node-label")
    .attr("font-size", (d) => Math.max(7, Math.min(11, d.radius * 0.45)))
    .text((d) => d.shortName);

  // Tooltip
  const tooltip = document.getElementById("graphTooltip");

  nodeElements
    .on("mouseenter", function (event, d) {
      tooltip.innerHTML =
        '<div class="tt-name">' +
        escapeHtml(d.name) +
        "</div>" +
        '<div class="tt-id">' +
        escapeHtml(d.techId) +
        "</div>" +
        '<div class="tt-tactic">' +
        escapeHtml(TACTIC_LABELS[d.tactic] || d.tactic) +
        "</div>" +
        '<div class="tt-score">Score: ' +
        d.score +
        "</div>";
      tooltip.classList.add("visible");
      moveTooltip(event);
      d3.select(this).raise();
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", function () {
      tooltip.classList.remove("visible");
    })
    .on("click", function (event, d) {
      openModal(d);
    });

  // Links tooltip
  linkElements
    .on("mouseenter", function (event, d) {
      tooltip.innerHTML =
        '<div class="tt-name">' +
        escapeHtml(d.source.name) +
        "</div>" +
        '<div class="tt-id">' +
        escapeHtml(d.source.techId) +
        "</div>" +
        '<div style="text-align:center;margin:4px 0;opacity:0.5;">&darr;</div>' +
        '<div class="tt-name">' +
        escapeHtml(d.target.name) +
        "</div>" +
        '<div class="tt-id">' +
        escapeHtml(d.target.techId) +
        "</div>";
      tooltip.classList.add("visible");
      moveTooltip(event);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", function () {
      tooltip.classList.remove("visible");
    });

  // Force simulation
  simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance(90)
        .strength(0.3),
    )
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(0, 0))
    .force(
      "collision",
      d3.forceCollide().radius((d) => d.radius + 5),
    )
    .alphaDecay(0.03);

  simulation.on("tick", () => {
    linkElements
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    nodeElements.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    labelElements.attr("x", (d) => d.x).attr("y", (d) => d.y - d.radius - 6);
  });

  simulation.on("end", () => {
    // Fully settled — nodes should be stable now
  });

  simulation.alpha(0.8).restart();

  // Release fixed positions after simulation stabilizes
  setTimeout(() => {
    for (const n of nodes) {
      n.fx = null;
      n.fy = null;
    }
    simulation.alpha(0.2).restart();
  }, 1800);

  // Build legend
  buildLegend(nodes);

  document.getElementById("totalCount").textContent =
    nodes.length + " techniques";

  // ResizeObserver
  if (resizeObserver) resizeObserver.disconnect();
  resizeObserver = new ResizeObserver(() => {
    const r = container.getBoundingClientRect();
    graphSvg.attr("width", r.width).attr("height", r.height);
  });
  resizeObserver.observe(container);

  if (currentFilter) applyFilter(currentFilter, nodes);
}

function drag(sim) {
  function dragstarted(event, d) {
    if (!event.active) sim?.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) sim?.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  return d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

function moveTooltip(event) {
  const tooltip = document.getElementById("graphTooltip");
  let x = event.clientX + 14;
  let y = event.clientY - 10;
  const tr = tooltip.getBoundingClientRect();
  if (x + tr.width > window.innerWidth - 10) x = event.clientX - tr.width - 14;
  if (y + tr.height > window.innerHeight - 10)
    y = event.clientY - tr.height + 10;
  if (y < 10) y = 10;
  tooltip.style.left = x + "px";
  tooltip.style.top = y + "px";
}

function buildLegend(nodes) {
  const legend = document.getElementById("graphLegend");
  legend.innerHTML = "";

  const seen = new Set();
  for (const n of nodes) {
    if (seen.has(n.tactic)) continue;
    seen.add(n.tactic);

    const item = document.createElement("div");
    item.className = "graph-legend-item";
    item.dataset.tactic = n.tactic;

    const dot = document.createElement("span");
    dot.className = "graph-legend-dot";
    dot.style.background = TACTIC_COLORS[n.tactic] || "#888";
    item.appendChild(dot);

    const label = document.createElement("span");
    label.className = "graph-legend-label";
    label.textContent = TACTIC_LABELS[n.tactic] || n.tactic;
    item.appendChild(label);

    item.addEventListener("click", () => toggleTacticFilter(n.tactic, nodes));
    legend.appendChild(item);
  }
}

function toggleTacticFilter(tactic, nodes) {
  if (activeTacticFilter === tactic) {
    activeTacticFilter = null;
  } else {
    activeTacticFilter = tactic;
  }

  const items = document.querySelectorAll(".graph-legend-item");
  items.forEach((el) => el.classList.remove("active"));

  nodeElements.each(function (d) {
    const el = d3.select(this);
    const label = d3.select(
      labelElements.nodes()[nodeElements.nodes().indexOf(this)],
    );

    if (!activeTacticFilter) {
      el.classed("faded", false);
      el.classed("highlighted", false);
      label.classed("faded", false);
      label.classed("visible", false);
      el.attr("r", d.radius);
      el.attr(
        "stroke-width",
        2 + (d.score / Math.max(...nodes.map((n) => n.score))) * 5,
      );
    } else {
      const match = d.tactic === activeTacticFilter;
      el.classed("faded", !match);
      el.classed("highlighted", match);
      label.classed("faded", !match);
      label.classed("visible", match);
      el.attr("r", match ? d.radius * 1.2 : d.radius * 0.7);
      if (match) {
        el.attr("stroke-width", 4);
      } else {
        el.attr(
          "stroke-width",
          2 + (d.score / Math.max(...nodes.map((n) => n.score))) * 5,
        );
      }
    }
  });

  linkElements.each(function (d) {
    if (!activeTacticFilter) {
      d3.select(this).attr("stroke-opacity", 0.25);
    } else {
      const match =
        d.source.tactic === activeTacticFilter ||
        d.target.tactic === activeTacticFilter;
      d3.select(this).attr("stroke-opacity", match ? 0.5 : 0.04);
    }
  });

  if (activeTacticFilter) {
    document
      .querySelector(`.graph-legend-item[data-tactic="${activeTacticFilter}"]`)
      ?.classList.add("active");
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// --- Filter / Search ---

function applyFilter(filterText, nodes) {
  const lower = filterText.toLowerCase();

  nodeElements.each(function (d) {
    const el = d3.select(this);
    const label = d3.select(
      labelElements.nodes()[nodeElements.nodes().indexOf(this)],
    );
    const matches =
      !filterText ||
      d.techId.toLowerCase().includes(lower) ||
      d.name.toLowerCase().includes(lower);

    el.classed("highlighted", matches && !!filterText);
    el.classed("faded", !matches && !!filterText);
    label.classed("visible", matches && !!filterText);
    label.classed("faded", !matches && !!filterText);

    if (matches && filterText) {
      el.attr("r", d.radius * 1.3);
    } else {
      el.attr("r", d.radius);
    }
  });

  linkElements.each(function (d) {
    const sourceMatch =
      !filterText ||
      d.source.techId.toLowerCase().includes(lower) ||
      d.source.name.toLowerCase().includes(lower);
    const targetMatch =
      !filterText ||
      d.target.techId.toLowerCase().includes(lower) ||
      d.target.name.toLowerCase().includes(lower);
    const anyMatch = sourceMatch || targetMatch;
    d3.select(this).attr(
      "stroke-opacity",
      filterText ? (anyMatch ? 0.4 : 0.04) : 0.25,
    );
  });
}

function onFilterChange() {
  currentFilter = document.getElementById("searchInput").value;
  if (activeTacticFilter) {
    activeTacticFilter = null;
    document
      .querySelectorAll(".graph-legend-item")
      .forEach((el) => el.classList.remove("active"));
  }
  if (nodeData.length > 0) {
    applyFilter(currentFilter, nodeData);
  }
}

function resetLayout() {
  if (!nodeData.length || !simulation) return;
  for (const n of nodeData) {
    n.fx = n._tx;
    n.fy = n._ty;
  }
  simulation.alpha(0.8).restart();
  setTimeout(() => {
    for (const n of nodeData) {
      n.fx = null;
      n.fy = null;
    }
    simulation.alpha(0.2).restart();
  }, 1200);
}

// --- Modal ---

function openModal(d) {
  const info = lookupData[d.techId] || {};
  document.getElementById("modalId").textContent = d.techId;
  document.getElementById("modalName").textContent = info.name || d.techId;
  document.getElementById("modalTactic").textContent =
    TACTIC_LABELS[d.tactic] || d.tactic;

  const desc = document.getElementById("modalDesc");
  desc.textContent = info.description || "No description available.";

  const minScore = Math.min(...nodeData.map((n) => n.score));
  const maxScore = Math.max(...nodeData.map((n) => n.score));
  const layer = layerData;
  const [c1, c2, c3] = layer.gradient.colors.map((c) => c.slice(0, 7));
  const bg = scoreColor(d.score, minScore, maxScore, c1, c2, c3);

  const badge = document.getElementById("modalScore");
  badge.textContent = "Score: " + d.score;
  badge.style.background = bg;
  badge.style.color = textColor(bg);

  document.getElementById("modalLink").href =
    "https://attack.mitre.org/techniques/" + d.techId.replace(".", "/");

  document.getElementById("modal").classList.add("active");
}

// --- Theme ---

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  // Update arrow color
  const arrow = document.querySelector(".arrow-head");
  if (arrow) {
    const style = getComputedStyle(document.documentElement);
    arrow.setAttribute("fill", style.getPropertyValue("--text-dim").trim());
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
}

// --- Init ---

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
    const el = document.getElementById("graphContainer");
    el.innerHTML =
      '<div class="loading"><div class="spinner"></div>Rendering graph...</div>';
    setTimeout(() => buildGraph(layer, lookup), 50);
  })
  .catch((err) => {
    document.getElementById("graphContainer").innerHTML =
      '<div class="error">Failed to load data: ' + err.message + "</div>";
  });

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("theme") || "dark";
  applyTheme(saved);
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  document
    .getElementById("resetLayoutBtn")
    .addEventListener("click", resetLayout);

  const input = document.getElementById("searchInput");
  let debounceTimer;
  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(onFilterChange, 200);
  });

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
