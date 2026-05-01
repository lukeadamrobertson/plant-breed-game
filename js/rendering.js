// ── Canvas Rendering System ──

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

// Grid placements array — defined in game.js, accessed via window
function getGridPlacements() { return window.gridPlacements || []; }

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Grid config — accessed from window (game.js loaded first)
const GRID_COLS = window.GRID_COLS;
const const_ROWS = window.const_ROWS;
const SLOT_W = 120;
const SLOT_H = 140;

function getGridOffset() {
  const totalW = GRID_COLS * SLOT_W;
  const totalH = const_ROWS * SLOT_H;
  return {
    x: (canvas.width - totalW) / 2 + SLOT_W / 2,
    y: canvas.height * 0.35 + SLOT_H / 2
  };
}

function getSlotBounds(col, row) {
  const off = getGridOffset();
  return {
    x: off.x + col * SLOT_W - SLOT_W / 2,
    y: off.y + row * SLOT_H - SLOT_H / 2,
    w: SLOT_W,
    h: SLOT_H
  };
}

function isSlotOccupied(col, row) {
  const placements = getGridPlacements();
  const placement = placements.find(p => p.col === col && p.row === row);
  return placement && placement.plantId;
}

function getPlantAtSlot(col, row) {
  const placements = getGridPlacements();
  const placement = placements.find(p => p.col === col && p.row === row);
  if (!placement) return null;
  return gameState.plants.find(p => p.id === placement.plantId) || null;
}

// ── Background ──

function drawBackground() {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
  skyGrad.addColorStop(0, "#87CEEB");
  skyGrad.addColorStop(1, "#b5e6a0");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ground
  const groundY = canvas.height * 0.35;
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, canvas.height);
  groundGrad.addColorStop(0, "#7ab552");
  groundGrad.addColorStop(0.3, "#6b9e4a");
  groundGrad.addColorStop(1, "#4a7a30");
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  // Subtle grass texture
  ctx.strokeStyle = "rgba(90,140,60,0.3)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 80; i++) {
    const gx = (i * 47 + 13) % canvas.width;
    const gy = groundY + ((i * 73 + 29) % (canvas.height - groundY));
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx - 2, gy - 6 - (i % 4));
    ctx.stroke();
  }
}

// ── Grid & Pots ──

