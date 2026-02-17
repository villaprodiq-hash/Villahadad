import React from 'react';
import ReceptionHeader from '../../shared/headers/ReceptionHeader';

import { User } from '../../../types';

interface ReceptionPageWrapperProps {
  children: React.ReactNode;
  className?: string; // allow overrides/extensions
  isDraggable?: boolean;
  isReception?: boolean;
  isManager?: boolean;
  allowOverflow?: boolean;
  hideBackground?: boolean;
  noPadding?: boolean;
  currentUser?: User;
  onLogout?: () => void;
}

const ReceptionPageWrapper: React.FC<ReceptionPageWrapperProps> = ({ 
  children, 
  className = '',
  isDraggable = false,
  isReception = true,
  isManager = false,
  allowOverflow = false,
  hideBackground = false,
  noPadding = false,
  currentUser,
  onLogout
}) => {
  const isPremiumTheme = isManager;
  const isWebRuntime =
    typeof window !== 'undefined' &&
    typeof (window as Window & { electronAPI?: unknown }).electronAPI === 'undefined';
  const rootOverflowClass = allowOverflow
    ? ''
    : isWebRuntime
      ? 'overflow-x-hidden overflow-y-auto xl:overflow-hidden'
      : 'overflow-hidden';
  const contentOverflowClass = allowOverflow
    ? ''
    : isWebRuntime
      ? 'overflow-x-hidden overflow-y-auto xl:overflow-hidden'
      : 'overflow-hidden';

  return (
    <div className={`${isWebRuntime ? 'min-h-[100dvh]' : 'h-full'} ${hideBackground ? 'bg-transparent shadow-none' : (isPremiumTheme ? 'bg-[#1a1c22]' : isReception ? 'bg-[#121212]' : 'bg-[#1e1e24]')} ${hideBackground ? 'rounded-none' : (isPremiumTheme ? 'rounded-xl' : isReception ? 'rounded-[3rem]' : 'rounded-3xl')} ${hideBackground ? '' : 'shadow-[inset_0_4px_20px_rgba(0,0,0,0.9)]'} ${rootOverflowClass} flex flex-col relative ${className}`} dir="rtl">
      {/* Background gradient overlay */}
      {!hideBackground && (
        <div className={`absolute inset-0 bg-linear-to-br ${isPremiumTheme ? 'from-orange-500/10' : isReception ? 'from-[#C94557]/5' : 'from-pink-500/5'} via-transparent to-gray-800/3 pointer-events-none z-0`} />
      )}
      
      {/* Grid pattern - displayed when draggable/editing mode is active */}
      {isDraggable && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" 
             style={{ backgroundImage: 'radial-gradient(circle, #FF5722 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      )}
      
      {/* Content */}
      <div className={`flex-1 min-h-0 ${contentOverflowClass} relative z-10 flex flex-col`}>
        {/* Unified Header for Reception */}
        {isReception && !isManager && (
             <ReceptionHeader 
                title="الاستقبال" 
                currentUser={currentUser}
                onLogout={onLogout || (() => {})} 
             />
        )}
        <div className={`flex-1 ${noPadding ? 'p-0' : 'p-4'} ${contentOverflowClass}`}>
             {children}
        </div>
      </div>
    </div>
  );
};

export default ReceptionPageWrapper;
