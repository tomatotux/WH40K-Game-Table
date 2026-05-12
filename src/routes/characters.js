const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET all characters (with faction info)
router.get('/', (req, res) => {
  const { faction_id, search } = req.query;
  let sql = `
    SELECT c.*, f.name as faction_name, f.color as faction_color
    FROM characters c
    LEFT JOIN factions f ON c.faction_id = f.id
    WHERE 1=1
  `;
  const params = [];
  if (faction_id) { sql += ` AND c.faction_id = ?`; params.push(faction_id); }
  if (search) { sql += ` AND c.name LIKE ?`; params.push(`%${search}%`); }
  sql += ` ORDER BY f.name, c.name`;
  res.json(db.prepare(sql).all(...params));
});

// GET single character with weapons
router.get('/:id', (req, res) => {
  const char = db.prepare(`
    SELECT c.*, f.name as faction_name, f.color as faction_color
    FROM characters c LEFT JOIN factions f ON c.faction_id = f.id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!char) return res.status(404).json({ error: 'Character not found' });
  char.weapons = db.prepare('SELECT * FROM weapons WHERE character_id = ? ORDER BY weapon_type, name').all(char.id);
  res.json(char);
});

// POST create character
router.post('/', (req, res) => {
  const {
    faction_id, name, unit_type, points_cost, keywords, lore,
    movement, toughness, save, wounds, leadership, objective_control,
    ws, bs, inv_save, feel_no_pain
  } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = db.prepare(`
    INSERT INTO characters (faction_id, name, unit_type, points_cost, keywords, lore,
      movement, toughness, save, wounds, leadership, objective_control, ws, bs, inv_save, feel_no_pain)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    faction_id || null, name, unit_type || 'Infantry', points_cost || 0,
    keywords || '', lore || '',
    movement || 6, toughness || 4, save || 4, wounds || 1,
    leadership || 7, objective_control || 1, ws || 4, bs || 4,
    inv_save || 0, feel_no_pain || 0
  );
  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT update character
router.put('/:id', (req, res) => {
  const {
    faction_id, name, unit_type, points_cost, keywords, lore,
    movement, toughness, save, wounds, leadership, objective_control,
    ws, bs, inv_save, feel_no_pain
  } = req.body;
  db.prepare(`
    UPDATE characters SET
      faction_id=?, name=?, unit_type=?, points_cost=?, keywords=?, lore=?,
      movement=?, toughness=?, save=?, wounds=?, leadership=?, objective_control=?,
      ws=?, bs=?, inv_save=?, feel_no_pain=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    faction_id, name, unit_type, points_cost, keywords, lore,
    movement, toughness, save, wounds, leadership, objective_control,
    ws, bs, inv_save, feel_no_pain, req.params.id
  );
  res.json({ success: true });
});

// DELETE character
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM characters WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// GET weapons for character
router.get('/:id/weapons', (req, res) => {
  res.json(db.prepare('SELECT * FROM weapons WHERE character_id=? ORDER BY weapon_type, name').all(req.params.id));
});

// POST add weapon
router.post('/:id/weapons', (req, res) => {
  const { name, weapon_type, range_inches, attacks, skill, strength, ap, damage, abilities } = req.body;
  const result = db.prepare(`
    INSERT INTO weapons (character_id, name, weapon_type, range_inches, attacks, skill, strength, ap, damage, abilities)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, name, weapon_type || 'Ranged', range_inches || 0, attacks || '1',
    skill || 4, strength || 4, ap || 0, damage || '1', abilities || '');
  res.status(201).json({ id: result.lastInsertRowid });
});

// DELETE weapon
router.delete('/:charId/weapons/:weapId', (req, res) => {
  db.prepare('DELETE FROM weapons WHERE id=? AND character_id=?').run(req.params.weapId, req.params.charId);
  res.json({ success: true });
});

module.exports = router;
