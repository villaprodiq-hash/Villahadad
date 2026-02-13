/**
 * ⚡ Performance Utilities
 * 
 * Tools for optimizing and monitoring application performance
 */

import { logger } from './logger';
import { MEMOIZE_CACHE_MAX_SIZE, SLOW_OPERATION_THRESHOLD_MS, FRAME_BUDGET_MS } from '../constants/appConstants';

/**
 * Debounce function to limit how often a function can fire
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>): void {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function to limit execution to once per wait period
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function(...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memoize function to cache results with LRU eviction
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  func: T,
  maxSize: number = MEMOIZE_CACHE_MAX_SIZE
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();

  return function(...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      // Move to end (most recently used)
      const value = cache.get(key)!;
      cache.delete(key);
      cache.set(key, value);
      return value;
    }
    const result = func(...args) as ReturnType<T>;
    // Evict oldest entry if at capacity
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }
    cache.set(key, result);
    return result;
  };
}

/**
 * Performance monitor for tracking function execution time
 */
export class PerformanceMonitor {
  private static marks: Map<string, number> = new Map();
  private static measures: Map<string, number[]> = new Map();

  static start(markName: string): void {
    this.marks.set(markName, performance.now());
  }

  static end(markName: string): number {
    const startTime = this.marks.get(markName);
    if (!startTime) {
      logger.warn(`Performance mark "${markName}" not found`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.marks.delete(markName);
    
    // Store measure
    if (!this.measures.has(markName)) {
      this.measures.set(markName, []);
    }
    this.measures.get(markName)!.push(duration);
    
    // Log slow operations
    if (duration > SLOW_OPERATION_THRESHOLD_MS) {
      logger.warn(`Slow operation detected: ${markName} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }

  static getAverage(markName: string): number {
    const measures = this.measures.get(markName);
    if (!measures || measures.length === 0) return 0;
    
    const sum = measures.reduce((a, b) => a + b, 0);
    return sum / measures.length;
  }

  static getStats(markName: string): { avg: number; min: number; max: number; count: number } {
    const measures = this.measures.get(markName) || [];
    if (measures.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }
    
    return {
      avg: this.getAverage(markName),
      min: Math.min(...measures),
      max: Math.max(...measures),
      count: measures.length
    };
  }

  static clear(): void {
    this.marks.clear();
    this.measures.clear();
  }

  static export(): Record<string, ReturnType<typeof this.getStats>> {
    const result: Record<string, ReturnType<typeof this.getStats>> = {};
    for (const [name] of this.measures) {
      result[name] = this.getStats(name);
    }
    return result;
  }
}

/**
 * Deep equality check that's faster than JSON.stringify comparison
 */
export function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;
  
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  
  return true;
}

/**
 * Shallow equality check for objects
 */
export function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  
  return true;
}

/**
 * Shallow equality check for arrays
 */
export function shallowEqualArrays<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
}

/**
 * Batch processor for handling large arrays efficiently
 */
export async function processInBatches<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length);
    }
    
    // Yield to event loop
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return results;
}

/**
 * Request idle callback polyfill with fallback
 */
export function requestIdleCallbackPolyfill(
  callback: () => void,
  timeout: number = 2000
): void {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
}

/**
 * Measure component render performance (for React DevTools)
 */
export function useRenderProfiler(componentName: string): void {
  if (import.meta.env.DEV) {
    const start = performance.now();
    
    requestAnimationFrame(() => {
      const duration = performance.now() - start;
      if (duration > FRAME_BUDGET_MS) {
        logger.warn(`Slow render detected: ${componentName} took ${duration.toFixed(2)}ms`);
      }
    });
  }
}

export default {
  debounce,
  throttle,
  memoize,
  deepEqual,
  shallowEqual,
  processInBatches,
  requestIdleCallbackPolyfill,
  PerformanceMonitor
};
