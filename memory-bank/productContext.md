# Product Context

## The Problem
The previous version lacked proper architectural boundaries, relied on CDNs (`importmap`), and had scattered source files. This made maintenance, testing, and scaling difficult.

## The Solution
We are building a robust, production-grade system with:
1.  **Centralized Structure:** All code moves to `src/`.
2.  **Dependency Safety:** Removing CDN dependence for full offline support.
3.  **Role-Based Access:** Distinct views for Admin, Reception, Manager, and Design/Print staff.
4.  **Smart Features:** Local AI for querying booking data instantly.

## User Roles
- **Reception:** Quick booking entry, calendar view.
- **Admin/Manager:** Financial reports, sensitive data access.
- **Designers:** Photo selection and editing workflows.