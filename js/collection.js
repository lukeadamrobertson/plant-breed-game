// ── Collection Book System ──

const VISITOR_RULES = [
  { condition: (plants) => plants.some(p => p.phenotype.flowerType === "F" && p.state === "mature"), type: "butterfly", probability: 0.005, label: "Monarch Butterfly" },
  { condition: (plants) => plants.some(p => p.phenotype.vinePresence === "V" && p.state === "mature"), type: "bird", probability: 0.002, label: "Bluebird" },
  { condition: (plants) => plants.filter(p => p.state === "mature").length >= 3, type: "butterfly", probability: 0.01, label: "White Butterfly" }
];

function initCollection() {
  return {
    discoveredPlants: [],   // Array of { genotypeKey, name, phenotype, rarity, count }
    totalPlantsGrown: 0,
    totalBreeds: 0,
    totalClones: 0,
    visitors: []            // Active visitor animations { type, x, y, vx, vy, frame, maxFrames }
  };
}

function genotypeKey(genotype) {
  return JSON.stringify(genotype);
}

function registerPlant(plant) {
  const col = window.collection;
  if (!col) return;
  const key = genotypeKey(plant.genotype);
  const existing = col.discoveredPlants.find(p => p.key === key);
  if (existing) {
    existing.count++;
    existing.rarity = evaluateRarity(plant.genotype);
    return;
  }

  const rarity = evaluateRarity(plant.genotype);
  col.discoveredPlants.push({
    key,
    name: plantName(plant.phenotype),
    phenotype: { ...plant.phenotype },
    genotype: JSON.parse(JSON.stringify(plant.genotype)),
    rarity,
    count: 1
  });
}

function spawnVisitor() {
  const canvas = document.getElementById("game-canvas");
  const rules = VISITOR_RULES.filter(r => r.condition(gameState.plants));
  if (rules.length === 0) return;

  const rule = rules[Math.floor(Math.random() * rules.length)];
  if (Math.random() > rule.probability) return;

  const fromLeft = Math.random() > 0.5;
  window.collection.visitors.push({
    type: rule.type,
    x: fromLeft ? -20 : canvas.width + 20,
    y: 60 + Math.random() * (canvas.height * 0.4),
    vx: (fromLeft ? 1 : -1) * (0.5 + Math.random() * 1.5),
    vy: (Math.random() - 0.5) * 0.8,
    frame: 0,
    maxFrames: 200 + Math.random() * 200,
    label: rule.label
  });
}

function updateVisitors(dt) {
  const canvas = document.getElementById("game-canvas");
  const col = window.collection;
  if (!col || !col.visitors) return;
  for (const v of col.visitors) {
    v.x += v.vx * dt;
    v.y += Math.sin(v.frame * 0.05) * 0.3 + v.vy * dt;
    v.frame += dt;
  }
  // Remove expired or off-screen visitors
  col.visitors = col.visitors.filter(v =>
    v.x > -40 && v.x < canvas.width + 40 && v.frame < v.maxFrames
  );

  // Spawn new ones periodically
  if (Math.random() < 0.003 && col.visitors.length < 5) {
    spawnVisitor();
  }
}

// ── UI Rendering for Collection ──

function renderCollectionPanel() {
  const list = document.getElementById("collection-list");
  const col = window.collection;
  if (!list || !col || col.discoveredPlants.length === 0) {
    list.innerHTML = '<p style="color:#7a6a50;font-size:13px;padding:12px;">No plants discovered yet. Grow and breed plants to fill your garden book!</p>';
    return;
  }

  list.innerHTML = col.discoveredPlants.map(p => `
    <div class="collection-entry ${p.count === 0 ? 'locked' : ''}">
      <canvas class="mini-plant" data-key="${p.key}" width="48" height="48"></canvas>
      <div class="info">
        <h4 style="color:${p.rarity.color}">${p.name}</h4>
        <p>${p.rarity.name}${p.count > 1 ? ` · ${p.count} found` : ""}</p>
      </div>
    </div>
  `).join("");

  // Render mini plant previews on collection canvases
  requestAnimationFrame(() => {
    list.querySelectorAll(".mini-plant").forEach(canvas => {
      const ctx = canvas.getContext("2d");
      const key = canvas.dataset.key;
      const data = col.discoveredPlants.find(p => p.key === key);
      if (data) {
        drawMiniPlant(ctx, 24, 24, data.phenotype, 0.4);
      }
    });
  });
}
