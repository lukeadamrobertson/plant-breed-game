// ── Plant Entity Creation ──

const STAGES = ["sprout", "young", "mature", "elderly", "dead"];
const AGE_THRESHOLDS = { sprout: 0, young: 10, mature: 25, elderly: 40, dead: 55 };

function createPlant(genotype, parentA, parentB) {
  const phenotype = computePhenotype(genotype);
  const maxLifespan = computeMaxLifespan({ genotype });
  const generation = Math.max(parentA.generation, parentB.generation) + 1;

  return {
    id: uuid(),
    name: plantName(phenotype),
    generation,
    age: 0,
    genotype,
    phenotype,
    secondaryTraits: { potType: "terracotta", soilColor: "dark" },
    state: "sprout",
    maxLifespan,
    waterLevel: 1.0,
    fertilizerBoost: 0,
    parentIds: [parentA.id, parentB.id],
    historyBredWith: []
  };
}

function clonePlant(parent) {
  return {
    id: uuid(),
    name: parent.name + "'s Sprout",
    generation: parent.generation + 1,
    age: 0,
    genotype: JSON.parse(JSON.stringify(parent.genotype)),
    phenotype: { ...parent.phenotype },
    secondaryTraits: { ...parent.secondaryTraits },
    state: "sprout",
    maxLifespan: parent.maxLifespan,
    waterLevel: 1.0,
    fertilizerBoost: 0,
    parentIds: [parent.id],
    historyBredWith: []
  };
}

// ── Lifecycle Management ──

function getStage(age) {
  if (age >= AGE_THRESHOLDS.dead) return "dead";
  if (age >= AGE_THRESHOLDS.elderly) return "elderly";
  if (age >= AGE_THRESHOLDS.mature) return "mature";
  if (age >= AGE_THRESHOLDS.young) return "young";
  return "sprout";
}

function applyCare(plant, careType) {
  const isElderly = plant.state === "elderly";
  let ageGain = isElderly ? 0.7 : 1;

  switch (careType) {
    case "water":
      plant.waterLevel = Math.min(1.0, plant.waterLevel + 0.35);
      if (plant.waterLevel < 0.3) ageGain *= 0.5; // stressed plants grow slower even when watered
      break;
    case "fertilizer":
      plant.fertilizerBoost = 3;
      break;
  }

  plant.age += ageGain + (plant.fertilizerBoost > 0 ? 1 : 0);
  if (plant.fertilizerBoost > 0) plant.fertilizerBoost--;

  const newStage = getStage(Math.floor(plant.age));
  if (newStage !== plant.state) {
    plant.state = newStage;
    return { stageChanged: true, newStage };
  }
  return { stageChanged: false };
}

function depleteWater(plant, dt) {
  // Slow depletion (~0.001 per frame = ~0.06/sec at 60fps → ~17s to empty)
  plant.waterLevel = Math.max(0, plant.waterLevel - 0.0008 * dt);

  // Stress penalty: if water < 0.3, halt aging temporarily
  if (plant.waterLevel < 0.3 && (plant.state === "mature" || plant.state === "elderly")) {
    plant.age -= 0.0005 * dt; // negligible reverse to simulate stress
  }

  // Update state based on current age
  const newStage = getStage(Math.floor(plant.age));
  if (newStage !== plant.state) {
    const oldState = plant.state;
    plant.state = newStage;
    return { stageChanged: true, oldStage: oldState, newStage };
  }
  return { stageChanged: false };
}

function isMature(plant) {
  return plant.state === "mature" || plant.state === "elderly";
}

function isDead(plant) {
  return plant.state === "dead";
}
