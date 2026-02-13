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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, token, selections } = await req.json();

    if (!token) {
      return errorResponse(400, 'Missing client token');
    }

    // Create admin client (server-side only)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

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
  const { data: images, error } = await supabase
    .from('session_images')
    .select('id, file_name, cloud_url, thumbnail_url, status, liked, notes, sort_order')
    .eq('booking_id', booking.id)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  // Map snake_case → camelCase for the frontend
  const mappedImages = (images || []).map((img: any) => ({
    id: img.id,
    fileName: img.file_name,
    cloudUrl: img.cloud_url,
    thumbnailUrl: img.thumbnail_url,
    status: img.status,
    liked: img.liked ? 1 : 0,
    notes: img.notes,
    sortOrder: img.sort_order,
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
    const updateData: Record<string, unknown> = {
      status: sel.status,
      selected_by: 'client',
      selected_at: now,
      updated_at: now,
    };

    if (sel.liked !== undefined) updateData.liked = sel.liked;
    if (sel.notes !== undefined) updateData.notes = sel.notes;

    const { error } = await supabase
      .from('session_images')
      .update(updateData)
      .eq('id', sel.imageId)
      .eq('booking_id', booking.id);

    if (!error) updated++;
  }

  return jsonResponse({ success: true, updated });
}

/**
 * Confirm final selection — locks in the client's choices.
 * Updates booking status, session status, and records
 * selection_confirmed_at for the 45-day R2 cleanup countdown.
 */
async function handleConfirmSelection(
  supabase: any,
  booking: { id: string; status: string }
) {
  const now = new Date().toISOString();

  // Count selected images
  const { count } = await supabase
    .from('session_images')
    .select('id', { count: 'exact', head: true })
    .eq('booking_id', booking.id)
    .eq('status', 'selected');

  // Calculate R2 cleanup date (45 days from now)
  const cleanupDate = new Date();
  cleanupDate.setDate(cleanupDate.getDate() + 45);

  // Update session — record confirmation timestamp + scheduled cleanup
  const { error: sessionErr } = await supabase
    .from('sessions')
    .update({
      status: 'editing',
      selected_images: count || 0,
      updated_at: now,
      selection_confirmed_at: now,
      r2_cleanup_after: cleanupDate.toISOString(),
    })
    .eq('booking_id', booking.id);

  if (sessionErr) console.error('Session update error:', sessionErr);

  // Move booking to Editing status if currently in Selection
  if (booking.status === 'Selection') {
    const { error: bookingErr } = await supabase
      .from('bookings')
      .update({
        status: 'Editing',
        actual_selection_date: now,
        updated_at: now,
      })
      .eq('id', booking.id);

    if (bookingErr) console.error('Booking status update error:', bookingErr);
  }

  return jsonResponse({
    success: true,
    selectedCount: count || 0,
    r2CleanupAfter: cleanupDate.toISOString(),
    message: 'Selection confirmed — photos sent to editing. Cloud photos will be removed after 45 days.',
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
  const { data: images, error } = await supabase
    .from('session_images')
    .select('id, file_name, cloud_url')
    .eq('booking_id', booking.id)
    .eq('status', 'selected')
    .not('cloud_url', 'is', null)
    .order('sort_order', { ascending: true });

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
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
