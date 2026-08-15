/**
 * test-gemini.mjs
 * Quick local test to call Gemini 2.5 Flash-Lite directly and see the exact
 * error/response without needing Supabase auth or a real upload.
 * 
 * Usage: node test-gemini.mjs YOUR_GEMINI_API_KEY
 */

const GEMINI_API_KEY = process.argv[2];

if (!GEMINI_API_KEY) {
  console.error('Usage: node test-gemini.mjs YOUR_GEMINI_API_KEY');
  process.exit(1);
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

// Use a small public HTTPS image (a plain fashion photo from Unsplash)
const TEST_IMAGE_URL = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=600&fit=crop';

console.log('Fetching test image from:', TEST_IMAGE_URL);

const imgRes = await fetch(TEST_IMAGE_URL);
if (!imgRes.ok) {
  console.error('Failed to fetch test image:', imgRes.status, imgRes.statusText);
  process.exit(1);
}

const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
const mimeType = contentType.split(';')[0].trim();
const arrayBuffer = await imgRes.arrayBuffer();
const imageBase64 = Buffer.from(arrayBuffer).toString('base64');

console.log(`Image fetched OK — MIME: ${mimeType}, size: ${arrayBuffer.byteLength} bytes, base64 length: ${imageBase64.length}`);
console.log('\nCalling Gemini API...');
console.log('Endpoint:', GEMINI_ENDPOINT);

const payload = {
  system_instruction: {
    parts: [{ text: 'You are a content moderation system. Return ONLY valid JSON: { "is_appropriate": true, "reason": "" }' }],
  },
  contents: [
    {
      role: 'user',
      parts: [
        {
          inline_data: {
            mime_type: mimeType,
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
    thinkingConfig: { thinkingBudget: 0 },
    responseMimeType: 'application/json',
  },
};

const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

console.log('\n=== GEMINI RESPONSE ===');
console.log('Status:', geminiRes.status, geminiRes.statusText);
console.log('Headers:', Object.fromEntries(geminiRes.headers.entries()));

const responseText = await geminiRes.text();
console.log('\n=== FULL RESPONSE BODY ===');
console.log(responseText);

try {
  const parsed = JSON.parse(responseText);
  console.log('\n=== PARSED JSON ===');
  console.log(JSON.stringify(parsed, null, 2));
  
  const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text) {
    console.log('\n=== EXTRACTED TEXT ===');
    console.log(text);
  }
} catch {
  console.log('\n(Response was not valid JSON)');
}
