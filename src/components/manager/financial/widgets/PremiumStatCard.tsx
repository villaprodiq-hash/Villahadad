import React, { useEffect } from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, Cell, Tooltip } from 'recharts';
import { GlowCard } from "../../../shared/GlowCard";

type CardVariant = 'circle' | 'wave' | 'simple' | 'bar';

interface PremiumStatCardProps {
  title: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  variant: CardVariant;
  trend?: string;
  trendDirection?: 'up' | 'down';
  color?: 'cyan' | 'emerald' | 'rose' | 'violet' | 'amber';
  data?: any[]; // For chart
  percentage?: number; // For circle
  subtitle?: React.ReactNode;
  disableTilt?: boolean;
}

const PremiumStatCard: React.FC<PremiumStatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  variant,
  trend,
  trendDirection = 'up',
  color = 'cyan',
  data = [],
  percentage = 65,
  subtitle,
  disableTilt
}) => {
  
  // Color Maps
  const colors = {
    cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', stroke: '#22d3ee', shadow: 'shadow-cyan-500/20', bar: '#06b6d4' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', stroke: '#34d399', shadow: 'shadow-emerald-500/20', bar: '#10b981' },
    rose: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', stroke: '#fb7185', shadow: 'shadow-rose-500/20', bar: '#f43f5e' },
    violet: { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', stroke: '#a78bfa', shadow: 'shadow-violet-500/20', bar: '#8b5cf6' },
    amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', stroke: '#fbbf24', shadow: 'shadow-amber-500/20', bar: '#f59e0b' },
  };

  const theme = colors[color];

  // Number Animation
  const isNumericValue = typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value.replace(/[^0-9.-]+/g,""))));
  const numericValue = isNumericValue ? (typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g,"")) : (value as number)) : 0;
  
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const displayValue = useTransform(spring, (current) => {
    const hasDollar = typeof value === 'string' && value.includes('$');
    const formatted = current.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return hasDollar ? `$${formatted}` : formatted;
  });

  useEffect(() => {
    if (isNumericValue) spring.set(numericValue || 0);
  }, [numericValue, spring, isNumericValue]);

  // Circle Progress Animation
  const circumference = 2 * Math.PI * 28; // r=28
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const tooltipStyle = {
      backgroundColor: '#1f2937',
      border: 'none',
      borderRadius: '8px',
      fontSize: '10px',
      color: '#fff',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
  };

  return (
    <GlowCard 
      variant="light"
      glowColor={theme.stroke}
      disableTilt={disableTilt}
      className={`rounded-4xl bg-white dark:bg-[#1a1c22] shadow-sm h-full transition-colors duration-300 border border-transparent dark:border-white/5`}
    >
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="h-full relative overflow-hidden p-6"
        >
            {/* Background Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 ${theme.bg} blur-3xl rounded-full -mr-10 -mt-10 opacity-40 group-hover:opacity-60 transition-opacity dark:opacity-20 dark:group-hover:opacity-40`}></div>

            <div className="flex justify-between items-start mb-2 relative z-10 w-full">
                <div className="flex-1">
                    <h3 className="text-gray-400 dark:text-gray-500 text-[11px] font-bold uppercase tracking-widest mb-1">{title}</h3>
                    <motion.div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        {isNumericValue ? displayValue : value}
                    </motion.div>
                    
                    {subtitle && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">{subtitle}</p>}
                    
                    {trend && (
                        <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-50 dark:bg-white/5 w-fit ${trendDirection === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {trendDirection === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {trend}
                        </div>
                    )}
                </div>

                {/* Icon / Action */}
                <button className="text-gray-400 dark:text-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <MoreHorizontal size={16} />
                </button>
            </div>

            {/* --- Variant: CIRCLE --- */}
            {variant === 'circle' && (
                <div className="absolute bottom-4 left-4">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100 dark:text-gray-800" />
                            <motion.circle 
                                cx="32" cy="32" r="28" 
                                stroke="currentColor" 
                                strokeWidth="6" 
                                fill="transparent" 
                                strokeLinecap="round"
                                className={theme.text}
                                initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </svg>
                        <span className={`absolute text-[10px] font-bold ${theme.text}`}>{percentage}%</span>
                    </div>
                </div>
            )}

            {/* --- Variant: WAVE --- */}
            {variant === 'wave' && (
                <div className="h-16 w-full -mb-2 mt-4 opacity-80 group-hover:opacity-100 transition-opacity">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={theme.stroke} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={theme.stroke} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Tooltip 
                                contentStyle={tooltipStyle} 
                                itemStyle={{ color: theme.stroke }}
                                cursor={{ stroke: theme.stroke, strokeWidth: 1, strokeDasharray: '3 3' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke={theme.stroke} 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill={`url(#gradient-${color})`} 
                                isAnimationActive={true}
                                animationDuration={2000}
                            />
                        </AreaChart>
                     </ResponsiveContainer>
                </div>
            )}

            {/* --- Variant: BAR --- */}
            {variant === 'bar' && (
                 <div className="h-16 w-full -mb-2 mt-4 opacity-80 group-hover:opacity-100 transition-opacity flex items-end">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                             <Tooltip 
                                contentStyle={tooltipStyle} 
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1500}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={theme.bar} fillOpacity={index === data.length - 1 ? 1 : 0.3} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
            )}

            {/* --- Variant: SIMPLE --- */}
            {variant === 'simple' && Icon && (
                <div className={`absolute bottom-4 left-4 w-12 h-12 rounded-2xl ${theme.bg} flex items-center justify-center `}>
                    <Icon size={20} className={theme.text} />
                </div>
            )}

        </motion.div>
    </GlowCard>
  );
};

export default React.memo(PremiumStatCard);
