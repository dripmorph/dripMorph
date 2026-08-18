/**
 * outfitService.js
 * Handles all backend interactions for the outfit upload flow:
 *   1. Storage upload  → Supabase Storage (outfit-photos bucket)
 *   2. Moderation      → moderate-image Edge Function
 *   3. Rating          → rate-outfit Edge Function
 *   4. Publish         → outfits + outfit_ratings DB inserts
 */

import { supabase } from './supabaseClient';
import { compressImage } from './compressImage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

// ── Helper: get the current session's access token ────────────────────────────
async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to upload an outfit.');
  }
  return session.access_token;
}

// ── 1. Upload image to Supabase Storage ───────────────────────────────────────
/**
 * Uploads a File object to the outfit-photos bucket.
 * Returns the public URL of the uploaded image.
 */
export async function uploadOutfitImage(file, userId) {
  if (!file || !userId) throw new Error('Missing file or user ID.');

  console.log(`[outfitService.uploadOutfitImage] Step 1: Called with original file: "${file.name}", size: ${(file.size / (1024 * 1024)).toFixed(2)} MB (${file.size} bytes)`);

  // ── Compress before upload ────────────────────────────────────────────────
  console.log(`[outfitService.uploadOutfitImage] Step 2: Calling compressImage()...`);
  const compressed = await compressImage(file);
  console.log(`[outfitService.uploadOutfitImage] Step 3: compressImage() returned. Compressed file size: ${(compressed.size / (1024 * 1024)).toFixed(2)} MB (${compressed.size} bytes)`);

  // Edge-case guard: if the file is still over the bucket limit even after
  // compression, reject it client-side with a clear, specific error.
  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB bucket limit
  if (compressed.size > MAX_UPLOAD_BYTES) {
    console.warn(`[outfitService.uploadOutfitImage] FILE_TOO_LARGE check TRIGGERED! Compressed size ${(compressed.size / (1024 * 1024)).toFixed(2)} MB exceeds 5 MB limit.`);
    const err = new Error(
      'Image too large — please choose a smaller photo.',
    );
    err.code = 'FILE_TOO_LARGE';
    throw err;
  }
  console.log(`[outfitService.uploadOutfitImage] FILE_TOO_LARGE check PASSED! Size ${(compressed.size / (1024 * 1024)).toFixed(2)} MB is under 5 MB limit.`);

  const timestamp = Date.now();
  const safeFilename = compressed.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${userId}/${timestamp}-${safeFilename}`;

  const { error: uploadError } = await supabase.storage
    .from('outfit-photos')
    .upload(storagePath, compressed, {
      cacheControl: '3600',
      upsert: false,
      contentType: compressed.type,
    });

  if (uploadError) {
    console.error('[outfitService] Storage upload error:', uploadError);
    throw new Error('Failed to upload your photo. Please try again.');
  }

  const { data: urlData } = supabase.storage
    .from('outfit-photos')
    .getPublicUrl(storagePath);

  if (!urlData?.publicUrl) {
    throw new Error('Could not get the public URL for your photo.');
  }

  return urlData.publicUrl;
}

// ── 1.5. Upload avatar image to Supabase Storage ────────────────────────────────
/**
 * Uploads a profile picture file to the outfit-photos bucket under ${userId}/avatar-....
 * Uses the user's ID as the root folder to satisfy Supabase Storage RLS policy.
 * Returns the public URL of the uploaded image.
 */
export async function uploadAvatarImage(file, userId) {
  console.log(`[outfitService.uploadAvatarImage] Step 1: Called with file: "${file?.name}", size: ${file?.size} bytes, userId: "${userId}"`);
  if (!file || !userId) {
    const err = new Error('Missing file or user ID.');
    console.error('[outfitService.uploadAvatarImage] Error:', err);
    throw err;
  }

  console.log('[outfitService.uploadAvatarImage] Step 2: Compressing file via compressImage()...');
  const compressed = await compressImage(file);
  console.log(`[outfitService.uploadAvatarImage] Step 3: Compression complete. Compressed size: ${compressed.size} bytes`);

  const timestamp = Date.now();
  const safeFilename = compressed.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Use ${userId}/avatar-... so the first path segment matches auth.uid() for Supabase Storage RLS policy
  const storagePath = `${userId}/avatar-${timestamp}-${safeFilename}`;
  console.log(`[outfitService.uploadAvatarImage] Step 4: Storage path set to "${storagePath}". Uploading to bucket "outfit-photos"...`);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('outfit-photos')
    .upload(storagePath, compressed, {
      cacheControl: '3600',
      upsert: true,
      contentType: compressed.type,
    });

  if (uploadError) {
    console.error('[outfitService.uploadAvatarImage] Step 5 ERROR: Storage upload failed:', {
      message: uploadError.message,
      error: uploadError,
      status: uploadError.status,
      statusCode: uploadError.statusCode,
      storagePath
    });
    throw new Error(`Upload failed: ${uploadError.message || 'Storage permission error'}`);
  }

  console.log('[outfitService.uploadAvatarImage] Step 5 SUCCESS: File uploaded successfully:', uploadData);

  const { data: urlData } = supabase.storage
    .from('outfit-photos')
    .getPublicUrl(storagePath);

  if (!urlData?.publicUrl) {
    console.error('[outfitService.uploadAvatarImage] Step 6 ERROR: Could not get public URL for path:', storagePath);
    throw new Error('Could not get public URL for uploaded avatar.');
  }

  console.log('[outfitService.uploadAvatarImage] Step 6 SUCCESS: Public URL generated:', urlData.publicUrl);
  return urlData.publicUrl;
}

// ── 2. Moderate image ─────────────────────────────────────────────────────────
/**
 * Calls the moderate-image Edge Function.
 * Returns { is_appropriate: boolean, reason: string }
 * Throws on network/server errors.
 */
export async function moderateImage(imageUrl) {
  const token = await getAccessToken();

  let response;
  try {
    response = await fetch(`${FUNCTIONS_BASE}/moderate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ image_url: imageUrl }),
    });
  } catch {
    throw new Error('Network error during content check. Please try again.');
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('[outfitService] moderate-image error:', response.status, text);
    throw new Error('Content check failed. Please try again.');
  }

  const data = await response.json();
  return data; // { is_appropriate, reason }
}

