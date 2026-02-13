# Architecture Overview - Villa Hadad System

## System Architecture

Villa Hadad is a hybrid desktop application built with Electron, React, and TypeScript, designed to manage photography studio operations both online and offline.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Shell (macOS)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           React Frontend (TypeScript)                  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Role-Based Views (7 Roles)                     │  │  │
│  │  │  - Manager, Admin, Reception                    │  │  │
│  │  │  - Photo Editor, Video Editor, Printer          │  │  │
│  │  │  - Selector                                      │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  State Management (Zustand)                     │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Services Layer                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │  DB Service  │  │ Sync Manager │  │ NAS Bridge │  │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Data Layer                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │ SQLite (Local)│  │  Supabase   │  │ NAS Storage│  │  │
│  │  │  (Offline)   │  │   (Cloud)    │  │  (Media)   │  │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Offline-First Architecture

```
User Action → Local SQLite → UI Update
                    ↓
            Sync Queue (Background)
                    ↓
            Supabase Cloud (When Online)
```

### 2. Media Workflow

```
Booking Created → Folder Created on NAS
                       ↓
                Photo Shoot → Images Uploaded
                       ↓
                Client Selection → Selected Images Tagged
                       ↓
                Photo Editing → Edited Images Saved
                       ↓
                Printing → Print Queue
                       ↓
                Delivery → Status Updated
```

## Key Components

### Frontend Layer

#### Role-Based Access Control (RBAC)
- **7 Distinct Roles** with granular permissions
- **Dynamic UI** based on user role
- **Permission Checks** at component level

#### State Management
- **Zustand** for global state
- **React Query** for server state (with persistence)
- **Local Storage** for user preferences

### Services Layer

#### Database Service (`src/services/db/`)
- **Drizzle ORM** for type-safe queries
- **SQLite** for local storage
- **Migrations** for schema versioning
- **Repositories** for data access patterns

#### Sync Manager (`src/services/sync/`)
- **Bidirectional Sync** between local and cloud
- **Conflict Resolution** with last-write-wins
- **Queue System** for offline operations
- **Real-time Updates** via Supabase subscriptions

#### NAS Bridge (`electron/database-bridge.cjs`)
- **File Operations** on network storage
- **Folder Creation** for bookings
- **Image Caching** for performance
- **Safe Import** with checksum verification

### Data Layer

#### Local Database (SQLite)
- **Primary Data Store** for offline capability
- **Fast Queries** for UI responsiveness
- **Automatic Backups** to NAS

#### Cloud Database (Supabase/PostgreSQL)
- **Centralized Data** for multi-device access
- **Real-time Sync** across devices
- **Backup and Recovery**

#### NAS Storage (Synology)
- **Media Files** (photos, videos)
- **Database Backups**
- **Shared Access** across studio

## Security Architecture

### Authentication
1. **Local Authentication** - PIN codes stored in SQLite
2. **Biometric** - Touch ID integration (macOS)
3. **Session Management** - Zustand store

### Authorization
- **Role-Based Permissions** defined in `src/types/user.types.ts`
- **Component-Level Guards** for UI elements
- **API-Level Checks** for data operations

### Data Protection
- **Sensitive Data Masking** based on permissions
- **Audit Logs** for all critical operations
- **Encrypted Storage** for passwords

## Performance Optimizations

### Frontend
- **Code Splitting** by role
- **Lazy Loading** for heavy components
- **Virtual Scrolling** for large lists
- **Image Caching** via Electron IPC

### Backend
- **Connection Pooling** for database
- **Query Optimization** with indexes
- **Batch Operations** for sync

### Network
- **Offline Queue** for failed requests
- **Incremental Sync** (only changed data)
- **Compression** for large payloads

## Deployment Architecture

### Development
```
npm run dev → Vite Dev Server (Port 3000)
                    ↓
            Electron loads localhost:3000
```

### Production
```
npm run build → Vite builds to dist/
                    ↓
npm run package:mac → Electron Builder
                    ↓
            .app bundle with embedded dist/
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Desktop** | Electron 39 | Cross-platform desktop app |
| **Frontend** | React 18 | UI framework |
| **Language** | TypeScript 5.8 | Type safety |
| **Styling** | TailwindCSS v4 | Utility-first CSS |
| **State** | Zustand | Global state management |
| **Forms** | React Hook Form + Zod | Form handling & validation |
| **Database (Local)** | SQLite + Drizzle ORM | Offline-first storage |
| **Database (Cloud)** | Supabase (PostgreSQL) | Cloud sync & backup |
| **Build** | Vite 6 | Fast bundling |
| **Package** | Electron Builder | App packaging |

## Design Patterns

### Repository Pattern
- Abstracts data access logic
- Located in `src/services/db/repositories/`
- Provides clean API for CRUD operations

### Service Layer Pattern
- Business logic separated from UI
- Located in `src/services/db/services/`
- Handles complex operations

### Observer Pattern
- Supabase real-time subscriptions
- React Query for cache invalidation
- Event-driven sync updates

## Future Considerations

### Scalability
- **Multi-Studio Support** - Separate databases per studio
- **Cloud Migration** - Move more logic to cloud functions
- **Mobile App** - React Native version for tablets

### Features
- **AI Photo Selection** - Auto-suggest best photos
- **Automated Workflows** - Smart status transitions
- **Analytics Dashboard** - Business intelligence

---

**Last Updated:** January 2026  
**Architecture Version:** 2.0
