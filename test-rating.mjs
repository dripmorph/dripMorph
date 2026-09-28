/**
 * test-rating.mjs
 * Tests the revised RATING_SYSTEM_PROMPT against a real outfit image.
 * Usage: node test-rating.mjs YOUR_GEMINI_API_KEY
 */

const GEMINI_API_KEY = process.argv[2];
if (!GEMINI_API_KEY) {
  console.error('Usage: node test-rating.mjs YOUR_GEMINI_API_KEY');
  process.exit(1);
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

// Same fashion photo used by test-gemini.mjs
const TEST_IMAGE_URL =
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=600&fit=crop';

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

console.log('Fetching outfit image from:', TEST_IMAGE_URL);
const imgRes = await fetch(TEST_IMAGE_URL);
if (!imgRes.ok) {
  console.error('Failed to fetch image:', imgRes.status, imgRes.statusText);
  process.exit(1);
}
const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
const mimeType = contentType.split(';')[0].trim();
const arrayBuffer = await imgRes.arrayBuffer();
const imageBase64 = Buffer.from(arrayBuffer).toString('base64');
console.log(`Image OK — MIME: ${mimeType}, size: ${arrayBuffer.byteLength} bytes\n`);

console.log('Calling Gemini with revised rating prompt...\n');

const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    system_instruction: { parts: [{ text: RATING_SYSTEM_PROMPT }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
          { text: 'Rate the outfit in this image.' },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: 'application/json',
    },
  }),
});

console.log('=== HTTP STATUS ===');
console.log(geminiRes.status, geminiRes.statusText);

const raw = await geminiRes.text();
const parsed = JSON.parse(raw);
const resultText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;

if (!resultText) {
  console.error('\nNo result text in response. Full response:');
  console.log(JSON.stringify(parsed, null, 2));
  process.exit(1);
}

console.log('\n=== RAW RATING JSON FROM GEMINI ===');
console.log(resultText);

const rating = JSON.parse(resultText);
console.log('\n=== PARSED RATING ===');
console.log(JSON.stringify(rating, null, 2));

console.log('\n=== SCORE SUMMARY ===');
console.log(`  Color Harmony:           ${rating.color_harmony.score} — ${rating.color_harmony.comment}`);
console.log(`  Silhouette & Proportions: ${rating.silhouette_proportions.score} — ${rating.silhouette_proportions.comment}`);
console.log(`  Coherence & Styling:      ${rating.coherence_styling.score} — ${rating.coherence_styling.comment}`);
console.log(`  Overall:                  ${rating.overall}`);
console.log(`  Summary:                  ${rating.summary}`);
console.log(`  Improvement Tip:          ${rating.improvement_tip}`);
