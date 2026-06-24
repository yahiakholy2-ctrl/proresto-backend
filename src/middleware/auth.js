const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = payload;  // { id, email, role }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
