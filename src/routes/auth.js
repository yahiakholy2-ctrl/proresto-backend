const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

const SUPER_EMAIL = 'yahiakholy2@gmail.com';
const sign = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'All fields required' });
  try {
    const exists = await db.query('SELECT id FROM users WHERE LOWER(email)=$1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 12);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { rows } = await db.query(
      `INSERT INTO users (email, pwd_hash, name, verify_code) VALUES ($1,$2,$3,$4) RETURNING id, email, name, role, status, verified`,
      [email.toLowerCase(), hash, name, code]
    );
    // In production send code via email; for demo return it
    res.json({ user: rows[0], code });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE LOWER(email)=$1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });
    const ok = await bcrypt.compare(password, user.pwd_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.verified) return res.status(403).json({ error: 'unverified', code: user.verify_code });
    const token = sign(user);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
  const { userId, code } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE id=$1', [userId]);
    const user = rows[0];
    if (!user || user.verify_code !== code) return res.status(400).json({ error: 'Invalid code' });
    await db.query("UPDATE users SET verified=TRUE, status='active' WHERE id=$1", [userId]);
    const token = sign({ ...user, verified: true, status: 'active' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, status: 'active' } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
