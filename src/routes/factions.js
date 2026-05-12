const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM factions ORDER BY name').all());
});

router.post('/', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const result = db.prepare('INSERT INTO factions (name, color) VALUES (?, ?)').run(name, color || '#c0392b');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { name, color } = req.body;
  db.prepare('UPDATE factions SET name=?, color=? WHERE id=?').run(name, color, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM factions WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
