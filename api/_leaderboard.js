// Shared "top N fastest for one epoch" query, used by both the public
// api/leaderboard.js and the private api/admin-leaderboard.js. Not a
// route -- see api/_redis.js for why files under /api starting with "_"
// are safe from Vercel's routing.
//
// Scores live one-per-wallet-per-epoch at score:<epochId>:<wallet>
// (written by api/submit-score.js), indexed by a set of that epoch's
// wallets at epoch:<epochId>:wallets so we can enumerate them without a
// key-scan -- the same pattern api/submit-entry.js and
// api/admin-entries.js already use for the entries registry.
async function topForEpoch(kv, epochId, limit) {
  const wallets = await kv.smembers(`epoch:${epochId}:wallets`);
  if (!wallets || wallets.length === 0) return [];

  const keys = wallets.map((w) => `score:${epochId}:${w}`);
  const records = await kv.mget(...keys);

  return records
    .filter(Boolean)
    .sort((a, b) => a.timeMs - b.timeMs)
    .slice(0, limit)
    .map((r) => ({ name: r.name, wallet: r.wallet, timeMs: r.timeMs }));
}

module.exports = { topForEpoch };
