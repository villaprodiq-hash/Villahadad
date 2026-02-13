/**
 * 🏥 useHealth Hook
 * 
 * React hook for accessing health monitor in components
 */

import { useState, useEffect, useCallback } from 'react';
import { healthMonitor, SystemHealth, HealthCheck } from '../services/health/HealthMonitor';

export interface UseHealthReturn {
  health: SystemHealth;
  isHealthy: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  getCheck: (name: string) => HealthCheck | undefined;
}

/**
 * Hook to subscribe to health monitor updates
 */
export function useHealth(): UseHealthReturn {
  const [health, setHealth] = useState<SystemHealth>(healthMonitor.getHealth());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Subscribe to health updates
    const unsubscribe = healthMonitor.subscribe((newHealth) => {
      setHealth(newHealth);
    });

    return unsubscribe;
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await healthMonitor.runAllChecks();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCheck = useCallback((name: string) => {
    return health.checks.find(check => check.name === name);
  }, [health.checks]);

  const isHealthy = health.overall === 'healthy';

  return {
    health,
    isHealthy,
    isLoading,
    refresh,
    getCheck
  };
}

/**
 * Hook to check specific service health
 */
export function useServiceHealth(serviceName: string): {
  check: HealthCheck | undefined;
  isHealthy: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const { health, isLoading, refresh } = useHealth();
  
  const check = health.checks.find(c => c.name === serviceName);
  const isHealthy = check?.status === 'healthy';

  return {
    check,
    isHealthy,
    isLoading,
    refresh
  };
}

export default useHealth;
