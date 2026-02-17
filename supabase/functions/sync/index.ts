import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

type JsonRecord = Record<string, unknown>;
type SyncAction = 'create' | 'update' | 'delete' | 'upsert' | 'resolve_conflict';
type SyncPayload = {
  action?: SyncAction | string;
  data?: JsonRecord;
  entity?: string;
  userId?: string;
};
type SupabaseAdminClient = ReturnType<typeof createClient>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let payload: SyncPayload | null = null;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { action, data, entity } = payload || {};

    // 🔒 SECURITY: Create admin client with service role key (server-side only)
    const serviceRoleKey =
      Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing SERVICE_ROLE_KEY secret' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') || '', serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Validate required fields
    if (!action || !entity) {
      return new Response(JSON.stringify({ error: 'Missing required fields: action, entity' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    let result;

    switch (action) {
      case 'create':
        result = await handleCreate(supabaseAdmin, entity, isRecord(data) ? data : {});
        break;
      case 'update':
        result = await handleUpdate(supabaseAdmin, entity, isRecord(data) ? data : {});
        break;
      case 'delete':
        result = await handleDelete(supabaseAdmin, entity, isRecord(data) ? data : {});
        break;
      case 'upsert':
        result = await handleUpsert(supabaseAdmin, entity, isRecord(data) ? data : {});
        break;
      case 'resolve_conflict':
        result = await handleConflictResolution(supabaseAdmin, entity, isRecord(data) ? data : {});
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: corsHeaders,
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Sync Function Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unexpected sync error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

async function handleCreate(supabaseAdmin: SupabaseAdminClient, entity: string, data: JsonRecord) {
  const cleanData = sanitizeEntityPayload(entity, data);
  const { data: result, error } = await supabaseAdmin
    .from(getTableName(entity))
    .insert(cleanData)
    .select()
    .single();

  if (error) throw error;
  return { success: true, data: result };
}

async function handleUpdate(supabaseAdmin: SupabaseAdminClient, entity: string, data: JsonRecord) {
  const cleanData = sanitizeEntityPayload(entity, data);
  const { id, ...updateData } = cleanData;
  const { data: result, error } = await supabaseAdmin
    .from(getTableName(entity))
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return { success: true, data: result };
}

async function handleDelete(supabaseAdmin: SupabaseAdminClient, entity: string, data: JsonRecord) {
  const { id, soft = true } = data;

  if (soft) {
    const { error } = await supabaseAdmin
      .from(getTableName(entity))
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return { success: true, message: 'Soft deleted successfully' };
  } else {
    const { error } = await supabaseAdmin.from(getTableName(entity)).delete().eq('id', id);

    if (error) throw error;
    return { success: true, message: 'Hard deleted successfully' };
  }
}

async function handleUpsert(supabaseAdmin: SupabaseAdminClient, entity: string, data: JsonRecord) {
  const cleanData = sanitizeEntityPayload(entity, data);
  const tableName = getTableName(entity);
  const { data: result, error } = await upsertWithSchemaFallback(supabaseAdmin, tableName, cleanData);

  if (error) throw error;
  return { success: true, data: result };
}

async function handleConflictResolution(
  supabaseAdmin: SupabaseAdminClient,
  entity: string,
  data: JsonRecord
) {
  const localData = isRecord(data.localData) ? data.localData : {};
  const resolution = typeof data.resolution === 'string' ? data.resolution : '';
  const id = localData.id;

  if (resolution === 'local') {
    // Apply local data (local wins)
    const { data: result, error } = await supabaseAdmin
      .from(getTableName(entity))
      .upsert(localData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: result, resolution: 'local_applied' };
  } else if (resolution === 'draft') {
    // Create conflict record for manual review
    const { data: result, error } = await supabaseAdmin
      .from('conflicts')
      .insert({
        booking_id: id,
        proposed_by_name: localData.updated_by_name || 'Unknown',
        proposed_by_rank: localData.last_editor_rank || 'RECEPTION',
        proposed_data: localData,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: result, resolution: 'draft_created' };
  }

  throw new Error('Invalid resolution type');
}

function getTableName(entity: string): string {
  const tableMap: Record<string, string> = {
    booking: 'bookings',
    user: 'users',
    attendance: 'daily_attendance',
    leave: 'leaves',
    activity_log: 'activity_logs',
    payment: 'payments',
    add_on: 'add_ons',
    add_on_audit: 'add_on_audit',
    add_on_notification: 'add_on_notifications',
    invoice: 'invoices',
    client_transaction: 'client_transactions',
    session_image: 'session_images',
    session: 'sessions',
  };

  return tableMap[entity] || entity + 's';
}

function pickFields(input: Record<string, unknown>, allowed: string[]) {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (input[key] !== undefined) out[key] = input[key];
  }
  return out;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return undefined;
}

function extractMissingColumnName(error: unknown): string | null {
  const message = String((error as { message?: string } | null)?.message || '');
  if (!message) return null;

  const patterns = [
    /Could not find the '([^']+)' column/i,
    /column ["']?([a-zA-Z0-9_]+)["']? does not exist/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

async function upsertWithSchemaFallback(
  supabaseAdmin: SupabaseAdminClient,
  tableName: string,
  payload: JsonRecord
) {
  const candidate: JsonRecord = { ...payload };
  const maxAttempts = 16;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabaseAdmin.from(tableName).upsert(candidate).select().single();
    if (!error) return { data, error: null };

    lastError = error;
    const missingColumn = extractMissingColumnName(error);
    if (!missingColumn || !(missingColumn in candidate)) {
      return { data: null, error };
    }

    console.warn(`[sync] Upsert fallback: removing missing column "${missingColumn}" from ${tableName}`);
    delete candidate[missingColumn];
  }

  return {
    data: null,
    error:
      lastError instanceof Error
        ? lastError
        : new Error(`Upsert failed for ${tableName} after ${maxAttempts} schema-fallback attempts`),
  };
}

function sanitizeEntityPayload(entity: string, data: Record<string, unknown>) {
  if (!data || typeof data !== 'object') return data;

  if (entity === 'session_image') {
    // Supports both modern and legacy schemas via column-fallback in upsert.
    const cloudUrl = data.cloud_url ?? data.cloudUrl ?? null;
    const likedValue = toBoolean(data.liked);
    const syncedToCloudValue = toBoolean(data.synced_to_cloud ?? data.syncedToCloud);
    const isSelectedValue = toBoolean(data.is_selected ?? data.isSelected);

    // cloud_url is required for portal rendering.
    if (!cloudUrl) {
      throw new Error(
        `session_image ${data.id} has no cloud_url — image not yet uploaded to R2. Skipping sync.`
      );
    }

    const mapped: Record<string, unknown> = {
      id: data.id,
      session_id: data.session_id ?? data.sessionId,
      booking_id: data.booking_id ?? data.bookingId ?? null,
      file_name: data.file_name ?? data.fileName,
      cloud_url: cloudUrl,
      original_path: data.original_path ?? data.originalPath ?? data.local_path ?? data.localPath ?? null,
      local_path: data.local_path ?? data.original_path ?? data.originalPath ?? null,
      thumbnail_url: data.thumbnail_url ?? data.thumbnailUrl ?? null,
      status: data.status ?? (isSelectedValue ? 'selected' : 'pending'),
      is_selected:
        isSelectedValue ?? (data.status === 'selected' ? true : false),
      liked: likedValue,
      notes: data.notes ?? null,
      sort_order: data.sort_order ?? data.sortOrder ?? 0,
      uploaded_at: data.uploaded_at ?? data.uploadedAt ?? data.created_at ?? new Date().toISOString(),
      synced_to_cloud: syncedToCloudValue ?? true,
      created_at: data.created_at ?? data.uploaded_at ?? data.uploadedAt ?? new Date().toISOString(),
      updated_at: data.updated_at ?? data.updatedAt ?? new Date().toISOString(),
    };

    return pickFields(mapped, [
      'id',
      'session_id',
      'booking_id',
      'file_name',
      'cloud_url',
      'original_path',
      'local_path',
      'thumbnail_url',
      'status',
      'is_selected',
      'liked',
      'notes',
      'sort_order',
      'uploaded_at',
      'synced_to_cloud',
      'created_at',
      'updated_at',
    ]);
  }

  if (entity === 'session') {
    const r2CleanedValue = toBoolean(data.r2_cleaned ?? data.r2Cleaned);
    const mapped: Record<string, unknown> = {
      id: data.id,
      booking_id: data.booking_id ?? data.bookingId,
      client_name: data.client_name ?? data.clientName,
      nas_path: data.nas_path ?? data.nasPath ?? data.folder_path ?? data.folderPath ?? null,
      folder_path: data.folder_path ?? data.folderPath ?? data.nas_path ?? data.nasPath ?? null,
      cloud_gallery_url: data.cloud_gallery_url ?? data.cloudGalleryUrl ?? null,
      status: data.status ?? 'ingesting',
      total_images: data.total_images ?? data.totalImages ?? 0,
      selected_images: data.selected_images ?? data.selectedImages ?? 0,
      upload_progress: data.upload_progress ?? data.uploadProgress ?? 0,
      selection_method: data.selection_method ?? data.selectionMethod ?? 'studio',
      r2_cleaned: r2CleanedValue ?? false,
      created_at: data.created_at ?? new Date().toISOString(),
      updated_at: data.updated_at ?? data.updatedAt ?? new Date().toISOString(),
    };

    return pickFields(mapped, [
      'id',
      'booking_id',
      'client_name',
      'nas_path',
      'folder_path',
      'cloud_gallery_url',
      'status',
      'total_images',
      'selected_images',
      'upload_progress',
      'selection_method',
      'r2_cleaned',
      'created_at',
      'updated_at',
    ]);
  }

  if (entity === 'booking') {
    // Guard old DBs that don't have exchange_rate yet.
    const clean = { ...data };
    delete clean.exchange_rate;
    return clean;
  }

  return data;
}
