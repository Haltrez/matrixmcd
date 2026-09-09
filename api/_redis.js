// Shared Redis client for the /api functions. Not a route itself --
// Vercel excludes files/dirs under /api starting with "_" from routing.
//
// Vercel KV (the old @vercel/kv package) is dead: no release since
// Sept 2024 and the product it talked to no longer exists. It was
// always just a thin wrapper around Upstash's REST API, so we talk to
// @upstash/redis directly instead. Depending on how the store gets
// connected in the dashboard, Vercel's Upstash Marketplace integration
// has been seen injecting either the legacy KV_REST_API_* names or
// Upstash's own UPSTASH_REDIS_REST_* names -- accept either.
const { Redis } = require('@upstash/redis');

let client = null;

function getRedis() {
  if (!client) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error('No Redis store connected. Add one under the Vercel project\'s Storage tab and connect it to this project.');
    }
    client = new Redis({ url, token });
  }
  return client;
}

module.exports = { getRedis };
