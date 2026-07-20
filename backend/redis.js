// Simple caching interface with Upstash Redis and In-Memory fallback

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Local Memory Cache
const localCache = new Map();

function log(msg) {
  console.log(`[SafeCall Cache] ${msg}`);
}

if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
  log('Redis credentials detected. Configuring remote cache.');
} else {
  log('Redis credentials missing. Configuring local memory cache.');
}

const cache = {
  async get(key) {
    if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
      try {
        const response = await fetch(`${UPSTASH_REDIS_REST_URL}/get/${key}`, {
          headers: {
            Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`
          }
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.result ? JSON.parse(data.result) : null;
      } catch (err) {
        log(`Redis GET error: ${err.message}. Using memory fallback.`);
      }
    }
    return localCache.get(key) || null;
  },

  async set(key, value, expireSeconds = 3600) {
    if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
      try {
        const response = await fetch(`${UPSTASH_REDIS_REST_URL}/set/${key}?EX=${expireSeconds}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`
          },
          body: JSON.stringify(value)
        });
        if (response.ok) return true;
      } catch (err) {
        log(`Redis SET error: ${err.message}. Using memory fallback.`);
      }
    }
    localCache.set(key, value);
    // Basic expiry helper for memory cache
    setTimeout(() => {
      localCache.delete(key);
    }, expireSeconds * 1000);
    return true;
  },

  async delete(key) {
    if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
      try {
        const response = await fetch(`${UPSTASH_REDIS_REST_URL}/del/${key}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`
          }
        });
        if (response.ok) return true;
      } catch (err) {
        log(`Redis DEL error: ${err.message}. Using memory fallback.`);
      }
    }
    return localCache.delete(key);
  }
};

module.exports = cache;
