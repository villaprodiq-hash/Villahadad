import React, { ReactNode } from 'react';
import PrinterSidebar from './PrinterSidebar';
import { User, UserRole } from '../../../types';
import ProductionHeader from '../../shared/headers/ProductionHeader';

interface PrinterLayoutProps {
  children: ReactNode;
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  currentUser: User;
  onLogout: () => void;
  onOpenSettings?: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  badges?: Record<string, number>;
  isWebRuntime?: boolean;

}

const PrinterLayout: React.FC<PrinterLayoutProps> = ({
  children,
  activeSection,
  onNavigate,
  currentUser,
  onLogout,
  onOpenSettings,
  isCollapsed,
  toggleCollapse,
  badges,
  isWebRuntime = false,
}) => {
  const contentMarginClass = isCollapsed ? 'lg:mr-[90px]' : 'lg:mr-[200px]';

  return (
    <div
      className={`flex bg-[#0a0f0d] ${isWebRuntime ? 'min-h-[100dvh] overflow-x-hidden overflow-y-auto' : 'h-screen overflow-hidden'}`}
      dir="rtl"
    >
      {/* Sidebar */}
      <PrinterSidebar
        activeSection={activeSection}
        onNavigate={onNavigate}
        isCollapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
        currentUser={currentUser}
        onLogout={onLogout}
        onOpenSettings={onOpenSettings}
        badges={badges}
      />

      {/* Main Content */}
      <div 
        className={`flex-1 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] mr-0 ${contentMarginClass}`}
      >
        <div className={`w-full flex flex-col ${isWebRuntime ? 'min-h-[100dvh]' : 'h-full'}`}>
          <ProductionHeader 
              title="محطة الطباعة" 
              role={UserRole.PRINTER}
              currentUser={currentUser} 
              onLogout={onLogout}
              onOpenSettings={onOpenSettings}
          />
          <div
            className={`flex-1 relative ${isWebRuntime ? 'overflow-x-hidden overflow-y-auto xl:overflow-hidden' : 'overflow-hidden'}`}
          >
              {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrinterLayout;
