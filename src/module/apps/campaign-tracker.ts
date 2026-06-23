const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Campaign tracker. Operates on the currently-selected Hero, providing
 * quick controls to award XP, level up, apply injuries, and spend credits.
 */
export class CampaignTracker extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "sq-campaign-tracker",
    classes: ["star-quest", "sq-panel"],
    tag: "div",
    window: { title: "SQ.Campaign.Title", resizable: true },
    position: { width: 360, height: "auto" as const },
    actions: {
      addXP: CampaignTracker.#onAddXP,
      levelUp: CampaignTracker.#onLevelUp,
      spendCredits: CampaignTracker.#onSpendCredits
    }
  };

  static PARTS = {
    body: { template: "systems/star-quest/templates/apps/campaign-tracker.hbs" }
  };

  /** The hero this panel acts on: first controlled token, else first owned hero. */
  get hero() {
    const controlled = canvas?.tokens?.controlled?.[0]?.actor;
    if (controlled?.type === "hero") return controlled;
    return (game as any).actors?.find((a: any) => a.type === "hero" && a.isOwner) ?? null;
  }

  async _prepareContext(_options: unknown) {
    const hero = this.hero as any;
    return {
      hero,
      system: hero?.system ?? null,
      injuries: hero ? hero.items.filter((i: any) => i.type === "injury") : []
    };
  }

  static async #onAddXP(this: CampaignTracker, _e: Event, target: HTMLElement) {
    const hero = this.hero as any;
    if (!hero) return ui.notifications?.warn("No hero selected.");
    const amount = Number(target.dataset.amount ?? 1);
    await hero.update({ "system.xp": hero.system.xp + amount });
    this.render();
  }

  static async #onLevelUp(this: CampaignTracker) {
    const hero = this.hero as any;
    if (!hero) return ui.notifications?.warn("No hero selected.");
    await hero.update({ "system.level": hero.system.level + 1 });
    ui.notifications?.info(`${hero.name} reaches level ${hero.system.level}!`);
    this.render();
  }

  static async #onSpendCredits(this: CampaignTracker, _e: Event, target: HTMLElement) {
    const hero = this.hero as any;
    if (!hero) return ui.notifications?.warn("No hero selected.");
    const amount = Number(target.dataset.amount ?? 0);
    const next = Math.max(0, hero.system.credits - amount);
    await hero.update({ "system.credits": next });
    this.render();
  }
}
