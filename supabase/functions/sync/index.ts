import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, data, entity, userId } = await req.json();

    // 🔒 SECURITY: Create admin client with service role key (server-side only)
    const serviceRoleKey =
      Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

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
        result = await handleCreate(supabaseAdmin, entity, data);
        break;
      case 'update':
        result = await handleUpdate(supabaseAdmin, entity, data);
        break;
      case 'delete':
        result = await handleDelete(supabaseAdmin, entity, data);
        break;
      case 'upsert':
        result = await handleUpsert(supabaseAdmin, entity, data);
        break;
      case 'resolve_conflict':
        result = await handleConflictResolution(supabaseAdmin, entity, data);
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
  } catch (error) {
    console.error('Sync Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

async function handleCreate(supabaseAdmin: any, entity: string, data: any) {
  const cleanData = sanitizeEntityPayload(entity, data);
  const { data: result, error } = await supabaseAdmin
    .from(getTableName(entity))
    .insert(cleanData)
    .select()
    .single();

  if (error) throw error;
  return { success: true, data: result };
}

async function handleUpdate(supabaseAdmin: any, entity: string, data: any) {
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

async function handleDelete(supabaseAdmin: any, entity: string, data: any) {
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

async function handleUpsert(supabaseAdmin: any, entity: string, data: any) {
  const cleanData = sanitizeEntityPayload(entity, data);
  const { data: result, error } = await supabaseAdmin
    .from(getTableName(entity))
    .upsert(cleanData)
    .select()
    .single();

  if (error) throw error;
  return { success: true, data: result };
}

async function handleConflictResolution(supabaseAdmin: any, entity: string, data: any) {
  const { localData, resolution } = data;
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
    attendance: 'attendance',
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

function sanitizeEntityPayload(entity: string, data: Record<string, unknown>) {
  if (!data || typeof data !== 'object') return data;

  if (entity === 'session_image') {
    // Support legacy production schema:
    // id, session_id, file_name, cloud_url, local_path, is_selected, created_at
    const mapped: Record<string, unknown> = {
      id: data.id,
      session_id: data.session_id ?? data.sessionId,
      file_name: data.file_name ?? data.fileName,
      cloud_url: data.cloud_url ?? data.cloudUrl,
      local_path: data.local_path ?? data.original_path ?? data.originalPath ?? null,
      is_selected:
        data.is_selected ?? data.isSelected ?? (data.status === 'selected' ? true : false),
      created_at: data.created_at ?? data.uploaded_at ?? new Date().toISOString(),
    };

    return pickFields(mapped, [
      'id',
      'session_id',
      'file_name',
      'cloud_url',
      'local_path',
      'is_selected',
      'created_at',
    ]);
  }

  if (entity === 'session') {
    // Support legacy production schema:
    // id, booking_id, client_name, folder_path, status, created_at
    const mapped: Record<string, unknown> = {
      id: data.id,
      booking_id: data.booking_id ?? data.bookingId,
      client_name: data.client_name ?? data.clientName,
      folder_path: data.folder_path ?? data.nas_path ?? data.nasPath ?? null,
      status: data.status ?? 'ingesting',
      created_at: data.created_at ?? new Date().toISOString(),
    };

    return pickFields(mapped, [
      'id',
      'booking_id',
      'client_name',
      'folder_path',
      'status',
      'created_at',
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
