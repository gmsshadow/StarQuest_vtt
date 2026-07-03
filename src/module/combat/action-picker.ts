import { SQ } from "../helpers/config";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Action picker. Chains automatically after a unit is chosen in the activation
 * picker. Presents the six Star Quest actions; the selection is stored on the
 * combatant as a placeholder (no mechanical effect yet) and posted to chat.
 */
export class ActionPicker extends HandlebarsApplicationMixin(ApplicationV2) {
  combat: any;
  combatant: any;

  constructor(combat: any, combatant: any, options: any = {}) {
    super(options);
    this.combat = combat;
    this.combatant = combatant;
  }

  static DEFAULT_OPTIONS = {
    id: "sq-action-picker",
    classes: ["star-quest", "sq-panel", "sq-action-picker"],
    tag: "div",
    window: { title: "SQ.Action.Title", resizable: false },
    position: { width: 340, height: "auto" as const },
    actions: {
      confirm: ActionPicker.#onConfirm
    }
  };

  static PARTS = {
    body: { template: "systems/star-quest/templates/apps/action-picker.hbs" }
  };

  async _prepareContext(_options: unknown) {
    const current = this.combatant?.getFlag?.("star-quest", "action") ?? "hold";
    return {
      unitName: this.combatant?.name ?? "Unit",
      actions: Object.entries(SQ.actions).map(([key, def]) => ({
        key,
        label: def.label,
        hint: def.hint,
        selected: key === current
      }))
    };
  }

  static async #onConfirm(this: ActionPicker) {
    const select = this.element.querySelector("select.sq-action") as HTMLSelectElement | null;
    const key = select?.value ?? "hold";
    const def = SQ.actions[key];
    if (!this.combatant) return this.close();

    await this.combatant.setFlag("star-quest", "action", key);

    // Post to chat so the table sees the declared action.
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.combatant.actor }),
      content: `
        <div class="star-quest sq-action-card">
          <strong>${this.combatant.name}</strong> declares:
          <span class="sq-action-name">${def?.label ?? key}</span>
          <div class="sq-action-hint">${def?.hint ?? ""}</div>
        </div>`
    });

    // Refresh the tracker so the row shows the chosen action.
    ui.combat?.render();
    this.close();
  }
}
