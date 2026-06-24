const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT i.*, b.name as branch_name FROM inventory i LEFT JOIN branches b ON b.id=i.branch_id WHERE i.user_id=$1 ORDER BY i.created_at DESC',
    [req.user.id]
  );
  res.json(rows);
});

router.post('/', auth, async (req, res) => {
  const { branch_id, name, name_ar, unit, unit_cost, waste_pct, entry_date } = req.body;
  const { rows } = await db.query(
    `INSERT INTO inventory (user_id,branch_id,name,name_ar,unit,unit_cost,waste_pct,entry_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.id, branch_id||null, name, name_ar||name, unit||'kg', unit_cost||0, waste_pct||0, entry_date||new Date()]
  );
  res.json(rows[0]);
});

router.patch('/:id', auth, async (req, res) => {
  const { unit_cost, waste_pct, name, name_ar } = req.body;
  const { rows } = await db.query(
    `UPDATE inventory SET unit_cost=COALESCE($1,unit_cost), waste_pct=COALESCE($2,waste_pct),
     name=COALESCE($3,name), name_ar=COALESCE($4,name_ar)
     WHERE id=$5 AND user_id=$6 RETURNING *`,
    [unit_cost, waste_pct, name, name_ar, req.params.id, req.user.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', auth, async (req, res) => {
  await db.query('DELETE FROM inventory WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
