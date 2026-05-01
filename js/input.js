// ── Input Handling (mouse + touch) ──

let isMouseDown = false;
let inputInitialized = false;

function getDragState() { return gameState.dragState; }

function initInput() {
  if (inputInitialized) return;
  inputInitialized = true;

  const c = document.getElementById("game-canvas");

  // Mouse events
  c.addEventListener("mousedown", onMouseDown);
  c.addEventListener("mousemove", onMouseMove);
  c.addEventListener("mouseup", onMouseUp);

  // Touch events
  c.addEventListener("touchstart", onTouchStart, { passive: false });
  c.addEventListener("touchmove", onTouchMove, { passive: false });
  c.addEventListener("touchend", onTouchEnd, { passive: false });

  // Toolbar clicks
  document.querySelectorAll(".tool-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tool = btn.dataset.tool;
      // Toggle off if already active
      if (gameState.selectedTool === tool) {
        gameState.selectedTool = null;
        document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
      } else {
        gameState.selectedTool = tool;
        document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      }
    });
  });

  // Collection toggle
  document.getElementById("collection-toggle").addEventListener("click", () => {
    const panel = document.getElementById("collection-panel");
    const dimmer = document.getElementById("overlay-dimmer");
    panel.classList.toggle("open");
    dimmer.classList.toggle("visible", panel.classList.contains("open"));
    if (panel.classList.contains("open")) renderCollectionPanel();
  });

  // Dimmer click closes collection + popup
  document.getElementById("overlay-dimmer").addEventListener("click", closeOverlays);
  document.getElementById("popup-close").addEventListener("click", closePlantPopup);

  // Close popup on dimmer click too
  document.querySelectorAll("#overlay-dimmer, #popup-close").forEach(el => {
    el.addEventListener("click", () => {
      closePlantPopup();
      const panel = document.getElementById("collection-panel");
      const dimmer = document.getElementById("overlay-dimmer");
      panel.classList.remove("open");
      dimmer.classList.remove("visible");
    });
  });

  // Keyboard: Escape to deselect tool
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      gameState.selectedTool = null;
      document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
      closePlantPopup();
      const panel = document.getElementById("collection-panel");
      panel.classList.remove("open");
      document.getElementById("overlay-dimmer").classList.remove("visible");
    }
  });

  // Close popup when clicking outside on canvas
  c.addEventListener("click", (e) => {
    if (!dragState.isDragging && gameState.selectedTool !== "info") {
      // If using info tool, clicking a plant already handled in onMouseDown
    }
  });
}

function getPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left,
    y: (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top
  };
}

function onMouseDown(e) {
  const pos = getPointerPos(e);
  handlePointerDown(pos.x, pos.y);
}

function onMouseMove(e) {
  const pos = getPointerPos(e);
  handlePointerMove(pos.x, pos.y);
}

function onMouseUp(e) {
  const pos = getPointerPos(e);
  handlePointerUp(pos.x, pos.y);
}

function onTouchStart(e) {
  e.preventDefault();
  const pos = getPointerPos(e);
  handlePointerDown(pos.x, pos.y);
}

function onTouchMove(e) {
  e.preventDefault();
  const pos = getPointerPos(e);
  handlePointerMove(pos.x, pos.y);
}

function onTouchEnd(e) {
  e.preventDefault();
  // Use last known position from gameState.dragState
  handlePointerUp(getDragState().mouseX, getDragState().mouseY);
}

