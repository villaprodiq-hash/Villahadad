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
      Deno.env.get('SERVICE_ROLE_KEY') ||
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
      '';

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Validate required fields
    if (!action || !entity) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, entity' }),
        { status: 400, headers: corsHeaders }
      );
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
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: corsHeaders }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function handleCreate(supabaseAdmin: any, entity: string, data: any) {
  const { data: result, error } = await supabaseAdmin
    .from(getTableName(entity))
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return { success: true, data: result };
}

async function handleUpdate(supabaseAdmin: any, entity: string, data: any) {
  const { id, ...updateData } = data;
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
    const { error } = await supabaseAdmin
      .from(getTableName(entity))
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true, message: 'Hard deleted successfully' };
  }
}

async function handleUpsert(supabaseAdmin: any, entity: string, data: any) {
  const { data: result, error } = await supabaseAdmin
    .from(getTableName(entity))
    .upsert(data)
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
