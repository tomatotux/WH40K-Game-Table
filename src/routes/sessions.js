const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const MAPS_DIR = path.join(__dirname, '../../data/maps');
if (!fs.existsSync(MAPS_DIR)) fs.mkdirSync(MAPS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: MAPS_DIR,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── Sessions CRUD ───────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const sessions = db.prepare(`
    SELECT s.*, COUNT(sc.character_id) as character_count
    FROM sessions s
    LEFT JOIN session_characters sc ON sc.session_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).all();
  res.json(sessions);
});

router.get('/active', (req, res) => {
  const session = db.prepare(`SELECT * FROM sessions WHERE status='active' ORDER BY created_at DESC LIMIT 1`).get();
  res.json(session || null);
});

router.get('/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id=?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.characters = getSessionCharacters(req.params.id);
  res.json(session);
});

// POST create session
router.post('/', (req, res) => {
  const { name, character_ids } = req.body;
  if (!name) return res.status(400).json({ error: 'Session name required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO sessions (id, name) VALUES (?, ?)`).run(id, name);
  if (Array.isArray(character_ids)) {
    const ins = db.prepare('INSERT OR IGNORE INTO session_characters (session_id, character_id) VALUES (?, ?)');
    character_ids.forEach(cid => ins.run(id, cid));
  }
  res.status(201).json({ id });
});

// POST upload map image
router.post('/:id/map', upload.single('map'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const mapPath = `/maps/${req.file.filename}`;
  db.prepare('UPDATE sessions SET map_image=? WHERE id=?').run(mapPath, req.params.id);
  res.json({ map_image: mapPath });
});

// POST end session — clears all modifiers
router.post('/:id/end', (req, res) => {
  const sid = req.params.id;
  db.prepare('DELETE FROM session_modifiers WHERE session_id=?').run(sid);
  db.prepare('DELETE FROM session_conditions WHERE session_id=?').run(sid);
  db.prepare(`UPDATE sessions SET status='ended', ended_at=datetime('now') WHERE id=?`).run(sid);
  res.json({ success: true, message: 'Session ended. All modifiers cleared.' });
});

// DELETE session
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM sessions WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── Session Characters ──────────────────────────────────────────────────────

router.get('/:id/characters', (req, res) => {
  res.json(getSessionCharacters(req.params.id));
});

router.post('/:id/characters', (req, res) => {
  const { character_id } = req.body;
  db.prepare('INSERT OR IGNORE INTO session_characters (session_id, character_id) VALUES (?, ?)').run(req.params.id, character_id);
  res.json({ success: true });
});

router.delete('/:id/characters/:charId', (req, res) => {
  db.prepare('DELETE FROM session_characters WHERE session_id=? AND character_id=?').run(req.params.id, req.params.charId);
  db.prepare('DELETE FROM session_modifiers WHERE session_id=? AND character_id=?').run(req.params.id, req.params.charId);
  db.prepare('DELETE FROM session_conditions WHERE session_id=? AND character_id=?').run(req.params.id, req.params.charId);
  res.json({ success: true });
});

// ── Modifiers ───────────────────────────────────────────────────────────────

router.get('/:id/characters/:charId/modifiers', (req, res) => {
  const mods = db.prepare('SELECT * FROM session_modifiers WHERE session_id=? AND character_id=?')
    .all(req.params.id, req.params.charId);
  const conditions = db.prepare('SELECT condition FROM session_conditions WHERE session_id=? AND character_id=?')
    .all(req.params.id, req.params.charId).map(r => r.condition);
  res.json({ modifiers: mods, conditions });
});

// PUT upsert modifier
router.put('/:id/characters/:charId/modifiers', (req, res) => {
  const { field, delta, note } = req.body;
  if (!field) return res.status(400).json({ error: 'field required' });
  db.prepare(`
    INSERT INTO session_modifiers (session_id, character_id, field, delta, note)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(session_id, character_id, field)
    DO UPDATE SET delta=excluded.delta, note=excluded.note, applied_at=datetime('now')
  `).run(req.params.id, req.params.charId, field, delta || 0, note || '');
  res.json({ success: true });
});

// DELETE single modifier
router.delete('/:id/characters/:charId/modifiers/:field', (req, res) => {
  db.prepare('DELETE FROM session_modifiers WHERE session_id=? AND character_id=? AND field=?')
    .run(req.params.id, req.params.charId, req.params.field);
  res.json({ success: true });
});

// POST add condition
router.post('/:id/characters/:charId/conditions', (req, res) => {
  const { condition } = req.body;
  db.prepare('INSERT OR IGNORE INTO session_conditions (session_id, character_id, condition) VALUES (?, ?, ?)')
    .run(req.params.id, req.params.charId, condition);
  res.json({ success: true });
});

// DELETE condition
router.delete('/:id/characters/:charId/conditions/:condition', (req, res) => {
  db.prepare('DELETE FROM session_conditions WHERE session_id=? AND character_id=? AND condition=?')
    .run(req.params.id, req.params.charId, req.params.condition);
  res.json({ success: true });
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function getSessionCharacters(sessionId) {
  const chars = db.prepare(`
    SELECT c.*, f.name as faction_name, f.color as faction_color
    FROM session_characters sc
    JOIN characters c ON c.id = sc.character_id
    LEFT JOIN factions f ON f.id = c.faction_id
    WHERE sc.session_id = ?
    ORDER BY f.name, c.name
  `).all(sessionId);

  return chars.map(c => {
    c.weapons = db.prepare('SELECT * FROM weapons WHERE character_id=?').all(c.id);
    c.modifiers = db.prepare('SELECT field, delta, note FROM session_modifiers WHERE session_id=? AND character_id=?')
      .all(sessionId, c.id);
    c.conditions = db.prepare('SELECT condition FROM session_conditions WHERE session_id=? AND character_id=?')
      .all(sessionId, c.id).map(r => r.condition);
    // Compute effective stats
    const modMap = {};
    c.modifiers.forEach(m => { modMap[m.field] = m.delta; });
    const statFields = ['movement','toughness','save','wounds','leadership','objective_control','ws','bs','inv_save','feel_no_pain'];
    c.effective = {};
    statFields.forEach(f => { c.effective[f] = (c[f] || 0) + (modMap[f] || 0); });
    return c;
  });
}

module.exports = router;