function handlePointerDown(x, y) {
  isMouseDown = true;

  const tool = gameState.selectedTool;

  // Info tool: show popup only
  if (tool === "info") {
    const plantHit = getPlantAtSlotForPos(x, y);
    if (plantHit && !isDead(plantHit)) {
      showPlantInfo(plantHit);
    }
    return;
  }

  // Water / Fertilizer: click-based care, no dragging
  if (tool === "water" || tool === "fertilizer") {
    const plantHit = getPlantAtSlotForPos(x, y);
    if (plantHit && !isDead(plantHit)) {
      applyCareToPlant(plantHit, tool);
    }
    return;
  }

  // Scissors: drag mature plant onto empty slot to clone
  if (tool === "scissors") {
    const plantHit = getPlantAtSlotForPos(x, y);
    if (plantHit && !isDead(plantHit) && isMature(plantHit)) {
      startDrag(plantHit.id, x, y);
    } else if (!plantHit) {
      // Dropped on empty slot while in scissors mode — clone nearest mature plant
      const maturePlant = gameState.plants.find(p => isMature(p) && !isDead(p));
      if (maturePlant) startDrag(maturePlant.id, x, y);
    }
    return;
  }

  // Default / breed: click and drag mature plant to start breeding drag
  const plantHit = getPlantAtSlotForPos(x, y);
  if (plantHit && !isDead(plantHit) && plantHit.state !== "sprout") {
    startDrag(plantHit.id, x, y);
  }
}

function handlePointerMove(x, y) {
  const ds = getDragState();
  if (!isMouseDown || !ds.isDragging) return;
  ds.mouseX = x;
  ds.mouseY = y;
}

function handlePointerUp(x, y) {
  const ds = getDragState();
  if (!ds.isDragging) {
    isMouseDown = false;
    return;
  }

  const tool = gameState.selectedTool || "breed";
  const plant = gameState.plants.find(p => p.id === ds.draggedPlantId);

  if (tool === "scissors" && plant) {
    // Clone: drop on empty slot
    const gp = window.gridPlacements || [];
    const placement = gp.find(p => p.plantId === plant.id);
    const startCol = placement?.col ?? 1;
    const startRow = placement?.row ?? 1;

    const slot = getSlotForPos(x, y);
    if (slot && !isSlotOccupied(slot.col, slot.row)) {
      clonePlantAtSlot(plant, slot.col, slot.row);
      spawnParticles(x, y, "clone", 10);
      showToast("Cloned! ✂️");
    } else if (!slot) {
      // Dropped outside grid: try nearest empty slot
      const nearestEmpty = findNearestEmptySlot(startCol, startRow);
      if (nearestEmpty) clonePlantAtSlot(plant, nearestEmpty.col, nearestEmpty.row);
    }
  } else {
    // Breed: drop on another plant
    const target = getPlantAtSlotForPos(x, y);
    if (target && target.id !== ds.draggedPlantId && isMature(target)) {
      breedPlants(plant, target);
      spawnParticles(x, y, "breed", 15);
      showToast("Bred! 🌱✨");
    } else {
      // Dropped on empty slot or invalid: check for scissors clone
      if (tool === "scissors" || gameState.selectedTool === "scissors") {
        const slot = getSlotForPos(x, y);
        if (slot && !isSlotOccupied(slot.col, slot.row)) {
          clonePlantAtSlot(plant, slot.col, slot.row);
          spawnParticles(x, y, "clone", 10);
          showToast("Cloned! ✂️");
        }
      }
    }
  }

  stopDrag();
  isMouseDown = false;
}

function startDrag(plantId, x, y) {
  const ds = getDragState();
  ds.isDragging = true;
  ds.draggedPlantId = plantId;
  ds.mouseX = x;
  ds.mouseY = y;
}

function stopDrag() {
  const ds = getDragState();
  ds.isDragging = false;
  ds.draggedPlantId = null;
}

// ── Plant Actions ──

function applyCareToPlant(plant, careType) {
  const result = applyCare(plant, careType);
  if (result.stageChanged) {
    showToast(`Evolved to ${result.newStage}! 🌿`);
    if (result.newStage === "mature") {
      showToast("Your plant is mature! Try breeding or cloning! ✨");
    }
  }

  // Spawn particles
  const gp = window.gridPlacements || [];
  const slot = gp.find(p => p.plantId === plant.id);
  if (slot) {
    const bounds = getSlotBounds(slot.col, slot.row);
    spawnParticles(bounds.x, bounds.y - 20, careType === "water" ? "water" : "sparkle", 8);
  }

  updateStats();
}

function clonePlantAtSlot(parent, col, row) {
  if (!isMature(parent)) return;

  const cloned = clonePlant(parent);
  gameState.plants.push(cloned);
  (window.gridPlacements || []).push({ plantId: cloned.id, col, row });

  window.collection.totalClones++;
  registerPlant(cloned);
  updateStats();
}

