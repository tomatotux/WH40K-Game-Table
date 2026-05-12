const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'wh40k.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ─────────────────────────────────────────────────────────────────

db.exec(`
  -- Factions / Armies
  CREATE TABLE IF NOT EXISTS factions (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL UNIQUE,
    color    TEXT DEFAULT '#c0392b'
  );

  -- Characters / Units
  CREATE TABLE IF NOT EXISTS characters (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    faction_id    INTEGER REFERENCES factions(id) ON DELETE SET NULL,
    name          TEXT NOT NULL,
    unit_type     TEXT NOT NULL DEFAULT 'Infantry',
    points_cost   INTEGER DEFAULT 0,
    keywords      TEXT DEFAULT '',
    lore          TEXT DEFAULT '',
    -- Core Stats (permanent base values)
    movement      INTEGER DEFAULT 6,
    toughness     INTEGER DEFAULT 4,
    save          INTEGER DEFAULT 4,
    wounds        INTEGER DEFAULT 1,
    leadership    INTEGER DEFAULT 7,
    objective_control INTEGER DEFAULT 1,
    -- Weapon Skill / Ballistic Skill
    ws            INTEGER DEFAULT 4,
    bs            INTEGER DEFAULT 4,
    -- Special
    inv_save      INTEGER DEFAULT 0,
    feel_no_pain  INTEGER DEFAULT 0,
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );

  -- Weapons belonging to a character
  CREATE TABLE IF NOT EXISTS weapons (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id  INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    weapon_type   TEXT DEFAULT 'Ranged',
    range_inches  INTEGER DEFAULT 0,
    attacks       TEXT DEFAULT '1',
    skill         INTEGER DEFAULT 4,
    strength      INTEGER DEFAULT 4,
    ap            INTEGER DEFAULT 0,
    damage        TEXT DEFAULT '1',
    abilities     TEXT DEFAULT ''
  );

  -- Active sessions
  CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    map_image   TEXT DEFAULT NULL,
    status      TEXT DEFAULT 'active',
    created_at  TEXT DEFAULT (datetime('now')),
    ended_at    TEXT DEFAULT NULL
  );

  -- Which characters are in a session
  CREATE TABLE IF NOT EXISTS session_characters (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    character_id  INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(session_id, character_id)
  );

  -- Temporary stat modifiers — cleared when session ends
  CREATE TABLE IF NOT EXISTS session_modifiers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    character_id  INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    field         TEXT NOT NULL,
    delta         INTEGER NOT NULL DEFAULT 0,
    note          TEXT DEFAULT '',
    applied_at    TEXT DEFAULT (datetime('now')),
    UNIQUE(session_id, character_id, field)
  );

  -- Condition markers (Stunned, On Fire, etc.) — also temporary
  CREATE TABLE IF NOT EXISTS session_conditions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    character_id  INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    condition     TEXT NOT NULL,
    UNIQUE(session_id, character_id, condition)
  );
`);

// ── Seed Data ──────────────────────────────────────────────────────────────

const seedFactions = db.prepare(`INSERT OR IGNORE INTO factions (name, color) VALUES (?, ?)`);
const seedData = [
  ['Space Marines', '#1a5276'],
  ['Chaos Space Marines', '#7b241c'],
  ['Orks', '#1e8449'],
  ['Eldar', '#9b59b6'],
  ['Tyranids', '#117a65'],
  ['Necrons', '#d4ac0d'],
  ['Imperial Guard', '#784212'],
  ['Tau Empire', '#2e86c1'],
];
seedData.forEach(([name, color]) => seedFactions.run(name, color));

