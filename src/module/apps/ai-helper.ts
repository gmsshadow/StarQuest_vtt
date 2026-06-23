const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * AI Helper. A guidance checklist for resolving an enemy activation in the
 * Star Quest AI flow. Deliberately does NOT automate movement — it surfaces
 * the decision steps and lets the player apply them on the tabletop.
 */
export class AIHelper extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "sq-ai-helper",
    classes: ["star-quest", "sq-panel"],
    tag: "div",
    window: { title: "SQ.AI.Title", resizable: true },
    position: { width: 340, height: "auto" as const },
    actions: {
      pickAction: AIHelper.#onPickAction,
      reset: AIHelper.#onReset
    }
  };

  static PARTS = {
    body: { template: "systems/star-quest/templates/apps/ai-helper.hbs" }
  };

  /** The most recently chosen AI action, for highlight feedback. */
  chosen: string | null = null;

  async _prepareContext(_options: unknown) {
    return {
      chosen: this.chosen,
      steps: [
        { key: "nearest", label: "SQ.AI.NearestHero" },
        { key: "goal", label: "SQ.AI.Goal" }
      ],
      actions: [
        { key: "shoot", label: "SQ.AI.Shoot" },
        { key: "charge", label: "SQ.AI.Charge" },
        { key: "rush", label: "SQ.AI.Rush" }
      ]
    };
  }

  static async #onPickAction(this: AIHelper, _e: Event, target: HTMLElement) {
    this.chosen = target.dataset.choice ?? null;
    this.render();
  }

  static async #onReset(this: AIHelper) {
    this.chosen = null;
    this.render();
  }
}
