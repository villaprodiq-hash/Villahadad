import React from 'react';

interface ReceptionWidgetCardProps {
  children: React.ReactNode;
  className?: string; // For additional/override styles (e.g. width, height)
  title?: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode; // For header buttons
  noPadding?: boolean; // If true, removes p-4 from content
  rounded?: string; // Custom border radius
  contentOverflowVisible?: boolean;
  isManager?: boolean;
}

const ReceptionWidgetCard: React.FC<ReceptionWidgetCardProps> = ({ 
  children, 
  className = '', 
  title, 
  subtitle, 
  icon,
  action, 
  noPadding = false,
  rounded = 'rounded-[2.5rem]',
  contentOverflowVisible = false,
  isManager = false
}) => {
  const isPremium = isManager;

  return (
    <div className={`${isPremium ? 'bg-[#1a1c22] rounded-xl border-white/10 shadow-2xl' : `bg-[#1a1c22] ${rounded} border-white/5`} border flex flex-col ${contentOverflowVisible ? 'overflow-visible' : 'overflow-hidden'} transition-all duration-300 ${className}`}>
      
      {/* Optional Header Section */}
      {(title || icon || action) && (
        <div className={`p-5 border-b border-white/5 shrink-0 flex items-center justify-between relative z-40 
          ${isPremium ? 'bg-gradient-to-r from-[#22242b] to-[#1e1e24] shadow-sm' : 'bg-[#27272a]'}`}>
          <div className="flex items-center gap-3">
             {icon && (
               <div className={`p-2 rounded-xl flex items-center justify-center border transition-all duration-300
                 ${isPremium 
                   ? 'bg-gradient-to-br from-white/5 to-white/10 border-white/5 shadow-inner backdrop-blur-sm group-hover:from-white/10 group-hover:to-white/20' 
                   : 'text-[#C94557] bg-[#C94557]/10 border-[#C94557]/20'}
               `}>
                 {isPremium && React.isValidElement(icon) 
                   ? React.cloneElement(icon as React.ReactElement<any>, { size: 18, className: 'text-gray-200' }) 
                   : icon
                 }
               </div>
             )}
             <div>
               {typeof title === 'string' ? (
                 <h3 className={`font-bold text-white ${isPremium ? 'text-lg tracking-wide' : 'text-xl'}`}>{title}</h3>
               ) : (
                 title
               )}
               {subtitle && (
                 <p className={`font-medium ${isPremium ? 'text-[10px] text-gray-400 uppercase tracking-wider' : 'text-sm text-gray-400'}`}>
                   {subtitle}
                 </p>
               )}
             </div>
          </div>
          {action && <div className="relative z-50">{action}</div>}
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 min-h-0 ${contentOverflowVisible ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'} flex flex-col ${noPadding ? '' : 'p-4'}`}>
        {children}
      </div>
    </div>
  );
};

export default ReceptionWidgetCard;
