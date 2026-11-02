import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODERATION_SYSTEM_PROMPT = `You are a content moderation system. Your ONLY job is a safety pass/fail check.

Evaluate whether the image is appropriate for a college outfit-rating app by checking ALL of the following:
1. The image must contain real clothing being worn by a person.
2. The image must NOT contain explicit, sexual, or NSFW content.
3. The image must NOT be irrelevant (e.g. landscapes, food, animals, memes, screenshots, objects without clothing).

Do NOT comment on style, quality, trends, or aesthetics — that is not your job.

Return ONLY valid JSON in this exact format, no preamble:
{
  "is_appropriate": true or false,
  "reason": "string explaining why if false, empty string if true"
}`;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // ── Top-level try/catch: catches any unexpected error anywhere in the handler ──
  try {
    console.log('[moderate-image] Request received');

    // ── Env var check ──────────────────────────────────────────────────────────
    console.log('[moderate-image] ENV check — GEMINI_API_KEY present:', !!GEMINI_API_KEY);
    // Log key prefix only (never log full key)
    if (GEMINI_API_KEY) {
      console.log('[moderate-image] GEMINI_API_KEY prefix:', GEMINI_API_KEY.slice(0, 8) + '...');
    }
    console.log('[moderate-image] ENV check — SUPABASE_URL present:', !!SUPABASE_URL);
    console.log('[moderate-image] ENV check — SUPABASE_SERVICE_ROLE_KEY present:', !!SUPABASE_SERVICE_ROLE_KEY);

    if (!GEMINI_API_KEY) {
      console.error('[moderate-image] FATAL: GEMINI_API_KEY is not set');
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // ── Auth JWT Verification ────────────────────────────────────────────────
    console.log('[moderate-image] Step: auth — verifying JWT');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[moderate-image] Auth failed: missing/malformed Authorization header');
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      console.error('[moderate-image] Auth failed:', authError?.message ?? 'user is null');
      return new Response(JSON.stringify({ error: 'Unauthorized — invalid JWT' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    console.log('[moderate-image] Auth OK — user:', user.id);

    // ── Parse Request Body ───────────────────────────────────────────────────
    console.log('[moderate-image] Step: parsing request body');
    let imageUrl: string;
    try {
      const body = await req.json();
      imageUrl = body?.image_url;
      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('image_url is required and must be a string');
      }
    } catch (err) {
      console.error('[moderate-image] Body parse error:', err.message, err.stack);
      return new Response(JSON.stringify({ error: `Invalid request body: ${err.message}` }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    console.log('[moderate-image] image_url:', imageUrl);

    // ── Fetch image bytes ────────────────────────────────────────────────────
    console.log('[moderate-image] Step: fetching image bytes from URL');
    let imageBase64: string;
    let imageMimeType: string;
    try {
      const imgResponse = await fetch(imageUrl);
      console.log('[moderate-image] Image fetch status:', imgResponse.status, imgResponse.statusText);
      if (!imgResponse.ok) {
        throw new Error(`Could not fetch image: HTTP ${imgResponse.status} ${imgResponse.statusText}`);
      }
      const contentType = imgResponse.headers.get('content-type') ?? 'image/jpeg';
      imageMimeType = contentType.split(';')[0].trim();
      console.log('[moderate-image] Image MIME type:', imageMimeType);
      const arrayBuffer = await imgResponse.arrayBuffer();
      console.log('[moderate-image] Image size (bytes):', arrayBuffer.byteLength);

      // Chunked conversion to avoid "Maximum call stack size exceeded" on large images
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const CHUNK_SIZE = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
      }
      imageBase64 = btoa(binary);
      console.log('[moderate-image] Base64 encoding done, length:', imageBase64.length);
    } catch (err) {
      console.error('DETAILED ERROR:', err.message, err.stack);
      return new Response(JSON.stringify({ error: `Failed to fetch image: ${err.message}` }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // ── Gemini API call ──────────────────────────────────────────────────────
    console.log('[moderate-image] Step: calling Gemini API');
    const geminiUrl = `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`;
    console.log('[moderate-image] Gemini URL (key masked):', geminiUrl.replace(GEMINI_API_KEY!, 'REDACTED'));
    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: MODERATION_SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inline_data: {
                    mime_type: imageMimeType,
                    data: imageBase64,
                  },
                },
                {
                  text: 'Perform a content moderation check on this image.',
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.0,
            // thinkingBudget: 0 disables thinking mode, required for reliable JSON output on 2.5 Flash-Lite
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: 'application/json',
          },
        }),
      });
    } catch (err) {
      console.error('DETAILED ERROR:', err.message, err.stack);
      return new Response(JSON.stringify({ error: `Failed to reach Gemini API: ${err.message}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    console.log('[moderate-image] Gemini response status:', geminiResponse.status);

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('[moderate-image] Gemini API error response:', geminiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `Gemini API error ${geminiResponse.status}: ${errText}` }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const geminiData = await geminiResponse.json();
    console.log('[moderate-image] Gemini raw response:', JSON.stringify(geminiData));

    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    console.log('[moderate-image] Extracted text from Gemini:', rawText);

    // ── Parse Gemini JSON response ───────────────────────────────────────────
    let result: { is_appropriate: boolean; reason: string };
    try {
      result = JSON.parse(rawText);
    } catch (err) {
      console.error('DETAILED ERROR:', err.message, err.stack);
      console.error('[moderate-image] Raw text that failed to parse:', rawText);
      return new Response(
        JSON.stringify({ error: 'Failed to parse Gemini response as JSON', raw: rawText }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[moderate-image] Success — result:', JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    // ── Catch-all: any unhandled exception ────────────────────────────────────
    console.error('DETAILED ERROR:', err.message, err.stack);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
