const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { branch_id, month } = req.query;
  let q = `SELECT w.*, i.name as inv_name, i.name_ar as inv_name_ar, b.name as branch_name
           FROM waste_log w
           LEFT JOIN inventory i ON i.id=w.inv_id
           LEFT JOIN branches  b ON b.id=w.branch_id
           WHERE w.user_id=$1`;
  const vals = [req.user.id];
  if (branch_id) { vals.push(branch_id); q += ` AND w.branch_id=$${vals.length}`; }
  if (month)     { vals.push(+month);    q += ` AND EXTRACT(MONTH FROM w.entry_date)=$${vals.length}`; }
  q += ' ORDER BY w.entry_date DESC';
  const { rows } = await db.query(q, vals);
  res.json(rows);
});

router.post('/', auth, async (req, res) => {
  const { branch_id, inv_id, entry_date, qty, unit_price, reason, reason_ar } = req.body;
  const { rows } = await db.query(
    `INSERT INTO waste_log (user_id,branch_id,inv_id,entry_date,qty,unit_price,reason,reason_ar)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.id, branch_id||null, inv_id||null, entry_date, qty, unit_price, reason||'', reason_ar||'']
  );
  res.json(rows[0]);
});

router.patch('/:id', auth, async (req, res) => {
  const { unit_price } = req.body;
  const { rows } = await db.query(
    'UPDATE waste_log SET unit_price=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
    [unit_price, req.params.id, req.user.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', auth, async (req, res) => {
  await db.query('DELETE FROM waste_log WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
