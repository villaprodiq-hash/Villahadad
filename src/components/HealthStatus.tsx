import React from 'react';
import { Activity, Database, Wifi, HardDrive, RefreshCw, CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { useHealth } from '../hooks/useHealth';
import { HealthCheck, HealthStatus as HealthStatusType } from '../services/health/HealthMonitor';

/**
 * 🏥 Health Status Component
 * 
 * Displays system health status with visual indicators
 */

interface HealthStatusProps {
  showDetails?: boolean;
  className?: string;
}

const statusConfig: Record<HealthStatusType, { icon: React.ReactNode; color: string; label: string }> = {
  healthy: {
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'text-green-500 bg-green-50 border-green-200',
    label: 'صحي'
  },
  degraded: {
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'text-yellow-500 bg-yellow-50 border-yellow-200',
    label: 'متدهور'
  },
  unhealthy: {
    icon: <XCircle className="w-5 h-5" />,
    color: 'text-red-500 bg-red-50 border-red-200',
    label: 'غير صحي'
  },
  unknown: {
    icon: <HelpCircle className="w-5 h-5" />,
    color: 'text-gray-500 bg-gray-50 border-gray-200',
    label: 'غير معروف'
  }
};

const serviceIcons: Record<string, React.ReactNode> = {
  supabase: <Database className="w-4 h-4" />,
  localDatabase: <Database className="w-4 h-4" />,
  network: <Wifi className="w-4 h-4" />,
  nas: <HardDrive className="w-4 h-4" />
};

const serviceLabels: Record<string, string> = {
  supabase: 'قاعدة البيانات السحابية',
  localDatabase: 'قاعدة البيانات المحلية',
  network: 'الاتصال بالشبكة',
  nas: 'التخزين المشترك (NAS)'
};

export const HealthStatus: React.FC<HealthStatusProps> = ({ 
  showDetails = false,
  className = '' 
}) => {
  const { health, isHealthy, isLoading, refresh } = useHealth();
  const config = statusConfig[health.overall];

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`} dir="rtl">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.color}`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">حالة النظام</h3>
              <p className="text-sm text-gray-500">
                {isHealthy ? 'جميع الأنظمة تعمل بشكل طبيعي' : 'هناك مشاكل في بعض الأنظمة'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
              {config.icon}
              <span className="mr-1">{config.label}</span>
            </span>
            
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="p-4">
          <div className="space-y-3">
            {health.checks.map((check) => (
              <HealthCheckItem key={check.name} check={check} />
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 text-left">
            آخر تحديث: {health.timestamp.toLocaleTimeString('ar-IQ')}
          </div>
        </div>
      )}
    </div>
  );
};

const HealthCheckItem: React.FC<{ check: HealthCheck }> = ({ check }) => {
  const config = statusConfig[check.status];
  const icon = serviceIcons[check.name] || <Activity className="w-4 h-4" />;
  const label = serviceLabels[check.name] || check.name;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="text-gray-400">
          {icon}
        </div>
        <div>
          <p className="font-medium text-gray-900">{label}</p>
          {check.message && (
            <p className="text-sm text-gray-500">{check.message}</p>
          )}
          {check.error && (
            <p className="text-sm text-red-500">{check.error}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">
          {check.responseTime}ms
        </span>
        <span className={`${config.color.split(' ')[0]}`}>
          {config.icon}
        </span>
      </div>
    </div>
  );
};

export default HealthStatus;
