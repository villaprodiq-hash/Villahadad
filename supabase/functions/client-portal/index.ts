/**
 * client-portal Edge Function
 *
 * Provides token-based access for clients to:
 * 1. Fetch their session photos (cloudUrl + thumbnailUrl)
 * 2. Submit selection decisions (approved/rejected/maybe)
 * 3. Confirm final selection
 * 4. Download all photos (full-res cloud URLs for saving/sharing)
 *
 * Security: Only accessible via a unique client_token stored in bookings table.
 * No login required — the token IS the authentication.
 */

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
    const { action, token, selections } = await req.json();

    if (!token) {
      return errorResponse(400, 'Missing client token');
    }

    // Create admin client (server-side only)
    const serviceRoleKey =
      Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabase = createClient(Deno.env.get('SUPABASE_URL') || '', serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Validate token → find booking (Supabase uses snake_case columns)
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, client_name, title, category, status, client_token')
      .eq('client_token', token)
      .is('deleted_at', null)
      .single();

    if (bookingErr || !booking) {
      return errorResponse(404, 'Invalid or expired token');
    }

    switch (action) {
      case 'get_photos':
        return await handleGetPhotos(supabase, booking);

      case 'update_selection':
        return await handleUpdateSelection(supabase, booking, selections);

      case 'confirm_selection':
        return await handleConfirmSelection(supabase, booking);

      case 'get_download_urls':
        return await handleGetDownloadUrls(supabase, booking);

      default:
        return errorResponse(400, `Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('client-portal Error:', error);
    return errorResponse(500, error.message);
  }
});

/**
 * Fetch all photos for a booking's session from session_images.
 */
async function handleGetPhotos(
  supabase: any,
  booking: { id: string; client_name: string; title: string; category: string; status: string }
) {
  let images: any[] = [];
  let error: any = null;

  // Try full schema first.
  let res = await runSessionImagesQuery(supabase, booking.id, q =>
    q
      .select('id, file_name, cloud_url, thumbnail_url, status, liked, notes, sort_order')
      .order('sort_order', { ascending: true })
  );

  images = res.data || [];
  error = res.error;

  // Fallback for older production schemas missing thumbnail_url / liked / notes / sort_order.
  if (error) {
    res = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id, file_name, cloud_url, is_selected')
    );

    images = res.data || [];
    error = res.error;
  }

  // Final fallback for very old schemas missing status as well.
  if (error) {
    res = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id, file_name, cloud_url')
    );

    images = res.data || [];
    error = res.error;
  }

  if (error) throw error;

  // Map snake_case → camelCase for the frontend
  const mappedImages = (images || []).map((img: any) => ({
    id: img.id,
    fileName: img.file_name,
    cloudUrl: img.cloud_url,
    thumbnailUrl: img.thumbnail_url || null,
    status: img.status || (img.is_selected ? 'selected' : 'pending'),
    liked: img.liked ? 1 : 0,
    notes: img.notes || null,
    sortOrder: img.sort_order ?? 0,
  }));

  return jsonResponse({
    booking: {
      clientName: booking.client_name,
      title: booking.title,
      category: booking.category,
      status: booking.status,
    },
    images: mappedImages,
    totalCount: mappedImages.length,
  });
}

/**
 * Update selection status for multiple images.
 * selections: [{ imageId: string, status: 'selected' | 'rejected' | 'pending', liked?: boolean, notes?: string }]
 */
async function handleUpdateSelection(
  supabase: any,
  booking: { id: string },
  selections: Array<{ imageId: string; status: string; liked?: boolean; notes?: string }>
) {
  if (!Array.isArray(selections) || selections.length === 0) {
    return errorResponse(400, 'No selections provided');
  }

  const now = new Date().toISOString();
  let updated = 0;

  for (const sel of selections) {
    const ownership = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id').eq('id', sel.imageId).limit(1)
    );

    if (ownership.error || !ownership.data || ownership.data.length === 0) {
      continue;
    }

    const updateData: Record<string, unknown> = {
      status: sel.status,
      selected_by: 'client',
      selected_at: now,
      updated_at: now,
    };

    if (sel.liked !== undefined) updateData.liked = sel.liked;
    if (sel.notes !== undefined) updateData.notes = sel.notes;

    let updateRes = await supabase.from('session_images').update(updateData).eq('id', sel.imageId);

    if (updateRes.error && isMissingColumnError(updateRes.error)) {
      updateRes = await supabase
        .from('session_images')
        .update({ is_selected: sel.status === 'selected' })
        .eq('id', sel.imageId);
    }

    if (!updateRes.error) updated++;
  }

  return jsonResponse({ success: true, updated });
}

/**
 * Confirm final selection — locks in the client's choices.
 * Updates booking status, session status, and records
 * selection_confirmed_at for the 45-day R2 cleanup countdown.
 */
async function handleConfirmSelection(supabase: any, booking: { id: string; status: string }) {
  const now = new Date().toISOString();

  // Count selected images
  let countRes = await runSessionImagesQuery(supabase, booking.id, q =>
    q.select('id', { count: 'exact', head: true }).eq('status', 'selected')
  );

  // Old schema fallback with boolean selection flag.
  if (countRes.error) {
    countRes = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id', { count: 'exact', head: true }).eq('is_selected', true)
    );
  }

  // Final fallback: count all linked images.
  if (countRes.error) {
    countRes = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id', { count: 'exact', head: true })
    );
  }

  const count = countRes.count || 0;

  // Calculate R2 cleanup date (45 days from now)
  const cleanupDate = new Date();
  cleanupDate.setDate(cleanupDate.getDate() + 45);

  // Update session — record confirmation timestamp + scheduled cleanup
  const sessionUpdate = {
    status: 'editing',
    selected_images: count,
    updated_at: now,
    selection_confirmed_at: now,
    r2_cleanup_after: cleanupDate.toISOString(),
  };

  let sessionRes = await supabase
    .from('sessions')
    .update(sessionUpdate)
    .eq('booking_id', booking.id);

  if (sessionRes.error && isMissingColumnError(sessionRes.error)) {
    sessionRes = await supabase.from('sessions').update(sessionUpdate).eq('bookingId', booking.id);
  }
  if (sessionRes.error && isMissingColumnError(sessionRes.error)) {
    sessionRes = await supabase.from('sessions').update(sessionUpdate).eq('bookingid', booking.id);
  }

  const sessionErr = sessionRes.error;

  if (sessionErr) console.error('Session update error:', sessionErr);

  // Always mark selection date, and advance status when still in selection pipeline.
  const bookingUpdate: Record<string, unknown> = {
    actual_selection_date: now,
    updated_at: now,
  };
  if (booking.status === 'Selection' || booking.status === 'Shooting Completed') {
    bookingUpdate.status = 'Editing';
  }

  const { error: bookingErr } = await supabase
    .from('bookings')
    .update(bookingUpdate)
    .eq('id', booking.id);

  if (bookingErr) console.error('Booking status update error:', bookingErr);

  return jsonResponse({
    success: true,
    selectedCount: count,
    r2CleanupAfter: cleanupDate.toISOString(),
    message:
      'Selection confirmed — photos sent to editing. Cloud photos will be removed after 45 days.',
  });
}

/**
 * Get full-resolution download URLs for SELECTED session photos only.
 * Clients use this to save their chosen photos to their phone or share on social media.
 */
async function handleGetDownloadUrls(
  supabase: any,
  booking: { id: string; client_name: string; title: string }
) {
  let images: any[] = [];
  let error: any = null;

  // Try with sort_order first.
  let res = await runSessionImagesQuery(supabase, booking.id, q =>
    q
      .select('id, file_name, cloud_url')
      .eq('status', 'selected')
      .not('cloud_url', 'is', null)
      .order('sort_order', { ascending: true })
  );

  images = res.data || [];
  error = res.error;

  // If selected list is empty but query succeeded, fallback to all cloud images.
  if (!error && images.length === 0) {
    res = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id, file_name, cloud_url').not('cloud_url', 'is', null)
    );
    images = res.data || [];
    error = res.error;
  }

  // Fallback for schemas without sort_order.
  if (error) {
    res = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id, file_name, cloud_url').eq('status', 'selected').not('cloud_url', 'is', null)
    );

    images = res.data || [];
    error = res.error;
  }

  // Fallback for legacy schemas using is_selected boolean.
  if (error) {
    res = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id, file_name, cloud_url').eq('is_selected', true).not('cloud_url', 'is', null)
    );

    images = res.data || [];
    error = res.error;
  }

  // Final fallback: return all cloud images.
  if (error) {
    res = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id, file_name, cloud_url').not('cloud_url', 'is', null)
    );

    images = res.data || [];
    error = res.error;
  }

  if (error) throw error;

  const downloads = (images || []).map((img: any) => ({
    id: img.id,
    fileName: img.file_name,
    url: img.cloud_url,
  }));

  return jsonResponse({
    clientName: booking.client_name,
    title: booking.title,
    downloads,
    totalCount: downloads.length,
  });
}

// ─── Helpers ──────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isMissingColumnError(error: any) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('column') && msg.includes('does not exist');
}

async function resolveSessionIdsForBooking(supabase: any, bookingId: string): Promise<string[]> {
  const attempts = ['booking_id', 'bookingId', 'bookingid'];
  for (const column of attempts) {
    const res = await supabase.from('sessions').select('id').eq(column, bookingId);

    if (!res.error) {
      return (res.data || []).map((s: any) => s.id).filter(Boolean);
    }

    if (!isMissingColumnError(res.error)) {
      return [];
    }
  }
  return [];
}

async function runSessionImagesQuery(supabase: any, bookingId: string, builder: (q: any) => any) {
  let lastResult: any = null;

  const directAttempts = ['booking_id', 'bookingId'];
  const directAttemptsLegacy = [...directAttempts, 'bookingid'];
  for (const column of directAttemptsLegacy) {
    const res = await builder(supabase.from('session_images')).eq(column, bookingId);
    lastResult = res;
    if (!res.error) return res;
    if (!isMissingColumnError(res.error)) return res;
  }

  const sessionIds = await resolveSessionIdsForBooking(supabase, bookingId);
  const candidateSessionIds = sessionIds.length > 0 ? sessionIds : [bookingId];

  const sessionAttempts = ['session_id', 'sessionId', 'sessionid'];
  for (const column of sessionAttempts) {
    const res = await builder(supabase.from('session_images')).in(column, candidateSessionIds);
    lastResult = res;
    if (!res.error) return res;
    if (!isMissingColumnError(res.error)) return res;
  }

  return lastResult || { data: [], error: null, count: 0 };
}
