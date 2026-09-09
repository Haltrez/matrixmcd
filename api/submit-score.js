// POST /api/submit-score
// Public endpoint hit when a round finishes. Records the player's time
// against the CURRENT 3-hour epoch (server clock decides the epoch, never
// the client), keeping only their fastest time per epoch -- resubmitting
// a slower time is a harmless no-op. Feeds the top-5-per-epoch airdrop
// leaderboard in api/leaderboard.js and api/admin-leaderboard.js.
const { getRedis } = require('./_redis');
const { currentEpochId } = require('./_epoch');

// Same alphabet check used across the API and the frontend gate.
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MAX_NAME_LEN = 40;
// The game has no forced timeout, so a distracted/backgrounded tab could
// in principle report a large-but-real time; this only exists to reject
// obviously-tampered values (negative, NaN, absurdly large).
const MAX_TIME_MS = 30 * 60 * 1000;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const wallet = String(body.wallet || '').trim();
  const nameRaw = String(body.name || '').trim();
  const name = (nameRaw || 'New Employee').slice(0, MAX_NAME_LEN);
  const timeMs = Number(body.timeMs);

  if (!SOLANA_ADDRESS_RE.test(wallet)) {
    res.status(400).json({ error: 'Invalid wallet address.' });
    return;
  }
  if (!Number.isFinite(timeMs) || timeMs <= 0 || timeMs > MAX_TIME_MS) {
    res.status(400).json({ error: 'Invalid time.' });
    return;
  }

  try {
    const kv = getRedis();
    const epochId = currentEpochId();
    const scoreKey = `score:${epochId}:${wallet}`;

    const existing = await kv.get(scoreKey);
    if (existing && existing.timeMs <= timeMs) {
      res.status(200).json({ ok: true });
      return;
    }

    await kv.set(scoreKey, { wallet, name, timeMs, at: Date.now() });
    await kv.sadd(`epoch:${epochId}:wallets`, wallet);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit-score failed:', err);
    res.status(500).json({ error: 'Could not save your score. Please try again.' });
  }
};
