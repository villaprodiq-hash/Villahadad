import React, { useEffect } from 'react';
import { LucideIcon, ArrowRight } from 'lucide-react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendDirection?: 'up' | 'down';
  subtitle?: string;
  iconColor?: string;
  iconBg?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendDirection = 'up',
  subtitle,
  iconColor = 'text-gray-600',
  iconBg = 'bg-gray-100'
}) => {
  // Parsing the numeric value for animation
  const numericValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.-]+/g,"")) 
    : value;
    
  // Spring animation configuration
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const displayValue = useTransform(spring, (current) => {
    // 1. Detect if original string had currency symbol (e.g. '$')
    const hasDollar = typeof value === 'string' && value.includes('$');
    // 2. Formatting
    const formatted = current.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return hasDollar ? `$${formatted}` : formatted;
  });

  useEffect(() => {
    spring.set(numericValue || 0);
  }, [numericValue, spring]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
    >
      {/* Decorative Blur Background (Subtle) */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-5 blur-2xl transition-all group-hover:scale-150 ${iconBg.replace('bg-', 'bg-')}`}></div>

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</h3>
          <div className="flex items-baseline gap-3">
            <motion.span className="text-2xl font-black text-gray-900">
               {displayValue}
            </motion.span>
            {trend && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                trendDirection === 'up' 
                  ? 'bg-emerald-50 text-emerald-600' 
                  : 'bg-rose-50 text-rose-600'
              }`}>
                {trendDirection === 'up' ? '↑' : '↓'} {trend}
              </span>
            )}
          </div>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-6 ${iconBg} ${iconColor}`}>
           <Icon size={24} />
        </div>
      </div>
      
      {subtitle && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-50 relative z-10">
           <span className="text-[10px] text-gray-400 font-bold">{subtitle}</span>
           <ArrowRight size={14} className="text-gray-300 rtl:rotate-180 transform group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;
