function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

/**
 * Static content definition shared by one or more generated floor instances.
 * It contains generation settings and variant metadata, never run progress.
 */
export default class FloorArchetype {
  constructor({
    id,
    name,
    description = "",
    generationOptions = {},
    variants = [{ id: "default", name: "Default", generationOverrides: {} }],
  } = {}) {
    if (typeof id !== "string" || id.trim() === "") {
      throw new TypeError("FloorArchetype requires a non-empty id.");
    }

    if (typeof name !== "string" || name.trim() === "") {
      throw new TypeError(`FloorArchetype "${id}" requires a non-empty name.`);
    }

    assertPlainObject(generationOptions, "generationOptions");

    if (!Array.isArray(variants) || variants.length === 0) {
      throw new TypeError(`FloorArchetype "${id}" requires at least one variant.`);
    }

    this.id = id;
    this.name = name;
    this.description = String(description);
    this.generationOptions = cloneSerializable(generationOptions);
    this.variants = new Map();

    for (const input of variants) {
      if (!input || typeof input.id !== "string" || input.id.trim() === "") {
        throw new TypeError(`Every variant in archetype "${id}" requires a non-empty id.`);
      }

      if (this.variants.has(input.id)) {
        throw new Error(`Duplicate variant id "${input.id}" in archetype "${id}".`);
      }

      const generationOverrides = input.generationOverrides ?? {};
      assertPlainObject(generationOverrides, `Variant "${input.id}" generationOverrides`);

      this.variants.set(input.id, {
        id: input.id,
        name: input.name ?? input.id,
        description: String(input.description ?? ""),
        generationOverrides: cloneSerializable(generationOverrides),
        visualThemeId: input.visualThemeId ?? null,
        enemyPoolId: input.enemyPoolId ?? null,
        bossPoolId: input.bossPoolId ?? null,
        metadata: cloneSerializable(input.metadata ?? {}),
      });
    }
  }

  getVariant(variantId) {
    const variant = this.variants.get(variantId);
    return variant ? cloneSerializable(variant) : null;
  }

  resolveGenerationOptions(variantId = "default") {
    const variant = this.variants.get(variantId);

    if (!variant) {
      throw new Error(
        `Variant "${variantId}" does not exist in floor archetype "${this.id}".`
      );
    }

    return {
      ...cloneSerializable(this.generationOptions),
      ...cloneSerializable(variant.generationOverrides),
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      generationOptions: cloneSerializable(this.generationOptions),
      variants: [...this.variants.values()].map(variant => cloneSerializable(variant)),
    };
  }

  static fromJSON(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      throw new TypeError("FloorArchetype.fromJSON requires an object snapshot.");
    }

    return new FloorArchetype(snapshot);
  }
}
