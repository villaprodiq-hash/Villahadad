import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

/**
 * 🏗️ Main Layout Component
 * 
 * Wraps the entire application with Error Boundary
 * and provides consistent layout structure.
 * 
 * Usage:
 * ```tsx
 * <MainLayout>
 *   <YourAppContent />
 * </MainLayout>
 * ```
 */

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <ErrorBoundary
      onError={(_error, _errorInfo) => {
        // Send to error tracking service in production
        if (import.meta.env.PROD) {
          // Example: Sentry.captureException(error, { extra: errorInfo });
        }
      }}
    >
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </ErrorBoundary>
  );
};

export default MainLayout;
