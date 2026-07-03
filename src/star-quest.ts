import { HeroData } from "./module/data/hero";
import { EnemyData, ObjectiveData } from "./module/data/enemy";
import {
  WeaponData,
  SkillData,
  SpellData,
  ConsumableData,
  InjuryData,
  SpecialRuleData
} from "./module/data/items";
import { HeroSheet } from "./module/sheets/hero-sheet";
import { EnemySheet, ObjectiveSheet } from "./module/sheets/actor-sheets";
import { StarQuestItemSheet } from "./module/sheets/item-sheet";
import { CampaignTracker } from "./module/apps/campaign-tracker";
import { AIHelper } from "./module/apps/ai-helper";
import { StarQuestCombat } from "./module/combat/combat";
import { StarQuestCombatant } from "./module/combat/combatant";
import { SQ, registerConditions } from "./module/helpers/config";

const SYSTEM_ID = "star-quest";

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | Initializing Grimdark Future: Star Quest`);

  // --- Handlebars helpers --------------------------------------------------
  Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
  Handlebars.registerHelper("array", (...args: unknown[]) => args.slice(0, -1));

  (CONFIG as any).SQ = SQ;

  // Tracks whether the starter scene has been imported into this world, so the
  // first-launch import runs exactly once and never re-imports if deleted.
  game.settings.register(SYSTEM_ID, "starterSceneImported", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  // --- Data models ---------------------------------------------------------
  Object.assign(CONFIG.Actor.dataModels, {
    hero: HeroData,
    enemy: EnemyData,
    objective: ObjectiveData
  });
  Object.assign(CONFIG.Item.dataModels, {
    weapon: WeaponData,
    skill: SkillData,
    spell: SpellData,
    consumable: ConsumableData,
    injury: InjuryData,
    specialRule: SpecialRuleData
  });

  // --- Combat: alternating activation, no initiative ------------------------
  CONFIG.Combat.documentClass = StarQuestCombat;
  CONFIG.Combatant.documentClass = StarQuestCombatant;
  // No initiative formula — Star Quest uses computed activation order.
  CONFIG.Combat.initiative = { formula: "0", decimals: 0 };

  // --- Sheets (v14 registration namespace) ---------------------------------
  const actors = foundry.documents.collections.Actors;
  const items = foundry.documents.collections.Items;

  actors.unregisterSheet("core", foundry.applications.sheets.ActorSheetV2);
  actors.registerSheet(SYSTEM_ID, HeroSheet, {
    types: ["hero"],
    makeDefault: true,
    label: "SQ.Sheet.Hero"
  });
  actors.registerSheet(SYSTEM_ID, EnemySheet, {
    types: ["enemy"],
    makeDefault: true,
    label: "SQ.Sheet.Enemy"
  });
  actors.registerSheet(SYSTEM_ID, ObjectiveSheet, {
    types: ["objective"],
    makeDefault: true,
    label: "SQ.Sheet.Objective"
  });

  items.unregisterSheet("core", foundry.applications.sheets.ItemSheetV2);
  items.registerSheet(SYSTEM_ID, StarQuestItemSheet, {
    makeDefault: true,
    label: "SQ.Sheet.Item"
  });

  registerConditions();

  // Expose panels on the game object for macro access.
  (game as any).starQuest = {
    openCampaignTracker: () => new CampaignTracker().render(true),
    openAIHelper: () => new AIHelper().render(true)
  };
});

// Add scene-control buttons to open the two helper panels.
Hooks.on("getSceneControlButtons", (controls: any) => {
  const tokenControls = Array.isArray(controls)
    ? controls.find((c: any) => c.name === "token")
    : controls.token;
  if (!tokenControls) return;

  const tools = tokenControls.tools;
  const add = (tool: any) => {
    if (Array.isArray(tools)) tools.push(tool);
    else tools[tool.name] = tool;
  };

  add({
    name: "sq-campaign",
    title: "SQ.Campaign.Title",
    icon: "fa-solid fa-scroll",
    button: true,
    onChange: () => new CampaignTracker().render(true),
    onClick: () => new CampaignTracker().render(true)
  });
  add({
    name: "sq-ai",
    title: "SQ.AI.Title",
    icon: "fa-solid fa-robot",
    button: true,
    onChange: () => new AIHelper().render(true),
    onClick: () => new AIHelper().render(true)
  });
});

// Augment the Combat Tracker: mark activated combatants, tag heroes vs enemies,
// and show which side is currently up. We enhance the rendered DOM rather than
// replacing the tracker application, which is more robust across versions.
Hooks.on("renderCombatTracker", (_app: any, html: any, data: any) => {
  const combat = data?.combat ?? game.combat;
  if (!combat) return;

  const root: HTMLElement | null =
    html instanceof HTMLElement ? html : html?.[0] ?? null;
  if (!root) return;

  for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-combatant-id]"))) {
    const id = el.dataset.combatantId!;
    const c = combat.combatants.get(id);
    if (!c) continue;

    const hero = c.actor?.type === "hero";
    el.classList.add(hero ? "sq-side-hero" : "sq-side-enemy");
    const done = c.getFlag?.("star-quest", "activated") === true;
    if (done) el.classList.add("sq-activated");

    // Only the GM (or a player owning this combatant) gets an Activate button.
    const canControl = game.user?.isGM || c.actor?.isOwner;
    if (!canControl) continue;

    // Avoid double-inserting on re-render.
    if (el.querySelector(".sq-activate-btn")) continue;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sq-activate-btn";
    btn.title = done ? "Mark as not activated" : "Activate this unit";
    btn.innerHTML = done
      ? '<i class="fa-solid fa-rotate-left"></i>'
      : '<i class="fa-solid fa-flag-checkered"></i>';
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (done) {
        // Undo: clear the flag without advancing.
        await c.setFlag("star-quest", "activated", false);
      } else {
        // Mark activated; if this is the current combatant, advance the turn.
        await c.setFlag("star-quest", "activated", true);
        if (combat.combatant?.id === c.id) await combat.nextTurn();
      }
      ui.combat?.render();
    });

    // Prefer the row's controls container; fall back to the row itself.
    const controls =
      el.querySelector(".combatant-controls") ??
      el.querySelector(".token-effects") ??
      el;
    controls.appendChild(btn);
  }

  // Banner: whose activation is it?
  const current = combat.combatant;
  if (current) {
    const side = current.actor?.type === "hero" ? "Players" : "AI";
    const banner = document.createElement("div");
    banner.className = "sq-turn-banner";
    banner.textContent = `${side} to activate`;
    root.querySelector(".combat-tracker")?.prepend(banner);
  }
});

Hooks.once("ready", async () => {
  console.log(`${SYSTEM_ID} | Ready`);

  // First-launch only: import the starter scene from the compendium and
  // activate it. Guarded by a world flag and gated to the GM so it runs once.
  try {
    if (!game.user?.isGM) return;
    if (game.settings.get(SYSTEM_ID, "starterSceneImported")) return;

    const pack = game.packs?.get(`${SYSTEM_ID}.scenes`);
    if (!pack) return;

    const index = await pack.getIndex();
    const entry = index.find((e: any) => e.name?.includes("Starter Map")) ?? index.contents?.[0];
    if (!entry) return;

    // Skip if a scene of this name already exists (e.g. user imported manually).
    const already = game.scenes?.find((s: any) => s.name === entry.name);
    const imported = already ?? (await game.scenes?.importFromCompendium(pack, entry._id));

    await game.settings.set(SYSTEM_ID, "starterSceneImported", true);
    if (imported && !imported.active) await imported.activate();
  } catch (err) {
    console.warn(`${SYSTEM_ID} | Starter scene import skipped:`, err);
  }
});