function drawGrid() {
  for (let row = 0; row < const_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const bounds = getSlotBounds(col, row);
      const occupied = isSlotOccupied(col, row);

      // Pot base
      ctx.fillStyle = occupied ? "#c4845c" : "rgba(196,132,92,0.3)";
      ctx.strokeStyle = occupied ? "#8B5E3C" : "rgba(139,94,60,0.4)";
      ctx.lineWidth = 2;

      // Draw trapezoid pot
      const topW = SLOT_W * 0.85;
      const botW = SLOT_W * 0.6;
      const potH = 50;
      const py = bounds.y + SLOT_H / 2 - potH;

      ctx.beginPath();
      ctx.moveTo(bounds.x - topW / 2, py);
      ctx.lineTo(bounds.x + topW / 2, py);
      ctx.lineTo(bounds.x + botW / 2, py + potH);
      ctx.lineTo(bounds.x - botW / 2, py + potH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pot rim
      ctx.fillStyle = occupied ? "#d4966c" : "rgba(212,150,108,0.3)";
      ctx.fillRect(bounds.x - topW / 2 - 4, py - 6, topW + 8, 10);
      ctx.strokeStyle = occupied ? "#8B5E3C" : "rgba(139,94,60,0.4)";
      ctx.strokeRect(bounds.x - topW / 2 - 4, py - 6, topW + 8, 10);

      // Soil
      const soilW = botW - 8;
      ctx.fillStyle = occupied ? "#5a3d2b" : "rgba(90,61,43,0.3)";
      ctx.beginPath();
      ctx.ellipse(bounds.x, py + potH - 2, soilW / 2, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Highlight on empty slot when scissors tool is active
      if (!occupied && gameState.selectedTool === "scissors") {
        ctx.strokeStyle = "#90ee90";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(bounds.x - SLOT_W / 2 + 10, py - 10, SLOT_W - 20, SLOT_H - 5);
        ctx.setLineDash([]);
      }
    }
  }
}

// ── Plant Drawing Functions ──

function getAgeScale(state) {
  switch (state) {
    case "sprout": return 0.3;
    case "young": return 0.55;
    case "mature": return 0.85;
    case "elderly": return 0.9;
    case "dead": return 0.7;
  }
}

function drawPlant(plant, col, row) {
  const bounds = getSlotBounds(col, row);
  const cx = bounds.x;
  const cy = bounds.y + SLOT_H / 2 - 45;
  const scale = getAgeScale(plant.state);
  const p = plant.phenotype;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Get colors
  let leafColor = "#5a9e40";
  let flowerColor = "#e8a44a";
  let darkLeaf = "#3d7a28";
  if (TRAITS.colorPalette.alleles.find(a => a.symbol === p.colorPalette)?.symbol === "C") {
    leafColor = "#5a9e40"; flowerColor = "#e8a44a"; darkLeaf = "#3d7a28";
  } else {
    leafColor = "#4a8a7a"; flowerColor = "#7ac4b0"; darkLeaf = "#2d6b5c";
  }

  const stemHeight = p.height === "H" ? 70 : 40;

  // Stem
  ctx.strokeStyle = leafColor;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 25);
  // Slight curve for natural look
  ctx.quadraticCurveTo(p.stemPattern === "S" ? 8 : -3, stemHeight / 2, 0, -stemHeight + 10);
  ctx.stroke();

  // Stem pattern (stripes)
  if (p.stemPattern === "S") {
    ctx.strokeStyle = darkLeaf;
    ctx.lineWidth = 2;
    for (let i = 0; i < stemHeight; i += 8) {
      const t = i / stemHeight;
      const sx = lerp(0, (p.stemPattern === "S" ? 8 : -3), Math.sin(t * Math.PI));
      ctx.beginPath();
      ctx.moveTo(sx - 3, 25 - i);
      ctx.lineTo(sx + 3, 25 - i);
      ctx.stroke();
    }
  }

  // Leaves
  const leafCount = plant.state === "sprout" ? 1 : (plant.state === "young" ? 2 : 3);
  for (let i = 0; i < leafCount; i++) {
    const t = (i + 1) / (leafCount + 1);
    const ly = 25 - stemHeight * t;
    const side = i % 2 === 0 ? 1 : -1;
    const lx = lerp(0, (p.stemPattern === "S" ? 8 : -3), t) + side * 12;

    drawLeaf(ctx, p.leafShape, ly, lx, side, leafColor, darkLeaf);
  }

  // Flower (if mature or elderly)
  if (plant.state === "mature" || plant.state === "elderly") {
    const topX = lerp(0, (p.stemPattern === "S" ? 8 : -3), 1);
    const topY = -stemHeight + 10;
    drawFlower(ctx, p.flowerType, topX, topY, flowerColor, darkLeaf);
  }

  // Vines
  if (p.vinePresence === "V" && (plant.state === "mature" || plant.state === "elderly")) {
    for (let i = 0; i < 3; i++) {
      const t = 0.3 + i * 0.2;
      const vy = 25 - stemHeight * t;
      const vx = lerp(0, 8, t) + (i % 2 === 0 ? 18 : -18);
      drawVine(ctx, 0, vy, vx, vy + 20, leafColor);
    }
  }

  // Elderly overlay
  if (plant.state === "elderly") {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#8B7355";
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI + Math.random() * 0.1;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * 10, -stemHeight * 0.5 + Math.sin(angle) * 10, 25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Dead overlay
  if (plant.state === "dead") {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#6b5a40";
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * 12, -stemHeight * 0.3 + Math.sin(angle) * 5, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Water stress indicator
  if (plant.waterLevel < 0.3 && plant.state !== "dead") {
    ctx.fillStyle = "#555";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(":", 0, -stemHeight - 15);
  }

  ctx.restore();
}

function drawLeaf(ctx, shape, y, x, side, color, darkColor) {
  const size = shape === "Broad" ? 16 : 10;
  const length = shape === "Broad" ? 20 : 30;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(side * (shape === "Broad" ? -0.4 : -0.7));

  ctx.fillStyle = color;
  ctx.beginPath();
  if (shape === "Broad") {
    // Wide oval leaf
    ctx.ellipse(0, -length / 2, size, length / 2, 0, 0, Math.PI * 2);
  } else {
    // Narrow pointed leaf
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.6, -length * 0.3, 0, -length);
    ctx.quadraticCurveTo(-size * 0.6, -length * 0.3, 0, 0);
  }
  ctx.fill();

  // Leaf vein
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -length * 0.85);
  ctx.stroke();

  ctx.restore();
}

