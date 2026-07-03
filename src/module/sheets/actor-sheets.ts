import { rollStatTest } from "../helpers/rolls";
import { AttackResolver } from "../combat/attack-resolver";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/** Enemy stat-block sheet. */
export class EnemySheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["star-quest", "sheet", "actor", "enemy"],
    position: { width: 420, height: 560 },
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      rollStat: EnemySheet.#onRollStat,
      rollWeapon: EnemySheet.#onRollWeapon,
      editItem: EnemySheet.#onEditItem,
      deleteItem: EnemySheet.#onDeleteItem
    }
  };

  static PARTS = {
    body: { template: "systems/star-quest/templates/actor/enemy-sheet.hbs" }
  };

  async _prepareContext(_options: unknown) {
    const actor = this.document as any;
    return {
      actor,
      system: actor.system,
      editable: this.isEditable,
      weapons: actor.items.filter((i: any) => i.type === "weapon"),
      specialRules: actor.items.filter((i: any) => i.type === "specialRule")
    };
  }

  static async #onRollStat(this: EnemySheet, _e: Event, target: HTMLElement) {
    const stat = target.dataset.stat!;
    const actor = this.document as any;
    await rollStatTest(actor, `${stat} Test`, actor.system[stat]);
  }

  static async #onRollWeapon(this: EnemySheet, _e: Event, target: HTMLElement) {
    const id = target.closest<HTMLElement>("[data-item-id]")?.dataset.itemId;
    const item = (this.document as any).items.get(id);
    if (!item) return;
    const actor = this.document as any;
    new AttackResolver({ attacker: actor, weapon: item }).render(true);
  }

  static async #onEditItem(this: EnemySheet, _e: Event, target: HTMLElement) {
    const id = target.closest<HTMLElement>("[data-item-id]")?.dataset.itemId;
    (this.document as any).items.get(id)?.sheet?.render(true);
  }

  static async #onDeleteItem(this: EnemySheet, _e: Event, target: HTMLElement) {
    const id = target.closest<HTMLElement>("[data-item-id]")?.dataset.itemId;
    await (this.document as any).items.get(id)?.delete();
  }
}

/** Objective marker sheet. */
export class ObjectiveSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["star-quest", "sheet", "actor", "objective"],
    position: { width: 380, height: 420 },
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      addProgress: ObjectiveSheet.#onAddProgress,
      removeProgress: ObjectiveSheet.#onRemoveProgress
    }
  };

  static PARTS = {
    body: { template: "systems/star-quest/templates/actor/objective-sheet.hbs" }
  };

  async _prepareContext(_options: unknown) {
    const actor = this.document as any;
    return { actor, system: actor.system, editable: this.isEditable };
  }

  static async #onAddProgress(this: ObjectiveSheet) {
    const actor = this.document as any;
    await actor.update({ "system.progress": actor.system.progress + 1 });
  }

  static async #onRemoveProgress(this: ObjectiveSheet) {
    const actor = this.document as any;
    await actor.update({ "system.progress": Math.max(0, actor.system.progress - 1) });
  }
}
