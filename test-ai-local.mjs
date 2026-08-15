/**
 * test-ai-local.mjs
 * Tests AI-generated image detection using a local image file.
 * Usage: node test-ai-local.mjs YOUR_GEMINI_API_KEY PATH_TO_IMAGE
 */
import { readFileSync } from 'node:fs';

const GEMINI_API_KEY = process.argv[2];
const IMAGE_PATH = process.argv[3];
if (!GEMINI_API_KEY || !IMAGE_PATH) {
  console.error('Usage: node test-ai-local.mjs KEY IMAGE_PATH');
  process.exit(1);
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

const PROMPT = `You are a brutally honest fashion critic and stylist rating outfits for a college-student app.

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
If is_ai_generated is true, also set "ai_generated_confidence" to one of: "low", "medium", or "high".

## Output — Return ONLY valid JSON, no preamble.

If is_ai_generated is TRUE: { "is_ai_generated": true, "ai_generated_confidence": "low" | "medium" | "high" }
If is_ai_generated is FALSE: { "is_ai_generated": false, "color_harmony": {"score": 0, "comment": ""}, "silhouette_proportions": {"score": 0, "comment": ""}, "coherence_styling": {"score": 0, "comment": ""}, "overall": 0, "summary": "", "improvement_tip": "" }`;

const imageBuffer = readFileSync(IMAGE_PATH);
const b64 = imageBuffer.toString('base64');
const mime = IMAGE_PATH.endsWith('.png') ? 'image/png' : 'image/jpeg';
console.log(`Loaded local image: ${IMAGE_PATH}`);
console.log(`Size: ${imageBuffer.byteLength} bytes, MIME: ${mime}\n`);

const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    system_instruction: { parts: [{ text: PROMPT }] },
    contents: [{
      role: 'user',
      parts: [
        { inline_data: { mime_type: mime, data: b64 } },
        { text: 'Assess this image.' },
      ],
    }],
    generationConfig: {
      temperature: 0.4,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: 'application/json',
    },
  }),
});

console.log('=== HTTP STATUS ===', geminiRes.status, geminiRes.statusText);
const raw = await geminiRes.text();
const parsed = JSON.parse(raw);
const txt = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
console.log('\n=== GEMINI RESULT ===');
console.log(txt);

const result = JSON.parse(txt);
console.log('\n=== PARSED ===');
console.log(JSON.stringify(result, null, 2));

if (result.is_ai_generated) {
  console.log(`\n🚨 FLAGGED AS AI-GENERATED — confidence: ${result.ai_generated_confidence}`);
  console.log('   → Edge function would return HTTP 422 and reject submission');
} else {
  console.log(`\n✅ PASSED AS REAL PHOTO — would proceed to rating (overall: ${result.overall})`);
}
