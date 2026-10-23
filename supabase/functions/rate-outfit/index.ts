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

const RATING_SYSTEM_PROMPT = `You are an expert fashion critic rating an outfit photo for a style-rating app (DripMorph).

## STEP 0A — AI-Generated Image Detection (always check first)
Before rating, assess whether this image is AI-generated or synthetic (not a real photo of a real person in real clothes).
Look for these tells:
- Unnatural fabric physics: fabric that folds impossibly, floats, or has no weight
- Inconsistent or impossible lighting/shadows: light sources that contradict each other, shadows in wrong directions
- Warped or physically impossible garment details: buttons that blur into fabric, zippers that don't align, seams that vanish
- Artificial skin/hair rendering: overly smooth skin with no texture variation, hair strands that merge unnaturally
- Background incoherence: objects or surfaces that don't obey perspective or gravity
- Over-idealized proportions that no real garment could produce

Set "is_ai_generated" to true if you observe clear evidence of synthesis. Set it to false if the image reads as a genuine photograph.
If is_ai_generated is true, also set "ai_generated_confidence" to one of: "low", "medium", or "high".

## STEP 0B — Full Outfit Completeness & Selfie Verification (CRITICAL STRICT GATE)
DripMorph ONLY accepts photos that clearly show the user's ENTIRE outfit so the silhouette, proportions, and styling can be fairly evaluated.

STRICT REJECTION RULES (Set "is_complete_outfit" to false):
1. NO SELFIES OF ANY KIND:
   - Front-camera selfies, portrait selfies, or close-up selfies focusing on the face, head, or chest.
   - Mirror selfies where only the torso/chest and face are visible.
2. NO INCOMPLETE OR CROPPED OUTFITS:
   - Photos cropped at the waist, ribs, or chest showing only a top/shirt/jacket without the lower garments.
   - Extreme close-ups of single clothing items (only sneakers/shoes, only a watch, only a cap, only a bag, only a jacket collar/graphic).
   - Any angle where key parts of the outfit (upper body, lower body, or overall silhouette) are cut off or hidden.

ACCEPTANCE REQUIREMENTS (Set "is_complete_outfit" to true):
- The photo MUST show the person wearing a complete outfit — clearly displaying BOTH the upper-body garments (top/shirt/jacket) AND lower-body garments (pants/jeans/shorts/skirt) together, presenting the full outfit silhouette.

If rejected because it is a selfie or incomplete outfit:
- Set "is_complete_outfit" to false.
- Set "rejection_reason" to "Only photos showing your entire outfit from head to toe are accepted. Selfies and incomplete outfits cannot be rated or posted."
- Set "style_archetype" to "N/A", all scores to 1.0, and "improvement_tip" to "N/A".

## STEP 1 — Classify Style Archetype (if is_ai_generated is false AND is_complete_outfit is true)
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
- Calibrate scores strictly across the FULL 1-10 range based on genuine execution quality:
  * Most outfits should now land in the 4.0-6.0 range (this is the new 'solid, unremarkable execution' baseline).
  * A merely 'fine, nothing wrong with it' outfit should score around 5.0, not 7.0 — only outfits with real intention, precision, and archetype-correct execution should clear 6.5+.
  * Reserve 8.0+ for genuinely excellent archetype execution (outfits that nail their archetype's conventions with true precision and distinction).
- Every category needs a specific comment referencing what you actually see.
- The improvement_tip must name the exact garment, the exact change, and why — framed within the outfit's own archetype (e.g. 'swap the crew socks for no-show — visible socks break the clean-lined silhouette Quiet Luxury depends on', not a generic 'wear better shoes').

## OUTPUT FORMAT:
Return ONLY valid JSON matching the schema, with no markdown formatting or preamble.

If is_ai_generated is TRUE:
{
  "is_ai_generated": true,
  "ai_generated_confidence": "low" | "medium" | "high",
  "is_complete_outfit": false,
  "rejection_reason": "AI-generated image detected",
  "style_archetype": "N/A",
  "color_harmony": {"score": 1.0, "comment": "AI-generated image detected"},
  "silhouette_proportions": {"score": 1.0, "comment": "AI-generated image detected"},
  "coherence_styling": {"score": 1.0, "comment": "AI-generated image detected"},
  "overall": 1.0,
  "summary": "AI-generated image detected",
  "improvement_tip": "N/A"
}

If is_complete_outfit is FALSE (selfie, cropped torso, or incomplete outfit):
{
  "is_ai_generated": false,
  "ai_generated_confidence": "low",
  "is_complete_outfit": false,
  "rejection_reason": "Only photos showing your entire outfit from head to toe are accepted. Selfies and incomplete outfits cannot be rated or posted.",
  "style_archetype": "N/A",
  "color_harmony": {"score": 1.0, "comment": "Incomplete outfit or selfie"},
  "silhouette_proportions": {"score": 1.0, "comment": "Incomplete outfit or selfie"},
  "coherence_styling": {"score": 1.0, "comment": "Incomplete outfit or selfie"},
  "overall": 1.0,
  "summary": "Photo does not show a complete outfit",
  "improvement_tip": "N/A"
}

If is_ai_generated is FALSE and is_complete_outfit is TRUE:
{
  "is_ai_generated": false,
  "ai_generated_confidence": "low",
  "is_complete_outfit": true,
  "rejection_reason": "",
  "style_archetype": "string — the classified archetype from the list",
  "color_harmony": {"score": 1.0-10.0, "comment": "string"},
  "silhouette_proportions": {"score": 1.0-10.0, "comment": "string"},
  "coherence_styling": {"score": 1.0-10.0, "comment": "string"},
  "overall": 1.0-10.0,
  "summary": "one sentence, naming the archetype",
  "improvement_tip": "string, archetype-specific, naming exact garment + change + why"
}
`;

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
    const { data: dbLogRows, error: countError } = await supabase
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
            is_ai_generated: {
              type: 'BOOLEAN',
              description: 'Whether the image is AI-generated or synthetic.',
            },
            ai_generated_confidence: {
              type: 'STRING',
              enum: ['low', 'medium', 'high'],
              description: 'Confidence level if is_ai_generated is true.',
            },
            is_complete_outfit: {
              type: 'BOOLEAN',
              description: 'Whether the image shows a complete outfit (both upper and lower body garments visible). Must be false for selfies, portraits, or incomplete outfits.',
            },
            rejection_reason: {
              type: 'STRING',
              description: 'Reason for rejection if image is a selfie, incomplete outfit, or AI-generated. Empty string if accepted.',
            },
            style_archetype: {
              type: 'STRING',
              description: 'Classified style archetype from the specified list (e.g. Classic Streetwear, Techwear, Quiet Luxury, etc.).',
            },
            color_harmony: {
              type: 'OBJECT',
              properties: {
                score: { type: 'NUMBER', description: 'Score between 1.0 and 10.0' },
                comment: { type: 'STRING', description: 'Specific critique comment' },
              },
              required: ['score', 'comment'],
            },
            silhouette_proportions: {
              type: 'OBJECT',
              properties: {
                score: { type: 'NUMBER', description: 'Score between 1.0 and 10.0' },
                comment: { type: 'STRING', description: 'Specific critique comment' },
              },
              required: ['score', 'comment'],
            },
            coherence_styling: {
              type: 'OBJECT',
              properties: {
                score: { type: 'NUMBER', description: 'Score between 1.0 and 10.0' },
                comment: { type: 'STRING', description: 'Specific critique comment' },
              },
              required: ['score', 'comment'],
            },
            overall: {
              type: 'NUMBER',
              description: 'Overall outfit score between 1.0 and 10.0',
            },
            summary: {
              type: 'STRING',
              description: 'One sentence summarizing the outfit and naming the style archetype',
            },
            improvement_tip: {
              type: 'STRING',
              description: 'Archetype-specific improvement tip naming exact garment + change + why',
            },
          },
          required: [
            'is_ai_generated',
            'is_complete_outfit',
            'rejection_reason',
            'style_archetype',
            'color_harmony',
            'silhouette_proportions',
            'coherence_styling',
            'overall',
            'summary',
            'improvement_tip',
          ],
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

        // Retry if model is experiencing temporary 503 high demand
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
    type ParsedGeminiResult = {
      is_ai_generated: boolean;
      ai_generated_confidence?: 'low' | 'medium' | 'high';
      is_complete_outfit: boolean;
      rejection_reason?: string;
      style_archetype: string;
      color_harmony: { score: number; comment: string };
      silhouette_proportions: { score: number; comment: string };
      coherence_styling: { score: number; comment: string };
      overall: number;
      summary: string;
      improvement_tip: string;
    };

    let result: ParsedGeminiResult;

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
    if (result.is_ai_generated === true) {
      console.warn(
        '[rate-outfit] Image flagged as AI-generated — confidence:',
        result.ai_generated_confidence,
      );
      return new Response(
        JSON.stringify({
          error: 'ai_generated',
          message: 'This image appears to be AI-generated and cannot be submitted.',
          ai_generated_confidence: result.ai_generated_confidence,
        }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // ── Complete outfit gate: reject selfies and incomplete outfits ──────────
    if (result.is_complete_outfit === false) {
      console.warn(
        '[rate-outfit] Image rejected: not a complete outfit or selfie. Reason:',
        result.rejection_reason,
      );
      return new Response(
        JSON.stringify({
          error: 'incomplete_outfit',
          message:
            result.rejection_reason ||
            'Only photos showing your entire outfit from head to toe are accepted. Selfies and incomplete outfits cannot be rated or posted.',
        }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // ── Log this valid rating call to cooldown history ───────────────────────
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

    console.log(
      '[rate-outfit] Success — style_archetype:',
      result.style_archetype,
      '| overall score:',
      result.overall,
    );
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
