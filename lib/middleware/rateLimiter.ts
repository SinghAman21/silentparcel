import { NextRequest, NextResponse } from 'next/server';
import redis, { REDIS_KEYS } from '../redis';
import { getClientIP } from '../security';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Simple in-memory rate limiter for fallback
class InMemoryRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();

  isAllowed(ip: string, windowMs: number, maxRequests: number): { allowed: boolean; resetTime?: number; remaining?: number } {
    const now = Date.now();
    const key = ip;
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // First request or window expired
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (record.count >= maxRequests) {
      return {
        allowed: false,
        resetTime: record.resetTime,
        remaining: 0
      };
    }

    // Increment count
    record.count++;
    this.store.set(key, record);

    return { allowed: true, remaining: maxRequests - record.count };
  }

  // Clean up expired entries periodically
  cleanup() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.store.forEach((record, key) => {
      if (now > record.resetTime) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.store.delete(key);
    });
  }
}

// Global in-memory rate limiter instance
const inMemoryRateLimiter = new InMemoryRateLimiter();

// Clean up expired entries every 5 minutes
setInterval(() => {
  inMemoryRateLimiter.cleanup();
}, 5 * 60 * 1000);

export class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private skipSuccessfulRequests: boolean;
  private skipFailedRequests: boolean;
  private keyPrefix: string;

  constructor(config: RateLimitConfig & { keyPrefix?: string }) {
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
    this.skipSuccessfulRequests = config.skipSuccessfulRequests || false;
    this.skipFailedRequests = config.skipFailedRequests || false;
    this.keyPrefix = config.keyPrefix || 'rate_limit';
  }

  async isAllowed(req: NextRequest): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
    const ip = getClientIP(req);
    const key = `${this.keyPrefix}:${ip}`;
    
    // Try Redis first, fallback to in-memory
    if (redis) {
      try {
        const current = await redis.get(key);
        const requestCount = current ? parseInt(current) : 0;
        const remaining = Math.max(0, this.maxRequests - requestCount);
        
        if (requestCount >= this.maxRequests) {
          const ttl = await redis.ttl(key);
          return {
            allowed: false,
            resetTime: Date.now() + (ttl * 1000),
            remaining: 0
          };
        }
        
        // Increment counter
        const newCount = requestCount + 1;
        if (newCount === 1) {
          await redis.setex(key, Math.floor(this.windowMs / 1000), newCount.toString());
        } else {
          await redis.set(key, newCount.toString());
        }
        
        return { allowed: true, remaining: this.maxRequests - newCount };
      } catch (error) {
        console.error('Redis rate limiter error, falling back to in-memory:', error);
        // Fall through to in-memory rate limiter
      }
    }
    
    // Fallback to in-memory rate limiter
    return inMemoryRateLimiter.isAllowed(ip, this.windowMs, this.maxRequests);
  }

  middleware() {
    return async (req: NextRequest) => {
      const result = await this.isAllowed(req);
      
      if (!result.allowed) {
        return NextResponse.json(
          { 
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            resetTime: result.resetTime,
            remaining: result.remaining
          },
          { status: 429 }
        );
      }
      
      return NextResponse.next();
    };
  }
}

// Configuration constants
const ROOM_CREATION_LIMIT = 9999; // Maximum number of rooms that can be created per window

// Default rate limiter instances
export const defaultRateLimiter = new RateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
});

// Room creation rate limiter - effectively no limit
export const roomCreationRateLimiter = new RateLimiter({
  windowMs: 0, // 5 minutes
  maxRequests: ROOM_CREATION_LIMIT, // No practical limit
  keyPrefix: 'room_creation'
});

// Less strict rate limiter for general API endpoints
export const strictRateLimiter = new RateLimiter({
  windowMs: 300000, // 5 minutes (increased from 1 minute) for dev purposes it is 0
  maxRequests: 30, // Increased from 10 to 30 requests per 5 minutes
  keyPrefix: 'strict'
});

// Rate limiter for file uploads
export const fileUploadRateLimiter = new RateLimiter({
  windowMs: 10000, // 5 minutes
  maxRequests: 20,
  keyPrefix: 'file_upload'
});

// Rate limiter for chat messages
export const chatMessageRateLimiter = new RateLimiter({
  windowMs: 10000, // 1 minute
  maxRequests: 50, // Allow 50 messages per minute
  keyPrefix: 'chat_messages'
});
