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

export class StarQuestCombat extends foundry.documents.Combat {
  /**
   * Produce the display / turn order:
   *   1. Un-activated units first (activated ones sink to the bottom).
   *   2. Among un-activated units, alternate Hero, Enemy, Hero, Enemy...
   *      Heroes lead. Enemies are ordered nearest-hero-first so the top
   *      enemy is the suggested AI pick.
   */
  _sortCombatants(a: any, b: any): number {
    // Activated units always sort after un-activated ones.
    const aDone = isActivated(a);
    const bDone = isActivated(b);
    if (aDone !== bDone) return aDone ? 1 : -1;

    // Build the interleaved order once per sort pass via cached ranks.
    const rankA = this._activationRank(a);
    const rankB = this._activationRank(b);
    if (rankA !== rankB) return rankA - rankB;

    // Stable fallback by name.
    return (a.name ?? "").localeCompare(b.name ?? "");
  }

  /**
   * Rank a combatant within the alternating sequence. Heroes get even slots
   * (0, 2, 4...), enemies get odd slots (1, 3, 5...), so the merged order is
   * H, E, H, E. Heroes keep insertion order; enemies are ordered by nearest
   * hero distance so the closest enemy occupies the first enemy slot.
   */
  _activationRank(c: any): number {
    const pending = this.combatants.filter((x: any) => !isActivated(x));
    const heroes = pending.filter((x: any) => isHero(x));
    const enemies = pending
      .filter((x: any) => !isHero(x))
      .sort(
        (x: any, y: any) => nearestHeroDistance(this, x) - nearestHeroDistance(this, y)
      );

    const hi = heroes.indexOf(c);
    if (hi !== -1) return hi * 2; // heroes: 0,2,4...
    const ei = enemies.indexOf(c);
    if (ei !== -1) return ei * 2 + 1; // enemies: 1,3,5...
    return Number.MAX_SAFE_INTEGER;
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
