import { rollStatTest } from "../helpers/rolls";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

interface AttackContext {
  attacker: any;
  weapon: any;
}

/**
 * Attack resolver. Semi-automated: the GM picks a target, the dialog rolls
 * Quality-to-hit then the target's Defense (worsened by the weapon's AP), and
 * shows the unsaved wound count with a confirm button that applies wounds.
 *
 * Special rules beyond AP (Shred, Rending, Deadly) are not yet factored in.
 */
export class AttackResolver extends HandlebarsApplicationMixin(ApplicationV2) {
  attacker: any;
  weapon: any;
  /** Populated after rolling: the resolved outcome awaiting confirmation. */
  result: { targetId: string; wounds: number; rolled: boolean } | null = null;

  constructor(ctx: AttackContext, options: any = {}) {
    super(options);
    this.attacker = ctx.attacker;
    this.weapon = ctx.weapon;
  }

  static DEFAULT_OPTIONS = {
    id: "sq-attack-resolver",
    classes: ["star-quest", "sq-panel", "sq-attack-resolver"],
    tag: "div",
    window: { title: "SQ.Attack.Title", resizable: false },
    position: { width: 380, height: "auto" as const },
    actions: {
      rollAttack: AttackResolver.#onRoll,
      applyWounds: AttackResolver.#onApply
    }
  };

  static PARTS = {
    body: { template: "systems/star-quest/templates/apps/attack-resolver.hbs" }
  };

  /** Candidate targets: tokens on the canvas other than the attacker. */
  get targets(): { id: string; name: string }[] {
    const attackerTokenId = this.attacker?.token?.id ?? this.attacker?.getActiveTokens?.()?.[0]?.id;
    const scene = game.scenes?.active ?? canvas?.scene;
    const tokens = scene?.tokens ?? [];
    return tokens
      .filter((t: any) => t.actor && t.id !== attackerTokenId)
      .map((t: any) => ({ id: t.id, name: t.name }));
  }

  async _prepareContext(_options: unknown) {
    const w = this.weapon.system;
    return {
      attackerName: this.attacker?.name ?? "Attacker",
      weaponName: this.weapon.name,
      attacks: w.attacks,
      ap: w.ap,
      special: w.special,
      targets: this.targets,
      hasTargets: this.targets.length > 0,
      result: this.result,
      canApply: this.result?.rolled && this.result.wounds > 0
    };
  }

  /** Resolve the selected token id to its Actor. */
  #targetActor(tokenId: string): any {
    const scene = game.scenes?.active ?? canvas?.scene;
    return scene?.tokens?.get(tokenId)?.actor ?? null;
  }

  static async #onRoll(this: AttackResolver) {
    const select = this.element.querySelector("select.sq-target") as HTMLSelectElement | null;
    const targetId = select?.value;
    if (!targetId) return ui.notifications?.warn("Pick a target first.");

    const target = this.#targetActor(targetId);
    if (!target) return ui.notifications?.warn("Target has no actor.");

    const w = this.weapon.system;
    const attacks = Math.max(1, w.attacks ?? 1);
    const ap = Math.max(0, w.ap ?? 0);

    // Stage 1: to-hit on the attacker's Quality.
    const hitResults = await rollStatTest(
      this.attacker,
      `${this.weapon.name} — To-Hit`,
      this.attacker.system.quality,
      attacks
    );
    const hits = hitResults.filter((r) => r.success).length;

    let wounds = 0;
    if (hits > 0) {
      // Stage 2: defence, worsened by AP (higher target = harder save).
      const effectiveDef = Math.min(6, (target.system.defense ?? 4) + ap);
      const saveResults = await rollStatTest(
        target,
        `Defense vs ${this.weapon.name}${ap ? ` (AP ${ap} → ${effectiveDef}+)` : ""}`,
        effectiveDef,
        hits
      );
      const saves = saveResults.filter((r) => r.success).length;
      wounds = Math.max(0, hits - saves);
    }

    this.result = { targetId, wounds, rolled: true };
    this.render();
  }

  static async #onApply(this: AttackResolver) {
    if (!this.result?.rolled) return;
    const target = this.#targetActor(this.result.targetId);
    if (!target) return;

    const newWounds = (target.system.wounds ?? 0) + this.result.wounds;
    await target.update({ "system.wounds": newWounds });

    const tough = target.system.toughness ?? 1;
    const down = newWounds >= tough;
    const verb = target.type === "hero" ? "unconscious" : "defeated";

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.attacker }),
      content: `
        <div class="star-quest sq-attack-card">
          <strong>${target.name}</strong> takes <span class="sq-wounds-num">${this.result.wounds}</span>
          wound${this.result.wounds === 1 ? "" : "s"}
          (${newWounds}/${tough})${down ? ` — <span class="sq-down-text">${verb}!</span>` : ""}
        </div>`
    });

    this.close();
  }
}
