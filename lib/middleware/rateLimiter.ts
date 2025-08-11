import { NextRequest, NextResponse } from 'next/server';
import redis, { REDIS_KEYS } from '../redis';
import { getClientIP } from '../security';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private skipSuccessfulRequests: boolean;
  private skipFailedRequests: boolean;

  constructor(config: RateLimitConfig) {
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
    this.skipSuccessfulRequests = config.skipSuccessfulRequests || false;
    this.skipFailedRequests = config.skipFailedRequests || false;
  }

  async isAllowed(req: NextRequest): Promise<{ allowed: boolean; resetTime?: number }> {
    const ip = getClientIP(req);
    const key = REDIS_KEYS.RATE_LIMIT(ip);
    
    // If Redis is not available, allow all requests
    if (!redis) {
      return { allowed: true };
    }
    
    try {
      const current = await redis.get(key);
      const requestCount = current ? parseInt(current) : 0;
      
      if (requestCount >= this.maxRequests) {
        const ttl = await redis.ttl(key);
        return {
          allowed: false,
          resetTime: Date.now() + (ttl * 1000)
        };
      }
      
      // Increment counter
      const newCount = requestCount + 1;
      if (newCount === 1) {
        await redis.setex(key, Math.floor(this.windowMs / 1000), newCount.toString());
      } else {
        await redis.set(key, newCount.toString());
      }
      
      return { allowed: true };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // On error, allow the request
      return { allowed: true };
    }
  }

  middleware() {
    return async (req: NextRequest) => {
      const result = await this.isAllowed(req);
      
      if (!result.allowed) {
        return NextResponse.json(
          { 
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            resetTime: result.resetTime 
          },
          { status: 429 }
        );
      }
      
      return NextResponse.next();
    };
  }
}

// Default rate limiter instances
export const defaultRateLimiter = new RateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
});

export const strictRateLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 10
});

export const fileUploadRateLimiter = new RateLimiter({
  windowMs: 300000, // 5 minutes
  maxRequests: 20
});
