require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/branches',   require('./routes/branches'));
app.use('/api/inventory',  require('./routes/inventory'));
app.use('/api/recipes',    require('./routes/recipes'));
app.use('/api/menu',       require('./routes/menu'));
app.use('/api/waste',      require('./routes/waste'));
app.use('/api/pnl',        require('./routes/pnl'));

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, time: new Date() }));

// ── Start: locally via node, on Vercel via module.exports ─────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`ProResto API running on port ${PORT}`));
}

module.exports = app;
