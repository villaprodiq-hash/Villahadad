/**
 * 🛡️ Safe JSON Utilities
 * Prevents app crashes from corrupted JSON data in the database
 */

/**
 * Safely parse a JSON string, returning a fallback value on failure
 */
export function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    console.warn('⚠️ safeJsonParse: Failed to parse JSON, using fallback', { input: str?.slice(0, 100) });
    return fallback;
  }
}

/**
 * Safely stringify a value, returning null on failure
 */
export function safeJsonStringify(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    console.warn('⚠️ safeJsonStringify: Failed to stringify value');
    return null;
  }
}
