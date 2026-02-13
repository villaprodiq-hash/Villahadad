import React, { useState } from 'react';
import { Activity, Wifi, Database, HardDrive, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useServiceHealth } from '../../hooks/useHealth';

/**
 * 🏥 Health Indicator Component
 * 
 * Compact health status indicator for the header
 * Shows network status with expandable details
 */

interface HealthIndicatorProps {
  theme?: 'manager' | 'reception' | 'dark';
  showDetails?: boolean;
}

const themeStyles = {
  manager: {
    container: 'bg-white/80 shadow-sm ring-1 ring-black/5',
    healthy: 'text-green-500 bg-green-50',
    degraded: 'text-yellow-500 bg-yellow-50',
    unhealthy: 'text-red-500 bg-red-50',
    text: 'text-gray-700',
    muted: 'text-gray-500',
    border: 'border-gray-100'
  },
  reception: {
    container: 'bg-[#1A1A1A] border border-teal-400/20',
    healthy: 'text-teal-400 bg-teal-400/10',
    degraded: 'text-yellow-400 bg-yellow-400/10',
    unhealthy: 'text-red-400 bg-red-400/10',
    text: 'text-white',
    muted: 'text-gray-400',
    border: 'border-gray-700'
  },
  dark: {
    container: 'bg-[#21242b] border border-white/10',
    healthy: 'text-green-400 bg-green-400/10',
    degraded: 'text-yellow-400 bg-yellow-400/10',
    unhealthy: 'text-red-400 bg-red-400/10',
    text: 'text-white',
    muted: 'text-gray-400',
    border: 'border-gray-700'
  }
};

export const HealthIndicator: React.FC<HealthIndicatorProps> = ({ 
  theme = 'dark',
  showDetails = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { check: networkCheck, isHealthy: isNetworkHealthy } = useServiceHealth('network');
  const { check: supabaseCheck, isHealthy: isSupabaseHealthy } = useServiceHealth('supabase');
  const { check: localDbCheck, isHealthy: isLocalDbHealthy } = useServiceHealth('localDatabase');
  
  const styles = themeStyles[theme];
  
  // Determine overall status
  const getOverallStatus = () => {
    if (!isNetworkHealthy || !isSupabaseHealthy || !isLocalDbHealthy) return 'unhealthy';
    if (networkCheck?.status === 'degraded' || supabaseCheck?.status === 'degraded') return 'degraded';
    return 'healthy';
  };
  
  const overallStatus = getOverallStatus();
  
  const statusConfig = {
    healthy: { icon: CheckCircle, color: styles.healthy, label: 'متصل' },
    degraded: { icon: AlertTriangle, color: styles.degraded, label: 'ضعيف' },
    unhealthy: { icon: XCircle, color: styles.unhealthy, label: 'غير متصل' }
  };
  
  const config = statusConfig[overallStatus];
  const Icon = config.icon;
  
  return (
    <div className="relative">
      {/* Compact Indicator */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ${styles.container} hover:scale-105`}
        title="حالة النظام"
      >
        <div className={`p-1.5 rounded-lg ${config.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className={`text-xs font-bold ${styles.text}`}>
          {config.label}
        </span>
        <Activity className={`w-3 h-3 ${styles.muted} ${overallStatus === 'healthy' ? 'animate-pulse' : ''}`} />
      </button>
      
      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && showDetails && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute top-full right-0 mt-2 w-64 ${styles.container} rounded-xl p-4 z-50`}
          >
            <h4 className={`text-sm font-bold mb-3 ${styles.text}`}>حالة النظام</h4>
            
            <div className="space-y-2">
              {/* Network */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className={`w-4 h-4 ${styles.muted}`} />
                  <span className={`text-xs ${styles.text}`}>الشبكة</span>
                </div>
                <StatusBadge 
                  status={networkCheck?.status || 'unknown'} 
                  theme={theme}
                  responseTime={networkCheck?.responseTime}
                />
              </div>
              
              {/* Supabase */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className={`w-4 h-4 ${styles.muted}`} />
                  <span className={`text-xs ${styles.text}`}>قاعدة البيانات السحابية</span>
                </div>
                <StatusBadge 
                  status={supabaseCheck?.status || 'unknown'} 
                  theme={theme}
                  responseTime={supabaseCheck?.responseTime}
                />
              </div>
              
              {/* Local DB */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className={`w-4 h-4 ${styles.muted}`} />
                  <span className={`text-xs ${styles.text}`}>قاعدة البيانات المحلية</span>
                </div>
                <StatusBadge 
                  status={localDbCheck?.status || 'unknown'} 
                  theme={theme}
                  responseTime={localDbCheck?.responseTime}
                />
              </div>
            </div>
            
            {networkCheck?.message && (
              <div className={`mt-3 pt-3 border-t ${styles.border}`}>
                <p className={`text-xs ${styles.muted}`}>{networkCheck.message}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Status Badge Component
const StatusBadge: React.FC<{ 
  status: string; 
  theme: 'manager' | 'reception' | 'dark';
  responseTime?: number;
}> = ({ status, theme, responseTime }) => {
  const styles = themeStyles[theme];
  
  const config = {
    healthy: { color: styles.healthy, label: 'متصل' },
    degraded: { color: styles.degraded, label: 'ضعيف' },
    unhealthy: { color: styles.unhealthy, label: 'غير متصل' },
    unknown: { color: 'text-gray-400 bg-gray-100', label: 'غير معروف' }
  };
  
  const { color, label } = config[status as keyof typeof config] || config.unknown;
  
  return (
    <div className="flex items-center gap-1.5">
      {responseTime && responseTime > 0 && (
        <span className={`text-[10px] ${styles.muted}`}>{responseTime}ms</span>
      )}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${color}`}>
        {label}
      </span>
    </div>
  );
};

export default HealthIndicator;
