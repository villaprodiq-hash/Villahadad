import { useEffect, useRef, useState } from 'react';

/**
 * Auto-Refresh Hook
 * Automatically calls a function at specified intervals
 * 
 * @param callback - Function to call on each refresh
 * @param intervalMs - Interval in milliseconds (default: 30000 = 30 seconds)
 * @param enabled - Whether auto-refresh is enabled (default: true)
 * 
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const [data, setData] = useState([]);
 *   
 *   const loadData = async () => {
 *     const result = await fetchData();
 *     setData(result);
 *   };
 *   
 *   // Auto-refresh every 30 seconds
 *   const { lastRefreshTime, isRefreshing } = useAutoRefresh(loadData, 30000);
 *   
 *   return (
 *     <div>
 *       <p>آخر تحديث: {lastRefreshTime}</p>
 *       {isRefreshing && <span>جاري التحديث...</span>}
 *     </div>
 *   );
 * };
 * ```
 */
export function useAutoRefresh(
  callback: () => void | Promise<void>,
  intervalMs: number = 30000,
  enabled: boolean = true
) {
  const callbackRef = useRef(callback);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Set up interval
  useEffect(() => {
    if (!enabled) return;
    
    const executeCallback = async () => {
      try {
        setIsRefreshing(true);
        await callbackRef.current();
        setLastRefreshTime(new Date());
      } catch (error) {
        console.error('Auto-refresh error:', error);
      } finally {
        setIsRefreshing(false);
      }
    };
    
    const interval = setInterval(executeCallback, intervalMs);
    
    // Cleanup on unmount or when dependencies change
    return () => clearInterval(interval);
  }, [intervalMs, enabled]);
  
  return {
    lastRefreshTime,
    isRefreshing,
  };
}

/**
 * Format time ago in Arabic
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  
  if (diffSeconds < 60) {
    return 'الآن';
  } else if (diffMinutes < 60) {
    return `منذ ${diffMinutes} دقيقة`;
  } else if (diffHours < 24) {
    return `منذ ${diffHours} ساعة`;
  } else {
    return date.toLocaleTimeString('ar-IQ', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}
