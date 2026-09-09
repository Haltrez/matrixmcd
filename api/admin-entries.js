// GET /api/admin-entries
// Private endpoint for admin.html. Requires the ADMIN_SECRET env var to
// be set in the Vercel project -- if it isn't, this refuses all requests
// rather than serving an accidentally-open list of everyone's wallet.
// Pass the secret either as header "x-admin-secret" or query "?secret=".
const { getRedis } = require('./_redis');
const { isAdminAuthorized } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isAdminAuthorized(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const kv = getRedis();
    const wallets = await kv.smembers('entries:index');
    if (!wallets || wallets.length === 0) {
      res.status(200).json({ entries: [] });
      return;
    }

    const keys = wallets.map((w) => `entry:${w}`);
    const records = await kv.mget(...keys);
    const entries = records
      .filter(Boolean)
      .sort((a, b) => b.lastSeen - a.lastSeen);

    res.status(200).json({ entries });
  } catch (err) {
    console.error('admin-entries failed:', err);
    res.status(500).json({ error: 'Could not load entries.' });
  }
};
