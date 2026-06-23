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
import { SQ, registerConditions } from "./module/helpers/config";

const SYSTEM_ID = "star-quest";

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | Initializing Grimdark Future: Star Quest`);

  // --- Handlebars helpers --------------------------------------------------
  Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
  Handlebars.registerHelper("array", (...args: unknown[]) => args.slice(0, -1));

  (CONFIG as any).SQ = SQ;

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

Hooks.once("ready", () => {
  console.log(`${SYSTEM_ID} | Ready`);
});
