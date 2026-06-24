const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

const SUPER_ID = '00000000-0000-0000-0000-000000000001';

// GET /api/users  (super-admin only)
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await db.query('SELECT id, email, name, role, status, verified, created_at FROM users ORDER BY created_at');
  res.json(rows);
});

// PATCH /api/users/:id
router.patch('/:id', auth, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  if (req.params.id === SUPER_ID) return res.status(403).json({ error: 'Cannot modify super-admin' });
  const { status, verified } = req.body;
  const sets = [], vals = [];
  if (status   !== undefined) { sets.push(`status=$${sets.length+1}`);   vals.push(status); }
  if (verified !== undefined) { sets.push(`verified=$${sets.length+1}`); vals.push(verified); }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  vals.push(req.params.id);
  const { rows } = await db.query(`UPDATE users SET ${sets.join(',')} WHERE id=$${vals.length} RETURNING id, email, name, role, status, verified`, vals);
  res.json(rows[0]);
});

// DELETE /api/users/:id
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  if (req.params.id === SUPER_ID) return res.status(403).json({ error: 'Cannot delete super-admin' });
  await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
