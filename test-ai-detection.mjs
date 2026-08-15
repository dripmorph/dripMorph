/**
 * test-ai-detection.mjs
 * Tests AI-generated image detection using a known AI-generated fashion image.
 * Usage: node test-ai-detection.mjs YOUR_GEMINI_API_KEY
 */

const GEMINI_API_KEY = process.argv[2];
if (!GEMINI_API_KEY) {
  console.error('Usage: node test-ai-detection.mjs YOUR_GEMINI_API_KEY');
  process.exit(1);
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

// AI-generated fashion image from Lexica (known Stable Diffusion output)
const TEST_IMAGE_URL =
  'https://image.lexica.art/full_jpg/0f16cff9-b9e0-4185-a6a3-3d13d7c60d4d';

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

Scoring calibration — use the FULL 1.0–10.0 range.
Do NOT cluster scores into a safe middle range out of politeness.

Rating rules:
- Critique styling choices only — never the person's body, face, weight, or appearance outside of clothing.
- Never use mocking, sarcastic, or insulting language, even for low scores.

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

console.log('Fetching AI-generated test image from:', TEST_IMAGE_URL);
const imgRes = await fetch(TEST_IMAGE_URL);
if (!imgRes.ok) {
  console.error('Failed to fetch image:', imgRes.status, imgRes.statusText);
  // Fallback: use a prompt-only test to describe an AI image
  console.log('\nFalling back to text-only AI detection test...');
  
  const fallbackRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: RATING_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: 'Rate the outfit in this image.' }] }],
      generationConfig: { temperature: 0.4, thinkingConfig: { thinkingBudget: 0 }, responseMimeType: 'application/json' },
    }),
  });
  const t = await fallbackRes.text();
  console.log('Fallback response:', t);
  process.exit(0);
}

const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
const mimeType = contentType.split(';')[0].trim();
const arrayBuffer = await imgRes.arrayBuffer();
const imageBase64 = Buffer.from(arrayBuffer).toString('base64');
console.log(`Image OK — MIME: ${mimeType}, size: ${arrayBuffer.byteLength} bytes\n`);

console.log('Calling Gemini AI-detection + rating...\n');

const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    system_instruction: { parts: [{ text: RATING_SYSTEM_PROMPT }] },
    contents: [{
      role: 'user',
      parts: [
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
        { text: 'Rate the outfit in this image.' },
      ],
    }],
    generationConfig: { temperature: 0.4, thinkingConfig: { thinkingBudget: 0 }, responseMimeType: 'application/json' },
  }),
});

console.log('=== HTTP STATUS ===');
console.log(geminiRes.status, geminiRes.statusText);

const raw = await geminiRes.text();
const parsed = JSON.parse(raw);
const resultText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;

console.log('\n=== RAW GEMINI RESPONSE ===');
console.log(resultText);

const result = JSON.parse(resultText);
console.log('\n=== PARSED RESULT ===');
console.log(JSON.stringify(result, null, 2));

if (result.is_ai_generated) {
  console.log('\n🚨 FLAGGED AS AI-GENERATED');
  console.log('   Confidence:', result.ai_generated_confidence);
  console.log('   → App would return HTTP 422 and reject submission');
} else {
  console.log('\n✅ PASSED AS REAL PHOTO — would proceed to rating');
  console.log('   Overall score:', result.overall);
}
