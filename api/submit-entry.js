// POST /api/submit-entry
// Public endpoint hit by the pre-round gate in index.html. Stores one
// record per unique wallet address (re-submitting the same wallet
// updates the existing record rather than creating a duplicate), plus
// a Redis SET ("entries:index") of every wallet seen so the admin
// endpoint can enumerate them without a KV key-scan.
const { kv } = require('@vercel/kv');

// Base58, no 0/O/I/l (matches the Solana/Bitcoin base58 alphabet).
// Solana addresses are ed25519 public keys base58-encoded, 32-44 chars.
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const MAX_NAME_LEN = 40;

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

  if (!SOLANA_ADDRESS_RE.test(wallet)) {
    res.status(400).json({ error: 'That doesn\'t look like a valid Solana wallet address.' });
    return;
  }

  try {
    const key = `entry:${wallet}`;
    const now = Date.now();
    const existing = await kv.get(key);

    const record = {
      wallet,
      name,
      firstSeen: (existing && existing.firstSeen) || now,
      lastSeen: now,
      timesEntered: ((existing && existing.timesEntered) || 0) + 1,
    };

    await kv.set(key, record);
    await kv.sadd('entries:index', wallet);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit-entry failed:', err);
    res.status(500).json({ error: 'Could not save your entry. Please try again.' });
  }
};
