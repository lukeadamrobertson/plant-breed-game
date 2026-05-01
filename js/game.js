// ── Main Game Loop & State Management ──

let gridPlacements = [];   // { plantId, col, row }

let gameState = {
  screen: "starter-select",
  plants: [],
  selectedTool: null,
  dragState: { isDragging: false, draggedPlantId: null, mouseX: 0, mouseY: 0 },
  lastTime: 0
};

let collection = null;
window.GRID_COLS = 4;
window.const_ROWS = 3;

// ── Initialization ──

function init() {
  gridPlacements = [];
  gameState.plants = [];

  // Try to load saved game
  const saved = localStorage.getItem("cozyGarden_save");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      gameState.plants = data.plants || [];
      gridPlacements = data.gridPlacements || [];
      collection = data.collection || initCollection();
      window.collection = collection;
      document.getElementById("starter-screen").style.display = "none";
      window.gridPlacements = gridPlacements;
      render();
      gameLoop(0);
    } catch (e) {
      console.warn("Failed to load save:", e);
    }
  }

  if (!collection) collection = initCollection();
  window.collection = collection;
  buildStarterSelection();
  gameState.screen = "starter-select";

  // Set up all input handlers (runs regardless of new/save)
  initInput();
}

function buildStarterSelection() {
  const container = document.getElementById("starter-cards");
  container.innerHTML = "";

  for (let i = 0; i < 3; i++) {
    const card = document.createElement("div");
    card.className = "starter-card";

    const miniCanvas = document.createElement("canvas");
    miniCanvas.width = 160;
    miniCanvas.height = 120;
    card.appendChild(miniCanvas);

    const starterGenotype = createStarterGenotype([5, 2, 3][i]);
    const starterPhenotype = computePhenotype(starterGenotype);

    // Preview on canvas
    const ctx = miniCanvas.getContext("2d");
    drawMiniPlant(ctx, 80, 60, starterPhenotype, 1.8);

    const h3 = document.createElement("h3");
    h3.textContent = ["Sunny", "Shadow", "Misty"][i];

    const p = document.createElement("p");
    p.textContent = ["A cheerful sprout with broad leaves and warm colors",
      "A mysterious plant thriving in cool tones and narrow leaves",
      "A gentle soul with delicate daisy buds and smooth stems"][i];

    card.addEventListener("click", (e) => {
      console.log("[DEBUG] CARD CLICKED on", e.target.className);
      try { selectStarter(i, starterGenotype); console.log("[DEBUG] selectStarter completed"); }
      catch(err) { console.error("[DEBUG] selectStarter FAILED:", err); }
    });

    card.appendChild(h3);
    card.appendChild(p);
    container.appendChild(card);
  }
}

function selectStarter(index, genotype) {
  console.log("[DEBUG] selectStarter called with index=", index);
  try {
  gameState.plants = gameState.plants || [];
  gridPlacements = gridPlacements || [];

  const plant = createPlant(genotype, null, null);
  plant.name = ["Sunny", "Shadow", "Misty"][index];
  plant.parentIds = [];
  plant.maxLifespan = computeMaxLifespan({ genotype });

  gameState.plants.push(plant);
  gridPlacements.push({ plantId: plant.id, col: 1, row: 1 });

  registerPlant(plant);
  window.collection.totalPlantsGrown++;

  // Hide starter screen
  const screen = document.getElementById("starter-screen");
  screen.style.display = "none";

  gameState.screen = "garden";
  window.gridPlacements = gridPlacements;
  updateStats();
  saveGame();

  } catch(err) { console.error("[DEBUG] selectStarter error:", err); }
    showToast(`Welcome to your garden! ${plant.name} is waiting. 💚`);
}

// ── Game Loop ──

function gameLoop(timestamp) {
  const dt = Math.min(timestamp - gameState.lastTime, 100) / 16.67; // normalize to ~60fps
  gameState.lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  if (gameState.screen !== "garden") return;

  // Update plants (water depletion, aging, death)
  for (const plant of gameState.plants) {
    if (isDead(plant)) continue;

    const placement = gridPlacements.find(p => p.plantId === plant.id);
    const result = depleteWater(plant, dt);
    if (result.stageChanged && result.newStage === "dead") {
      // Plant died
      showToast(`${plant.name} has passed away... 💔`);
      const bx = placement ? getSlotBounds(placement.col, placement.row).x : 0;
      const by = placement ? getSlotBounds(placement.col, placement.row).y - 20 : 0;
      spawnParticles(bx, by, "death", 12);

      // Remove from grid after a moment
      setTimeout(() => {
        const placementIdx = gridPlacements.findIndex(p => p.plantId === plant.id);
        if (placementIdx >= 0) {
          gridPlacements.splice(placementIdx, 1);
        }
      }, 2000);
    }
  }

  // Update particles
  updateParticles(dt);

  // Update visitors
  updateVisitors(dt);

  // Auto-save every ~30 seconds
  if (Math.floor(timestamp / 30000) !== Math.floor((timestamp - dt * 16.67) / 30000)) {
    saveGame();
  }
}

// ── Persistence ──

function saveGame() {
  try {
    const saveData = {
      plants: gameState.plants,
      gridPlacements,
      collection,
      screen: gameState.screen
    };
    localStorage.setItem("cozyGarden_save", JSON.stringify(saveData));
  } catch (e) {
    console.warn("Failed to save game:", e);
  }
}

// ── Stats Display ──

function updateStats() {
  const stats = document.getElementById("stats-display");
  if (!stats) return;
  const alivePlants = gameState.plants.filter(p => p.state !== "dead").length;
  const matureCount = gameState.plants.filter(p => isMature(p)).length;
  const col = window.collection;
  stats.textContent = `🌱 ${alivePlants} plants${matureCount > 0 ? ` · ${matureCount} ready` : ""} · 📖 ${(col?.discoveredPlants.length || 0)} discovered`;
}

// ── Start! ──

document.addEventListener("DOMContentLoaded", () => {
  window.gridPlacements = gridPlacements;
  init();
});
