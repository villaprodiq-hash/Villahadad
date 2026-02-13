/// <reference types="../../types/electron.d.ts" />

import {
  Kysely,
  SqliteDialect,
  Driver,
  DatabaseConnection,
  QueryResult,
  CompiledQuery,
  TransactionSettings,
} from 'kysely';
import { Database } from './types';
import { logger } from '../../utils/logger';

// --- IPC Driver Implementation (For Renderer) ---
class IpcConnection implements DatabaseConnection {
  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const { sql, parameters } = compiledQuery;
    // Call Main Process via Preload
    const api = window.electronAPI;
    if (!api) {
      logger.debug('[MockDB] Query skipped (Web Mode)', { sql });
      return { rows: [] }; // Return empty for web dev
    }

    if (!api.db) {
      logger.error('[IpcConnection] Electron API exists but db is undefined!');
      throw new Error('Database API not available - Main process may not have initialized the database bridge');
    }

    try {
      const rows = await api.db.query(sql, parameters as unknown[]);
      return {
        rows: (rows || []) as R[],
      };
    } catch (error) {
      logger.error('[IpcConnection] Query failed:', error);
      throw error;
    }
  }

  async *streamQuery<R>(
    _compiledQuery: CompiledQuery,
    _chunkSize?: number
  ): AsyncIterableIterator<QueryResult<R>> {
    // eslint-disable-next-line no-constant-condition
    if (false) {
      yield {} as QueryResult<R>;
    } // Make it a generator
    throw new Error('Streaming not supported in IPC mode');
  }
}

class IpcDriver implements Driver {
  async init(): Promise<void> {
    if (!window.electronAPI) {
      logger.warn('⚠️ Electron API not found. Running in Web/Mock Mode.');
    }
  }
  async acquireConnection(): Promise<DatabaseConnection> {
    return new IpcConnection();
  }
  async beginTransaction(
    _connection: DatabaseConnection,
    _settings: TransactionSettings
  ): Promise<void> {
    // No-op or throw. For now, we risk no transactions in Renderer.
    logger.warn('Transactions skipped in Renderer IPC Driver');
  }
  async commitTransaction(_connection: DatabaseConnection): Promise<void> {}
  async rollbackTransaction(_connection: DatabaseConnection): Promise<void> {}
  async releaseConnection(_connection: DatabaseConnection): Promise<void> {}
  async destroy(): Promise<void> {}
}

// --- Initialization ---

// RENDERER: Use IPC Driver
// This file is intended ONLY for the Renderer process.
// Main process uses electron/database-bridge.cjs
const dbInstance = new Kysely<Database>({
  dialect: {
    createAdapter: () => new SqliteDialect({ database: undefined as unknown as never }).createAdapter(),
    createDriver: () => new IpcDriver(),
    createIntrospector: db => new SqliteDialect({ database: undefined as unknown as never }).createIntrospector(db),
    createQueryCompiler: () => new SqliteDialect({ database: undefined as unknown as never }).createQueryCompiler(),
  },
});
logger.info('🚀 Kysely initialized in RENDERER mode (IPC)');

export const db = dbInstance;

export const closeDB = async () => {
  await db.destroy();
};
