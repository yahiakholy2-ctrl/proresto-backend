const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT m.*, b.name as branch_name FROM menu_items m LEFT JOIN branches b ON b.id=m.branch_id WHERE m.user_id=$1 ORDER BY m.created_at',
    [req.user.id]);
  res.json(rows);
});

router.post('/', auth, async (req, res) => {
  const { branch_id, recipe_id, name, name_ar, category, category_ar, price, sales_vol, manual_cost } = req.body;
  const { rows } = await db.query(
    `INSERT INTO menu_items (user_id,branch_id,recipe_id,name,name_ar,category,category_ar,price,sales_vol,manual_cost)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.user.id, branch_id||null, recipe_id||null, name, name_ar||name, category||'Main', category_ar||'رئيسي', price||0, sales_vol||0, manual_cost||null]
  );
  res.json(rows[0]);
});

router.patch('/:id', auth, async (req, res) => {
  const { price, sales_vol, manual_cost, recipe_id } = req.body;
  const { rows } = await db.query(
    `UPDATE menu_items SET
       price=COALESCE($1,price),
       sales_vol=COALESCE($2,sales_vol),
       manual_cost=$3,
       recipe_id=COALESCE($4,recipe_id)
     WHERE id=$5 AND user_id=$6 RETURNING *`,
    [price, sales_vol, manual_cost??null, recipe_id, req.params.id, req.user.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', auth, async (req, res) => {
  await db.query('DELETE FROM menu_items WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
