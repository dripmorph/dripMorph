/**
 * compressImage.js
 *
 * Client-side image compression using the Canvas API.
 * Resizes and re-encodes images to JPEG to bring them under a target file size.
 *
 * Design goals:
 *  - Target ≤ 1.8 MB so uploads stay comfortably under the 5 MB bucket limit
 *  - Preserve reasonable visual quality (starts at 0.85 JPEG quality)
 *  - Works on every upload, but especially important for large originals (7 MB+)
 *  - No external dependencies — pure browser APIs (canvas + createImageBitmap)
 */

/** Default target size: 1.8 MB (leaves plenty of margin under 5 MB) */
const DEFAULT_TARGET_BYTES = 1.8 * 1024 * 1024;

/** Absolute maximum dimension (width or height) for the first resize pass */
const MAX_DIMENSION = 2048;

/** Minimum JPEG quality we'll attempt before giving up */
const MIN_QUALITY = 0.60;

/**
 * Load a File/Blob into an HTMLImageElement (works in all browsers).
 * @param {File|Blob} file
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image for compression.'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Draw an image onto a canvas at the given dimensions and export as a JPEG Blob.
 * @param {HTMLImageElement} img
 * @param {number} width
 * @param {number} height
 * @param {number} quality  JPEG quality (0–1)
 * @returns {Promise<Blob>}
 */
function canvasToBlob(img, width, height, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  // Use high-quality resampling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas compression failed.'));
      },
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Compute scaled dimensions that fit within maxDim while preserving aspect ratio.
 * @param {number} origW
 * @param {number} origH
 * @param {number} maxDim
 * @returns {{ width: number, height: number }}
 */
function fitDimensions(origW, origH, maxDim) {
  if (origW <= maxDim && origH <= maxDim) {
    return { width: origW, height: origH };
  }
  const ratio = Math.min(maxDim / origW, maxDim / origH);
  return {
    width: Math.round(origW * ratio),
    height: Math.round(origH * ratio),
  };
}

/**
 * Compress an image File to fit under `targetBytes`.
 *
 * Strategy:
 *  1. Scale to fit within MAX_DIMENSION (2048 px) — this alone often drops
 *     multi-megabyte phone photos well below the target.
 *  2. Re-encode as JPEG at quality 0.85.
 *  3. If still too large, iteratively lower quality in 0.05 steps down to 0.60.
 *  4. If still too large at quality 0.60, halve dimensions and retry from 0.80.
 *
 * @param {File} file            The original image file from the user's device.
 * @param {number} [targetBytes] Target file size in bytes (default 1.8 MB).
 * @returns {Promise<File>}      A compressed File object (JPEG), or the original
 *                                if it was already under the target.
 */
export async function compressImage(file, targetBytes = DEFAULT_TARGET_BYTES) {
  console.log(`[compressImage] START - File: "${file.name}", Type: ${file.type}, Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB (${file.size} bytes), Target: ${(targetBytes / (1024 * 1024)).toFixed(2)} MB`);

  // If the file is already small enough and is a JPEG, skip compression entirely
  if (file.size <= targetBytes && file.type === 'image/jpeg') {
    console.log(`[compressImage] SKIP - File is already JPEG and under target size.`);
    return file;
  }

  const img = await loadImage(file);
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  console.log(`[compressImage] Original dimensions: ${origW}x${origH}`);

  // Release the object URL created in loadImage
  URL.revokeObjectURL(img.src);

  // ── Pass 1: scale to fit MAX_DIMENSION ────────────────────────────────────
  let { width, height } = fitDimensions(origW, origH, MAX_DIMENSION);
  let quality = 0.85;
  console.log(`[compressImage] Pass 1 - Resizing to ${width}x${height}, Quality: ${quality}`);
  let blob = await canvasToBlob(img, width, height, quality);
  console.log(`[compressImage] Pass 1 Result - Size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB (${blob.size} bytes)`);

  // Already under target after resize? Great, we're done.
  if (blob.size <= targetBytes) {
    console.log(`[compressImage] SUCCESS in Pass 1! Final size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
    const finalFile = blobToFile(blob, file.name);
    console.log(`[compressImage] Returning File object: name="${finalFile.name}", type="${finalFile.type}", size=${(finalFile.size / (1024 * 1024)).toFixed(2)} MB`);
    return finalFile;
  }

  // ── Pass 2: iteratively reduce JPEG quality ───────────────────────────────
  console.log(`[compressImage] Starting Pass 2 - Lowering JPEG quality...`);
  while (blob.size > targetBytes && quality > MIN_QUALITY) {
    quality -= 0.05;
    blob = await canvasToBlob(img, width, height, quality);
    console.log(`[compressImage] Pass 2 Attempt - Quality: ${quality.toFixed(2)}, Resulting Size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB (${blob.size} bytes)`);
  }

  if (blob.size <= targetBytes) {
    console.log(`[compressImage] SUCCESS in Pass 2! Final size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
    const finalFile = blobToFile(blob, file.name);
    console.log(`[compressImage] Returning File object: name="${finalFile.name}", type="${finalFile.type}", size=${(finalFile.size / (1024 * 1024)).toFixed(2)} MB`);
    return finalFile;
  }

  // ── Pass 3: scale down further (halve) and retry ──────────────────────────
  width = Math.round(width * 0.5);
  height = Math.round(height * 0.5);
  quality = 0.80;
  console.log(`[compressImage] Pass 3 - Halving dimensions to ${width}x${height}, Quality: ${quality}`);
  blob = await canvasToBlob(img, width, height, quality);
  console.log(`[compressImage] Pass 3 Initial Result - Size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB (${blob.size} bytes)`);

  if (blob.size <= targetBytes) {
    console.log(`[compressImage] SUCCESS in Pass 3! Final size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
    const finalFile = blobToFile(blob, file.name);
    console.log(`[compressImage] Returning File object: name="${finalFile.name}", type="${finalFile.type}", size=${(finalFile.size / (1024 * 1024)).toFixed(2)} MB`);
    return finalFile;
  }

  // Final quality reduction at the smaller size
  while (blob.size > targetBytes && quality > MIN_QUALITY) {
    quality -= 0.05;
    blob = await canvasToBlob(img, width, height, quality);
    console.log(`[compressImage] Pass 3 Quality Reduction - Quality: ${quality.toFixed(2)}, Size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB (${blob.size} bytes)`);
  }

  const finalFile = blobToFile(blob, file.name);
  console.log(`[compressImage] END - Returning compressed file. Final size: ${(finalFile.size / (1024 * 1024)).toFixed(2)} MB (${finalFile.size} bytes)`);
  return finalFile;
}

/**
 * Convert a Blob into a File, preserving a derivative of the original filename.
 * @param {Blob} blob
 * @param {string} originalName
 * @returns {File}
 */
function blobToFile(blob, originalName) {
  // Strip the old extension and replace with .jpg
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  return new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}
