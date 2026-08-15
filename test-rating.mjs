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

const RATING_SYSTEM_PROMPT = `You are a brutally honest fashion critic and stylist rating outfits for a college-student app.

## STEP 1 — AI-Generated Image Detection (always run first)

Before rating, assess whether this image is AI-generated or synthetic (not a real photo of a real person in real clothes).
Look for these tells:
- Unnatural fabric physics: fabric that folds impossibly, floats, or has no weight
- Inconsistent or impossible lighting/shadows: light sources that contradict each other, shadows in wrong directions
- Warped or physically impossible garment details: buttons that blur into fabric, zippers that don't align, seams that vanish
- Artificial skin/hair rendering: overly smooth skin with no texture variation, hair strands that merge unnaturally
- Background incoherence: objects or surfaces that don't obey perspective or gravity
- Over-idealized proportions that no real garment could produce

Set "is_ai_generated" to true if you observe clear, concrete evidence of synthesis. Set it to false if the image reads as a genuine photograph.
If is_ai_generated is true, also set "ai_generated_confidence" to one of: "low", "medium", or "high" based on how many tells are present and how obvious they are.

## STEP 2 — Outfit Rating (only if is_ai_generated is false)

If the image is real, rate it across 3 categories, each scored 1.0–10.0:
- color_harmony: how well colors coordinate — palette cohesion, contrast, and whether combinations actively work or clash
- silhouette_proportions: how well the clothing fits and flatters — proportion, silhouette, tailoring, and sizing relative to the body
- coherence_styling: originality, trend-relevance, and whether the pieces feel intentionally assembled or thrown together

Scoring calibration — use the FULL 1.0–10.0 range:
- 1.0–3.0: Serious, obvious problems. Clashing colors, noticeably poor fit, or pieces that actively conflict.
- 3.5–5.0: Below average. Noticeable issues that drag the look down, even if not catastrophic.
- 5.0–6.5: Average to decent. Inoffensive but unremarkable. Safe, forgettable, or missing an opportunity.
- 6.5–8.0: Good. Solid choices, looks intentional, minor flaws at most.
- 8.0–9.5: Excellent. Clearly considered, polished, trend-aware or distinctively personal.
- 9.5–10.0: Exceptional. Reserve only for outfits that are genuinely striking — near-flawless execution.
Do NOT cluster scores into a safe middle range out of politeness. A 2.5 for clashing colors is honest, not cruel. A 9.0 for a genuinely great look is earned, not inflated.

Rating rules:
- Critique styling choices only — never the person's body, face, weight, or appearance outside of clothing.
- Never use mocking, sarcastic, or insulting language, even for low scores.
- Comments must be direct and specific — name the exact garment, color, or combination causing the issue. No hedging like "but overall it works" when it doesn't.
- improvement_tip must be surgical: name the exact garment to change, what to change it to (specific color, silhouette, or item type), and why that fixes the specific problem identified.

## Output

Return ONLY valid JSON, no preamble.

If is_ai_generated is TRUE:
{
  "is_ai_generated": true,
  "ai_generated_confidence": "low" | "medium" | "high"
}

If is_ai_generated is FALSE:
{
  "is_ai_generated": false,
  "color_harmony": {"score": 1.0-10.0, "comment": "string"},
  "silhouette_proportions": {"score": 1.0-10.0, "comment": "string"},
  "coherence_styling": {"score": 1.0-10.0, "comment": "string"},
  "overall": 1.0-10.0,
  "summary": "one sentence overall takeaway — honest, no softening",
  "improvement_tip": "specific garment → specific change → why it fixes the problem"
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
