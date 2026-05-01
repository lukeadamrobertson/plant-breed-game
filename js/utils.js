// Utility functions

function uuid() {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Generate a deterministic name from phenotype
function plantName(phenotype) {
  // Map allele symbols to display-friendly names
  const nameMap = {
    L: "Leafy", l: "Nimble", F: "Rosy", f: "Daisy", S: "Stripe", s: "Smooth", V: "Viney", v: "Sturdy", C: "Sun", c: "Moon", H: "Tall", h: "Puff"
  };
  const suffixMap = {
    L: "fern", l: "grass", F: "bloom", f: "bud", S: "stem", s: "leaf", V: "ivy", v: "vine", C: "rose", c: "moss", H: "tower", h: "ball"
  };
  const p = phenotype;
  const prefix = nameMap[p.leafShape] || nameMap[p.height] || "Green";
  const suffix = suffixMap[p.flowerType] || suffixMap[p.colorPalette] || "plant";
  return `${prefix} ${suffix}`;
}
