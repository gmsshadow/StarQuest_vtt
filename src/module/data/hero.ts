import { fields, intField, strField, htmlField, resourceField } from "./fields";

/**
 * Hero — the player-controlled character.
 * All stats are D6 target numbers: a test succeeds on a roll >= the stat value.
 */
export class HeroData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      faction: strField(),
      class: strField(),
      level: intField(1, { min: 1 }),
      xp: intField(0, { min: 0 }),
      credits: intField(0, { min: 0 }),

      // Core D6 target-number stats. Lower is better; 2+ is elite, 6+ is poor.
      quality: intField(4, { min: 2, max: 6 }),
      defense: intField(4, { min: 2, max: 6 }),
      toughness: intField(3, { min: 1 }),
      strength: intField(4, { min: 2, max: 6 }),
      dexterity: intField(4, { min: 2, max: 6 }),
      willpower: intField(4, { min: 2, max: 6 }),

      power: resourceField(0, 0),

      // Damage accumulator. Hero falls unconscious when wounds >= toughness.
      wounds: intField(0, { min: 0 }),

      // Caster flag drives whether the Spells panel renders on the sheet.
      isCaster: new fields.BooleanField({ initial: false }),

      notes: htmlField(),
      biography: htmlField()
    };
  }

  /** Derived data computed after source data is prepared. */
  prepareDerivedData() {
    const sys = this as any;
    sys.isDown = sys.wounds >= sys.toughness;
    sys.woundsRemaining = Math.max(0, sys.toughness - sys.wounds);
  }
}
