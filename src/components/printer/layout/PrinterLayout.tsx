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
  badges?: any;

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
  badges
}) => {
  return (
    <div className="flex h-screen bg-[#0a0f0d] overflow-hidden" dir="rtl">
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
        className="flex-1 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]"
        style={{ marginRight: isCollapsed ? '90px' : '200px' }}
      >
        <div className="h-full w-full flex flex-col">
          <ProductionHeader 
              title="محطة الطباعة" 
              role={UserRole.PRINTER}
              currentUser={currentUser} 
              onLogout={onLogout}
              onOpenSettings={onOpenSettings}
          />
          <div className="flex-1 overflow-hidden relative">
              {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrinterLayout;
