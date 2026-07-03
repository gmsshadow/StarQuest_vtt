/**
 * Core dice mechanics for Star Quest.
 *
 * Everything is a single D6 vs a target number (the stat value).
 * Roll >= target succeeds. A natural 6 always succeeds; a natural 1 always fails.
 */

export interface StatTestResult {
  total: number;
  target: number;
  success: boolean;
  natural6: boolean;
  natural1: boolean;
}

/**
 * Roll a number of D6 stat tests and post the result to chat.
 * @param actor   The actor making the test (for speaker attribution).
 * @param label   What is being tested, e.g. "Quality Test".
 * @param target  The target number to meet or beat.
 * @param count   How many dice to roll (default 1).
 */
export async function rollStatTest(
  actor: any,
  label: string,
  target: number,
  count = 1
): Promise<StatTestResult[]> {
  const formula = `${Math.max(1, count)}d6`;
  const roll = await new Roll(formula).evaluate();

  const dice = (roll.dice[0]?.results ?? []).map((r: any) => r.result as number);
  const results: StatTestResult[] = dice.map((face) => {
    // CORE RULE (do not break when adding modifiers): a natural 6 ALWAYS
    // succeeds and a natural 1 ALWAYS fails, regardless of any modifiers.
    // These checks read the RAW die face. All modifiers (AP, Shred, Rending,
    // etc.) must adjust the `target` number passed in — NEVER the die result —
    // so that this override remains correct. If a future modifier changes the
    // die value itself, the natural-1/6 rule would silently break.
    const natural6 = face === 6;
    const natural1 = face === 1;
    const success = natural6 || (!natural1 && face >= target);
    return { total: face, target, success, natural6, natural1 };
  });

  const hits = results.filter((r) => r.success).length;
  const rows = results
    .map((r) => {
      const cls = r.success ? "success" : "failure";
      const tag = r.natural6 ? " (crit)" : r.natural1 ? " (fumble)" : "";
      return `<li class="sq-die ${cls}">${r.total}${tag}</li>`;
    })
    .join("");

  const content = `
    <div class="star-quest sq-roll-card">
      <header class="sq-roll-header">${label} <span class="sq-target">(${target}+)</span></header>
      <ul class="sq-dice">${rows}</ul>
      <footer class="sq-roll-footer">${hits} / ${results.length} success${hits === 1 ? "" : "es"}</footer>
    </div>`;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: label,
    content
  });

  return results;
}

/**
 * Resolve a simple shooting/melee exchange: attacker rolls Quality for hits,
 * defender rolls Defense for each hit. Returns the number of unsaved wounds.
 */
export async function resolveAttack(
  attacker: any,
  defender: any,
  opts: { attacks: number; quality: number; defense: number; label?: string }
): Promise<number> {
  const label = opts.label ?? "Attack";
  const hitResults = await rollStatTest(attacker, `${label} — To-Hit`, opts.quality, opts.attacks);
  const hits = hitResults.filter((r) => r.success).length;
  if (hits === 0) return 0;

  const saveResults = await rollStatTest(defender, `${label} — Defense`, opts.defense, hits);
  const saves = saveResults.filter((r) => r.success).length;
  return Math.max(0, hits - saves);
}
