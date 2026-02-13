/**
 * 📝 Centralized Logger Utility
 * 
 * Features:
 * - Environment-aware logging (dev vs production)
 * - Log levels: debug, info, warn, error
 * - Structured logging with timestamps
 * - Optional log persistence for debugging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

class Logger {
  private static instance: Logger;
  private logHistory: LogEntry[] = [];
  private readonly maxHistorySize = 1000;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevel = import.meta.env.VITE_LOG_LEVEL || 'info';
    return levels.indexOf(level) >= levels.indexOf(currentLevel as LogLevel);
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return context 
      ? `${prefix} ${message} ${JSON.stringify(context)}`
      : `${prefix} ${message}`;
  }

  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;
    
    const entry: LogEntry = {
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      context
    };
    
    this.addToHistory(entry);
    
    if (import.meta.env.DEV) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;
    
    const entry: LogEntry = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context
    };
    
    this.addToHistory(entry);
    console.info(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;
    
    const entry: LogEntry = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      context
    };
    
    this.addToHistory(entry);
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;
    
    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        errorName: error?.name,
        errorMessage: error?.message,
        errorStack: error?.stack
      }
    };
    
    this.addToHistory(entry);
    console.error(this.formatMessage('error', message, context), error);
  }

  getHistory(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logHistory.filter(entry => entry.level === level);
    }
    return [...this.logHistory];
  }

  clearHistory(): void {
    this.logHistory = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience exports for direct usage
export const logDebug = (message: string, context?: Record<string, unknown>) => 
  logger.debug(message, context);

export const logInfo = (message: string, context?: Record<string, unknown>) => 
  logger.info(message, context);

export const logWarn = (message: string, context?: Record<string, unknown>) => 
  logger.warn(message, context);

export const logError = (message: string, error?: Error, context?: Record<string, unknown>) => 
  logger.error(message, error, context);

export default logger;