function drawFlower(ctx, type, x, y, petalColor, centerColor) {
  const size = type === "Rose" ? 14 : 10;
  const petalCount = type === "Rose" ? 5 : 6;

  // Petals
  ctx.fillStyle = petalColor;
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -size, size * 0.5, size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Center
  ctx.fillStyle = centerColor || "#ffd700";
  ctx.beginPath();
  ctx.arc(x, y, type === "Rose" ? 5 : 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawVine(ctx, x1, y1, x2, y2, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 10;
  ctx.quadraticCurveTo(mx, (y1 + y2) / 2, x2, y2);
  ctx.stroke();

  // Small leaf at curve midpoint
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(mx - 3, (y1 + y2) / 2, 4, 7, 0.3, 0, Math.PI * 2);
  ctx.fill();
}

// ── Mini plant for collection panel ──

function drawMiniPlant(ctx, cx, cy, phenotype, scale) {
  const s = scale || 1;
  const p = phenotype;

  // Simplified stem
  const stemH = p.height === "H" ? 25 * s : 14 * s;
  ctx.strokeStyle = p.colorPalette === "C" ? "#5a9e40" : "#4a8a7a";
  ctx.lineWidth = 2 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy + 12);
  ctx.quadraticCurveTo(3, cy - stemH / 2, cx, cy - stemH);
  ctx.stroke();

  // Mini leaves
  const leafCount = 2;
  for (let i = 0; i < leafCount; i++) {
    const t = (i + 1) / (leafCount + 1);
    const ly = cy + 12 - stemH * t;
    const lx = lerp(cx, cx + 3, t) + (i % 2 === 0 ? 8 * s : -8 * s);
    ctx.fillStyle = p.colorPalette === "C" ? "#5a9e40" : "#4a8a7a";
    ctx.beginPath();
    const sz = p.leafShape === "L" ? 6 * s : 4 * s;
    ctx.ellipse(lx, ly, sz, sz * 1.5, i % 2 === 0 ? -0.4 : 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mini flower
  if (stemH > 18) {
    const fc = p.colorPalette === "C" ? "#e8a44a" : "#7ac4b0";
    ctx.fillStyle = fc;
    for (let i = 0; i < (p.flowerType === "F" ? 5 : 6); i++) {
      const angle = (i / (p.flowerType === "F" ? 5 : 6)) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(angle) * 5 * s, cy - stemH + Math.sin(angle) * 5 * s, 3 * s, 4 * s, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(cx, cy - stemH, 2 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mini pot
  ctx.fillStyle = "#c4845c";
  ctx.beginPath();
  ctx.moveTo(cx - 10 * s, cy + 12);
  ctx.lineTo(cx + 10 * s, cy + 12);
  ctx.lineTo(cx + 7 * s, cy + 22);
  ctx.lineTo(cx - 7 * s, cy + 22);
  ctx.closePath();
  ctx.fill();
}

// ── Particles ──

let particles = [];

function spawnParticles(x, y, type, count) {
  const types = {
    water: { color: "#6baed6", size: [3, 6], speed: [0.5, 2], life: 40 },
    sparkle: { color: "#ffd700", size: [2, 5], speed: [0.8, 3], life: 50 },
    breed: { color: "#90ee90", size: [3, 6], speed: [1, 4], life: 60 },
    clone: { color: "#87ceeb", size: [2, 4], speed: [0.5, 2], life: 40 },
    death: { color: "#8B7355", size: [2, 5], speed: [0.3, 1.5], life: 80 }
  };

  const t = types[type] || types.sparkle;
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * t.speed[1] * 2,
      vy: -Math.random() * t.speed[1] - t.speed[0],
      size: t.size[0] + Math.random() * (t.size[1] - t.size[0]),
      color: t.color,
      life: t.life + Math.random() * 20,
      maxLife: t.life + 20,
      alpha: 1
    });
  }
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.03 * dt; // gravity
    p.life -= dt;
    p.alpha = Math.max(0, p.life / p.maxLife);
  }
  particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Visitors (butterflies, birds) ──

function drawVisitors() {
  const col = window.collection;
  if (!col) return;
  for (const v of col.visitors) {
    ctx.save();
    ctx.translate(v.x, v.y);

    const wingAngle = Math.sin(v.frame * 0.3) * 0.5;

    if (v.type === "butterfly") {
      // Wings
      ctx.fillStyle = "#ff8c42";
      ctx.save();
      ctx.rotate(-wingAngle);
      ctx.beginPath();
      ctx.ellipse(-6, 0, 7, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = "#ffb842";
      ctx.save();
      ctx.rotate(wingAngle);
      ctx.beginPath();
      ctx.ellipse(6, 0, 7, 5, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Body
      ctx.fillStyle = "#333";
      ctx.fillRect(-1, -4, 2, 8);

      // Antennae
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(-3, -9, -4, -10);
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(3, -9, 4, -10);
      ctx.stroke();

    } else if (v.type === "bird") {
      // Body
      ctx.fillStyle = "#4682b4";
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wings
      ctx.fillStyle = "#5f9ea0";
      ctx.save();
      ctx.rotate(-wingAngle * 1.5);
      ctx.beginPath();
      ctx.ellipse(0, -3, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Beak
      ctx.fillStyle = "#ffa500";
      ctx.beginPath();
      const dir = v.vx > 0 ? 1 : -1;
      ctx.moveTo(dir * 8, -1);
      ctx.lineTo(dir * 14, 0);
      ctx.lineTo(dir * 8, 2);
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(dir * 3, -2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(dir * 3.5, -2, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ── Drag Ghost ──

function drawDragGhost(dragState) {
  const plant = gameState.plants.find(p => p.id === dragState.draggedPlantId);
  if (!plant || isDead(plant)) return;

  ctx.globalAlpha = 0.55;
  ctx.save();
  ctx.translate(dragState.mouseX, dragState.mouseY - 20);
  ctx.scale(0.6, 0.6);

  // Simplified plant drawing for ghost
  const p = plant.phenotype;
  let leafColor = p.colorPalette === "C" ? "#5a9e40" : "#4a8a7a";
  let flowerColor = p.colorPalette === "C" ? "#e8a44a" : "#7ac4b0";
  const stemHeight = p.height === "H" ? 70 : 40;

  ctx.strokeStyle = leafColor;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 25);
  ctx.quadraticCurveTo(p.stemPattern === "S" ? 8 : -3, stemHeight / 2, 0, -stemHeight + 10);
  ctx.stroke();

  // Leaves
  const leafCount = plant.state === "sprout" ? 1 : (plant.state === "young" ? 2 : 3);
  for (let i = 0; i < leafCount; i++) {
    const t = (i + 1) / (leafCount + 1);
    const ly = 25 - stemHeight * t;
    const side = i % 2 === 0 ? 1 : -1;
    const lx = lerp(0, 8, t) + side * 12;
    drawLeaf(ctx, p.leafShape, ly, lx, side, leafColor, leafColor);
  }

  if (plant.state === "mature" || plant.state === "elderly") {
    drawFlower(ctx, p.flowerType, 0, -stemHeight + 10, flowerColor, "#ffd700");
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

// ── Drag Highlight on hover target ──

function drawDragHighlight(dragState) {
  const target = getPlantAtSlotForPos(dragState.mouseX, dragState.mouseY);
  if (!target || target.id === dragState.draggedPlantId) return;

  const bounds = getSlotBounds(target.col, target.row);
  ctx.strokeStyle = (isMature(target)) ? "#90ee90" : "#ff6b6b";
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(bounds.x - SLOT_W / 2 + 5, bounds.y - SLOT_H / 2 + 5, SLOT_W - 10, SLOT_H - 10);
  ctx.setLineDash([]);
}

function getPlantAtSlotForPos(mx, my) {
  for (let row = 0; row < const_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const plant = getPlantAtSlot(col, row);
      if (!plant || isDead(plant)) continue;
      const bounds = getSlotBounds(col, row);
      const dist = Math.hypot(mx - bounds.x, my - (bounds.y + SLOT_H / 2 - 30));
      if (dist < 45) return { ...plant, col, row };
    }
  }
  return null;
}

function getSlotForPos(mx, my) {
  const off = getGridOffset();
  const col = Math.floor((mx - off.x) / SLOT_W);
  const row = Math.floor((my - off.y) / SLOT_H);
  if (col >= 0 && col < GRID_COLS && row >= 0 && row < const_ROWS) {
    return { col, row };
  }
  return null;
}

// ── Main Render Function ──

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();
  drawGrid();

  // Draw plants in grid order
  const placements = getGridPlacements();
  for (let row = 0; row < const_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const placement = placements.find(p => p.col === col && p.row === row);
      if (!placement || !placement.plantId) continue;
      const plant = gameState.plants.find(p => p.id === placement.plantId);
      if (plant) drawPlant(plant, col, row);
    }
  }

  drawParticles();
  drawVisitors();

  // Drag feedback
  if (gameState.dragState.isDragging) {
    drawDragHighlight(gameState.dragState);
    drawDragGhost(gameState.dragState);
  }

  // Empty slot hint text
  const hasAnyPlants = gameState.plants.length > 0;
  if (hasAnyPlants && placements.filter(p => p.plantId).length < GRID_COLS * const_ROWS) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";

    // Find first empty slot for hint
    for (const p of placements) {
      if (!p.plantId) {
        const b = getSlotBounds(p.col, p.row);
        ctx.fillText("+", b.x, b.y + SLOT_H / 2 + 20);
        break;
      }
    }
  }
}