// ── 3. Rate outfit ────────────────────────────────────────────────────────────
/**
 * Calls the rate-outfit Edge Function.
 * Returns the full rating object or throws a typed error.
 *
 * Throws { code: 'RATE_LIMITED' }  on 429 so callers can surface a specific message.
 * Throws { code: 'AI_GENERATED', ai_generated_confidence } on 422 so callers can
 *   show a rejection message and return the user to the upload step.
 */
export async function rateOutfit(imageUrl) {
  const token = await getAccessToken();

  let response;
  try {
    response = await fetch(`${FUNCTIONS_BASE}/rate-outfit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ image_url: imageUrl }),
    });
  } catch {
    throw new Error('Network error during rating. Please try again.');
  }

  if (response.status === 429) {
    // Parse body to distinguish our own rate limit from a Gemini quota error
    let body = {};
    try { body = await response.json(); } catch { /* ignore */ }
    const isGeminiQuota = body?.error === 'gemini_quota';
    const err = new Error(
      isGeminiQuota
        ? 'AI rating is temporarily unavailable — quota limit reached. Please try again in a minute.'
        : 'You\'ve rated 10 outfits this hour. Take a break and come back soon!',
    );
    err.code = 'RATE_LIMITED';
    throw err;
  }

  if (response.status === 422) {
    // AI-generated image detected — parse the confidence level out of the body
    let confidence = 'unknown';
    try {
      const body = await response.json();
      confidence = body?.ai_generated_confidence ?? 'unknown';
    } catch { /* ignore parse failures */ }
    const err = new Error(
      'This image appears to be AI-generated and can\'t be rated or published. Please upload a real photo of your outfit.',
    );
    err.code = 'AI_GENERATED';
    err.ai_generated_confidence = confidence;
    throw err;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('[outfitService] rate-outfit error:', response.status, text);
    throw new Error('Rating failed. Please try again.');
  }

  return await response.json();
  // {
  //   color_harmony: { score, comment },
  //   silhouette_proportions: { score, comment },
  //   coherence_styling: { score, comment },
  //   overall: number,
  //   summary: string,
  //   improvement_tip: string
  // }
}

// ── 3.5. Compute image hash ──────────────────────────────────────────────────
/**
 * Computes a SHA-256 hex hash from a File, Blob, ArrayBuffer, or URL string.
 */
export async function computeImageHash(input) {
  try {
    let buffer;
    if (input instanceof File || input instanceof Blob) {
      buffer = await input.arrayBuffer();
    } else if (input instanceof ArrayBuffer) {
      buffer = input;
    } else if (typeof input === 'string') {
      if (input.startsWith('data:') || input.startsWith('http://') || input.startsWith('https://') || input.startsWith('blob:')) {
        const res = await fetch(input);
        buffer = await res.arrayBuffer();
      } else {
        const encoder = new TextEncoder();
        buffer = encoder.encode(input);
      }
    } else {
      buffer = new TextEncoder().encode(String(input || ''));
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('[computeImageHash] Fallback hash calculation triggered:', err);
    const str = typeof input === 'string' ? input : (input?.name || '') + (input?.size || '') + (input?.lastModified || '');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return `hash_${Math.abs(hash)}_${Date.now()}`;
  }
}

// ── 4. Publish outfit ─────────────────────────────────────────────────────────
/**
 * Inserts into outfits + outfit_ratings + outfit_products tables with step-by-step debug logs.
 * Computes and includes image_hash to satisfy not-null and duplicate check constraints.
 * Returns the inserted outfit row (with its id).
 */
export async function publishOutfit({ userId, imageUrl, imageHash, imageFile, city, caption, rating, taggedItems }) {
  console.log('[outfitService] publishOutfit STARTED with params:', {
    userId,
    imageUrl,
    imageHash,
    city,
    caption,
    rating,
    taggedItems
  });

  // Calculate image_hash if not provided directly
  let computedHash = imageHash;
  if (!computedHash) {
    console.log('[outfitService] Computing image_hash for outfit insertion...');
    computedHash = await computeImageHash(imageFile || imageUrl);
    console.log('[outfitService] Computed image_hash:', computedHash);
  }

  // Step 1: Insert outfit row
  const outfitPayload = {
    poster_id: userId,
    image_url: imageUrl,
    image_hash: computedHash,
    city: city || null,
    caption: caption || null,
  };
  console.log('[outfitService] Step 1: Inserting into outfits table...', outfitPayload);

  const { data: outfit, error: outfitError } = await supabase
    .from('outfits')
    .insert(outfitPayload)
    .select()
    .single();

  if (outfitError) {
    console.error('[outfitService] Step 1 ERROR: outfits insert failed:', outfitError);
    if (
      outfitError.code === '23505' ||
      outfitError.message?.includes('duplicate key') ||
      outfitError.message?.includes('image_hash') ||
      outfitError.message?.includes('unique constraint')
    ) {
      throw new Error('You have already published this outfit photo!');
    }
    throw new Error(outfitError.message || 'Failed to publish your outfit. Please try again.');
  }
  console.log('[outfitService] Step 1 SUCCESS: outfits row created:', outfit);

  // Step 2: Insert matching outfit_ratings row
  if (rating) {
    const ratingPayload = {
      outfit_id: outfit.id,
      color_harmony_score: rating.color_harmony?.score ?? rating.color_harmony ?? 8,
      silhouette_proportions_score: rating.silhouette_proportions?.score ?? rating.silhouette_proportions ?? 8,
      coherence_styling_score: rating.coherence_styling?.score ?? rating.coherence_styling ?? 8,
      overall_score: rating.overall ?? 8.0,
      improvement_tip: rating.improvement_tip || null,
    };
    console.log('[outfitService] Step 2: Inserting into outfit_ratings table...', ratingPayload);

    const { data: ratingData, error: ratingError } = await supabase
      .from('outfit_ratings')
      .insert(ratingPayload)
      .select();

    if (ratingError) {
      console.error('[outfitService] Step 2 ERROR: outfit_ratings insert failed:', ratingError);
      await supabase.from('outfits').delete().eq('id', outfit.id);
      throw new Error(`Failed to save outfit rating: ${ratingError.message || 'RLS permission error'}`);
    } else {
      console.log('[outfitService] Step 2 SUCCESS: outfit_ratings row created:', ratingData);
    }
  } else {
    console.log('[outfitService] Step 2 SKIPPED: No rating object provided.');
  }

  // Step 3: Insert tagged items into outfit_products table if present
  const validProducts = (taggedItems || []).filter(item => item && item.name && item.name.trim() !== '');
  console.log('[outfitService] Step 3: Valid tagged products count:', validProducts.length);

  if (validProducts.length > 0) {
    const productRows = validProducts.map(item => ({
      outfit_id: outfit.id,
      category: item.category || 'Uncategorized',
      name: item.name.trim(),
      price: item.price || null,
      link: item.link || null,
    }));
    console.log('[outfitService] Step 3: Inserting into outfit_products table...', productRows);

    const { data: productData, error: productsError } = await supabase
      .from('outfit_products')
      .insert(productRows)
      .select();

    if (productsError) {
      console.error('[outfitService] Step 3 ERROR: outfit_products insert failed:', productsError);
      console.warn('[outfitService] Tagged products failed to save, but outfit was published.');
    } else {
      console.log('[outfitService] Step 3 SUCCESS: outfit_products rows created:', productData);
    }
  } else {
    console.log('[outfitService] Step 3 SKIPPED: No valid tagged products.');
  }

  console.log('[outfitService] publishOutfit COMPLETED successfully, returning outfit:', outfit);
  return outfit;
}

// ── 4.2. Delete Outfit ────────────────────────────────────────────────────────
/**
 * Deletes an outfit and its associated ratings/products using poster_id.
 */
export const deleteOutfit = async (outfitId) => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("You must be logged in to delete a post.");
  }

  // 1. Delete associated rating row first (safety fallback)
  const { error: ratingDeleteErr } = await supabase
    .from('outfit_ratings')
    .delete()
    .eq('outfit_id', outfitId);

  if (ratingDeleteErr) {
    console.warn("[outfitService] Rating delete warning:", ratingDeleteErr.message);
  }

  // 2. Delete main outfit row using poster_id
  const { error: outfitDeleteErr } = await supabase
    .from('outfits')
    .delete()
    .eq('id', outfitId)
    .eq('poster_id', user.id);

  if (outfitDeleteErr) {
    console.error("[outfitService] Delete outfit failed:", outfitDeleteErr);
    throw new Error(`Failed to delete outfit: ${outfitDeleteErr.message}`);
  }

  return true;
};

// ── 4.5. Toggle Outfit Like ───────────────────────────────────────────────────
/**
 * Toggles like for an outfit. Inserts row into outfit_likes if not liked, deletes if liked.
 * Returns { liked: boolean }
 */
export async function toggleOutfitLike(outfitId, userId) {
  console.log('[outfitService] toggleOutfitLike called with:', {
    outfitId,
    outfitIdType: typeof outfitId,
    userId,
    userIdType: typeof userId
  });

  if (!outfitId || !userId) {
    console.error('[outfitService] Missing required parameters:', { outfitId, userId });
    throw new Error(`Missing required IDs: outfitId=${outfitId}, userId=${userId}`);
  }

  // Verify current Supabase session to detect stale/null JWT tokens
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  console.log('[outfitService] toggleOutfitLike session authUser id:', authUser?.id, 'passed userId:', userId);

  if (authError || !authUser) {
    console.error('[outfitService] toggleOutfitLike unauthenticated session error:', authError);
    throw new Error(`Authentication error: Your session may have expired. Please re-login to like posts (auth.uid is null).`);
  }

  const activeUserId = authUser.id;

  const { data: existing, error: checkError } = await supabase
    .from('outfit_likes')
    .select('id')
    .eq('outfit_id', outfitId)
    .eq('user_id', activeUserId)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('[outfitService] toggleOutfitLike check error:', {
      message: checkError.message,
      code: checkError.code,
      details: checkError.details,
      hint: checkError.hint,
      raw: checkError
    });
  }

  if (existing) {
    console.log('[outfitService] Removing like for outfit_likes id:', existing.id);
    const { error: deleteErr } = await supabase
      .from('outfit_likes')
      .delete()
      .eq('outfit_id', outfitId)
      .eq('user_id', activeUserId);

    if (deleteErr) {
      console.error('[outfitService] toggleOutfitLike delete error:', {
        message: deleteErr.message,
        code: deleteErr.code,
        details: deleteErr.details,
        hint: deleteErr.hint,
        raw: deleteErr
      });
      throw new Error(`Delete like failed (${deleteErr.code || 'ERR'}): ${deleteErr.message}${deleteErr.details ? ' - ' + deleteErr.details : ''}`);
    }
    return { liked: false };
  } else {
    console.log('[outfitService] Inserting like into outfit_likes:', { outfit_id: outfitId, user_id: activeUserId });
    const { error: insertErr } = await supabase
      .from('outfit_likes')
      .insert({
        outfit_id: outfitId,
        user_id: activeUserId,
      });

    if (insertErr) {
      console.error('[outfitService] toggleOutfitLike insert error:', {
        message: insertErr.message,
        code: insertErr.code,
        details: insertErr.details,
        hint: insertErr.hint,
        raw: insertErr
      });
      throw new Error(`Insert like failed (${insertErr.code || 'ERR'}): ${insertErr.message}${insertErr.details ? ' - ' + insertErr.details : ''}`);
    }
    return { liked: true };
  }
}

// ── 5. Fetch feed outfits ──────────────────────────────────────────────────────
/**
 * Fetches outfits from Supabase ordered by created_at DESC,
 * joined with profiles, outfit_ratings, outfit_products, and outfit_likes.
 */
export async function fetchFeedOutfits(currentUserId = null) {
  const { data: outfitsData, error: outfitsError } = await supabase
    .from('outfits')
    .select(`
      id,
      poster_id,
      image_url,
      city,
      caption,
      created_at,
      profiles:poster_id (
        username,
        avatar_url,
        city
      ),
      outfit_ratings (
        overall_score,
        improvement_tip,
        color_harmony_score,
        silhouette_proportions_score,
        coherence_styling_score
      ),
      outfit_comments (count)
    `)
    .order('created_at', { ascending: false });

  if (outfitsError) {
    console.error('[outfitService] fetchFeedOutfits error:', outfitsError);
    throw outfitsError;
  }

  if (!outfitsData || outfitsData.length === 0) return [];

  const outfitIds = outfitsData.map(o => o.id);

  // Fetch likes count and current user's liked status
  let likesCountMap = {};
  let userLikedSet = new Set();
  try {
    const { data: likesData, error: likesErr } = await supabase
      .from('outfit_likes')
      .select('outfit_id, user_id')
      .in('outfit_id', outfitIds);

    if (!likesErr && likesData) {
      likesData.forEach(row => {
        likesCountMap[row.outfit_id] = (likesCountMap[row.outfit_id] || 0) + 1;
        if (currentUserId && row.user_id === currentUserId) {
          userLikedSet.add(row.outfit_id);
        }
      });
    }
  } catch (err) {
    console.warn('[outfitService] outfit_likes query skipped:', err);
  }

  // Fetch comments count as robust fallback
  let commentsCountMap = {};
  try {
    const { data: commentsData, error: commErr } = await supabase
      .from('outfit_comments')
      .select('outfit_id')
      .in('outfit_id', outfitIds);

    if (!commErr && commentsData) {
      commentsData.forEach(row => {
        commentsCountMap[row.outfit_id] = (commentsCountMap[row.outfit_id] || 0) + 1;
      });
    }
  } catch (err) {
    console.warn('[outfitService] outfit_comments count fallback query skipped:', err);
  }

  // Attempt to fetch tagged products for these outfits
  let productsByOutfitId = {};
  try {
    const { data: productsData, error: prodErr } = await supabase
      .from('outfit_products')
      .select('*')
      .in('outfit_id', outfitIds);

    if (!prodErr && productsData) {
      productsData.forEach(p => {
        if (!productsByOutfitId[p.outfit_id]) {
          productsByOutfitId[p.outfit_id] = [];
        }
        productsByOutfitId[p.outfit_id].push(p);
      });
    }
  } catch (err) {
    console.warn('[outfitService] outfit_products query skipped:', err);
  }

  return outfitsData.map((item) => {
    const ratingObj = Array.isArray(item.outfit_ratings) ? item.outfit_ratings[0] : item.outfit_ratings;
    const profileObj = item.profiles;
    const rawUsername = profileObj?.username || 'anonymous';
    const usernameStr = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;
    const avatarUrl = profileObj?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop';
    
    if (!ratingObj) {
      console.warn(`[outfitService] Warning: Outfit ${item.id} has no rating row in outfit_ratings.`);
    }

    const scoreVal = ratingObj?.overall_score ?? ratingObj?.overall;
    const numericScore = scoreVal != null ? parseFloat(scoreVal) : null;
    const overallScoreStr = numericScore != null ? numericScore.toFixed(1) : 'N/A';
    const aiScoreStr = numericScore != null ? `${overallScoreStr}/10` : 'No Rating';

    const rawProds = productsByOutfitId[item.id] || [];
    const products = rawProds.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price || '$0.00',
      brand: p.category || 'DripMorph Affiliate',
      link: p.link || '',
      image: item.image_url,
    }));

    const likeCount = likesCountMap[item.id] || 0;
    const userHasLiked = userLikedSet.has(item.id);

    const countVal = (Array.isArray(item.outfit_comments) && item.outfit_comments.length > 0 && typeof item.outfit_comments[0].count === 'number')
      ? item.outfit_comments[0].count
      : (commentsCountMap[item.id] || 0);

    return {
      ...item,
      id: item.id,
      user_id: item.poster_id,
      username: usernameStr,
      user_avatar: avatarUrl,
      avatar: avatarUrl,
      location: item.city || profileObj?.city || 'Kolkata',
      image_url: item.image_url,
      image: item.image_url,
      score: aiScoreStr,
      aiScore: aiScoreStr,
      overall_score: numericScore,
      likes: likeCount,
      likes_count: likeCount,
      user_has_liked: userHasLiked,
      comments: countVal,
      comments_count: countVal,
      comment_count: countVal,
      caption: item.caption || '',
      created_at: item.created_at,
      postedAt: item.created_at,
      products: products,
    };
  });
}

// ── 6. Fetch user outfits ──────────────────────────────────────────────────────
/**
 * Fetches outfits for a specific user ID from Supabase.
 */
export async function fetchUserOutfits(userId, currentUserId = null) {
  console.log('[outfitService.fetchUserOutfits] Called with userId:', userId, 'currentUserId:', currentUserId);
  if (!userId) {
    console.warn('[outfitService.fetchUserOutfits] userId is null/undefined! Returning []');
    return [];
  }

  const { data: outfitsData, error: outfitsError } = await supabase
    .from('outfits')
    .select(`
      id,
      poster_id,
      image_url,
      city,
      caption,
      created_at,
      profiles:poster_id (
        username,
        avatar_url,
        city
      ),
      outfit_ratings (
        overall_score,
        improvement_tip,
        color_harmony_score,
        silhouette_proportions_score,
        coherence_styling_score
      ),
      outfit_comments (count)
    `)
    .eq('poster_id', userId)
    .order('created_at', { ascending: false });

  if (outfitsError) {
    console.error('[outfitService.fetchUserOutfits] Supabase query error:', outfitsError);
    return [];
  }

  console.log(`[outfitService.fetchUserOutfits] Supabase returned ${outfitsData?.length || 0} rows for poster_id = "${userId}":`, outfitsData);

  if (!outfitsData || outfitsData.length === 0) return [];

  const outfitIds = outfitsData.map(o => o.id);

  let likesCountMap = {};
  let userLikedSet = new Set();
  try {
    const { data: likesData, error: likesErr } = await supabase
      .from('outfit_likes')
      .select('outfit_id, user_id')
      .in('outfit_id', outfitIds);

    if (!likesErr && likesData) {
      likesData.forEach(row => {
        likesCountMap[row.outfit_id] = (likesCountMap[row.outfit_id] || 0) + 1;
        const targetUser = currentUserId || userId;
        if (targetUser && row.user_id === targetUser) {
          userLikedSet.add(row.outfit_id);
        }
      });
    }
  } catch (err) {
    console.warn('[outfitService] outfit_likes query error:', err);
  }

  let commentsCountMap = {};
  try {
    const { data: commentsData, error: commErr } = await supabase
      .from('outfit_comments')
      .select('outfit_id')
      .in('outfit_id', outfitIds);

    if (!commErr && commentsData) {
      commentsData.forEach(row => {
        commentsCountMap[row.outfit_id] = (commentsCountMap[row.outfit_id] || 0) + 1;
      });
    }
  } catch (err) {
    console.warn('[outfitService] outfit_comments count fallback query error:', err);
  }

  let productsByOutfitId = {};
  try {
    const { data: productsData, error: prodErr } = await supabase
      .from('outfit_products')
      .select('*')
      .in('outfit_id', outfitIds);

    if (!prodErr && productsData) {
      productsData.forEach(p => {
        if (!productsByOutfitId[p.outfit_id]) {
          productsByOutfitId[p.outfit_id] = [];
        }
        productsByOutfitId[p.outfit_id].push(p);
      });
    }
  } catch (err) {
    console.warn('[outfitService] outfit_products query error:', err);
  }

  return outfitsData.map((item) => {
    const ratingObj = Array.isArray(item.outfit_ratings) ? item.outfit_ratings[0] : item.outfit_ratings;
    const profileObj = item.profiles;
    const rawUsername = profileObj?.username || 'anonymous';
    const usernameStr = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;
    const avatarUrl = profileObj?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop';

    if (!ratingObj) {
      console.warn(`[outfitService] Warning: User outfit ${item.id} has no rating row in outfit_ratings.`);
    }

    const scoreVal = ratingObj?.overall_score ?? ratingObj?.overall;
    const numericScore = scoreVal != null ? parseFloat(scoreVal) : null;
    const overallScoreStr = numericScore != null ? numericScore.toFixed(1) : 'N/A';
    const aiScoreStr = numericScore != null ? `${overallScoreStr}/10` : 'No Rating';

    const rawProds = productsByOutfitId[item.id] || [];
    const products = rawProds.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price || '$0.00',
      brand: p.category || 'DripMorph Affiliate',
      link: p.link || '',
      image: item.image_url,
    }));

    const likeCount = likesCountMap[item.id] || 0;
    const userHasLiked = userLikedSet.has(item.id);

    const countVal = (Array.isArray(item.outfit_comments) && item.outfit_comments.length > 0 && typeof item.outfit_comments[0].count === 'number')
      ? item.outfit_comments[0].count
      : (commentsCountMap[item.id] || 0);

    return {
      ...item,
      id: item.id,
      user_id: item.poster_id,
      username: usernameStr,
      user_avatar: avatarUrl,
      avatar: avatarUrl,
      location: item.city || profileObj?.city || '',
      image_url: item.image_url,
      image: item.image_url,
      title: item.caption || 'Outfit Check',
      brands: products.length > 0 ? products.map(p => p.brand || p.name).join(' / ') : 'DripMorph Fit',
      score: overallScoreStr,
      aiScore: aiScoreStr,
      overall_score: numericScore,
      likes: likeCount,
      likes_count: likeCount,
      user_has_liked: userHasLiked,
      comments: countVal,
      comments_count: countVal,
      comment_count: countVal,
      caption: item.caption || '',
      created_at: item.created_at,
      postedAt: item.created_at,
      products: products,
    };
  });
}

// ── 7. Fetch Trending Fits ────────────────────────────────────────────────────
/**
 * Fetches outfits ranked by real like count descending,
 * with overall_score as a secondary tiebreaker.
 */
export async function fetchTrendingFits(limit = 50) {
  const queryLimit = Math.min(Math.max(limit, 1), 50);

  const { data, error } = await supabase
    .from('outfits')
    .select(`
      id,
      image_url,
      caption,
      created_at,
      poster_id,
      profiles:poster_id (
        username,
        avatar_url
      ),
      outfit_ratings (
        overall_score
      ),
      outfit_comments (count)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error("[outfitService] Error fetching trending fits:", error);
    return [];
  }

  if (!data || data.length === 0) return [];

  const outfitIds = data.map(o => o.id);

  let likesCountMap = {};
  try {
    const { data: likesData, error: likesErr } = await supabase
      .from('outfit_likes')
      .select('outfit_id')
      .in('outfit_id', outfitIds);

    if (!likesErr && likesData) {
      likesData.forEach(row => {
        likesCountMap[row.outfit_id] = (likesCountMap[row.outfit_id] || 0) + 1;
      });
    }
  } catch (err) {
    console.warn('[outfitService] outfit_likes query skipped in trending fits:', err);
  }

  const formatted = data.map(item => {
    const ratingObj = Array.isArray(item.outfit_ratings) ? item.outfit_ratings[0] : item.outfit_ratings;
    const profileObj = item.profiles;
    const rawUsername = profileObj?.username || 'anonymous';
    const usernameStr = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;

    if (!ratingObj) {
      console.warn(`[outfitService] Warning: Trending fit candidate ${item.id} has no overall_score.`);
    }

    const scoreVal = ratingObj?.overall_score;
    const numericScore = scoreVal != null ? parseFloat(scoreVal) : 0;
    const likesCount = likesCountMap[item.id] || 0;

    return {
      id: item.id,
      title: item.caption || 'Outfit Check',
      username: usernameStr,
      score: numericScore > 0 ? numericScore.toFixed(1) : 'N/A',
      overall_score: numericScore,
      likes_count: likesCount,
      image: item.image_url,
      outfit_ratings: ratingObj,
    };
  });

  return formatted
    .sort((a, b) => (b.likes_count - a.likes_count) || (b.overall_score - a.overall_score))
    .slice(0, queryLimit);
}

// ── 8. Fetch Top Creators by City ─────────────────────────────────────────────
/**
 * Fetches top creators ranked by average overall_score in a city.
 * Falls back gracefully to top creators globally if city has < limit creators.
 */
export async function fetchTopCreatorsByCity(city, limit = 50) {
  const queryLimit = Math.min(Math.max(limit, 1), 50);

  let query = supabase
    .from('profiles')
    .select(`
      id,
      username,
      avatar_url,
      city,
      outfits (
        id,
        outfit_ratings (
          overall_score
        )
      )
    `)
    .limit(50);

  if (city && city.trim() !== '') {
    query = query.ilike('city', `%${city.trim()}%`);
  }

  let { data, error } = await query;

  if (error || !data || data.length === 0) return [];

  const creators = data.map(profile => {
    const rawUsername = profile.username || 'anonymous';
    const usernameStr = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;
    const avatarUrl = profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop';

    const outfits = profile.outfits || [];
    let totalScore = 0;
    let count = 0;

    outfits.forEach(o => {
      const r = Array.isArray(o.outfit_ratings) ? o.outfit_ratings[0] : o.outfit_ratings;
      if (r && r.overall_score != null) {
        totalScore += parseFloat(r.overall_score);
        count++;
      }
    });

    const avgScoreNum = count > 0 ? totalScore / count : 0;
    return {
      id: profile.id,
      username: usernameStr,
      avatar: avatarUrl,
      city: profile.city || city || '',
      fitsCount: count,
      avgScoreNum,
      score: `${avgScoreNum > 0 ? avgScoreNum.toFixed(1) : '0.0'}/10`,
    };
  }).filter(creator => creator.fitsCount > 0 && creator.avgScoreNum > 0);

  creators.sort((a, b) => b.avgScoreNum - a.avgScoreNum);

  return creators.slice(0, queryLimit).map((creator, index) => ({
    ...creator,
    rank: index + 1,
  }));
}

// ── 9. Fetch Outfit Comments ──────────────────────────────────────────────────
/**
 * Fetches comments for an outfit ordered by created_at ASC,
 * joined with poster profiles info (username, avatar_url, full_name).
 */
export async function fetchComments(outfitId) {
  if (!outfitId) return [];

  const { data, error } = await supabase
    .from('outfit_comments')
    .select(`
      id,
      outfit_id,
      user_id,
      content,
      created_at,
      profiles:user_id (
        id,
        username,
        avatar_url
      )
    `)
    .eq('outfit_id', outfitId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error("[outfitService] Error fetching comments:", error);
    throw error;
  }

  return (data || []).map(c => {
    const prof = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
    const rawUsername = prof?.username || 'anonymous';
    const usernameStr = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;
    return {
      ...c,
      id: c.id,
      outfit_id: c.outfit_id,
      user_id: c.user_id,
      content: c.content,
      text: c.content,
      username: usernameStr,
      avatar: prof?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      user_avatar: prof?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      created_at: c.created_at,
    };
  });
}

// ── 10. Add Outfit Comment ────────────────────────────────────────────────────
/**
 * Inserts { outfit_id, user_id, content } into outfit_comments.
 * Returns inserted comment joined with user profile metadata.
 */
export async function addComment(outfitId, content) {
  console.log('[outfitService] addComment called with:', { outfitId, content });

  if (!outfitId || !content || !content.trim()) {
    throw new Error('Missing outfitId or comment content');
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('[outfitService] addComment auth error:', authError);
    throw new Error("You must be signed in to comment.");
  }

  const cleanContent = content.trim();

  const { data, error } = await supabase
    .from('outfit_comments')
    .insert([{
      outfit_id: outfitId,
      user_id: user.id,
      content: cleanContent,
    }])
    .select(`
      id,
      outfit_id,
      user_id,
      content,
      created_at,
      profiles:user_id (
        id,
        username,
        avatar_url
      )
    `)
    .single();

  if (error) {
    console.error("[outfitService] Error adding comment:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      raw: error
    });
    throw new Error(error.message || "Failed to post comment.");
  }

  const prof = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const rawUsername = prof?.username || user.email?.split('@')[0] || 'anonymous';
  const usernameStr = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;

  return {
    ...data,
    id: data.id,
    outfit_id: data.outfit_id,
    user_id: data.user_id,
    content: data.content,
    text: data.content,
    username: usernameStr,
    avatar: prof?.avatar_url || user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    user_avatar: prof?.avatar_url || user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    created_at: data.created_at,
  };
}

