import { fields, intField, strField, htmlField } from "./fields";

/** Weapon — attack profile rolled against Quality. */
export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      range: intField(0, { min: 0 }),       // 0 = melee
      attacks: intField(1, { min: 1 }),
      ap: intField(0, { min: 0 }),          // armor piercing
      special: strField(),
      description: htmlField()
    };
  }

  get isMelee() {
    return (this as any).range === 0;
  }
}

/** Skill — a learned action tied to a stat, with a roll target. */
export class SkillData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      stat: new fields.StringField({
        required: true,
        initial: "quality",
        choices: {
          quality: "Quality",
          defense: "Defense",
          strength: "Strength",
          dexterity: "Dexterity",
          willpower: "Willpower"
        }
      }),
      rollTarget: intField(0, { min: 0 }),   // 0 = use the linked stat's value
      cost: intField(0, { min: 0 }),
      description: htmlField()
    };
  }
}

/** Spell — cast against a casting value, costs Power. */
export class SpellData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      castingValue: intField(4, { min: 2, max: 6 }),
      cost: intField(1, { min: 0 }),         // Power spent to cast
      range: intField(0, { min: 0 }),
      effects: htmlField(),
      description: htmlField()
    };
  }
}

/** Consumable — limited-use item. */
export class ConsumableData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      uses: new fields.SchemaField({
        value: intField(1, { min: 0 }),
        max: intField(1, { min: 0 })
      }),
      effect: htmlField()
    };
  }
}

/** Injury — a lasting campaign condition with mechanical effects. */
export class InjuryData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      mechanicalEffects: htmlField()
    };
  }
}

/** Special Rule — a reusable named rule definition. */
export class SpecialRuleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: htmlField()
    };
  }
}
