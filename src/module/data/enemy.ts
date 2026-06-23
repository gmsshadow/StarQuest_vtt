import { fields, intField, strField, htmlField } from "./fields";

/**
 * Enemy — an AI-controlled unit.
 */
export class EnemyData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      quality: intField(4, { min: 2, max: 6 }),
      defense: intField(4, { min: 2, max: 6 }),
      toughness: intField(3, { min: 1 }),
      unitSize: intField(1, { min: 1 }),
      pointCost: intField(0, { min: 0 }),
      wounds: intField(0, { min: 0 }),
      notes: htmlField()
    };
  }

  prepareDerivedData() {
    const sys = this as any;
    sys.isDefeated = sys.wounds >= sys.toughness;
  }
}

/**
 * Objective — a mission marker tracked on a scene.
 */
export class ObjectiveData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      objectiveType: new fields.StringField({
        required: true,
        initial: "primary",
        choices: { primary: "Primary", secondary: "Secondary", bonus: "Bonus" }
      }),
      progress: intField(0, { min: 0 }),
      target: intField(1, { min: 1 }),
      completed: new fields.BooleanField({ initial: false }),
      notes: htmlField()
    };
  }

  prepareDerivedData() {
    const sys = this as any;
    if (sys.target > 0 && sys.progress >= sys.target) sys.completed = true;
  }
}
