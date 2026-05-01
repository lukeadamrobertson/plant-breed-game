// ── Trait Definitions ──
// 6 traits, each with 2 alleles (dominant uppercase / recessive lowercase)

const TRAITS = {
  leafShape: {
    displayName: "Leaf Shape",
    alleles: [
      { symbol: "L", name: "Broad Leaf", dominant: true },
      { symbol: "l", name: "Narrow Leaf", dominant: false }
    ]
  },
  flowerType: {
    displayName: "Flower Type",
    alleles: [
      { symbol: "F", name: "Rose Bloom", dominant: true },
      { symbol: "f", name: "Daisy Bud", dominant: false }
    ]
  },
  stemPattern: {
    displayName: "Stem Pattern",
    alleles: [
      { symbol: "S", name: "Striped Stem", dominant: true },
      { symbol: "s", name: "Smooth Stem", dominant: false }
    ]
  },
  vinePresence: {
    displayName: "Vine Presence",
    alleles: [
      { symbol: "V", name: "Vining", dominant: true },
      { symbol: "v", name: "No Vine", dominant: false }
    ]
  },
  colorPalette: {
    displayName: "Color Palette",
    alleles: [
      { symbol: "C", name: "Warm Tones", dominant: true },
      { symbol: "c", name: "Cool Tones", dominant: false }
    ],
    colors: {
      C: { leaf: "#5a9e40", accent: "#d4763a", flower: "#e8a44a", darkLeaf: "#3d7a28" },
      c: { leaf: "#4a8a7a", accent: "#5bb8a2", flower: "#7ac4b0", darkLeaf: "#2d6b5c" }
    }
  },
  height: {
    displayName: "Height Class",
    alleles: [
      { symbol: "H", name: "Tall Stalk", dominant: true },
      { symbol: "h", name: "Short Stalk", dominant: false }
    ]
  }
};

const TRAIT_KEYS = Object.keys(TRAITS);

// ── Genotype / Phenotype ──

function createRandomGenotype() {
  const genotype = {};
  for (const key of TRAIT_KEYS) {
    const alleles = TRAITS[key].alleles.map(a => a.symbol);
    genotype[key] = [alleles[Math.floor(Math.random() * 2)], alleles[Math.floor(Math.random() * 2)]];
  }
  return genotype;
}

function createStarterGenotype(dominantTraitCount) {
  // Each starter has ~3 dominant alleles showing (heterozygous at most loci)
  const genotype = {};
  for (const key of TRAIT_KEYS) {
    const traitDef = TRAITS[key];
    const isDominant = traitDef.alleles.findIndex(a => a.dominant);
    if (dominantTraitCount > 0 && Math.random() < dominantTraitCount / TRAIT_KEYS.length) {
      genotype[key] = [traitDef.alleles[isDominant].symbol, traitDef.alleles[1 - isDominant].symbol];
    } else {
      genotype[key] = [traitDef.alleles[1 - isDominant].symbol, traitDef.alleles[isDominant].symbol];
    }
  }
  return genotype;
}

function computePhenotype(genotype) {
  const phenotype = {};
  for (const [key, alleles] of Object.entries(genotype)) {
    if (alleles[0] === alleles[1]) {
      phenotype[key] = alleles[0];
    } else {
      // Heterozygous: express dominant allele
      const dominantAllele = TRAITS[key].alleles.find(a => a.dominant);
      phenotype[key] = dominantAllele.symbol;
    }
  }
  return phenotype;
}

// ── Breeding Inheritance ──

function breedGenotypes(parentA, parentB) {
  const offspringGenotype = {};

  for (const key of TRAIT_KEYS) {
    const traitDef = TRAITS[key];
    let allelesA = [...parentA.genotype[key]];
    let allelesB = [...parentB.genotype[key]];

    shuffle(allelesA);
    shuffle(allelesB);

    // Parent A contributes 0, 1, or 2 alleles; B fills the rest to make 2
    const aContribution = Math.floor(Math.random() * 3);
    let chosenAlleles = [];

    if (aContribution === 0) {
      shuffle(allelesB);
      chosenAlleles = [allelesB[0], allelesB[1]];
    } else if (aContribution === 2) {
      shuffle(allelesA);
      chosenAlleles = [allelesA[0], allelesA[1]];
    } else {
      chosenAlleles = [allelesA[0], allelesB[0]];
    }

    // 15% chance of allele "swap" (recessive surfacing)
    if (Math.random() < 0.15) {
      const idx = Math.floor(Math.random() * 2);
      const current = chosenAlleles[idx];
      const opposite = traitDef.alleles.find(a => a.symbol !== current).symbol;
      chosenAlleles[idx] = opposite;
    }

    offspringGenotype[key] = chosenAlleles;
  }

  return offspringGenotype;
}

// ── Lifespan / Rarity ──

function computeMaxLifespan(genotype) {
  let base = 4;
  for (const alleles of Object.values(genotype)) {
    if (alleles[0] === alleles[1]) {
      const traitKey = TRAIT_KEYS.find(k => JSON.stringify(genotype[k]) === JSON.stringify(alleles));
      if (traitKey && TRAITS[traitKey].alleles.find(a => a.symbol === alleles[0]).dominant) {
        base += 1;
      }
    }
  }
  return Math.min(base, 8);
}

function evaluateRarity(genotype) {
  let homoCount = 0;
  for (const alleles of Object.values(genotype)) {
    if (alleles[0] === alleles[1]) homoCount++;
  }

  const tiers = [
    { name: "Legendary", color: "#fa0", count: 6 },
    { name: "Epic",     color: "#a6f", count: 5 },
    { name: "Rare",     color: "#58c", count: 4 },
    { name: "Uncommon", color: "#4a9", count: 3 }
  ];

  for (const tier of tiers) {
    if (homoCount >= tier.count) return tier;
  }
  return { name: "Common", color: "#aaa" };
}

// ── Starter Plant Data ──

function createStarterPlant(index) {
  const starters = [
    { name: "Sunny", desc: "A cheerful sprout with broad leaves and warm colors" },
    { name: "Shadow", desc: "A mysterious plant thriving in cool tones and narrow leaves" },
    { name: "Misty", desc: "A gentle soul with delicate daisy buds and smooth stems" }
  ];

  const dominantCounts = [5, 2, 3]; // How many dominant traits each starter leans toward
  const genotype = createStarterGenotype(dominantCounts[index]);
  const phenotype = computePhenotype(genotype);

  return {
    id: uuid(),
    name: starters[index].name,
    description: starters[index].desc,
    generation: 0,
    age: 0,
    genotype,
    phenotype,
    secondaryTraits: {
      potType: "terracotta",
      soilColor: "dark"
    },
    state: "sprout",
    maxLifespan: computeMaxLifespan({ genotype }),
    waterLevel: 1.0,
    fertilizerBoost: 0,
    parentIds: [],
    historyBredWith: []
  };
}
