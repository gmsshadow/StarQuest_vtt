/**
 * Star Quest system configuration constants.
 */

export const SQ = {
  /** The six activation actions a unit may take. */
  actions: {
    rest: { label: "Rest", hint: "Doesn't move or act, restores power." },
    hold: { label: "Hold", hint: "Doesn't move, can shoot." },
    advance: { label: "Advance", hint: "Moves 6\" and can shoot after moving." },
    rush: { label: "Rush", hint: "Moves 12\" but can't shoot." },
    charge: { label: "Charge", hint: "Moves 12\" into melee." },
    skill: { label: "Skill", hint: "Doesn't move, uses skill action." }
  } as Record<string, { label: string; hint: string }>,
  /** The five tracked conditions, used for both UI and Active Effect status icons. */
  conditions: {
    afflicted: "SQ.Condition.Afflicted",
    crippled: "SQ.Condition.Crippled",
    diseased: "SQ.Condition.Diseased",
    impaired: "SQ.Condition.Impaired",
    shaken: "SQ.Condition.Shaken"
  } as Record<string, string>
};

/**
 * Register conditions into CONFIG.statusEffects.
 * v14 uses a keyed object ({ [id]: StatusEffectConfig }) for CONFIG.statusEffects,
 * but core still accepts an array on registration; we build entries and assign.
 */
export function registerConditions() {
  const icons: Record<string, string> = {
    afflicted: "icons/svg/poison.svg",
    crippled: "icons/svg/downgrade.svg",
    diseased: "icons/svg/blood.svg",
    impaired: "icons/svg/daze.svg",
    shaken: "icons/svg/terror.svg"
  };

  const entries = Object.entries(SQ.conditions).map(([id, label]) => ({
    id,
    name: label,
    img: icons[id] ?? "icons/svg/aura.svg"
  }));

  // Assign as a keyed object (v14 preferred shape); core keeps array compatibility.
  const keyed: Record<string, any> = {};
  for (const e of entries) keyed[e.id] = e;
  (CONFIG as any).statusEffects = keyed;
}
