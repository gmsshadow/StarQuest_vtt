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

  /** Mark the current combatant activated, then advance. */
  async activateCurrent(): Promise<void> {
    const current = this.combatant;
    if (current) await current.setFlag("star-quest", "activated", true);
    await this.nextTurn();
  }

  /** Reset all activation flags — called at the start of each round. */
  async resetActivations(): Promise<void> {
    const updates = this.combatants.map((c: any) => ({
      _id: c.id,
      "flags.star-quest.activated": false
    }));
    if (updates.length) await this.updateEmbeddedDocuments("Combatant", updates);
  }

  /**
   * Override round advancement to reset activations and rebuild order.
   */
  async nextRound(): Promise<this> {
    await this.resetActivations();
    return super.nextRound();
  }

  /** New combats start without rolling initiative. */
  async startCombat(): Promise<this> {
    await this.resetActivations();
    return super.startCombat();
  }
}
