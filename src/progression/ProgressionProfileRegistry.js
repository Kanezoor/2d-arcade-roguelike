function cloneSerializable(value, label) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    throw new TypeError(`${label} must contain only JSON-serializable data.`);
  }
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function assertProfileId(id, label) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new TypeError(`${label} requires a non-empty id.`);
  }
}

function mergeDeep(base, override) {
  const result = cloneSerializable(base ?? {}, "Profile data");
  if (override == null) return result;
  assertPlainObject(override, "Profile override");

  for (const [key, value] of Object.entries(override)) {
    if (
      value && typeof value === "object" && !Array.isArray(value) &&
      result[key] && typeof result[key] === "object" && !Array.isArray(result[key])
    ) {
      result[key] = mergeDeep(result[key], value);
    } else {
      result[key] = cloneSerializable(value, `Profile override.${key}`);
    }
  }
  return result;
}

function normalizeStage(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Progression stages must be objects.");
  }
  assertProfileId(input.id, "Progression stage");
  const minDepth = input.minDepth ?? 1;
  const maxDepth = input.maxDepth ?? null;
  if (!Number.isInteger(minDepth) || minDepth < 1) {
    throw new TypeError(`Stage "${input.id}" minDepth must be a positive integer.`);
  }
  if (maxDepth !== null && (!Number.isInteger(maxDepth) || maxDepth < minDepth)) {
    throw new TypeError(`Stage "${input.id}" maxDepth must be null or an integer >= minDepth.`);
  }
  for (const key of ["generationOptions", "contentPools", "difficulty"]) {
    if (input[key] !== undefined) assertPlainObject(input[key], `Stage "${input.id}" ${key}`);
  }
  return {
    id: input.id,
    name: String(input.name ?? input.id),
    minDepth,
    maxDepth,
    generationOptions: cloneSerializable(input.generationOptions ?? {}, `Stage "${input.id}" generationOptions`),
    contentPools: cloneSerializable(input.contentPools ?? {}, `Stage "${input.id}" contentPools`),
    difficulty: cloneSerializable(input.difficulty ?? {}, `Stage "${input.id}" difficulty`),
  };
}

function normalizeOverlay(input, label) {
  if (!input || typeof input !== "object") {
    throw new TypeError(`${label} must be an object.`);
  }
  assertProfileId(input.id, label);
  const generationOverrides = input.generationOverrides ?? {};
  const contentPoolOverrides = input.contentPoolOverrides ?? {};
  const difficultyOverrides = input.difficultyOverrides ?? {};
  assertPlainObject(generationOverrides, `${label} "${input.id}" generationOverrides`);
  assertPlainObject(contentPoolOverrides, `${label} "${input.id}" contentPoolOverrides`);
  assertPlainObject(difficultyOverrides, `${label} "${input.id}" difficultyOverrides`);
  return {
    id: input.id,
    name: String(input.name ?? input.id),
    generationOverrides: cloneSerializable(generationOverrides, `${label} "${input.id}" generationOverrides`),
    contentPoolOverrides: cloneSerializable(contentPoolOverrides, `${label} "${input.id}" contentPoolOverrides`),
    difficultyOverrides: cloneSerializable(difficultyOverrides, `${label} "${input.id}" difficultyOverrides`),
  };
}

/**
 * Resolves depth stages, route-specific overlays and run modifiers into one
 * immutable-ish generation snapshot. This class only handles data; it does not
 * generate rooms or create runtime entities.
 */
export default class ProgressionProfileRegistry {
  constructor({ stages = [], paths = [{ id: "default" }], modifiers = [] } = {}) {
    if (!Array.isArray(stages) || stages.length === 0) {
      throw new TypeError("ProgressionProfileRegistry requires at least one stage.");
    }
    if (!Array.isArray(paths) || !Array.isArray(modifiers)) {
      throw new TypeError("Progression paths and modifiers must be arrays.");
    }

    this.stages = new Map();
    this.paths = new Map();
    this.modifiers = new Map();

    for (const stage of stages) this.registerStage(stage);
    for (const path of paths) this.registerPath(path);
    for (const modifier of modifiers) this.registerModifier(modifier);

    if (!this.paths.has("default")) {
      this.registerPath({ id: "default", name: "Default" });
    }
    this.assertStagesDoNotOverlap();
  }

