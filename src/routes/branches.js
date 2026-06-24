const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

router.get('/',    auth, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM branches WHERE user_id=$1 ORDER BY created_at', [req.user.id]);
  res.json(rows);
});
router.post('/',   auth, async (req, res) => {
  const { name } = req.body;
  const { rows } = await db.query('INSERT INTO branches (user_id, name) VALUES ($1,$2) RETURNING *', [req.user.id, name]);
  res.json(rows[0]);
});
router.delete('/:id', auth, async (req, res) => {
  await db.query('DELETE FROM branches WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});
module.exports = router;
