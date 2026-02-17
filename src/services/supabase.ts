import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// These environment variables must be set in .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL or Anon Key is missing! Check your .env file.');
}

// ✅ IMPROVED: Enhanced Supabase client configuration with Singleton Pattern
const createSupabaseClient = () => createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,           // Keep the user logged in
    autoRefreshToken: true,         // Auto refresh JWT tokens
    detectSessionInUrl: false,      // Disabled for Electron (no OAuth redirects)
    flowType: 'implicit',           // Best for desktop apps
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-app-version': '2.0.0',     // Track app version in requests
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,          // Rate limit realtime events
    },
  },
});

// Use existing instance if available (prevents multiple GoTrueClient warnings)
const browserWindow =
  typeof window !== 'undefined'
    ? (window as Window & { __supabase?: SupabaseClient })
    : undefined;

export const supabase =
  browserWindow?.__supabase ??
  (() => {
    const client = createSupabaseClient();
    if (browserWindow) browserWindow.__supabase = client;
    return client;
  })();

// 🔒 SECURITY: Admin client removed from frontend
// Sync operations now use Edge Function 'sync' which has secure access to service role key
// This prevents exposing service keys in the frontend bundle
export const supabaseAdmin = null; // Deprecated - use Edge Function instead

console.log('✅ Supabase client initialized (Admin client removed for security)');
console.log('   Sync operations use secure Edge Function');

/**
 * 🔒 SECURE SYNC: Call Edge Function for admin operations
 * This keeps the service role key server-side only
 */
export async function callSyncFunction(
  action: 'create' | 'update' | 'delete' | 'upsert' | 'resolve_conflict',
  entity: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const { data: result, error } = await supabase.functions.invoke('sync', {
      body: {
        action,
        entity,
        data,
      },
    });

    if (error) {
      // Parse actual server error body for better debugging
      let serverMessage = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          const body = (await error.context.json()) as {
            error?: string;
            message?: string;
          } | null;
          serverMessage = body?.error || body?.message || JSON.stringify(body);
        } else if (error.context && typeof error.context.text === 'function') {
          serverMessage = await error.context.text();
        }
      } catch {
        // Fallback to original message
      }
      console.error(`Sync Function Error [${action} ${entity}]:`, serverMessage);
      return { success: false, error: serverMessage };
    }

    return { success: true, data: result };
  } catch (err) {
    console.error(`Sync Function Call Failed [${action} ${entity}]:`, err);
    return { success: false, error: String(err) };
  }
}
