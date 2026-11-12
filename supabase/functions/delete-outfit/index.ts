import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Admin accounts authorized to delete ANY post from anywhere
const ADMIN_USER_IDS = [
  'bc00cfb3-288f-4a22-8425-b40a3a8f923b', // Ash
];

const ADMIN_EMAILS = [
  'ayushagarwal2006.9@gmail.com',
  'ayushagarwal21.11.06@gmail.com',
];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[delete-outfit] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing service credentials' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ── Auth JWT Verification ────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized — missing authorization token' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized — invalid or expired session token' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const outfitId = body?.outfitId || body?.outfit_id;

    if (!outfitId) {
      return new Response(
        JSON.stringify({ error: 'outfitId is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-outfit] Request from user ${user.id} (${user.email}) to delete outfit ${outfitId}`);

    // Fetch outfit to verify existence and ownership
    const { data: outfit, error: fetchErr } = await supabaseAdmin
      .from('outfits')
      .select('id, poster_id, image_url')
      .eq('id', outfitId)
      .maybeSingle();

    if (fetchErr) {
      console.error('[delete-outfit] Error fetching outfit:', fetchErr);
      return new Response(
        JSON.stringify({ error: 'Database error fetching outfit' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (!outfit) {
      // If already deleted, return success
      return new Response(
        JSON.stringify({ success: true, message: 'Outfit already deleted' }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is Ash / Admin OR the post owner
    const isOwner = outfit.poster_id === user.id;
    const userEmail = (user.email || '').toLowerCase();
    const isAdmin = ADMIN_USER_IDS.includes(user.id) || ADMIN_EMAILS.includes(userEmail);

    if (!isOwner && !isAdmin) {
      console.warn(`[delete-outfit] User ${user.id} is NOT authorized to delete outfit ${outfitId}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not have permission to delete this post.' }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-outfit] Authorized (isOwner=${isOwner}, isAdmin=${isAdmin}). Deleting outfit ${outfitId} completely...`);

    // 1. Delete all related child records across database
    await Promise.allSettled([
      supabaseAdmin.from('outfit_ratings').delete().eq('outfit_id', outfitId),
      supabaseAdmin.from('outfit_likes').delete().eq('outfit_id', outfitId),
      supabaseAdmin.from('outfit_comments').delete().eq('outfit_id', outfitId),
      supabaseAdmin.from('outfit_products').delete().eq('outfit_id', outfitId),
    ]);

    // 2. Delete main outfit row using service role
    const { error: deleteError } = await supabaseAdmin
      .from('outfits')
      .delete()
      .eq('id', outfitId);

    if (deleteError) {
      console.error('[delete-outfit] Error deleting outfit row:', deleteError);
      return new Response(
        JSON.stringify({ error: `Failed to delete outfit: ${deleteError.message}` }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Delete image from Storage if applicable
    if (outfit.image_url) {
      try {
        const marker = '/outfit-photos/';
        if (outfit.image_url.includes(marker)) {
          const storagePath = outfit.image_url.split(marker)[1];
          if (storagePath) {
            console.log('[delete-outfit] Deleting storage file:', storagePath);
            await supabaseAdmin.storage.from('outfit-photos').remove([storagePath]);
          }
        }
      } catch (storageErr) {
        console.warn('[delete-outfit] Storage delete non-fatal:', storageErr);
      }
    }

    console.log(`[delete-outfit] Successfully deleted outfit ${outfitId} entirely from database.`);

    return new Response(
      JSON.stringify({ success: true, message: 'Post deleted successfully from database and storage' }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[delete-outfit] Unexpected error:', err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message || 'An unexpected error occurred during post deletion' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
