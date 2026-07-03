var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _HeroSheet_static, onRollStat_fn, onRollWeapon_fn, onRollSkill_fn, onCastSpell_fn, onUseConsumable_fn, onSpendPower_fn, onRestorePower_fn, onRest_fn, onToggleCondition_fn, onEditItem_fn, onDeleteItem_fn, _HeroSheet_instances, getItem_fn, adjustPower_fn, _EnemySheet_static, onRollStat_fn2, onEditItem_fn2, onDeleteItem_fn2, _ObjectiveSheet_static, onAddProgress_fn, onRemoveProgress_fn, _CampaignTracker_static, onAddXP_fn, onLevelUp_fn, onSpendCredits_fn, _AIHelper_static, onPickAction_fn, onReset_fn;
const fields = foundry.data.fields;
function intField(initial = 0, opts = {}) {
  return new fields.NumberField({
    required: true,
    nullable: false,
    integer: true,
    initial,
    ...opts
  });
}
function strField(initial = "", opts = {}) {
  return new fields.StringField({
    required: true,
    nullable: false,
    blank: true,
    initial,
    ...opts
  });
}
function htmlField(initial = "") {
  return new fields.HTMLField({ required: true, nullable: false, blank: true, initial });
}
function resourceField(value = 0, max = 0) {
  return new fields.SchemaField({
    value: intField(value),
    max: intField(max)
  });
}
class HeroData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      faction: strField(),
      class: strField(),
      level: intField(1, { min: 1 }),
      xp: intField(0, { min: 0 }),
      credits: intField(0, { min: 0 }),
      // Core D6 target-number stats. Lower is better; 2+ is elite, 6+ is poor.
      quality: intField(4, { min: 2, max: 6 }),
      defense: intField(4, { min: 2, max: 6 }),
      toughness: intField(3, { min: 1 }),
      strength: intField(4, { min: 2, max: 6 }),
      dexterity: intField(4, { min: 2, max: 6 }),
      willpower: intField(4, { min: 2, max: 6 }),
      power: resourceField(0, 0),
      // Damage accumulator. Hero falls unconscious when wounds >= toughness.
      wounds: intField(0, { min: 0 }),
      // Caster flag drives whether the Spells panel renders on the sheet.
      isCaster: new fields.BooleanField({ initial: false }),
      notes: htmlField(),
      biography: htmlField()
    };
  }
  /** Derived data computed after source data is prepared. */
  prepareDerivedData() {
    const sys = this;
    sys.isDown = sys.wounds >= sys.toughness;
    sys.woundsRemaining = Math.max(0, sys.toughness - sys.wounds);
  }
}
class EnemyData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      quality: intField(4, { min: 2, max: 6 }),
      defense: intField(4, { min: 2, max: 6 }),
      toughness: intField(3, { min: 1 }),
      unitSize: intField(1, { min: 1 }),
      pointCost: intField(0, { min: 0 }),
      wounds: intField(0, { min: 0 }),
      notes: htmlField()
    };
  }
  prepareDerivedData() {
    const sys = this;
    sys.isDefeated = sys.wounds >= sys.toughness;
  }
}
class ObjectiveData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      objectiveType: new fields.StringField({
        required: true,
        initial: "primary",
        choices: { primary: "Primary", secondary: "Secondary", bonus: "Bonus" }
      }),
      progress: intField(0, { min: 0 }),
      target: intField(1, { min: 1 }),
      completed: new fields.BooleanField({ initial: false }),
      notes: htmlField()
    };
  }
  prepareDerivedData() {
    const sys = this;
    if (sys.target > 0 && sys.progress >= sys.target) sys.completed = true;
  }
}
class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      range: intField(0, { min: 0 }),
      // 0 = melee
      attacks: intField(1, { min: 1 }),
      ap: intField(0, { min: 0 }),
      // armor piercing
      special: strField(),
      description: htmlField()
    };
  }
  get isMelee() {
    return this.range === 0;
  }
}
class SkillData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      stat: new fields.StringField({
        required: true,
        initial: "quality",
        choices: {
          quality: "Quality",
          defense: "Defense",
          strength: "Strength",
          dexterity: "Dexterity",
          willpower: "Willpower"
        }
      }),
      rollTarget: intField(0, { min: 0 }),
      // 0 = use the linked stat's value
      cost: intField(0, { min: 0 }),
      description: htmlField()
    };
  }
}
class SpellData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      castingValue: intField(4, { min: 2, max: 6 }),
      cost: intField(1, { min: 0 }),
      // Power spent to cast
      range: intField(0, { min: 0 }),
      effects: htmlField(),
      description: htmlField()
    };
  }
}
class ConsumableData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      uses: new fields.SchemaField({
        value: intField(1, { min: 0 }),
        max: intField(1, { min: 0 })
      }),
      effect: htmlField()
    };
  }
}
class InjuryData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      mechanicalEffects: htmlField()
    };
  }
}
class SpecialRuleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: htmlField()
    };
  }
}
async function rollStatTest(actor, label, target, count = 1) {
  var _a;
  const formula = `${Math.max(1, count)}d6`;
  const roll = await new Roll(formula).evaluate();
  const dice = (((_a = roll.dice[0]) == null ? void 0 : _a.results) ?? []).map((r) => r.result);
  const results = dice.map((face) => {
    const natural6 = face === 6;
    const natural1 = face === 1;
    const success = natural6 || !natural1 && face >= target;
    return { total: face, target, success, natural6, natural1 };
  });
  const hits = results.filter((r) => r.success).length;
  const rows = results.map((r) => {
    const cls = r.success ? "success" : "failure";
    const tag = r.natural6 ? " (crit)" : r.natural1 ? " (fumble)" : "";
    return `<li class="sq-die ${cls}">${r.total}${tag}</li>`;
  }).join("");
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
const SQ = {
  /** The five tracked conditions, used for both UI and Active Effect status icons. */
  conditions: {
    afflicted: "SQ.Condition.Afflicted",
    crippled: "SQ.Condition.Crippled",
    diseased: "SQ.Condition.Diseased",
    impaired: "SQ.Condition.Impaired",
    shaken: "SQ.Condition.Shaken"
  }
};
function registerConditions() {
  const icons = {
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
  const keyed = {};
  for (const e of entries) keyed[e.id] = e;
  CONFIG.statusEffects = keyed;
}
const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$4 } = foundry.applications.api;
const { ActorSheetV2: ActorSheetV2$1 } = foundry.applications.sheets;
const _HeroSheet = class _HeroSheet extends HandlebarsApplicationMixin$4(ActorSheetV2$1) {
  constructor() {
    super(...arguments);
    __privateAdd(this, _HeroSheet_instances);
  }
  async _prepareContext(_options) {
    const actor = this.document;
    const sys = actor.system;
    const items = (type) => actor.items.filter((i) => i.type === type);
    return {
      actor,
      system: sys,
      editable: this.isEditable,
      weapons: items("weapon"),
      skills: items("skill"),
      spells: items("spell"),
      consumables: items("consumable"),
      injuries: items("injury"),
      specialRules: items("specialRule"),
      conditions: Object.entries(SQ.conditions).map(([id, label]) => {
        var _a;
        return {
          id,
          label,
          active: ((_a = actor.statuses) == null ? void 0 : _a.has(id)) ?? false
        };
      })
    };
  }
};
_HeroSheet_static = new WeakSet();
onRollStat_fn = async function(_event, target) {
  const stat = target.dataset.stat;
  const actor = this.document;
  const value = actor.system[stat];
  const label = `${stat.charAt(0).toUpperCase() + stat.slice(1)} Test`;
  await rollStatTest(actor, label, value);
};
onRollWeapon_fn = async function(_event, target) {
  const item = __privateMethod(this, _HeroSheet_instances, getItem_fn).call(this, target);
  if (!item) return;
  const actor = this.document;
  await rollStatTest(actor, `${item.name} — To-Hit`, actor.system.quality, item.system.attacks);
};
onRollSkill_fn = async function(_event, target) {
  const item = __privateMethod(this, _HeroSheet_instances, getItem_fn).call(this, target);
  if (!item) return;
  const actor = this.document;
  const tgt = item.system.rollTarget || actor.system[item.system.stat];
  await rollStatTest(actor, `${item.name}`, tgt);
};
onCastSpell_fn = async function(_event, target) {
  const item = __privateMethod(this, _HeroSheet_instances, getItem_fn).call(this, target);
  if (!item) return;
  const actor = this.document;
  await __privateMethod(this, _HeroSheet_instances, adjustPower_fn).call(this, -(item.system.cost ?? 0));
  await rollStatTest(actor, `Cast ${item.name}`, item.system.castingValue);
};
onUseConsumable_fn = async function(_event, target) {
  const item = __privateMethod(this, _HeroSheet_instances, getItem_fn).call(this, target);
  if (!item) return;
  const remaining = Math.max(0, (item.system.uses.value ?? 0) - 1);
  await item.update({ "system.uses.value": remaining });
};
onSpendPower_fn = async function() {
  await __privateMethod(this, _HeroSheet_instances, adjustPower_fn).call(this, -1);
};
onRestorePower_fn = async function() {
  await __privateMethod(this, _HeroSheet_instances, adjustPower_fn).call(this, 1);
};
onRest_fn = async function() {
  const actor = this.document;
  await actor.update({ "system.power.value": actor.system.power.max });
};
onToggleCondition_fn = async function(_event, target) {
  const id = target.dataset.condition;
  const actor = this.document;
  await actor.toggleStatusEffect(id);
};
onEditItem_fn = async function(_event, target) {
  var _a, _b;
  (_b = (_a = __privateMethod(this, _HeroSheet_instances, getItem_fn).call(this, target)) == null ? void 0 : _a.sheet) == null ? void 0 : _b.render(true);
};
onDeleteItem_fn = async function(_event, target) {
  var _a;
  await ((_a = __privateMethod(this, _HeroSheet_instances, getItem_fn).call(this, target)) == null ? void 0 : _a.delete());
};
_HeroSheet_instances = new WeakSet();
// --- Helpers ---------------------------------------------------------------
getItem_fn = function(target) {
  var _a;
  const id = (_a = target.closest("[data-item-id]")) == null ? void 0 : _a.dataset.itemId;
  return id ? this.document.items.get(id) : null;
};
adjustPower_fn = async function(delta) {
  var _a;
  const actor = this.document;
  const cur = actor.system.power.value;
  const max = actor.system.power.max;
  const next = cur + delta;
  if (next < 0) {
    const overflow = -next;
    await actor.update({
      "system.power.value": 0,
      "system.wounds": actor.system.wounds + overflow
    });
    (_a = ui.notifications) == null ? void 0 : _a.warn(
      `Out of Power — ${overflow} wound${overflow === 1 ? "" : "s"} taken instead.`
    );
    return;
  }
  await actor.update({ "system.power.value": Math.min(max, next) });
};
__privateAdd(_HeroSheet, _HeroSheet_static);
__publicField(_HeroSheet, "DEFAULT_OPTIONS", {
  classes: ["star-quest", "sheet", "actor", "hero"],
  position: { width: 480, height: 720 },
  window: { resizable: true },
  form: {
    submitOnChange: true,
    closeOnSubmit: false
  },
  actions: {
    rollStat: __privateMethod(_HeroSheet, _HeroSheet_static, onRollStat_fn),
    rollWeapon: __privateMethod(_HeroSheet, _HeroSheet_static, onRollWeapon_fn),
    rollSkill: __privateMethod(_HeroSheet, _HeroSheet_static, onRollSkill_fn),
    castSpell: __privateMethod(_HeroSheet, _HeroSheet_static, onCastSpell_fn),
    useConsumable: __privateMethod(_HeroSheet, _HeroSheet_static, onUseConsumable_fn),
    spendPower: __privateMethod(_HeroSheet, _HeroSheet_static, onSpendPower_fn),
    restorePower: __privateMethod(_HeroSheet, _HeroSheet_static, onRestorePower_fn),
    restAction: __privateMethod(_HeroSheet, _HeroSheet_static, onRest_fn),
    toggleCondition: __privateMethod(_HeroSheet, _HeroSheet_static, onToggleCondition_fn),
    editItem: __privateMethod(_HeroSheet, _HeroSheet_static, onEditItem_fn),
    deleteItem: __privateMethod(_HeroSheet, _HeroSheet_static, onDeleteItem_fn)
  }
});
__publicField(_HeroSheet, "PARTS", {
  body: { template: "systems/star-quest/templates/actor/hero-sheet.hbs" }
});
let HeroSheet = _HeroSheet;
const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$3 } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const _EnemySheet = class _EnemySheet extends HandlebarsApplicationMixin$3(ActorSheetV2) {
  async _prepareContext(_options) {
    const actor = this.document;
    return {
      actor,
      system: actor.system,
      editable: this.isEditable,
      weapons: actor.items.filter((i) => i.type === "weapon"),
      specialRules: actor.items.filter((i) => i.type === "specialRule")
    };
  }
};
_EnemySheet_static = new WeakSet();
onRollStat_fn2 = async function(_e, target) {
  const stat = target.dataset.stat;
  const actor = this.document;
  await rollStatTest(actor, `${stat} Test`, actor.system[stat]);
};
onEditItem_fn2 = async function(_e, target) {
  var _a, _b, _c;
  const id = (_a = target.closest("[data-item-id]")) == null ? void 0 : _a.dataset.itemId;
  (_c = (_b = this.document.items.get(id)) == null ? void 0 : _b.sheet) == null ? void 0 : _c.render(true);
};
onDeleteItem_fn2 = async function(_e, target) {
  var _a, _b;
  const id = (_a = target.closest("[data-item-id]")) == null ? void 0 : _a.dataset.itemId;
  await ((_b = this.document.items.get(id)) == null ? void 0 : _b.delete());
};
__privateAdd(_EnemySheet, _EnemySheet_static);
__publicField(_EnemySheet, "DEFAULT_OPTIONS", {
  classes: ["star-quest", "sheet", "actor", "enemy"],
  position: { width: 420, height: 560 },
  window: { resizable: true },
  form: {
    submitOnChange: true,
    closeOnSubmit: false
  },
  actions: {
    rollStat: __privateMethod(_EnemySheet, _EnemySheet_static, onRollStat_fn2),
    editItem: __privateMethod(_EnemySheet, _EnemySheet_static, onEditItem_fn2),
    deleteItem: __privateMethod(_EnemySheet, _EnemySheet_static, onDeleteItem_fn2)
  }
});
__publicField(_EnemySheet, "PARTS", {
  body: { template: "systems/star-quest/templates/actor/enemy-sheet.hbs" }
});
let EnemySheet = _EnemySheet;
const _ObjectiveSheet = class _ObjectiveSheet extends HandlebarsApplicationMixin$3(ActorSheetV2) {
  async _prepareContext(_options) {
    const actor = this.document;
    return { actor, system: actor.system, editable: this.isEditable };
  }
};
_ObjectiveSheet_static = new WeakSet();
onAddProgress_fn = async function() {
  const actor = this.document;
  await actor.update({ "system.progress": actor.system.progress + 1 });
};
onRemoveProgress_fn = async function() {
  const actor = this.document;
  await actor.update({ "system.progress": Math.max(0, actor.system.progress - 1) });
};
__privateAdd(_ObjectiveSheet, _ObjectiveSheet_static);
__publicField(_ObjectiveSheet, "DEFAULT_OPTIONS", {
  classes: ["star-quest", "sheet", "actor", "objective"],
  position: { width: 380, height: 420 },
  window: { resizable: true },
  form: {
    submitOnChange: true,
    closeOnSubmit: false
  },
  actions: {
    addProgress: __privateMethod(_ObjectiveSheet, _ObjectiveSheet_static, onAddProgress_fn),
    removeProgress: __privateMethod(_ObjectiveSheet, _ObjectiveSheet_static, onRemoveProgress_fn)
  }
});
__publicField(_ObjectiveSheet, "PARTS", {
  body: { template: "systems/star-quest/templates/actor/objective-sheet.hbs" }
});
let ObjectiveSheet = _ObjectiveSheet;
const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$2 } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
class StarQuestItemSheet extends HandlebarsApplicationMixin$2(ItemSheetV2) {
  async _prepareContext(_options) {
    const item = this.document;
    return {
      item,
      system: item.system,
      type: item.type,
      editable: this.isEditable
    };
  }
}
__publicField(StarQuestItemSheet, "DEFAULT_OPTIONS", {
  classes: ["star-quest", "sheet", "item"],
  position: { width: 460, height: 480 },
  window: { resizable: true },
  form: {
    submitOnChange: true,
    closeOnSubmit: false
  }
});
__publicField(StarQuestItemSheet, "PARTS", {
  body: { template: "systems/star-quest/templates/item/item-sheet.hbs" }
});
const { ApplicationV2: ApplicationV2$1, HandlebarsApplicationMixin: HandlebarsApplicationMixin$1 } = foundry.applications.api;
const _CampaignTracker = class _CampaignTracker extends HandlebarsApplicationMixin$1(ApplicationV2$1) {
  /** The hero this panel acts on: first controlled token, else first owned hero. */
  get hero() {
    var _a, _b, _c, _d;
    const controlled = (_c = (_b = (_a = canvas == null ? void 0 : canvas.tokens) == null ? void 0 : _a.controlled) == null ? void 0 : _b[0]) == null ? void 0 : _c.actor;
    if ((controlled == null ? void 0 : controlled.type) === "hero") return controlled;
    return ((_d = game.actors) == null ? void 0 : _d.find((a) => a.type === "hero" && a.isOwner)) ?? null;
  }
  async _prepareContext(_options) {
    const hero = this.hero;
    return {
      hero,
      system: (hero == null ? void 0 : hero.system) ?? null,
      injuries: hero ? hero.items.filter((i) => i.type === "injury") : []
    };
  }
};
_CampaignTracker_static = new WeakSet();
onAddXP_fn = async function(_e, target) {
  var _a;
  const hero = this.hero;
  if (!hero) return (_a = ui.notifications) == null ? void 0 : _a.warn("No hero selected.");
  const amount = Number(target.dataset.amount ?? 1);
  await hero.update({ "system.xp": hero.system.xp + amount });
  this.render();
};
onLevelUp_fn = async function() {
  var _a, _b;
  const hero = this.hero;
  if (!hero) return (_a = ui.notifications) == null ? void 0 : _a.warn("No hero selected.");
  await hero.update({ "system.level": hero.system.level + 1 });
  (_b = ui.notifications) == null ? void 0 : _b.info(`${hero.name} reaches level ${hero.system.level}!`);
  this.render();
};
onSpendCredits_fn = async function(_e, target) {
  var _a;
  const hero = this.hero;
  if (!hero) return (_a = ui.notifications) == null ? void 0 : _a.warn("No hero selected.");
  const amount = Number(target.dataset.amount ?? 0);
  const next = Math.max(0, hero.system.credits - amount);
  await hero.update({ "system.credits": next });
  this.render();
};
__privateAdd(_CampaignTracker, _CampaignTracker_static);
__publicField(_CampaignTracker, "DEFAULT_OPTIONS", {
  id: "sq-campaign-tracker",
  classes: ["star-quest", "sq-panel"],
  tag: "div",
  window: { title: "SQ.Campaign.Title", resizable: true },
  position: { width: 360, height: "auto" },
  actions: {
    addXP: __privateMethod(_CampaignTracker, _CampaignTracker_static, onAddXP_fn),
    levelUp: __privateMethod(_CampaignTracker, _CampaignTracker_static, onLevelUp_fn),
    spendCredits: __privateMethod(_CampaignTracker, _CampaignTracker_static, onSpendCredits_fn)
  }
});
__publicField(_CampaignTracker, "PARTS", {
  body: { template: "systems/star-quest/templates/apps/campaign-tracker.hbs" }
});
let CampaignTracker = _CampaignTracker;
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const _AIHelper = class _AIHelper extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor() {
    super(...arguments);
    /** The most recently chosen AI action, for highlight feedback. */
    __publicField(this, "chosen", null);
  }
  async _prepareContext(_options) {
    return {
      chosen: this.chosen,
      steps: [
        { key: "nearest", label: "SQ.AI.NearestHero" },
        { key: "goal", label: "SQ.AI.Goal" }
      ],
      actions: [
        { key: "shoot", label: "SQ.AI.Shoot" },
        { key: "charge", label: "SQ.AI.Charge" },
        { key: "rush", label: "SQ.AI.Rush" }
      ]
    };
  }
};
_AIHelper_static = new WeakSet();
onPickAction_fn = async function(_e, target) {
  this.chosen = target.dataset.choice ?? null;
  this.render();
};
onReset_fn = async function() {
  this.chosen = null;
  this.render();
};
__privateAdd(_AIHelper, _AIHelper_static);
__publicField(_AIHelper, "DEFAULT_OPTIONS", {
  id: "sq-ai-helper",
  classes: ["star-quest", "sq-panel"],
  tag: "div",
  window: { title: "SQ.AI.Title", resizable: true },
  position: { width: 340, height: "auto" },
  actions: {
    pickAction: __privateMethod(_AIHelper, _AIHelper_static, onPickAction_fn),
    reset: __privateMethod(_AIHelper, _AIHelper_static, onReset_fn)
  }
});
__publicField(_AIHelper, "PARTS", {
  body: { template: "systems/star-quest/templates/apps/ai-helper.hbs" }
});
let AIHelper = _AIHelper;
const SYSTEM_ID = "star-quest";
Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | Initializing Grimdark Future: Star Quest`);
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("array", (...args) => args.slice(0, -1));
  CONFIG.SQ = SQ;
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
  game.starQuest = {
    openCampaignTracker: () => new CampaignTracker().render(true),
    openAIHelper: () => new AIHelper().render(true)
  };
});
Hooks.on("getSceneControlButtons", (controls) => {
  const tokenControls = Array.isArray(controls) ? controls.find((c) => c.name === "token") : controls.token;
  if (!tokenControls) return;
  const tools = tokenControls.tools;
  const add = (tool) => {
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
//# sourceMappingURL=star-quest.mjs.map
