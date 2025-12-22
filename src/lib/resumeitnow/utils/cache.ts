/**
 * Simple In-Memory Cache for ResumeItNow
 * Caches API responses to reduce redundant calls
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate cache key from arguments
   */
  private generateKey(prefix: string, ...args: any[]): string {
    const argsString = JSON.stringify(args);
    return `${prefix}:${btoa(argsString)}`;
  }

  /**
   * Get cached value
   */
  get<T>(prefix: string, ...args: any[]): T | null {
    const key = this.generateKey(prefix, ...args);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.defaultTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set cached value
   */
  set<T>(prefix: string, data: T, ttl?: number, ...args: any[]): void {
    const key = this.generateKey(prefix, ...args);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      key,
    };
    
    this.cache.set(key, entry);
    
    // Auto-cleanup after TTL
    if (ttl) {
      setTimeout(() => {
        this.cache.delete(key);
      }, ttl);
    }
  }

  /**
   * Clear cache
   */
  clear(prefix?: string): void {
    if (prefix) {
      // Clear only entries with this prefix
      for (const [key, entry] of this.cache.entries()) {
        if (key.startsWith(prefix + ':')) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all
      this.cache.clear();
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.defaultTTL) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const resumeCache = new SimpleCache(5 * 60 * 1000); // 5 minutes TTL

// Auto-cleanup every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    resumeCache.cleanExpired();
  }, 10 * 60 * 1000);
}

/**
 * Cache ATS analysis result
 */
export function cacheATSResult(resumeText: string, jobDescription: string | undefined, result: any): void {
  resumeCache.set('ats', result, 10 * 60 * 1000, resumeText, jobDescription);
}

/**
 * Get cached ATS analysis result
 */
export function getCachedATSResult(resumeText: string, jobDescription: string | undefined): any | null {
  return resumeCache.get('ats', resumeText, jobDescription);
}

/**
 * Cache cover letter
 */
export function cacheCoverLetter(resumeData: any, jobDescription: string, companyName: string, role: string, result: string): void {
  resumeCache.set('coverLetter', result, 30 * 60 * 1000, resumeData, jobDescription, companyName, role);
}

/**
 * Get cached cover letter
 */
export function getCachedCoverLetter(resumeData: any, jobDescription: string, companyName: string, role: string): string | null {
  return resumeCache.get('coverLetter', resumeData, jobDescription, companyName, role);
}