  registerStage(input) {
    const stage = normalizeStage(input);
    if (this.stages.has(stage.id)) throw new Error(`Duplicate progression stage "${stage.id}".`);
    this.stages.set(stage.id, stage);
    this.assertStagesDoNotOverlap();
    return cloneSerializable(stage, `Stage "${stage.id}"`);
  }

  registerPath(input) {
    const path = normalizeOverlay(input, "Progression path");
    if (this.paths.has(path.id)) throw new Error(`Duplicate progression path "${path.id}".`);
    this.paths.set(path.id, path);
    return cloneSerializable(path, `Path "${path.id}"`);
  }

  registerModifier(input) {
    const modifier = normalizeOverlay(input, "Run modifier");
    if (this.modifiers.has(modifier.id)) throw new Error(`Duplicate run modifier "${modifier.id}".`);
    this.modifiers.set(modifier.id, modifier);
    return cloneSerializable(modifier, `Modifier "${modifier.id}"`);
  }

  assertStagesDoNotOverlap() {
    const stages = [...this.stages.values()].sort((a, b) => a.minDepth - b.minDepth);
    for (let index = 1; index < stages.length; index++) {
      const previous = stages[index - 1];
      const current = stages[index];
      if (previous.maxDepth === null || current.minDepth <= previous.maxDepth) {
        throw new Error(
          `Progression stages "${previous.id}" and "${current.id}" overlap in depth.`,
        );
      }
    }
  }

  getStageForDepth(depth) {
    if (!Number.isInteger(depth) || depth < 1) {
      throw new TypeError("Progression depth must be a positive integer.");
    }
    return [...this.stages.values()].find(stage => (
      depth >= stage.minDepth && (stage.maxDepth === null || depth <= stage.maxDepth)
    )) ?? null;
  }

  resolve(context) {
    if (!context || typeof context !== "object") {
      throw new TypeError("ProgressionProfileRegistry.resolve requires a progression context.");
    }
    const depth = context.depth;
    const pathId = context.pathId ?? "default";
    const modifierIds = context.modifierIds ?? [];
    const stage = this.getStageForDepth(depth);
    if (!stage) {
      throw new RangeError(`No progression stage is configured for depth ${depth}.`);
    }
    const path = this.paths.get(pathId);
    if (!path) throw new Error(`Unknown progression path "${pathId}".`);
    if (!Array.isArray(modifierIds)) {
      throw new TypeError("Progression modifierIds must be an array.");
    }

    let generationOptions = cloneSerializable(stage.generationOptions, "Stage generationOptions");
    let contentPools = cloneSerializable(stage.contentPools, "Stage contentPools");
    let difficulty = cloneSerializable(stage.difficulty, "Stage difficulty");

    const overlays = [path];
    const sortedModifierIds = [...new Set(modifierIds)].sort();
    for (const modifierId of sortedModifierIds) {
      const modifier = this.modifiers.get(modifierId);
      if (!modifier) throw new Error(`Unknown run modifier "${modifierId}".`);
      overlays.push(modifier);
    }

    for (const overlay of overlays) {
      generationOptions = mergeDeep(generationOptions, overlay.generationOverrides);
      contentPools = mergeDeep(contentPools, overlay.contentPoolOverrides);
      difficulty = mergeDeep(difficulty, overlay.difficultyOverrides);
    }

    const budgetBase = difficulty.encounterBudgetBase ?? 10;
    const budgetPerDepth = difficulty.encounterBudgetPerDepth ?? 0;
    const budgetCap = difficulty.encounterBudgetCap ?? null;
    if (!Number.isFinite(budgetBase) || budgetBase < 0) {
      throw new TypeError(`Stage "${stage.id}" encounterBudgetBase must be non-negative.`);
    }
    if (!Number.isFinite(budgetPerDepth) || budgetPerDepth < 0) {
      throw new TypeError(`Stage "${stage.id}" encounterBudgetPerDepth must be non-negative.`);
    }
    if (budgetCap !== null && (!Number.isFinite(budgetCap) || budgetCap < 0)) {
      throw new TypeError(`Stage "${stage.id}" encounterBudgetCap must be null or non-negative.`);
    }

    let encounterBudget = budgetBase + budgetPerDepth * (depth - stage.minDepth);
    if (budgetCap !== null) encounterBudget = Math.min(encounterBudget, budgetCap);

    const profileId = [stage.id, path.id, ...sortedModifierIds].join("+");
    return {
      id: profileId,
      stageId: stage.id,
      stageName: stage.name,
      depth,
      pathId,
      modifierIds: sortedModifierIds,
      generationOptions,
      contentPools,
      difficulty: {
        ...difficulty,
        encounterBudget,
      },
    };
  }
}

