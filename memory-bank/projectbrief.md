# Project Brief: Villa Hadad v2

## Overview
Villa Hadad v2 is a comprehensive Studio Management System designed as a Desktop Application (Electron). It manages bookings, finance, staff roles, and printing workflows for a large photography studio.

## Core Tech Stack
- **Runtime:** Electron (Desktop)
- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **Database:** - Local: SQLite (`better-sqlite3`) for offline-first capability.
  - Cloud: Supabase (PostgreSQL) for synchronization.
- **AI Integration:** Local LlamaIndex + Chroma (Hybrid approach).

## Key Requirements
- Offline-first architecture (must work without internet).
- Strict Type Safety (TypeScript).
- "Deep Architectural Refactor" is currently in progress to move to a `src/` based structure.