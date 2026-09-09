// GET /api/leaderboard
// Public endpoint: top 5 fastest times in the CURRENT 3-hour epoch, for
// the persistent leaderboard panel in index.html. Wallet addresses are
// included in the response -- they're public identifiers by design
// (that's the whole point of a wallet address), not secrets, and showing
// the winning wallet lets players verify a payout themselves.
const { getRedis } = require('./_redis');
const { currentEpochId, epochBounds } = require('./_epoch');
const { topForEpoch } = require('./_leaderboard');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const kv = getRedis();
    const epochId = currentEpochId();
    const { start, end } = epochBounds(epochId);
    const top = await topForEpoch(kv, epochId, 5);
    res.status(200).json({ epochId, epochStart: start, epochEnd: end, serverNow: Date.now(), top });
  } catch (err) {
    console.error('leaderboard failed:', err);
    res.status(500).json({ error: 'Could not load leaderboard.' });
  }
};
