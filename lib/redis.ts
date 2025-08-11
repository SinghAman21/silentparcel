import Redis from 'ioredis';

// Check if Redis is available
const isRedisAvailable = process.env.REDIS_HOST || process.env.REDIS_URL;

let redis: Redis | null = null;

if (isRedisAvailable) {
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 60000,
    });

    // Handle Redis connection errors gracefully
    redis.on('error', (error) => {
      console.warn('Redis connection error:', error.message);
      // Don't throw the error, just log it
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  } catch (error) {
    console.warn('Failed to initialize Redis:', error);
    redis = null;
  }
} else {
  console.log('Redis not configured, running without Redis');
}

export default redis;

// Redis key patterns
export const REDIS_KEYS = {
  CHAT_ROOM: (roomId: string) => `chat:room:${roomId}`,
  CHAT_USERS: (roomId: string) => `chat:users:${roomId}`,
  CHAT_MESSAGES: (roomId: string) => `chat:messages:${roomId}`,
  RATE_LIMIT: (ip: string) => `rate_limit:${ip}`,
  FILE_UPLOAD: (token: string) => `file_upload:${token}`,
  TEMP_FILES: (fileId: string) => `temp_files:${fileId}`,
};

// Helper functions
export const setWithExpiry = async (key: string, value: string, ttl: number) => {
  if (redis) {
    try {
      await redis.setex(key, ttl, value);
    } catch (error) {
      console.warn('Redis setWithExpiry failed:', error);
    }
  }
};

export const getAndDelete = async (key: string) => {
  if (redis) {
    try {
      const value = await redis.get(key);
      if (value) {
        await redis.del(key);
      }
      return value;
    } catch (error) {
      console.warn('Redis getAndDelete failed:', error);
      return null;
    }
  }
  return null;
};
