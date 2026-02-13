import React from 'react';
import { UserRole } from './types';

// Lazy-loaded components
const ManagerDashboard = React.lazy(() => import('./components/manager/dashboard/ManagerDashboard'));
const ManagerClientsView = React.lazy(() => import('./components/manager/clients/ManagerClientsView'));
const ManagerTeamView = React.lazy(() => import('./components/manager/team/ManagerTeamView'));
const ManagerGalleryView = React.lazy(() => import('./components/manager/gallery/ManagerGalleryView'));
const ManagerFinancialView = React.lazy(() => import('./components/manager/financial/ManagerFinancialView'));

const AdminGeniusDashboard = React.lazy(() => import('./components/admin/dashboard/AdminGeniusDashboard'));
const AdminClientsListView = React.lazy(() => import('./components/admin/clients/AdminClientsListView'));
const AdminFinancialView = React.lazy(() => import('./components/admin/financial/AdminFinancialView'));
const AdminSystemView = React.lazy(() => import('./components/admin/system/AdminSystemView'));
const AdminHRView = React.lazy(() => import('./components/admin/hr/AdminHRView'));
const WorkflowManagerView = React.lazy(() => import('./components/admin/workflow/WorkflowManagerView'));

const ReceptionDashboard = React.lazy(() => import('./components/reception/dashboard/ReceptionDashboard'));
const ReceptionClientsView = React.lazy(() => import('./components/reception/clients/ReceptionClientsView'));
const ReceptionBookingsView = React.lazy(() => import('./components/reception/bookings/ReceptionBookingsView'));

const PhotoEditorDashboard = React.lazy(() => import('./components/photo-editor/dashboard/PhotoEditorDashboard'));
const VideoEditorDashboard = React.lazy(() => import('./components/video-editor/dashboard/VideoEditorDashboard'));
const PrinterDashboard = React.lazy(() => import('./components/printer/dashboard/PrinterDashboard'));
const SelectionDashboard = React.lazy(() => import('./components/selection/SelectionDashboard'));

export interface RouteConfig {
  id: string;
  label: string;
  component: React.LazyExoticComponent<any>;
}

/**
 * Role-based route configuration
 * Maps each user role to their accessible sections
 */
export const roleRoutes: Record<UserRole, RouteConfig[]> = {
  [UserRole.MANAGER]: [
    { id: 'section-home', label: 'الرئيسية', component: ManagerDashboard },
    { id: 'section-my-bookings', label: 'الحجوزات', component: ManagerDashboard },
    { id: 'section-clients', label: 'العملاء', component: ManagerClientsView },
    { id: 'section-financial', label: 'المالية', component: ManagerFinancialView },
    { id: 'section-files', label: 'المعرض', component: ManagerGalleryView },
    { id: 'section-team', label: 'فريق العمل', component: ManagerTeamView },
  ],

  [UserRole.ADMIN]: [
    { id: 'section-home', label: 'الرئيسية', component: AdminGeniusDashboard },
    { id: 'section-bookings', label: 'العمليات', component: WorkflowManagerView },
    { id: 'section-clients', label: 'العملاء', component: AdminClientsListView },
    { id: 'section-financial', label: 'المالية', component: AdminFinancialView },
    { id: 'section-settings', label: 'النظام', component: AdminSystemView },
    { id: 'section-hr', label: 'الموارد البشرية', component: AdminHRView },
  ],

  [UserRole.RECEPTION]: [
    { id: 'section-home', label: 'الرئيسية', component: ReceptionDashboard },
    { id: 'section-bookings', label: 'الحجوزات', component: ReceptionBookingsView },
    { id: 'section-clients', label: 'العملاء', component: ReceptionClientsView },
  ],

  [UserRole.PHOTO_EDITOR]: [
    { id: 'section-home', label: 'لوحة التحكم', component: PhotoEditorDashboard },
  ],

  [UserRole.VIDEO_EDITOR]: [
    { id: 'section-home', label: 'لوحة التحكم', component: VideoEditorDashboard },
  ],

  [UserRole.PRINTER]: [
    { id: 'section-home', label: 'قائمة الطباعة', component: PrinterDashboard },
  ],

  [UserRole.SELECTOR]: [
    { id: 'section-home', label: 'السلكشن', component: SelectionDashboard },
  ],
};

/**
 * Get available routes for a specific role
 */
export const getRoutesForRole = (role: UserRole): RouteConfig[] => {
  return roleRoutes[role] || [];
};

/**
 * Get default section for a role
 */
export const getDefaultSection = (role: UserRole): string => {
  const routes = getRoutesForRole(role);
  return routes.length > 0 ? routes[0].id : 'section-home';
};
