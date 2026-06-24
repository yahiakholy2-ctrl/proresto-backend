const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

// GET /api/recipes — returns recipes with their ingredients
router.get('/', auth, async (req, res) => {
  const { rows: recipes } = await db.query(
    'SELECT * FROM recipes WHERE user_id=$1 ORDER BY created_at', [req.user.id]);
  const { rows: ings } = await db.query(
    `SELECT ri.*, i.name, i.name_ar, i.unit, i.unit_cost
     FROM recipe_ingredients ri JOIN inventory i ON i.id=ri.inv_id
     WHERE i.user_id=$1`, [req.user.id]);
  const map = {};
  ings.forEach(ing => { if (!map[ing.recipe_id]) map[ing.recipe_id]=[]; map[ing.recipe_id].push(ing); });
  res.json(recipes.map(r => ({ ...r, ingredients: map[r.id]||[] })));
});

router.post('/', auth, async (req, res) => {
  const { name, name_ar, ingredients } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO recipes (user_id,name,name_ar) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, name, name_ar||name]);
    const recipe = rows[0];
    if (ingredients?.length) {
      for (const ing of ingredients) {
        await client.query(
          'INSERT INTO recipe_ingredients (recipe_id,inv_id,grams) VALUES ($1,$2,$3)',
          [recipe.id, ing.inv_id, ing.grams]);
      }
    }
    await client.query('COMMIT');
    res.json(recipe);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// PUT /api/recipes/:id — full replace
router.put('/:id', auth, async (req, res) => {
  const { name, name_ar, ingredients } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'UPDATE recipes SET name=$1, name_ar=$2 WHERE id=$3 AND user_id=$4 RETURNING *',
      [name, name_ar||name, req.params.id, req.user.id]);
    await client.query('DELETE FROM recipe_ingredients WHERE recipe_id=$1', [req.params.id]);
    for (const ing of (ingredients||[])) {
      await client.query(
        'INSERT INTO recipe_ingredients (recipe_id,inv_id,grams) VALUES ($1,$2,$3)',
        [req.params.id, ing.inv_id, ing.grams]);
    }
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

router.delete('/:id', auth, async (req, res) => {
  await db.query('DELETE FROM recipes WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
