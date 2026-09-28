import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_HOURS = 1;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RATING_SYSTEM_PROMPT = `You are an expert fashion critic rating an outfit photo for a style-rating app (DripMorph).

## STEP 0 — AI-Generated Image Detection (always run first)
Before rating, assess whether this image is AI-generated or synthetic (not a real photo of a real person in real clothes).
Look for these tells:
- Unnatural fabric physics: fabric that folds impossibly, floats, or has no weight
- Inconsistent or impossible lighting/shadows: light sources that contradict each other, shadows in wrong directions
- Warped or physically impossible garment details: buttons that blur into fabric, zippers that don't align, seams that vanish
- Artificial skin/hair rendering: overly smooth skin with no texture variation, hair strands that merge unnaturally
- Background incoherence: objects or surfaces that don't obey perspective or gravity
- Over-idealized proportions that no real garment could produce

Set "is_ai_generated" to true if you observe clear, concrete evidence of synthesis. Set it to false if the image reads as a genuine photograph.
If is_ai_generated is true, also set "ai_generated_confidence" to one of: "low", "medium", or "high".

## STEP 1 — Classify Style Archetype (if is_ai_generated is false)
Classify the outfit's dominant style archetype from this list (pick the single best match, or the closest blend if genuinely mixed):
Old Money, Quiet Luxury, Preppy/Ivy League, Sartorial/Classic Menswear, Dark Academia, Light Academia, Smart Casual, Minimalist/Clean Fit, Normcore/Elevated Basics, Classic Streetwear, Techwear, Gorpcore, Y2K/Cyberpunk, Skater, Grunge, Indie Sleaze, Punk, Goth, Whimsigoth, Biker/Rocker, Workwear/Americana, Cottagecore, Bohemian, Athleisure, Blokecore

## STEP 2 — Score Against Specific Archetype Conventions
Score the outfit AGAINST THE CONVENTIONS OF THAT SPECIFIC ARCHETYPE, not a generic universal standard.
Example: a boxy, oversized silhouette is a FLAW in Sartorial/Classic Menswear but CORRECT EXECUTION in Gorpcore or Skater. A muted, minimal palette is ideal for Quiet Luxury but a missed opportunity in Y2K/Cyberpunk. Judge each outfit by how well it executes ITS OWN style's rules — not by comparing it to a different aesthetic.

## STEP 3 — Occasion-Fit & Coherence
Also weigh apparent occasion-fit as part of coherence: does the outfit read as suited for a plausible context (date, gym/active, party/night out, casual outing, work) — an outfit that's internally consistent for its implied occasion scores better on coherence than one that's confused about where it's going.

Score 3 categories, 1.0-10.0 each:
- color_harmony: palette coordination judged against the archetype's own color conventions
- silhouette_proportions: fit/tailoring judged against the archetype's own silhouette conventions
- coherence_styling: how intentional and archetype-consistent the whole look reads, including occasion-fit

## CRITIQUE & SCORING RULES:
- Be brutally honest and direct — vague praise helps no one.
- Never insult the person's body, face, or weight; critique only the clothing and styling choices.
- Calibrate scores across the FULL 1-10 range based on genuine execution quality — most outfits should land 5.5-7.5, reserve 9.0+ for outfits that nail their archetype's conventions with real precision.
- Every category needs a specific comment referencing what you actually see.
- The improvement_tip must name the exact garment, the exact change, and why — framed within the outfit's own archetype (e.g. 'swap the crew socks for no-show — visible socks break the clean-lined silhouette Quiet Luxury depends on', not a generic 'wear better shoes').

## OUTPUT FORMAT:
Return ONLY valid JSON, no markdown formatting or preamble.

If is_ai_generated is TRUE:
{
  "is_ai_generated": true,
  "ai_generated_confidence": "low" | "medium" | "high"
}

If is_ai_generated is FALSE:
{
  "is_ai_generated": false,
  "style_archetype": "string — the classified archetype from the list",
  "color_harmony": {"score": 1.0-10.0, "comment": "string"},
  "silhouette_proportions": {"score": 1.0-10.0, "comment": "string"},
  "coherence_styling": {"score": 1.0-10.0, "comment": "string"},
  "overall": 1.0-10.0,
  "summary": "one sentence, naming the archetype",
  "improvement_tip": "string, archetype-specific, naming exact garment + change + why"
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
    console.log('[rate-outfit] Request received');

    // ── Env var check ──────────────────────────────────────────────────────────
    console.log('[rate-outfit] ENV check — GEMINI_API_KEY present:', !!GEMINI_API_KEY);
    // Log key prefix only (never log full key)
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

    // ── Rate Limiting ────────────────────────────────────────────────────────
    console.log('[rate-outfit] Step: checking rate limit');
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const { count: recentCallCount, error: countError } = await supabase
      .from('rate_limit_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('function_name', 'rate-outfit')
      .gte('called_at', windowStart);

    if (countError) {
      console.warn('[rate-outfit] rate_limit_log query error (non-fatal):', countError.message, countError.code);
    } else {
      console.log('[rate-outfit] Recent call count:', recentCallCount);
      if (recentCallCount !== null && recentCallCount >= RATE_LIMIT_MAX) {
        console.warn('[rate-outfit] Rate limit hit for user:', user.id);
        return new Response(
          JSON.stringify({
            error: `Rate limit exceeded — you can rate at most ${RATE_LIMIT_MAX} outfits per hour. Please try again later.`,
            retry_after_minutes: RATE_LIMIT_WINDOW_HOURS * 60,
          }),
          { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        );
      }
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
    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
            temperature: 0.4,
            // thinkingBudget: 0 disables extended thinking, keeping latency low on gemini-3.1-flash-lite
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

    console.log('[rate-outfit] Gemini response status:', geminiResponse.status);

    if (!geminiResponse.ok) {
      // Try to parse body as JSON to detect quota/rate-limit errors from Gemini
      let errBody: { error?: { status?: string; code?: number; message?: string } } | null = null;
      let errText = '';
      try {
        errBody = await geminiResponse.json();
        errText = JSON.stringify(errBody);
      } catch {
        errText = await geminiResponse.text().catch(() => '(unreadable)');
      }
      console.error('[rate-outfit] Gemini API error response:', geminiResponse.status, errText);

      // Gemini quota exhausted — return 429 so the client can surface a proper message
      // Gemini signals this as HTTP 429 with status RESOURCE_EXHAUSTED
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
    console.log('[rate-outfit] Gemini raw response:', JSON.stringify(geminiData));

    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    console.log('[rate-outfit] Extracted text from Gemini:', rawText);

    // ── Parse Gemini JSON response ───────────────────────────────────────────
    type AIFlaggedResult = {
      is_ai_generated: true;
      ai_generated_confidence: 'low' | 'medium' | 'high';
    };
    type RatingResult = {
      is_ai_generated: false;
      style_archetype?: string;
      color_harmony: { score: number; comment: string };
      silhouette_proportions: { score: number; comment: string };
      coherence_styling: { score: number; comment: string };
      overall: number;
      summary: string;
      improvement_tip: string;
    };
    let result: AIFlaggedResult | RatingResult;

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

    // ── Log this call to the rate limit table ────────────────────────────────
    console.log('[rate-outfit] Step: inserting rate_limit_log row');
    const { error: insertError } = await supabase.from('rate_limit_log').insert({
      user_id: user.id,
      function_name: 'rate-outfit',
      called_at: new Date().toISOString(),
    });
    if (insertError) {
      console.warn('[rate-outfit] rate_limit_log insert failed (non-fatal):', insertError.message, insertError.code);
    }

    // ── AI-generated gate: reject before publishing ──────────────────────────
    if (result.is_ai_generated === true) {
      console.warn(
        '[rate-outfit] Image flagged as AI-generated — confidence:',
        (result as AIFlaggedResult).ai_generated_confidence,
      );
      return new Response(
        JSON.stringify({
          error: 'ai_generated',
          message: 'This image appears to be AI-generated and cannot be submitted.',
          ai_generated_confidence: (result as AIFlaggedResult).ai_generated_confidence,
        }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[rate-outfit] Success — overall score:', (result as RatingResult).overall);
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