export function createDefaultProgressionProfileRegistry() {
  return new ProgressionProfileRegistry({
    stages: [
      {
        id: "early",
        name: "Early Game",
        minDepth: 1,
        maxDepth: 2,
        generationOptions: {
          minRooms: 10,
          maxRooms: 12,
          roomTemplateWeights: {
            square: 8,
            rectangle: 2,
            diamond: 0,
            octagon: 0,
            circle: 0,
          },
          roomFootprintWeights: { "1x1": 1 },
          roomSizeWeights: { small: 1, medium: 4, large: 0 },
          roomTypeWeights: { combat: 100, treasure: 10, shop: 6, special: 0 },
          guaranteedRoomTypes: ["treasure", "shop"],
        },
        contentPools: {
          enemyPoolId: "basic",
          roomLayoutPoolId: "starter",
          obstaclePoolId: "minimal",
          rewardPoolId: "starter",
        },
        difficulty: {
          encounterBudgetBase: 10,
          encounterBudgetPerDepth: 2,
          encounterBudgetCap: 14,
          maxEnemyTier: 1,
          eliteWeight: 0,
        },
      },
      {
        id: "middle",
        name: "Mid Game",
        minDepth: 3,
        maxDepth: 4,
        generationOptions: {
          minRooms: 10,
          maxRooms: 14,
          roomTemplateWeights: {
            square: 4,
            rectangle: 4,
            diamond: 1,
            octagon: 1,
            circle: 0.5,
          },
          roomFootprintWeights: { "1x1": 8, "2x1": 1, "1x2": 1, "2x2": 0 },
          roomSizeWeights: { small: 1, medium: 5, large: 2 },
          roomTypeWeights: { combat: 100, treasure: 12, shop: 7, special: 2 },
          guaranteedRoomTypes: ["treasure", "shop"],
        },
        contentPools: {
          enemyPoolId: "expanded",
          roomLayoutPoolId: "intermediate",
          obstaclePoolId: "mixed",
          rewardPoolId: "standard",
        },
        difficulty: {
          encounterBudgetBase: 16,
          encounterBudgetPerDepth: 3,
          encounterBudgetCap: 24,
          maxEnemyTier: 2,
          eliteWeight: 1,
        },
      },
      {
        id: "late",
        name: "Late Game",
        minDepth: 5,
        maxDepth: null,
        generationOptions: {
          minRooms: 11,
          maxRooms: 15,
          roomTemplateWeights: {
            square: 2,
            rectangle: 3,
            diamond: 2,
            octagon: 2,
            circle: 1,
          },
          roomFootprintWeights: { "1x1": 5, "2x1": 2, "1x2": 2, "2x2": 1 },
          roomSizeWeights: { small: 1, medium: 4, large: 3 },
          roomTypeWeights: { combat: 100, treasure: 15, shop: 8, special: 5 },
          guaranteedRoomTypes: ["treasure", "shop"],
        },
        contentPools: {
          enemyPoolId: "advanced",
          roomLayoutPoolId: "complex",
          obstaclePoolId: "dangerous",
          rewardPoolId: "enhanced",
        },
        difficulty: {
          encounterBudgetBase: 22,
          encounterBudgetPerDepth: 4,
          encounterBudgetCap: 40,
          maxEnemyTier: 3,
          eliteWeight: 2,
        },
      },
    ],
    paths: [{ id: "default", name: "Default Path" }],
    modifiers: [],
  });
}
