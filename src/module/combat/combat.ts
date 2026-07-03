/**
 * Star Quest activation model.
 *
 * Not initiative-based. Each round:
 *  - Players go first, then strict alternation: Player, AI, Player, AI, ...
 *  - When one side has no un-activated units left, the other side activates
 *    its remaining units back-to-back.
 *  - On an AI activation, the enemy nearest to any hero is suggested (the
 *    tracker highlights it); the GM may override by selecting another.
 *  - At the start of each round all activations reset.
 *
 * We drive this by overriding the combatant sort so the tracker displays the
 * alternating sequence directly, rather than assigning initiative numbers.
 */

import { ActivationPicker } from "./activation-picker";

const HERO = "hero";
const ENEMY = "enemy";

/** True if this combatant's actor is a player-controlled hero. */
function isHero(c: any): boolean {
  return c?.actor?.type === HERO;
}

/** True if this combatant has already activated this round. */
function isActivated(c: any): boolean {
  return c?.getFlag?.("star-quest", "activated") === true;
}

/**
 * Compute the shortest distance (in grid units) from an enemy token to any
 * hero token on the same scene. Returns Infinity if it can't be determined.
 */
function nearestHeroDistance(combat: any, enemyCombatant: any): number {
  const enemyToken = enemyCombatant?.token?.object;
  if (!enemyToken) return Infinity;

  const heroTokens = combat.combatants
    .filter((c: any) => isHero(c))
    .map((c: any) => c?.token?.object)
    .filter(Boolean);
  if (!heroTokens.length) return Infinity;

  let best = Infinity;
  for (const h of heroTokens) {
    const dx = enemyToken.center.x - h.center.x;
    const dy = enemyToken.center.y - h.center.y;
    const d = Math.hypot(dx, dy);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Build a combatant-id -> rank map expressing the full activation order.
 * Un-activated units rank ahead of activated ones. Within the un-activated
 * set, heroes take even slots (0,2,4...) and enemies odd slots (1,3,5...),
 * producing H,E,H,E interleaving; enemies are ordered nearest-hero-first.
 * Activated units are appended after, preserving the same interleave offset.
 *
 * Computed once per sort pass (the comparator just looks up this map), so the
 * cost is O(n log n) for the enemy distance sort, not per-comparison.
 */
function rankMap(combat: any): Map<string, number> {
  const map = new Map<string, number>();
  const all = Array.from(combat.combatants ?? []);

  const split = (list: any[]) => {
    const heroes = list.filter((x) => isHero(x));
    const enemies = list
      .filter((x) => !isHero(x))
      .sort((x, y) => nearestHeroDistance(combat, x) - nearestHeroDistance(combat, y));
    return { heroes, enemies };
  };

  // Pending (un-activated) first, then activated — each interleaved internally.
  const pending = all.filter((x: any) => !isActivated(x));
  const done = all.filter((x: any) => isActivated(x));

  let base = 0;
  for (const group of [pending, done]) {
    const { heroes, enemies } = split(group);
    heroes.forEach((c, i) => map.set(c.id, base + i * 2));
    enemies.forEach((c, i) => map.set(c.id, base + i * 2 + 1));
    // Advance base past this group so the next group sorts strictly after.
    base += Math.max(heroes.length, enemies.length) * 2 + 2;
  }
  return map;
}

export class StarQuestCombat extends foundry.documents.Combat {
  /**
   * Produce the display / turn order:
   *   1. Un-activated units first (activated ones sink to the bottom).
   *   2. Among un-activated units, alternate Hero, Enemy, Hero, Enemy...
   *      Heroes lead. Enemies are ordered nearest-hero-first so the top
   *      enemy is the suggested AI pick.
   *
   * IMPORTANT: Foundry calls this as a bare `Array.sort` callback, so `this`
   * is NOT the combat instance here. Everything is derived from the combatants
   * themselves (via their shared parent combat), never from `this`.
   */
  _sortCombatants(a: any, b: any): number {
    const combat = a?.parent ?? b?.parent;
    if (!combat) return 0;

    const rank = rankMap(combat);
    const ra = rank.get(a?.id) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b?.id) ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return (a?.name ?? "").localeCompare(b?.name ?? "");
  }

  /** Public accessor so the picker can order enemies nearest-hero-first. */
  distanceToNearestHero(combatant: any): number {
    return nearestHeroDistance(this, combatant);
  }

  /** The side currently choosing a unit: "hero" (players first) or "enemy". */
  get currentSide(): "hero" | "enemy" {
    return this.getFlag("star-quest", "side") === "enemy" ? "enemy" : "hero";
  }

  /** True when no un-activated units remain on the given side. */
  #sideExhausted(side: "hero" | "enemy"): boolean {
    return !this.combatants.some((c: any) => {
      const isHero = c.actor?.type === "hero";
      const activated = c.getFlag?.("star-quest", "activated") === true;
      return !activated && (side === "hero" ? isHero : !isHero);
    });
  }

  /** All units activated → round is complete. */
  #allActivated(): boolean {
    return this.combatants.every(
      (c: any) => c.getFlag?.("star-quest", "activated") === true
    );
  }

  /**
   * Commit the pending pick (flag it activated), then choose the next side and
   * open its picker. Alternates sides, but if one side is exhausted the other
   * side keeps going. Called from the Next Turn control.
   */
  async nextTurn(): Promise<this> {
    // 1. Commit the currently-selected unit, if any.
    const pickId = this.getFlag("star-quest", "pendingPick");
    if (pickId) {
      const picked = this.combatants.get(pickId);
      if (picked) await picked.setFlag("star-quest", "activated", true);
      await this.unsetFlag("star-quest", "pendingPick");
    }

    // 2. Round over?
    if (this.#allActivated()) {
      await this.nextRound();
      return this;
    }

    // 3. Choose the next side: alternate, unless the other side is exhausted.
    const current = this.currentSide;
    const other = current === "hero" ? "enemy" : "hero";
    const next = this.#sideExhausted(other) ? current : other;
    await this.setFlag("star-quest", "side", next);

    // 4. Open the picker for the chosen side (GM only). The picker sets the
    //    turn index when a unit is chosen, which drives the active-token marker.
    this.openPicker(next);
    return this;
  }

  /** Open the activation picker dialog for a side (GM only). */
  openPicker(side: "hero" | "enemy"): void {
    if (!game.user?.isGM) return;
    new ActivationPicker(this, side).render(true);
  }

  /** Reset all activation flags and clear the pending pick / side / actions. */
  async resetActivations(): Promise<void> {
    const updates = this.combatants.map((c: any) => ({
      _id: c.id,
      "flags.star-quest.activated": false,
      "flags.star-quest.-=action": null
    }));
    if (updates.length) await this.updateEmbeddedDocuments("Combatant", updates);
    await this.unsetFlag("star-quest", "pendingPick");
    await this.setFlag("star-quest", "side", "hero");
  }

  /** Round advance: reset activations, rebuild order, players lead again. */
  async nextRound(): Promise<this> {
    await this.resetActivations();
    await super.nextRound();
    this.openPicker("hero");
    return this;
  }

  /** New combats start without initiative; players pick first. */
  async startCombat(): Promise<this> {
    await this.resetActivations();
    await super.startCombat();
    this.openPicker("hero");
    return this;
  }
}
