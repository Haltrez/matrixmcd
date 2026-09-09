// Shared epoch math for the 3-hour "airdrop round" leaderboard. Not a
// route -- see api/_redis.js for why files under /api starting with "_"
// are safe from Vercel's routing.
//
// Epochs are anchored to the Unix epoch (not to server start time or
// anything stored), so boundaries always land on the same wall-clock
// instants (00:00, 03:00, 06:00... UTC) and any function instance -- or
// the browser -- agrees on the current epoch with nothing to persist.
const EPOCH_MS = 3 * 60 * 60 * 1000;

function currentEpochId(now = Date.now()) {
  return Math.floor(now / EPOCH_MS);
}

function epochBounds(epochId) {
  return { start: epochId * EPOCH_MS, end: (epochId + 1) * EPOCH_MS };
}

module.exports = { EPOCH_MS, currentEpochId, epochBounds };
