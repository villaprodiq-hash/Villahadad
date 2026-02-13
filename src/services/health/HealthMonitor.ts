/**
 * 🏥 Health Monitor Service
 * 
 * Monitors system health and provides diagnostics
 * for database, network, and storage connections.
 */

import { logger } from '../../utils/logger';
import { supabase } from '../supabase';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  responseTime: number;
  lastChecked: Date;
  message?: string;
  error?: string;
}

export interface SystemHealth {
  overall: HealthStatus;
  checks: HealthCheck[];
  timestamp: Date;
}

class HealthMonitor {
  private static instance: HealthMonitor;
  private checks: Map<string, HealthCheck> = new Map();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(health: SystemHealth) => void> = [];

  private constructor() {}

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  /**
   * Start periodic health checks
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.checkInterval) {
      logger.warn('Health monitoring already started');
      return;
    }

    logger.info('Starting health monitoring', { intervalMs });
    
    // Run initial check
    this.runAllChecks();
    
    // Schedule periodic checks
    this.checkInterval = setInterval(() => {
      this.runAllChecks();
    }, intervalMs);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Health monitoring stopped');
    }
  }

  /**
   * Register a health check
   */
  registerCheck(name: string, checkFn: () => Promise<HealthCheck>): void {
    this.checks.set(name, {
      name,
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date()
    });

    // Store the check function separately
    (this.checks.get(name) as HealthCheck & { checkFn?: () => Promise<HealthCheck> }).checkFn = checkFn;
  }

  /**
   * Run all registered health checks
   */
  async runAllChecks(): Promise<SystemHealth> {
    const checkPromises: Promise<HealthCheck>[] = [];

    for (const [name, check] of this.checks) {
      const checkFn = (check as HealthCheck & { checkFn?: () => Promise<HealthCheck> }).checkFn;
      if (checkFn) {
        checkPromises.push(this.runCheckWithTimeout(name, checkFn));
      }
    }

    const results = await Promise.allSettled(checkPromises);
    const checks: HealthCheck[] = [];

    results.forEach((result, index) => {
      const names = Array.from(this.checks.keys());
      if (result.status === 'fulfilled') {
        checks.push(result.value);
        this.checks.set(result.value.name, result.value);
      } else {
        const failedCheck: HealthCheck = {
          name: names[index],
          status: 'unhealthy',
          responseTime: 0,
          lastChecked: new Date(),
          error: result.reason?.message || 'Check failed'
        };
        checks.push(failedCheck);
        this.checks.set(names[index], failedCheck);
      }
    });

    const health: SystemHealth = {
      overall: this.calculateOverallStatus(checks),
      checks,
      timestamp: new Date()
    };

    // Notify listeners
    this.listeners.forEach(listener => listener(health));

    return health;
  }

  /**
   * Run a single check with timeout
   */
  private async runCheckWithTimeout(
    name: string,
    checkFn: () => Promise<HealthCheck>,
    timeoutMs: number = 5000
  ): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      const checkPromise = checkFn();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), timeoutMs);
      });

      const result = await Promise.race([checkPromise, timeoutPromise]);
      const responseTime = Math.round(performance.now() - startTime);
      
      return {
        ...result,
        responseTime
      };
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);
      return {
        name,
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date(),
        error: (error as Error).message
      };
    }
  }

  /**
   * Calculate overall system health
   */
  private calculateOverallStatus(checks: HealthCheck[]): HealthStatus {
    if (checks.length === 0) return 'unknown';
    
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;
    
    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  }

  /**
   * Subscribe to health updates
   */
  subscribe(callback: (health: SystemHealth) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current health status
   */
  getHealth(): SystemHealth {
    const checks = Array.from(this.checks.values());
    return {
      overall: this.calculateOverallStatus(checks),
      checks,
      timestamp: new Date()
    };
  }
}

// Export singleton
export const healthMonitor = HealthMonitor.getInstance();

/**
 * Pre-defined health checks
 */
export const healthChecks = {
  /**
   * Check Supabase connection
   */
  async checkSupabase(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
      
      if (error) {
        throw error;
      }

      return {
        name: 'supabase',
        status: 'healthy',
        responseTime: Math.round(performance.now() - startTime),
        lastChecked: new Date(),
        message: 'Connected successfully'
      };
    } catch (error) {
      return {
        name: 'supabase',
        status: 'unhealthy',
        responseTime: Math.round(performance.now() - startTime),
        lastChecked: new Date(),
        error: (error as Error).message
      };
    }
  },

  /**
   * Check local database
   */
  async checkLocalDatabase(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      // Check if electron API is available
      const api = (window as Window & { electronAPI?: { db?: { query: (sql: string) => Promise<unknown[]> } } }).electronAPI;
      
      if (!api?.db) {
        return {
          name: 'localDatabase',
          status: 'degraded',
          responseTime: Math.round(performance.now() - startTime),
          lastChecked: new Date(),
          message: 'Running in web mode (no local DB)'
        };
      }

      await api.db.query('SELECT 1');

      return {
        name: 'localDatabase',
        status: 'healthy',
        responseTime: Math.round(performance.now() - startTime),
        lastChecked: new Date(),
        message: 'Local database responsive'
      };
    } catch (error) {
      return {
        name: 'localDatabase',
        status: 'unhealthy',
        responseTime: Math.round(performance.now() - startTime),
        lastChecked: new Date(),
        error: (error as Error).message
      };
    }
  },

  /**
   * Check network connectivity
   */
  async checkNetwork(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    const isOnline = navigator.onLine;
    
    return {
      name: 'network',
      status: isOnline ? 'healthy' : 'unhealthy',
      responseTime: Math.round(performance.now() - startTime),
      lastChecked: new Date(),
      message: isOnline ? 'Online' : 'Offline'
    };
  },

  /**
   * Check NAS storage (if available)
   */
  async checkNAS(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      const api = (window as Window & { electronAPI?: { fileSystem?: { checkNasStatus: () => Promise<{ connected: boolean }> } } }).electronAPI;
      
      if (!api?.fileSystem?.checkNasStatus) {
        return {
          name: 'nas',
          status: 'unknown',
          responseTime: Math.round(performance.now() - startTime),
          lastChecked: new Date(),
          message: 'NAS check not available'
        };
      }

      const status = await api.fileSystem.checkNasStatus();

      return {
        name: 'nas',
        status: status.connected ? 'healthy' : 'unhealthy',
        responseTime: Math.round(performance.now() - startTime),
        lastChecked: new Date(),
        message: status.connected ? 'NAS connected' : 'NAS disconnected'
      };
    } catch (error) {
      return {
        name: 'nas',
        status: 'unhealthy',
        responseTime: Math.round(performance.now() - startTime),
        lastChecked: new Date(),
        error: (error as Error).message
      };
    }
  }
};

// Register default health checks
healthMonitor.registerCheck('supabase', healthChecks.checkSupabase);
healthMonitor.registerCheck('localDatabase', healthChecks.checkLocalDatabase);
healthMonitor.registerCheck('network', healthChecks.checkNetwork);
healthMonitor.registerCheck('nas', healthChecks.checkNAS);

export default healthMonitor;
