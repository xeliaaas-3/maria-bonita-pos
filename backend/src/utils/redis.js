const Redis = require('ioredis');
const { logger } = require('./logger');

let redis = null;

const connectRedis = async () => {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3
    });

    redis.on('connect', () => logger.info('Redis: conectado'));
    redis.on('error', (err) => logger.warn('Redis error:', err.message));

    await redis.ping();
  } catch (error) {
    logger.warn('Redis no disponible, usando memoria:', error.message);
    // Fallback simple en memoria
    redis = createMemoryFallback();
  }
};

const getRedis = () => {
  if (!redis) redis = createMemoryFallback();
  return redis;
};

// Fallback simple si Redis no está disponible
function createMemoryFallback() {
  const store = new Map();
  const timers = new Map();

  return {
    get: async (key) => store.get(key) || null,
    set: async (key, value) => { store.set(key, value); return 'OK'; },
    setex: async (key, seconds, value) => {
      store.set(key, value);
      if (timers.has(key)) clearTimeout(timers.get(key));
      timers.set(key, setTimeout(() => store.delete(key), seconds * 1000));
      return 'OK';
    },
    del: async (key) => { store.delete(key); return 1; },
    ping: async () => 'PONG',
    on: () => {}
  };
}

module.exports = { connectRedis, getRedis };