function breedPlants(plantA, plantB) {
  if (!isMature(plantA) || !isMature(plantB)) return;

  const offspringGenotype = breedGenotypes(plantA, plantB);
  const offspring = createPlant(offspringGenotype, plantA, plantB);

  // Find nearest empty slot near the parents
  const gp = window.gridPlacements || [];
  const pa = gp.find(p => p.plantId === plantA.id);
  const pb = gp.find(p => p.plantId === plantB.id);
  const startCol = Math.min(pa?.col ?? 1, pb?.col ?? 1);
  const startRow = Math.min(pa?.row ?? 1, pb?.row ?? 1);
  const slot = findNearestEmptySlot(startCol, startRow);
  if (!slot) {
    showToast("No empty slots! Grow more plants or wait for old ones to pass.");
    return;
  }

  gameState.plants.push(offspring);
  (window.gridPlacements || []).push({ plantId: offspring.id, col: slot.col, row: slot.row });

  window.collection.totalBreeds++;
  registerPlant(offspring);

  // Track breeding history
  plantA.historyBredWith = plantA.historyBredWith || [];
  plantA.historyBredWith.push(plantB.id);
  plantB.historyBredWith = plantB.historyBredWith || [];
  plantB.historyBredWith.push(plantA.id);

  updateStats();
}

function findNearestEmptySlot(startCol, startRow) {
  // Spiral search from starting position
  const cols = window.GRID_COLS || 4;
  const rows = window.const_ROWS || 3;
  for (let dist = 0; dist <= Math.max(cols, rows); dist++) {
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const d = Math.abs(c - startCol) + Math.abs(r - startRow);
        if (d === dist && !isSlotOccupied(c, r)) {
          return { col: c, row: r };
        }
      }
    }
  }
  return null;
}

function isSprout(plant) {
  return plant.state === "sprout";
}

// ── UI Helpers ──

function showPlantInfo(plant) {
  const popup = document.getElementById("plant-popup");
  const title = document.getElementById("popup-title");
  const content = document.getElementById("popup-content");

  title.textContent = plant.name;

  const rarity = evaluateRarity(plant.genotype);
  let html = `<p style="color:${rarity.color};font-size:12px;margin-bottom:8px;">${rarity.name} · Generation ${plant.generation} · Age ${Math.floor(plant.age)} / ${plant.maxLifespan}</p>`;

  html += `<p style="font-size:12px;color:#7a6a50;margin-bottom:8px;">State: ${plant.state} | Water: ${Math.round(plant.waterLevel * 100)}%</p>`;
  html += '<div style="margin-top:8px;">';

  for (const key of TRAIT_KEYS) {
    const traitDef = TRAITS[key];
    const alleles = plant.genotype[key];
    const pheno = plant.phenotype[key];
    const allele1 = traitDef.alleles.find(a => a.symbol === alleles[0]);
    const allele2 = traitDef.alleles.find(a => a.symbol === alleles[1]);
    const isHomozygous = alleles[0] === alleles[1];

    html += `<div class="trait-row">
      <span>${traitDef.displayName}</span>
      <span style="color:${pheno === alleles[0] || pheno === alleles[1] ? '#5a3' : '#999'}">${isHomozygous ? allele1.name + " / " + allele2.name : `${allele1.symbol}/${allele2.symbol} → ${traitDef.alleles.find(a => a.symbol === pheno).name}`}</span>
    </div>`;
  }

  html += '</div>';

  // Lineage
  if (plant.parentIds && plant.parentIds.length > 0) {
    html += `<p style="font-size:11px;color:#9a8a70;margin-top:8px;">Parents: ${plant.parentIds.map(id => id.slice(-4).toUpperCase()).join(" × ")}</p>`;
  }

  content.innerHTML = html;
  popup.classList.add("visible");
}

function closePlantPopup() {
  document.getElementById("plant-popup").classList.remove("visible");
}

function closeOverlays() {
  closePlantPopup();
  const panel = document.getElementById("collection-panel");
  panel.classList.remove("open");
  document.getElementById("overlay-dimmer").classList.remove("visible");
}

function showToast(msg) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}
