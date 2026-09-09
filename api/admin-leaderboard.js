// GET /api/admin-leaderboard
// Private endpoint for admin.html: top 5 for each of the last N epochs
// (default 8 = 24h), full wallet addresses included, so the site owner
// can actually run the airdrop. Same ADMIN_SECRET gate as
// api/admin-entries.js. Optional query params: ?count=N (how many
// epochs back, capped at 56 / ~1 week) and ?epoch=<id> (just that one).
const { getRedis } = require('./_redis');
const { isAdminAuthorized } = require('./_auth');
const { currentEpochId, epochBounds } = require('./_epoch');
const { topForEpoch } = require('./_leaderboard');

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
    const query = req.query || {};

    let ids;
    if (query.epoch !== undefined) {
      const epochId = Number(query.epoch);
      if (!Number.isFinite(epochId)) {
        res.status(400).json({ error: 'Invalid epoch.' });
        return;
      }
      ids = [epochId];
    } else {
      const countRaw = Number(query.count);
      const count = Math.min(Math.max(Number.isFinite(countRaw) ? countRaw : 8, 1), 56);
      const nowEpoch = currentEpochId();
      ids = Array.from({ length: count }, (_, i) => nowEpoch - i);
    }

    const epochs = [];
    for (const epochId of ids) {
      const { start, end } = epochBounds(epochId);
      const top = await topForEpoch(kv, epochId, 5);
      epochs.push({ epochId, epochStart: start, epochEnd: end, top });
    }

    res.status(200).json({ epochs });
  } catch (err) {
    console.error('admin-leaderboard failed:', err);
    res.status(500).json({ error: 'Could not load leaderboard history.' });
  }
};
