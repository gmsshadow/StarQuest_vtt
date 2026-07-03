const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Activation picker. Pops when it is a side's turn to choose a unit.
 * Lists un-activated units for the current side (heroes, or enemies sorted
 * nearest-hero-first). Selecting one makes its token the controlled token;
 * pressing Next Turn (in the combat) then commits the activation.
 *
 * GM-driven. This dialog only chooses & selects — it does not flag activation.
 */
export class ActivationPicker extends HandlebarsApplicationMixin(ApplicationV2) {
  combat: any;
  side: "hero" | "enemy";

  constructor(combat: any, side: "hero" | "enemy", options: any = {}) {
    super(options);
    this.combat = combat;
    this.side = side;
  }

  static DEFAULT_OPTIONS = {
    id: "sq-activation-picker",
    classes: ["star-quest", "sq-panel", "sq-activation-picker"],
    tag: "div",
    window: { title: "SQ.Activation.Title", resizable: false },
    position: { width: 340, height: "auto" as const },
    actions: {
      pick: ActivationPicker.#onPick,
      commit: ActivationPicker.#onCommit
    }
  };

  static PARTS = {
    body: { template: "systems/star-quest/templates/apps/activation-picker.hbs" }
  };

  /** Un-activated combatants for the current side, ordered for display. */
  get choices(): any[] {
    const list = this.combat.combatants.filter((c: any) => {
      const isHero = c.actor?.type === "hero";
      const activated = c.getFlag?.("star-quest", "activated") === true;
      return !activated && (this.side === "hero" ? isHero : !isHero);
    });

    if (this.side === "enemy") {
      // Nearest-hero-first ordering for the AI side.
      list.sort(
        (a: any, b: any) =>
          this.combat.distanceToNearestHero(a) - this.combat.distanceToNearestHero(b)
      );
    }
    return list;
  }

  async _prepareContext(_options: unknown) {
    const choices = this.choices;
    const selectedId = this.combat.getFlag("star-quest", "pendingPick") ?? choices[0]?.id ?? null;
    return {
      side: this.side,
      sideLabel: this.side === "hero" ? "Players" : "AI",
      choices: choices.map((c: any) => ({
        id: c.id,
        name: c.name,
        selected: c.id === selectedId
      })),
      hasChoices: choices.length > 0,
      selectedId
    };
  }

  static async #onPick(this: ActivationPicker, event: Event) {
    const select = (event.target as HTMLSelectElement);
    const id = select.value;
    await this.#selectToken(id);
  }

  static async #onCommit(this: ActivationPicker) {
    // "Confirm & select" — stores the pending pick and selects its token.
    const select = this.element.querySelector("select.sq-pick") as HTMLSelectElement | null;
    const id = select?.value ?? this.choices[0]?.id;
    if (!id) return;
    await this.#selectToken(id);
    ui.notifications?.info("Unit selected. Press Next Turn to activate it.");
    this.close();
  }

  /** Record the pending pick on the combat and control that unit's token. */
  async #selectToken(id: string) {
    await this.combat.setFlag("star-quest", "pendingPick", id);

    // Point Foundry's own turn pointer at the picked combatant so the active-
    // token marker (the spinning ring) tracks the chosen unit rather than
    // whichever combatant happens to sit at the top of the order.
    const turnIndex = this.combat.turns?.findIndex((t: any) => t.id === id) ?? -1;
    if (turnIndex >= 0 && this.combat.turn !== turnIndex) {
      await this.combat.update({ turn: turnIndex });
    }

    const c = this.combat.combatants.get(id);
    const token = c?.token?.object;
    if (token) {
      token.control({ releaseOthers: true });
      // Pan to it so the GM sees who's up.
      if (canvas?.animatePan) canvas.animatePan({ x: token.center.x, y: token.center.y });
    }
  }
}