// ── 11. Delete Outfit Comment ─────────────────────────────────────────────────
/**
 * Deletes comment where id = commentId and user_id = auth.uid().
 */
export async function deleteComment(commentId) {
  if (!commentId) throw new Error('Missing commentId');

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('You must be logged in to delete comments.');
  }

  const { error } = await supabase
    .from('outfit_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[outfitService] deleteComment error:', error);
    throw new Error(`Failed to delete comment: ${error.message}`);
  }

  return true;
}

// ── 12. Fetch Leaderboard Creators (Weekly Monday Reset) ───────────────────────
/**
 * Calculates the UTC Date object for the current week's Monday at 00:00:00.000 UTC.
 * Automatically refreshes and resets the leaderboard every week on Monday.
 */
export function getWeeklyMondayCutoff() {
  const now = new Date();
  const day = now.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Fetches leaderboard creators ordered by avg_score DESC, then total_fits DESC.
 * Applies city filter if provided. Resets and refreshes every week on Monday.
 */
export async function fetchLeaderboard(cityOrOptions = null, limitParam = 50) {
  let city = null;
  let limit = 50;

  if (typeof cityOrOptions === 'object' && cityOrOptions !== null) {
    city = cityOrOptions.city || null;
    limit = cityOrOptions.limit || 50;
  } else {
    city = cityOrOptions;
    limit = limitParam || 50;
  }

  const queryLimit = Math.min(Math.max(limit, 1), 50);
  const mondayCutoff = getWeeklyMondayCutoff().toISOString();

  try {
    // Query outfits created in the current weekly cycle (since Monday 00:00:00 UTC)
    let query = supabase
      .from('outfits')
      .select(`
        id,
        image_url,
        created_at,
        poster_id,
        city,
        profiles:poster_id (id, username, avatar_url, city),
        outfit_ratings (overall_score)
      `)
      .gte('created_at', mondayCutoff)
      .order('created_at', { ascending: false });

    let { data: outfits, error } = await query;
    if (error || !outfits) {
      console.error("[outfitService] Error fetching outfits for leaderboard:", error);
      return [];
    }

    // Robust city filtering logic: check submission-locked outfit city first, then profile city
    let filteredOutfits = outfits;
    if (city && city.trim() !== '') {
      const searchCity = city.trim().toLowerCase();
      filteredOutfits = outfits.filter(o => {
        const outfitCity = o.city ? o.city.trim().toLowerCase() : '';
        const prof = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
        const profileCity = prof?.city ? prof.city.trim().toLowerCase() : '';
        return outfitCity.includes(searchCity) || profileCity.includes(searchCity);
      });
    }

    // Aggregate per user and track highest scoring outfit photo
    const userMap = {};
    filteredOutfits.forEach(o => {
      const prof = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
      if (!prof || !prof.id) return;

      const r = Array.isArray(o.outfit_ratings) ? o.outfit_ratings[0] : o.outfit_ratings;
      const score = r?.overall_score != null ? parseFloat(r.overall_score) : 0;

      if (!userMap[prof.id]) {
        const rawUsername = prof.username || 'anonymous';
        const usernameStr = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;
        const avatarUrl = prof.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop';

        userMap[prof.id] = {
          user_id: prof.id,
          username: usernameStr,
          avatar_url: avatarUrl,
          avatar: avatarUrl,
          user_avatar: avatarUrl,
          city: prof.city || 'Global',
          total_fits: 0,
          total_score: 0,
          top_outfit_image: o.image_url,
          highest_score: score,
        };
      }

      userMap[prof.id].total_fits += 1;
      userMap[prof.id].total_score += score;

      // Keep the photo of the creator's highest scoring outfit
      if (score >= userMap[prof.id].highest_score && o.image_url) {
        userMap[prof.id].top_outfit_image = o.image_url;
        userMap[prof.id].highest_score = score;
      }
    });

    return Object.values(userMap)
      .map(u => {
        const avgNum = u.total_fits > 0 ? parseFloat((u.total_score / u.total_fits).toFixed(1)) : 0.0;
        const topImage = u.top_outfit_image || u.avatar_url;
        return {
          id: u.user_id,
          user_id: u.user_id,
          username: u.username,
          avatar: u.avatar,
          avatar_url: u.avatar_url,
          user_avatar: u.avatar_url,
          city: u.city,
          total_fits: u.total_fits,
          fitsCount: u.total_fits,
          avg_score: avgNum,
          score: avgNum > 0 ? avgNum.toFixed(1) : '0.0',
          image: topImage,
          outfit_image: topImage,
        };
      })
      .sort((a, b) => (b.avg_score - a.avg_score) || (b.total_fits - a.total_fits))
      .slice(0, queryLimit)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  } catch (err) {
    console.error("[outfitService] Error in fetchLeaderboard:", err);
    return [];
  }
}

// ── 9. Fetch Profile by User ID or Username ─────────────────────────────────
/**
 * Fetches a user's profile row from Supabase profiles table by user ID or username.
 */
export async function fetchUserProfile(identifier) {
  if (!identifier) return null;

  try {
    let query = supabase.from('profiles').select('*');

    let id = typeof identifier === 'object' ? (identifier.poster_id || identifier.user_id || identifier.id) : null;
    let username = typeof identifier === 'object' ? (identifier.username || identifier.name) : (typeof identifier === 'string' ? identifier : null);

    if (id) {
      query = query.eq('id', id);
    } else if (username) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username)) {
        query = query.eq('id', username);
      } else {
        const clean = username.trim().replace(/^@/, '');
        query = query.ilike('username', clean);
      }
    } else {
      return null;
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error('[outfitService] fetchUserProfile error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[outfitService] fetchUserProfile exception:', err);
    return null;
  }
}
