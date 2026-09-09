// Shared admin-secret check for the private /api/admin-*.js endpoints.
// Not a route -- see api/_redis.js for why files under /api starting
// with "_" are safe from Vercel's routing.
const crypto = require('crypto');

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Refuses everything if ADMIN_SECRET isn't set, so a misconfigured
// deployment fails closed instead of accidentally serving an open endpoint.
function isAdminAuthorized(req) {
  const expected = process.env.ADMIN_SECRET || '';
  const provided = req.headers['x-admin-secret'] || (req.query && req.query.secret) || '';
  return Boolean(expected) && safeEqual(provided, expected);
}

module.exports = { isAdminAuthorized };
