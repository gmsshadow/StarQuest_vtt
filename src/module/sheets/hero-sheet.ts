import { rollStatTest } from "../helpers/rolls";
import { SQ } from "../helpers/config";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Hero character sheet. Mobile-friendly single-column layout with
 * large stat values, weapon table, collapsible skills, and an optional
 * spell panel for casters.
 */
export class HeroSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["star-quest", "sheet", "actor", "hero"],
    position: { width: 480, height: 720 },
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      rollStat: HeroSheet.#onRollStat,
      rollWeapon: HeroSheet.#onRollWeapon,
      rollSkill: HeroSheet.#onRollSkill,
      castSpell: HeroSheet.#onCastSpell,
      useConsumable: HeroSheet.#onUseConsumable,
      spendPower: HeroSheet.#onSpendPower,
      restorePower: HeroSheet.#onRestorePower,
      restAction: HeroSheet.#onRest,
      toggleCondition: HeroSheet.#onToggleCondition,
      editItem: HeroSheet.#onEditItem,
      deleteItem: HeroSheet.#onDeleteItem
    }
  };

  static PARTS = {
    body: { template: "systems/star-quest/templates/actor/hero-sheet.hbs" }
  };

  async _prepareContext(_options: unknown) {
    const actor = this.document as any;
    const sys = actor.system;

    const items = (type: string) => actor.items.filter((i: any) => i.type === type);

    return {
      actor,
      system: sys,
      editable: this.isEditable,
      weapons: items("weapon"),
      skills: items("skill"),
      spells: items("spell"),
      consumables: items("consumable"),
      injuries: items("injury"),
      specialRules: items("specialRule"),
      conditions: Object.entries(SQ.conditions).map(([id, label]) => ({
        id,
        label,
        active: actor.statuses?.has(id) ?? false
      }))
    };
  }

  // --- Action handlers -------------------------------------------------------

  static async #onRollStat(this: HeroSheet, _event: Event, target: HTMLElement) {
    const stat = target.dataset.stat!;
    const actor = this.document as any;
    const value = actor.system[stat];
    const label = `${stat.charAt(0).toUpperCase() + stat.slice(1)} Test`;
    await rollStatTest(actor, label, value);
  }

  static async #onRollWeapon(this: HeroSheet, _event: Event, target: HTMLElement) {
    const item = this.#getItem(target);
    if (!item) return;
    const actor = this.document as any;
    await rollStatTest(actor, `${item.name} — To-Hit`, actor.system.quality, item.system.attacks);
  }

  static async #onRollSkill(this: HeroSheet, _event: Event, target: HTMLElement) {
    const item = this.#getItem(target);
    if (!item) return;
    const actor = this.document as any;
    const tgt = item.system.rollTarget || actor.system[item.system.stat];
    await rollStatTest(actor, `${item.name}`, tgt);
  }

  static async #onCastSpell(this: HeroSheet, _event: Event, target: HTMLElement) {
    const item = this.#getItem(target);
    if (!item) return;
    const actor = this.document as any;
    await this.#adjustPower(-(item.system.cost ?? 0));
    await rollStatTest(actor, `Cast ${item.name}`, item.system.castingValue);
  }

  static async #onUseConsumable(this: HeroSheet, _event: Event, target: HTMLElement) {
    const item = this.#getItem(target);
    if (!item) return;
    const remaining = Math.max(0, (item.system.uses.value ?? 0) - 1);
    await item.update({ "system.uses.value": remaining });
  }

  static async #onSpendPower(this: HeroSheet) {
    await this.#adjustPower(-1);
  }

  static async #onRestorePower(this: HeroSheet) {
    await this.#adjustPower(1);
  }

  static async #onRest(this: HeroSheet) {
    const actor = this.document as any;
    await actor.update({ "system.power.value": actor.system.power.max });
  }

  static async #onToggleCondition(this: HeroSheet, _event: Event, target: HTMLElement) {
    const id = target.dataset.condition!;
    const actor = this.document as any;
    await actor.toggleStatusEffect(id);
  }

  static async #onEditItem(this: HeroSheet, _event: Event, target: HTMLElement) {
    this.#getItem(target)?.sheet?.render(true);
  }

  static async #onDeleteItem(this: HeroSheet, _event: Event, target: HTMLElement) {
    await this.#getItem(target)?.delete();
  }

  // --- Helpers ---------------------------------------------------------------

  #getItem(target: HTMLElement) {
    const id = target.closest<HTMLElement>("[data-item-id]")?.dataset.itemId;
    return id ? (this.document as any).items.get(id) : null;
  }

  /**
   * Adjust current Power. Positive delta restores (clamped to max).
   *
   * Per the rules (p.7): if a hero spends or loses more power than it has,
   * it takes as many wounds as the power it could not pay from its pool.
   * Power floors at 0 and the shortfall is added to wounds (uncapped —
   * the Down/killed check compares wounds vs Toughness separately).
   */
  async #adjustPower(delta: number) {
    const actor = this.document as any;
    const cur = actor.system.power.value;
    const max = actor.system.power.max;
    const next = cur + delta;

    if (next < 0) {
      const overflow = -next; // power that couldn't be paid from the pool
      await actor.update({
        "system.power.value": 0,
        "system.wounds": actor.system.wounds + overflow
      });
      ui.notifications?.warn(
        `Out of Power — ${overflow} wound${overflow === 1 ? "" : "s"} taken instead.`
      );
      return;
    }
    await actor.update({ "system.power.value": Math.min(max, next) });
  }
}
