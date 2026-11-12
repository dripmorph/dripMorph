import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

const RATE_LIMIT_MAX = 2; // 2 pics
const RATE_LIMIT_WINDOW_MINUTES = 20; // 20-minute cooldown
const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

// In-memory caller timestamp cache (persists within warm Deno isolates across requests)
const userCallHistory = new Map<string, number[]>();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RATING_SYSTEM_PROMPT = `You are DripMorph's outfit rater. You rate ONE outfit photo honestly but constructively. Never mock, never comment on body, face or skin. Judge clothes only.

STEP 0 - AI IMAGE CHECK
If the image looks AI-generated, return {"rejected": true, "reason": "ai_generated"} and nothing else.

STEP 1 - VISIBILITY
Decide how much of the outfit is visible:
- "full": head to shoes visible
- "partial": cut off at waist/thigh/knee, or footwear not visible
- "upper_only": torso and above only

STEP 2 - SCORE THE VISIBLE OUTFIT (1.0 to 10.0, one decimal)
Judge the fit of the VISIBLE garments first: shoulders, sleeves, length, drape, layering. A well-fitted visible outfit must still score well.
- color_harmony: palette, contrast, tone matching, accessories
- silhouette_proportions: fit, shape, balance of what is visible
- coherence_styling: does it feel like one intentional look (occasion, layering, accessories, grooming of the outfit)

SCORING CALIBRATION (important):
- Score like a friendly but honest stylist, not a harsh judge.
- Most intentional, put-together outfits should land 6.0-7.5.
- Reserve below 5.0 for outfits with clear clashes, poor fit, or no visible effort.
- 5.0 = "average, nothing wrong but nothing intentional".
- Give credit for: layering, tonal/monochrome palettes, good accessories,
  intentional proportions (e.g. wide trousers with a fitted top), and confident styling.
- Pose, lighting and photo quality must NOT lower the score.
- Do not subtract points for minimalism. Simple and clean outfits can score 7+.
- 9.0+ stays reserved for truly exceptional outfits.
- The weakest category drives the improvement_tip, but keep the tone encouraging
  and non-mocking. Never body-shame.
- Reference: black knit + white shirt layered + wide trousers + watch = ~6.5-7.0.

STEP 3 - VISIBILITY DEDUCTION (apply after Step 2)
- full: no deduction
- partial: silhouette_proportions -0.8, coherence_styling -0.3
- upper_only: silhouette_proportions -1.5, coherence_styling -0.5
Never push a category below 4.0 because of this deduction alone.
Do not invent or assume what the hidden lower half looks like.

STEP 4 - OVERALL
overall = average of the three final category scores, rounded to 1 decimal.

STEP 5 - FEEDBACK
- style_archetype: dominant style archetype (e.g. Classic Streetwear, Minimalist, Old Money, Techwear, Smart Casual, Y2K/Cyberpunk, Preppy, Grunge, Athleisure, etc.)
- summary: 1-2 honest, non-mocking sentences about the look.
- improvement_tip: tied to the lowest-scoring category. Name the exact garment, the exact change, and why it helps. If visibility is not "full", the tip must also ask the user to post a full-body photo (pants and shoes visible) for a fairer rating.

OUTPUT: return ONLY valid JSON matching the schema, no markdown, no extra text.`;

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
    console.log('[rate-outfit] Request received');

    // ── Env var check ──────────────────────────────────────────────────────────
    console.log('[rate-outfit] ENV check — GEMINI_API_KEY present:', !!GEMINI_API_KEY);
    if (GEMINI_API_KEY) {
      console.log('[rate-outfit] GEMINI_API_KEY prefix:', GEMINI_API_KEY.slice(0, 8) + '...');
    }
    console.log('[rate-outfit] ENV check — SUPABASE_URL present:', !!SUPABASE_URL);
    console.log('[rate-outfit] ENV check — SUPABASE_SERVICE_ROLE_KEY present:', !!SUPABASE_SERVICE_ROLE_KEY);

    if (!GEMINI_API_KEY) {
      console.error('[rate-outfit] FATAL: GEMINI_API_KEY is not set');
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // ── Auth JWT Verification ────────────────────────────────────────────────
    console.log('[rate-outfit] Step: auth — verifying JWT');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[rate-outfit] Auth failed: missing/malformed Authorization header');
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      console.error('[rate-outfit] Auth failed:', authError?.message ?? 'user is null');
      return new Response(JSON.stringify({ error: 'Unauthorized — invalid JWT' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    console.log('[rate-outfit] Auth OK — user:', user.id);

    // ── Rate Limiting (20-min cooldown for every 2 pics) ─────────────────────
    console.log('[rate-outfit] Step: checking rate limit (2 pics per 20 minutes)');
    const now = Date.now();
    const windowStartMs = now - RATE_LIMIT_WINDOW_MS;
    const windowStartIso = new Date(windowStartMs).toISOString();

    // 1. Check in-memory history
    const userTimestamps = (userCallHistory.get(user.id) || []).filter(
      (t) => t > windowStartMs,
    );
    userCallHistory.set(user.id, userTimestamps);

    // 2. Query rate_limit_log table if present
    const { data: dbLogRows, count: recentCallCount, error: countError } = await supabase
      .from('rate_limit_log')
      .select('called_at', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('function_name', 'rate-outfit')
      .gte('called_at', windowStartIso)
      .order('called_at', { ascending: true });

    let effectiveCount = userTimestamps.length;
    let earliestCallMs = userTimestamps[0] || (now - RATE_LIMIT_WINDOW_MS);

    if (!countError && dbLogRows && dbLogRows.length > 0) {
      effectiveCount = Math.max(effectiveCount, dbLogRows.length);
      const dbEarliest = new Date(dbLogRows[0].called_at).getTime();
      earliestCallMs = Math.min(earliestCallMs, dbEarliest);
    }

    if (effectiveCount >= RATE_LIMIT_MAX) {
      const remainingMs = Math.max(0, earliestCallMs + RATE_LIMIT_WINDOW_MS - now);
      const retryAfterSeconds = Math.ceil(remainingMs / 1000);
      console.warn(
        `[rate-outfit] Cooldown active for user ${user.id}: ${effectiveCount}/${RATE_LIMIT_MAX} ratings in last 20m. Remaining: ${retryAfterSeconds}s`,
      );
      return new Response(
        JSON.stringify({
          error: `Cooldown active — you can rate at most 2 outfits every 20 minutes. Please wait before rating another outfit.`,
          code: 'RATE_LIMITED',
          retry_after_seconds: retryAfterSeconds,
          retry_after_minutes: Math.ceil(retryAfterSeconds / 60),
          cooldown_until: new Date(now + remainingMs).toISOString(),
        }),
        { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // ── Parse Request Body ───────────────────────────────────────────────────
    console.log('[rate-outfit] Step: parsing request body');
    let imageUrl: string;
    try {
      const body = await req.json();
      imageUrl = body?.image_url;
      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('image_url is required and must be a string');
      }
    } catch (err) {
      console.error('DETAILED ERROR:', err.message, err.stack);
      return new Response(JSON.stringify({ error: `Invalid request body: ${err.message}` }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    console.log('[rate-outfit] image_url:', imageUrl);

    // ── Fetch image bytes ────────────────────────────────────────────────────
    console.log('[rate-outfit] Step: fetching image bytes from URL');
    let imageBase64: string;
    let imageMimeType: string;
    try {
      const imgResponse = await fetch(imageUrl);
      console.log('[rate-outfit] Image fetch status:', imgResponse.status, imgResponse.statusText);
      if (!imgResponse.ok) {
        throw new Error(`Could not fetch image: HTTP ${imgResponse.status} ${imgResponse.statusText}`);
      }
      const contentType = imgResponse.headers.get('content-type') ?? 'image/jpeg';
      imageMimeType = contentType.split(';')[0].trim();
      console.log('[rate-outfit] Image MIME type:', imageMimeType);
      const arrayBuffer = await imgResponse.arrayBuffer();
      console.log('[rate-outfit] Image size (bytes):', arrayBuffer.byteLength);

      // Chunked conversion to avoid "Maximum call stack size exceeded" on large images
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const CHUNK_SIZE = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
      }
      imageBase64 = btoa(binary);
      console.log('[rate-outfit] Base64 encoding done, length:', imageBase64.length);
    } catch (err) {
      console.error('DETAILED ERROR:', err.message, err.stack);
      return new Response(JSON.stringify({ error: `Failed to fetch image: ${err.message}` }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // ── Gemini API call ──────────────────────────────────────────────────────
    console.log('[rate-outfit] Step: calling Gemini API');
    const geminiUrl = `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`;
    console.log('[rate-outfit] Gemini URL (key masked):', geminiUrl.replace(GEMINI_API_KEY!, 'REDACTED'));
    let geminiResponse!: Response;

    const requestPayload = {
      system_instruction: {
        parts: [{ text: RATING_SYSTEM_PROMPT }],
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
              text: 'Rate the outfit in this image.',
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        topK: 1,
        topP: 0,
        seed: 42,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            rejected: {
              type: 'BOOLEAN',
              description: 'True if image is AI-generated, false otherwise.',
            },
            reason: {
              type: 'STRING',
              description: 'Reason if rejected is true (e.g. ai_generated).',
            },
            visibility: {
              type: 'STRING',
              enum: ['full', 'partial', 'upper_only'],
              description: 'Visibility level of the outfit: full, partial, or upper_only.',
            },
            style_archetype: {
              type: 'STRING',
              description: 'Dominant style archetype (e.g. Classic Streetwear, Minimalist, Old Money, etc.).',
            },
            color_harmony: {
              type: 'NUMBER',
              description: 'Color harmony score between 1.0 and 10.0',
            },
            silhouette_proportions: {
              type: 'NUMBER',
              description: 'Silhouette and proportions score between 1.0 and 10.0',
            },
            coherence_styling: {
              type: 'NUMBER',
              description: 'Coherence and styling score between 1.0 and 10.0',
            },
            overall: {
              type: 'NUMBER',
              description: 'Overall score between 1.0 and 10.0',
            },
            summary: {
              type: 'STRING',
              description: '1-2 honest, non-mocking sentences about the look.',
            },
            improvement_tip: {
              type: 'STRING',
              description: 'Improvement tip tied to lowest-scoring category.',
            },
          },
          required: ['rejected'],
        },
      },
    };

    try {
      const MAX_RETRIES = 3;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        });

        if (geminiResponse.status === 503 && attempt < MAX_RETRIES) {
          console.warn(`[rate-outfit] Gemini 503 spike on attempt ${attempt}. Retrying in ${attempt * 1500}ms...`);
          await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
          continue;
        }
        break;
      }
    } catch (err) {
      console.error('DETAILED ERROR:', err.message, err.stack);
      return new Response(JSON.stringify({ error: `Failed to reach Gemini API: ${err.message}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    console.log('[rate-outfit] Gemini response status:', geminiResponse.status);

    if (!geminiResponse.ok) {
      let errBody: { error?: { status?: string; code?: number; message?: string } } | null = null;
      let errText = '';
      try {
        errBody = await geminiResponse.json();
        errText = JSON.stringify(errBody);
      } catch {
        errText = await geminiResponse.text().catch(() => '(unreadable)');
      }
      console.error('[rate-outfit] Gemini API error response:', geminiResponse.status, errText);

      if (
        geminiResponse.status === 429 ||
        errBody?.error?.status === 'RESOURCE_EXHAUSTED'
      ) {
        console.warn('[rate-outfit] Gemini quota/rate-limit hit — returning 429 to client');
        return new Response(
          JSON.stringify({
            error: 'gemini_quota',
            message: 'AI rating is temporarily unavailable due to quota limits. Please try again in a moment.',
          }),
          { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ error: `Gemini API error ${geminiResponse.status}: ${errText}` }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const geminiData = await geminiResponse.json();
    console.log('[rate-outfit] FULL RAW GEMINI RESPONSE:', JSON.stringify(geminiData, null, 2));

    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    console.log('[rate-outfit] Extracted text from Gemini:', rawText);

    // ── Parse Gemini JSON response ───────────────────────────────────────────
    type ParsedResult = {
      rejected?: boolean;
      reason?: string;
      is_ai_generated?: boolean;
      visibility?: 'full' | 'partial' | 'upper_only';
      style_archetype?: string;
      color_harmony?: number | { score: number; comment?: string };
      silhouette_proportions?: number | { score: number; comment?: string };
      coherence_styling?: number | { score: number; comment?: string };
      overall?: number;
      summary?: string;
      improvement_tip?: string;
    };

    let result: ParsedResult;
    try {
      result = JSON.parse(rawText);
    } catch (err) {
      console.error('DETAILED ERROR:', err.message, err.stack);
      console.error('[rate-outfit] Raw text that failed to parse:', rawText);
      return new Response(
        JSON.stringify({ error: 'Failed to parse Gemini response as JSON', raw: rawText }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // ── AI-generated gate: reject before publishing ──────────────────────────
    if (result.rejected === true || result.is_ai_generated === true) {
      console.warn('[rate-outfit] Image rejected as AI-generated:', result.reason || 'ai_generated');
      return new Response(
        JSON.stringify({
          error: 'ai_generated',
          message: 'This image appears to be AI-generated and cannot be submitted.',
          ai_generated_confidence: 'high',
        }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // ── Edge Function safety net (do not trust model arithmetic) ─────────────
    const VIS = ['full', 'partial', 'upper_only'];
    const clamp = (n: number) => Math.min(10, Math.max(4.0, Number(n.toFixed(1))));
    const r1 = (n: number) => Math.round(n * 10) / 10;

    const extractNum = (val: unknown): number => {
      if (typeof val === 'number' && !isNaN(val)) return val;
      if (typeof val === 'object' && val !== null && 'score' in val) {
        const s = Number((val as { score: unknown }).score);
        return !isNaN(s) ? s : 6.0;
      }
      const parsed = Number(val);
      return !isNaN(parsed) ? parsed : 6.0;
    };

    const visibility = (result.visibility && VIS.includes(result.visibility)) ? result.visibility : 'full';
    const color = clamp(extractNum(result.color_harmony));
    const sil = clamp(extractNum(result.silhouette_proportions));
    const coh = clamp(extractNum(result.coherence_styling));

    // Recompute overall server-side with clamp
    const overall = clamp(r1((color + sil + coh) / 3));

    // ── Log this call to cooldown history ──────────────────────────────────
    console.log('[rate-outfit] Step: updating cooldown call history');
    const activeCalls = (userCallHistory.get(user.id) || []).filter(
      (t) => t > Date.now() - RATE_LIMIT_WINDOW_MS,
    );
    activeCalls.push(Date.now());
    userCallHistory.set(user.id, activeCalls);

    const { error: insertError } = await supabase.from('rate_limit_log').insert({
      user_id: user.id,
      function_name: 'rate-outfit',
      called_at: new Date().toISOString(),
    });
    if (insertError) {
      console.warn('[rate-outfit] rate_limit_log insert notice (non-fatal):', insertError.message, insertError.code);
    }

    const finalResponse = {
      rejected: false,
      visibility,
      style_archetype: result.style_archetype || 'Classic Streetwear',
      color_harmony: { score: color, comment: '' },
      silhouette_proportions: { score: sil, comment: '' },
      coherence_styling: { score: coh, comment: '' },
      color_harmony_score: color,
      silhouette_proportions_score: sil,
      coherence_styling_score: coh,
      overall,
      summary: result.summary || '',
      improvement_tip: result.improvement_tip || '',
    };

    console.log(
      '[rate-outfit] Success — visibility:',
      visibility,
      '| style_archetype:',
      finalResponse.style_archetype,
      '| overall score:',
      overall,
    );
    return new Response(JSON.stringify(finalResponse), {
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