// Seed example characters if empty
const count = db.prepare('SELECT COUNT(*) as c FROM characters').get();
if (count.c === 0) {
  const insert = db.prepare(`
    INSERT INTO characters (faction_id, name, unit_type, points_cost, keywords, lore,
      movement, toughness, save, wounds, leadership, objective_control, ws, bs, inv_save, feel_no_pain)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const factionId = (name) => db.prepare('SELECT id FROM factions WHERE name=?').get(name)?.id;

  const characters = [
    [factionId('Space Marines'), 'Captain Uriel Ventris', 'Character', 100,
      'Adeptus Astartes, Character, Infantry, Captain', 'Veteran captain of the Ultramarines.',
      6, 4, 3, 5, 6, 1, 3, 3, 4, 0],
    [factionId('Space Marines'), 'Tactical Marine Squad', 'Infantry', 90,
      'Adeptus Astartes, Infantry, Tacticus', 'Backbone of any Space Marine force.',
      6, 4, 3, 2, 6, 2, 4, 4, 0, 0],
    [factionId('Space Marines'), 'Dreadnought', 'Vehicle', 130,
      'Adeptus Astartes, Vehicle, Dreadnought, Walker', 'Ancient warrior interred within a sarcophagus.',
      6, 7, 2, 8, 6, 3, 4, 4, 0, 0],
    [factionId('Chaos Space Marines'), 'Chaos Lord', 'Character', 105,
      'Chaos, Character, Infantry, Chaos Lord', 'Warlord devoted to the dark gods.',
      6, 4, 3, 5, 7, 1, 3, 3, 4, 0],
    [factionId('Chaos Space Marines'), 'Berzerkers', 'Infantry', 80,
      'Chaos, Infantry, Khorne Berzerkers', 'Frenzied warriors of Khorne.',
      6, 4, 3, 2, 7, 2, 3, 4, 0, 0],
    [factionId('Orks'), 'Warboss', 'Character', 95,
      'Ork, Character, Infantry, Warboss', 'Da biggest and da meanest.',
      5, 5, 4, 6, 7, 1, 3, 4, 0, 6],
    [factionId('Orks'), 'Boyz Squad', 'Infantry', 60,
      'Ork, Infantry, Core', 'Classic Ork foot soldiers.',
      5, 5, 4, 1, 8, 2, 4, 4, 0, 0],
    [factionId('Necrons'), 'Overlord', 'Character', 110,
      'Necrons, Character, Infantry, Overlord', 'Ancient necron noble awakened from slumber.',
      6, 5, 3, 5, 7, 1, 3, 3, 4, 4],
  ];

  const insertWeapon = db.prepare(`
    INSERT INTO weapons (character_id, name, weapon_type, range_inches, attacks, skill, strength, ap, damage, abilities)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  characters.forEach(args => {
    const result = insert.run(...args);
    const cid = result.lastInsertRowid;
    const name = args[1];

    // Add some default weapons
    if (name === 'Captain Uriel Ventris') {
      insertWeapon.run(cid, 'Power Sword', 'Melee', 0, '5', 3, 5, -2, '1', 'Lethal Hits');
      insertWeapon.run(cid, 'Master-crafted Bolt Pistol', 'Ranged', 18, '2', 3, 4, 0, '2', 'Pistol');
    } else if (name === 'Tactical Marine Squad') {
      insertWeapon.run(cid, 'Bolt Rifle', 'Ranged', 24, '2', 4, 4, -1, '1', 'Assault, Heavy');
      insertWeapon.run(cid, 'Bolt Pistol', 'Ranged', 12, '1', 4, 4, 0, '1', 'Pistol');
      insertWeapon.run(cid, 'Fists', 'Melee', 0, '3', 4, 4, 0, '1', '');
    } else if (name === 'Dreadnought') {
      insertWeapon.run(cid, 'Assault Cannon', 'Ranged', 24, '6', 4, 7, -1, '1', 'Devastating Wounds');
      insertWeapon.run(cid, 'Dreadnought Combat Weapon', 'Melee', 0, '5', 4, 12, -2, '3', '');
    } else if (name === 'Chaos Lord') {
      insertWeapon.run(cid, 'Chainsword', 'Melee', 0, '6', 3, 4, -1, '1', 'Lethal Hits');
      insertWeapon.run(cid, 'Plasma Pistol', 'Ranged', 12, '1', 3, 7, -2, '1', 'Pistol; Supercharge: S8, Haz');
    } else if (name === 'Berzerkers') {
      insertWeapon.run(cid, 'Chainsword', 'Melee', 0, '4', 3, 4, -1, '1', 'Lethal Hits');
      insertWeapon.run(cid, 'Bolt Pistol', 'Ranged', 12, '1', 4, 4, 0, '1', 'Pistol');
    } else if (name === 'Warboss') {
      insertWeapon.run(cid, 'Power Klaw', 'Melee', 0, '4', 3, 10, -2, '3', '');
      insertWeapon.run(cid, 'Slugga', 'Ranged', 12, '2', 4, 4, 0, '1', 'Pistol');
    } else if (name === 'Boyz Squad') {
      insertWeapon.run(cid, 'Choppa', 'Melee', 0, '2', 4, 5, -1, '1', '');
      insertWeapon.run(cid, 'Slugga', 'Ranged', 12, '1', 5, 4, 0, '1', 'Pistol');
    } else if (name === 'Overlord') {
      insertWeapon.run(cid, 'Staff of Light (Melee)', 'Melee', 0, '3', 3, 6, -1, '2', '');
      insertWeapon.run(cid, 'Staff of Light (Ranged)', 'Ranged', 18, '3', 3, 5, -2, '2', 'Assault');
    }
  });
}

module.exports = db;
