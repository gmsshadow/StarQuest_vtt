/**
 * Generates the compendium _source JSON files for the Star Quest starter content.
 *
 * Run with: node tools/build-packs.mjs
 * Produces:
 *   packs/_source/heroes/*.json
 *   packs/_source/enemies/*.json
 *   packs/_source/rules/*.json   (special rules, skills, consumables as world items)
 *
 * The _source JSON is the editable form. compile-packs.mjs turns it into LevelDB.
 */

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "packs", "_source");

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function rid(n = 16) {
  let s = "";
  for (let i = 0; i < n; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

// --- Item factory helpers ---------------------------------------------------

function weapon(name, { range = 0, attacks = 1, ap = 0, special = "" } = {}) {
  return {
    _id: rid(),
    name,
    type: "weapon",
    img: "icons/svg/sword.svg",
    system: { range, attacks, ap, special, description: "" },
    effects: [],
    folder: null,
    sort: 0,
    flags: {},
    _stats: {}
  };
}

function skill(name, { stat = "quality", rollTarget = 0, cost = 0, description = "" } = {}) {
  return {
    _id: rid(),
    name,
    type: "skill",
    img: "icons/svg/upgrade.svg",
    system: { stat, rollTarget, cost, description },
    effects: [],
    folder: null,
    sort: 0,
    flags: {},
    _stats: {}
  };
}

function consumable(name, { value = 1, max = 1, effect = "" } = {}) {
  return {
    _id: rid(),
    name,
    type: "consumable",
    img: "icons/svg/regen.svg",
    system: { uses: { value, max }, effect },
    effects: [],
    folder: null,
    sort: 0,
    flags: {},
    _stats: {}
  };
}

function specialRule(name, description) {
  return {
    _id: rid(),
    name,
    type: "specialRule",
    img: "icons/svg/aura.svg",
    system: { description },
    effects: [],
    folder: null,
    sort: 0,
    flags: {},
    _stats: {}
  };
}

// --- Rule text (paraphrased / transcribed from the OPR Star Quest reference) -

const RULES = {
  shred: "Shred: Targets get -1 to Defense rolls when blocking hits from this weapon.",
  selfRepair: "Self-Repair: This unit may restore 1 wound at the start of its activation.",
  slow: "Slow: This unit moves at reduced distance (treat Advance/Rush/Charge as shorter, per the army rules).",
  tough: "Tough(X): Once a model has taken as many wounds as its Tough value, it is killed (removed from play).",
  shoot: "",
  deadly: "Deadly(X): Assign each wound to one model and multiply it by X. Deadly hits are resolved first and do not carry over to other models if the original target is killed.",
  rending: "Rending: Ignores Regeneration, and on unmodified 6s to hit, those hits get AP(+4).",
  ap: "AP(X): Targets get -X to Defense rolls when blocking hits.",
  commandingShout: "Commanding Shout: Once per game, when activated, two heroes within 3\" may move by up to 6\" each.",
  darkborn: "Darkborn: Enemies get -4\" range (min 6\") when shooting units where all models have this rule, and -2\" movement (min 6\") when charging them.",
  fearless: "Fearless: When a unit where all models have this rule fails a morale test, roll one die. On a 4+ it counts as passed instead.",
  ancientWeapon: "Ancient Weapon: Pick one other friendly unit within 6\", which gets +2 to hit rolls the next time it attacks.",
  inquisitorialAgent: "Inquisitorial Agent: Once per game, if all models have this rule, this unit may be activated again in a round (it stops being fatigued when activated the second time). Limited to up to one third of eligible units per round.",
  instigatedRestoration: "Instigated Restoration: Once per game, when activated, two other heroes within 9\" restore 1 power each.",
  inspire: "Inspire: Pick two other friendly units within 9\", which each get +1 to their next stat roll.",
  songOfHealth: "Song of Health: Pick two other friendly heroes within 9\", which each restore 1 wound.",
  curingKit: "Curing Kit: Use with a skill action, then remove. The hero loses all status conditions. May instead be applied to one other hero within 3\"."
};

// --- Actor factory ----------------------------------------------------------

function hero(name, data, items) {
  const _id = rid();
  for (const it of items) it._key = `!actors.items!${_id}.${it._id}`;
  return {
    _id,
    _key: `!actors!${_id}`,
    name,
    type: "hero",
    img: "icons/svg/mystery-man.svg",
    system: data,
    items,
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    prototypeToken: {
      name,
      actorLink: true,
      disposition: 1,
      sight: { enabled: true }
    },
    _stats: {}
  };
}

function enemy(name, data, items) {
  const _id = rid();
  for (const it of items) it._key = `!actors.items!${_id}.${it._id}`;
  return {
    _id,
    _key: `!actors!${_id}`,
    name,
    type: "enemy",
    img: "icons/svg/terror.svg",
    system: data,
    items,
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    prototypeToken: {
      name,
      actorLink: false,
      disposition: -1,
      sight: { enabled: false }
    },
    _stats: {}
  };
}

/**
 * A gridless Scene backed by a full-image battlemap.
 * width/height must match the image's pixel dimensions.
 */
function scene(name, { src, width, height } = {}) {
  const _id = rid();
  return {
    _id,
    _key: `!scenes!${_id}`,
    name,
    active: false,
    navigation: true,
    width,
    height,
    padding: 0.25,
    initial: null,
    backgroundColor: "#111111",
    background: { src, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0, tint: null },
    foreground: null,
    // grid.type 0 = gridless. size is required by the schema but unused when gridless.
    grid: {
      type: 0,
      size: 100,
      style: "solidLines",
      thickness: 1,
      color: "#000000",
      alpha: 0.2,
      distance: 1,
      units: "\""
    },
    tokenVision: false,
    fog: { exploration: false, overlay: null },
    globalLight: true,
    darkness: 0,
    drawings: [],
    tokens: [],
    lights: [],
    notes: [],
    sounds: [],
    regions: [],
    templates: [],
    tiles: [],
    walls: [],
    playlist: null,
    playlistSound: null,
    journal: null,
    weather: "",
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: {}
  };
}

// --- Build documents --------------------------------------------------------

// Malius — Lvl 1 Commander (Dark Brothers)
const malius = hero(
  "Malius",
  {
    faction: "Dark Brothers",
    class: "Commander (Aspiring Dark Master Brother)",
    level: 1,
    xp: 0,
    credits: 0,
    quality: 4,
    defense: 6,
    toughness: 9,
    strength: 6,
    dexterity: 6,
    willpower: 4,
    power: { value: 4, max: 4 },
    wounds: 0,
    isCaster: false,
    notes: "<p>140 pts. Mission Credits: 0.</p>",
    biography: ""
  },
  [
    weapon("Energy Fist", { range: 0, attacks: 2, ap: 4, special: "" }),
    weapon("Fusion Pistol", { range: 6, attacks: 1, ap: 4, special: "Deadly(3)" }),
    skill("Ancient Weapon", { stat: "willpower", description: `<p>${RULES.ancientWeapon}</p>` }),
    specialRule("Commanding Shout", `<p>${RULES.commandingShout}</p>`),
    specialRule("Darkborn", `<p>${RULES.darkborn}</p>`),
    specialRule("Fearless", `<p>${RULES.fearless}</p>`),
    specialRule("Tough(9)", `<p>${RULES.tough}</p>`),
    consumable("Curing Kit", { value: 2, max: 2, effect: `<p>${RULES.curingKit}</p>` })
  ]
);

// Osteomandeus — Lvl 1 Instigator (Human Inquisition)
const osteo = hero(
  "Osteomandeus",
  {
    faction: "Human Inquisition",
    class: "Instigator (Aspiring Inquisitor)",
    level: 1,
    xp: 0,
    credits: 10,
    quality: 5,
    defense: 6,
    toughness: 9,
    strength: 6,
    dexterity: 5,
    willpower: 5,
    power: { value: 5, max: 5 },
    wounds: 0,
    isCaster: false,
    notes: "<p>90 pts. Credits Stash: 10c. Mission Credits: 0.</p>",
    biography: ""
  },
  [
    weapon("Heavy Pistol", { range: 12, attacks: 1, ap: 1, special: "" }),
    weapon("Energy Sword", { range: 0, attacks: 2, ap: 1, special: "Rending" }),
    skill("Inspire", { stat: "dexterity", description: `<p>${RULES.inspire}</p>` }),
    skill("Song of Health", { stat: "willpower", description: `<p>${RULES.songOfHealth}</p>` }),
    specialRule("Inquisitorial Agent", `<p>${RULES.inquisitorialAgent}</p>`),
    specialRule("Instigated Restoration", `<p>${RULES.instigatedRestoration}</p>`),
    specialRule("Tough(9)", `<p>${RULES.tough}</p>`),
    consumable("Curing Kit", { value: 2, max: 2, effect: `<p>${RULES.curingKit}</p>` })
  ]
);

// Warrior — Robot Legion enemy
const warrior = enemy(
  "Warrior",
  {
    quality: 4,
    defense: 4,
    toughness: 3,
    unitSize: 1,
    pointCost: 65,
    wounds: 0,
    notes: "<p>Robot Legion. Base: 32mm.</p>"
  },
  [
    weapon("Reaper Rifle", { range: 18, attacks: 3, ap: 1, special: "Shred" }),
    weapon("CCW", { range: 0, attacks: 3, ap: 0, special: "" }),
    specialRule("Self-Repair", `<p>${RULES.selfRepair}</p>`),
    specialRule("Slow", `<p>${RULES.slow}</p>`),
    specialRule("Tough(3)", `<p>${RULES.tough}</p>`)
  ]
);

// Standalone reference items for the "rules" pack.
const refItems = [
  specialRule("Shred", `<p>${RULES.shred}</p>`),
  specialRule("Deadly(X)", `<p>${RULES.deadly}</p>`),
  specialRule("Rending", `<p>${RULES.rending}</p>`),
  specialRule("AP(X)", `<p>${RULES.ap}</p>`),
  specialRule("Tough(X)", `<p>${RULES.tough}</p>`),
  specialRule("Fearless", `<p>${RULES.fearless}</p>`),
  consumable("Curing Kit", { value: 1, max: 1, effect: `<p>${RULES.curingKit}</p>` }),
  consumable("Med Kit", {
    value: 1,
    max: 1,
    effect: "<p>Med Kit: Use with a skill action, then remove. The hero restores 3 wounds. May instead be applied to one other hero within 3\".</p>"
  }),
  consumable("Resting Kit", {
    value: 1,
    max: 1,
    effect: "<p>Resting Kit: Use with a skill action, then remove. The hero restores 3 power. May instead be applied to one other hero within 3\".</p>"
  })
];

// --- Write _source ----------------------------------------------------------

rmSync(SRC, { recursive: true, force: true });

function writeDocs(pack, docs) {
  const dir = join(SRC, pack);
  mkdirSync(dir, { recursive: true });
  for (const doc of docs) {
    const safe = doc.name.replace(/[^a-z0-9]+/gi, "_");
    writeFileSync(join(dir, `${safe}_${doc._id}.json`), JSON.stringify(doc, null, 2));
  }
}

writeDocs("heroes", [malius, osteo]);
writeDocs("enemies", [warrior]);
// Standalone pack items need an !items! collection key for the compiler.
for (const it of refItems) it._key = `!items!${it._id}`;
writeDocs("rules", refItems);

// Starter scene — gridless, sized to the 1920x1920 battlemap.
const starterScene = scene("Star Quest — Starter Map", {
  src: "systems/star-quest/assets/sq-starter-map.jpg",
  width: 1920,
  height: 1920
});
writeDocs("scenes", [starterScene]);

console.log(
  "Wrote _source for heroes (2), enemies (1), rules (" +
    refItems.length +
    "), scenes (1)."
);
