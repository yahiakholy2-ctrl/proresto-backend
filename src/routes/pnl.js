const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

// ── Channels ─────────────────────────────────────────────────────────────────
router.get('/channels', auth, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM pnl_channels WHERE user_id=$1 ORDER BY sort_order,name', [req.user.id]);
  res.json(rows);
});
router.post('/channels', auth, async (req, res) => {
  const { name, name_ar, comm_rate } = req.body;
  const { rows } = await db.query(
    'INSERT INTO pnl_channels (user_id,name,name_ar,comm_rate) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.user.id, name, name_ar||name, comm_rate||null]);
  res.json(rows[0]);
});
router.patch('/channels/:id', auth, async (req, res) => {
  const { name, name_ar, comm_rate } = req.body;
  const { rows } = await db.query(
    'UPDATE pnl_channels SET name=COALESCE($1,name),name_ar=COALESCE($2,name_ar),comm_rate=$3 WHERE id=$4 AND user_id=$5 RETURNING *',
    [name, name_ar, comm_rate??null, req.params.id, req.user.id]);
  res.json(rows[0]);
});
router.delete('/channels/:id', auth, async (req, res) => {
  await db.query('DELETE FROM pnl_channels WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// ── Categories ────────────────────────────────────────────────────────────────
router.get('/categories', auth, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM pnl_categories WHERE user_id=$1 ORDER BY sort_order,name', [req.user.id]);
  res.json(rows);
});
router.post('/categories', auth, async (req, res) => {
  const { name, name_ar, is_cogs } = req.body;
  const { rows } = await db.query(
    'INSERT INTO pnl_categories (user_id,name,name_ar,is_cogs) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.user.id, name, name_ar||name, is_cogs||false]);
  res.json(rows[0]);
});
router.delete('/categories/:id', auth, async (req, res) => {
  await db.query('DELETE FROM pnl_categories WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// ── Entries ───────────────────────────────────────────────────────────────────
router.get('/entries', auth, async (req, res) => {
  const { branch_id, months } = req.query; // months = "1,3,5"
  let q = 'SELECT * FROM pnl_entries WHERE user_id=$1';
  const vals = [req.user.id];
  if (branch_id) { vals.push(branch_id); q += ` AND branch_id=$${vals.length}`; }
  if (months) {
    const arr = months.split(',').map(Number);
    q += ` AND EXTRACT(MONTH FROM entry_date) = ANY($${vals.length+1}::int[])`;
    vals.push(arr);
  }
  q += ' ORDER BY entry_date DESC LIMIT 2000';
  const { rows } = await db.query(q, vals);
  res.json(rows);
});

router.post('/entries', auth, async (req, res) => {
  const { branch_id, entry_type, cat_id, entry_date, amount } = req.body;
  const { rows } = await db.query(
    'INSERT INTO pnl_entries (user_id,branch_id,entry_type,cat_id,entry_date,amount) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.user.id, branch_id||null, entry_type, cat_id, entry_date, amount]);
  res.json(rows[0]);
});

router.patch('/entries/:id', auth, async (req, res) => {
  const { amount } = req.body;
  const { rows } = await db.query(
    'UPDATE pnl_entries SET amount=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
    [amount, req.params.id, req.user.id]);
  res.json(rows[0]);
});

router.delete('/entries/:id', auth, async (req, res) => {
  await db.query('DELETE FROM pnl_entries WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
