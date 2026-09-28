import React, { useState, useRef } from 'react';
import { Sparkles, Upload, RefreshCw, Trash2, Plus, X, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadOutfitImage, moderateImage, rateOutfit, publishOutfit } from '../lib/outfitService';

// Pipeline step labels shown during the scan animation
const PIPELINE_STEPS = [
  { key: 'uploading',   label: 'Uploading photo...' },
  { key: 'moderating', label: 'Running content check...' },
  { key: 'rating',     label: 'AI analyzing your look...' },
];

const ITEM_CATEGORIES = [
  'Top / Shirt',
  'Bottom / Pants',
  'Footwear / Shoes',
  'Outerwear / Jacket',
  'Accessory',
];

export const OUTFIT_STYLES = [
  'Old Money',
  'Quiet Luxury',
  'Preppy/Ivy League',
  'Sartorial/Classic Menswear',
  'Dark Academia',
  'Light Academia',
  'Smart Casual',
  'Minimalist/Clean Fit',
  'Normcore/Elevated Basics',
  'Classic Streetwear',
  'Techwear',
  'Gorpcore',
  'Y2K/Cyberpunk',
  'Skater',
  'Grunge',
  'Indie Sleaze',
  'Punk',
  'Goth',
  'Whimsigoth',
  'Biker/Rocker',
  'Workwear/Americana',
  'Cottagecore',
  'Bohemian',
  'Athleisure',
  'Blokecore',
];

export default function PostUpload({ showToast, onPostCreated }) {
  const { user } = useAuth();

  // ── Image state ──────────────────────────────────────────────────────────────
  // selectedFile  → the raw File object (for uploading)
  // selectedImage → local object-URL preview (for <img> display)
  // uploadedUrl   → the public Supabase Storage URL (set after upload)
  const [selectedFile, setSelectedFile]   = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadedUrl, setUploadedUrl]     = useState(null);

  // ── Pipeline state ───────────────────────────────────────────────────────────
  const [isAnalyzing, setIsAnalyzing]     = useState(false);
  const [pipelineStep, setPipelineStep]   = useState(null); // 'uploading' | 'moderating' | 'rating'
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);   // string | null — generic errors
  const [aiGeneratedError, setAiGeneratedError] = useState(null); // string | null — AI-image rejection

  // ── Post detail & style archetype state ───────────────────────────────────────
  const [selectedStyle, setSelectedStyle] = useState('');
  const [aiSuggestedStyle, setAiSuggestedStyle] = useState('');
  const [caption, setCaption]     = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [enableTagging, setEnableTagging] = useState(false);
  const [taggedItems, setTaggedItems] = useState([
    { id: Date.now(), category: '', name: '', price: '', link: '' },
  ]);

  const cameraInputRef  = useRef(null);
  const galleryInputRef = useRef(null);

  // ── Tagged item helpers ──────────────────────────────────────────────────────
  const toggleTagging = () => {
    if (!enableTagging && taggedItems.length === 0) {
      setTaggedItems([{ id: Date.now(), category: '', name: '', price: '', link: '' }]);
    }
    setEnableTagging(!enableTagging);
  };

  const handleTaggedItemChange = (id, field, value) => {
    setTaggedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };
  const addTaggedItem = () => {
    setTaggedItems(prev => [
      ...prev,
      { id: Date.now(), category: '', name: '', price: '', link: '' },
    ]);
  };
  const removeTaggedItem = (id) => {
    setTaggedItems(prev => prev.filter(item => item.id !== id));
  };

  // ── File selection ───────────────────────────────────────────────────────────
  const applyFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please select a valid image file.');
      return;
    }
    // Revoke previous object URL to avoid memory leaks
    if (selectedImage && selectedImage.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImage);
    }
    setSelectedFile(file);
    setSelectedImage(URL.createObjectURL(file));
    setAnalysisResult(null);
    setAnalysisError(null);
    setAiGeneratedError(null);
    setUploadedUrl(null);
    setSelectedStyle('');
    setAiSuggestedStyle('');
    setCaption('');
    showToast('Outfit photo loaded!');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) applyFile(file);
    // Reset so the same file can be re-selected if needed
    e.target.value = '';
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) applyFile(file);
  };

  // ── Main pipeline: upload → moderate → rate ──────────────────────────────────
  const startAnalysis = async () => {
    if (!selectedFile) {
      showToast('Please choose an outfit photo first!');
      return;
    }
    if (!user?.id) {
      showToast('Please sign in to analyze your fit.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    setAiGeneratedError(null);

    try {
      // ── Step 1: Upload to Supabase Storage ──────────────────────────────────
      setPipelineStep('uploading');
      const publicUrl = await uploadOutfitImage(selectedFile, user.id);
      setUploadedUrl(publicUrl);

      // ── Step 2: Moderation check ─────────────────────────────────────────────
      setPipelineStep('moderating');
      const moderationResult = await moderateImage(publicUrl);

      if (!moderationResult.is_appropriate) {
        setAnalysisError(
          'This photo doesn\'t meet our content guidelines. Please upload a photo showing your outfit.',
        );
        setIsAnalyzing(false);
        setPipelineStep(null);
        return;
      }

      // ── Step 3: AI Rating ────────────────────────────────────────────────────
      setPipelineStep('rating');
      showToast('DripMorph AI is analyzing your look...');
      const rating = await rateOutfit(publicUrl);

      // Shape the result into the format the existing UI expects
      const detectedArchetype = rating.style_archetype || '';
      let matchedStyle = OUTFIT_STYLES.find(
        s => s.toLowerCase() === detectedArchetype.toLowerCase()
      );

      if (!matchedStyle && detectedArchetype) {
        matchedStyle = OUTFIT_STYLES.find(
          s => detectedArchetype.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(detectedArchetype.toLowerCase())
        );
      }

      if (!matchedStyle && rating.summary) {
        for (const s of OUTFIT_STYLES) {
          if (rating.summary.toLowerCase().includes(s.toLowerCase())) {
            matchedStyle = s;
            break;
          }
        }
      }

      const finalStyle = matchedStyle || detectedArchetype || 'Classic Streetwear';
      setSelectedStyle(finalStyle);
      setAiSuggestedStyle(finalStyle);
      setCaption(finalStyle);

      setAnalysisResult({
        overall: rating.overall.toFixed(1),
        summary: rating.summary,
        suggestion: rating.improvement_tip,
        style_archetype: finalStyle,
        // Raw rating kept for publishing
        _raw: rating,
        categories: [
          {
            name: 'Color Harmony',
            score: rating.color_harmony.score.toFixed(1),
            comment: rating.color_harmony.comment,
          },
          {
            name: 'Silhouette & Proportions',
            score: rating.silhouette_proportions.score.toFixed(1),
            comment: rating.silhouette_proportions.comment,
          },
          {
            name: 'Coherence & Styling',
            score: rating.coherence_styling.score.toFixed(1),
            comment: rating.coherence_styling.comment,
          },
        ],
      });

      showToast(`Analyzed! Match: ${finalStyle}`);
    } catch (err) {
      console.error('[PostUpload] pipeline error:', err);
      if (err.code === 'AI_GENERATED') {
        // Distinct branch: surface a clear rejection, keep user on upload step
        setAiGeneratedError(err.message);
      } else if (err.code === 'RATE_LIMITED') {
        setAnalysisError(err.message);
      } else if (err.code === 'FILE_TOO_LARGE') {
        setAnalysisError(err.message);
      } else {
        setAnalysisError(err.message || 'Something went wrong. Please check your connection and try again.');
      }
    } finally {
      setIsAnalyzing(false);
      setPipelineStep(null);
    }
  };

  // ── Publish to feed ──────────────────────────────────────────────────────────
  const handlePostSubmit = async () => {
    console.log('[PostUpload] handlePostSubmit STARTED', {
      userId: user?.id,
      uploadedUrl,
      hasAnalysisResult: Boolean(analysisResult?._raw),
      caption,
      taggedItemsCount: taggedItems?.length
    });

    if (!user?.id) {
      console.warn('[PostUpload] handlePostSubmit BLOCKED: Missing user.id');
      showToast('Please sign in to post your fit.');
      return;
    }
    if (!uploadedUrl || !analysisResult?._raw) {
      console.warn('[PostUpload] handlePostSubmit BLOCKED: Missing uploadedUrl or analysisResult._raw', {
        uploadedUrl,
        analysisResult
      });
      showToast('Please analyze your fit before publishing.');
      return;
    }

    setIsPublishing(true);
    try {
      console.log('[PostUpload] Calling publishOutfit()...');
      const validTaggedItems = enableTagging
        ? taggedItems.filter(item => item && item.name && item.name.trim() !== '')
        : [];

      const outfit = await publishOutfit({
        userId: user.id,
        imageUrl: uploadedUrl,
        imageFile: selectedFile,
        city: user.city || null,
        caption: caption || null,
        rating: analysisResult._raw,
        taggedItems: validTaggedItems,
      });

      console.log('[PostUpload] publishOutfit() SUCCESS, returned outfit:', outfit);

      // Build the post object that App.jsx's handlePostCreated expects
      const aiScoreStr = `${analysisResult.overall}/10`;
      const products = validTaggedItems.map(item => ({
        id: `p-${item.id}`,
        name: item.name,
        price: item.price || '$0.00',
        brand: item.category || 'Uncategorized',
        link: item.link || '',
        image: uploadedUrl,
      }));

      if (onPostCreated) {
        console.log('[PostUpload] Calling onPostCreated() handler in App.jsx...');
        onPostCreated({
          id: outfit.id,
          user_id: user.id,
          username: user.username || user.email?.split('@')[0] || 'anonymous',
          user_avatar: user.avatar || '',
          avatar: user.avatar || '',
          location: user.city || '',
          image_url: uploadedUrl,
          image: uploadedUrl,
          score: aiScoreStr,
          aiScore: aiScoreStr,
          likes_count: 0,
          likes: 0,
          comments_count: 0,
          comments: 0,
          caption: caption,
          created_at: new Date().toISOString(),
          products: products.length > 0 ? products : [],
          taggedItems: validTaggedItems,
        });
      } else {
        console.warn('[PostUpload] Warning: onPostCreated prop is undefined!');
      }

      // Reset all state
      if (selectedImage && selectedImage.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImage);
      }
      setSelectedFile(null);
      setSelectedImage(null);
      setUploadedUrl(null);
      setAnalysisResult(null);
      setAnalysisError(null);
      setCaption('');
      setEnableTagging(false);
      setTaggedItems([{ id: Date.now(), category: '', name: '', price: '', link: '' }]);
      showToast('Outfit shared to your DripMorph Feed!');
    } catch (err) {
      console.error('[PostUpload] publish error caught in handlePostSubmit:', err);
      showToast('Failed to publish. Please try again.');
    } finally {
      setIsPublishing(false);
      console.log('[PostUpload] handlePostSubmit FINISHED (isPublishing reset to false)');
    }
  };

  // ── Current pipeline step label ──────────────────────────────────────────────
  const stepLabel = PIPELINE_STEPS.find(s => s.key === pipelineStep)?.label ?? 'AI Analyzing...';

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="upload-screen post-screen-scroll-container">
      {/* Visual media viewport */}
      <div
        className="media-viewport"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Camera input (direct capture on mobile devices) */}
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleImageChange}
          style={{ display: 'none' }}
        />

        {/* Gallery / File picker input (opens device files/photos) */}
        <input
          type="file"
          ref={galleryInputRef}
          accept="image/*"
          onChange={handleImageChange}
          style={{ display: 'none' }}
        />

        {selectedImage ? (
          <div
            className="preview-container"
            onClick={() => !isAnalyzing && galleryInputRef.current?.click()}
          >
            <img src={selectedImage} alt="Outfit Preview" className="preview-image" />

            {/* Top-center overlay badge */}
            {!isAnalyzing && (
              <div className="upload-badge-overlay">
                <span>+ Upload / Change Fit Photo</span>
              </div>
            )}

            {/* Camera Viewfinder Corners */}
            <div className="viewfinder-corner top-left" />
            <div className="viewfinder-corner top-right" />
            <div className="viewfinder-corner bottom-left" />
            <div className="viewfinder-corner bottom-right" />

            {/* Neon Scanner line — shows during real analysis */}
            {isAnalyzing && <div className="neon-scan-line" />}

            {/* Analyzing pill — shows real step label */}
            {isAnalyzing && (
              <div className="analyzing-pill">
                <Sparkles size={13} className="sparkle-spin" />
                <span>{stepLabel}</span>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`upload-placeholder ${isDragOver ? 'drag-over' : ''}`}
            onClick={() => cameraInputRef.current?.click()}
          >
            <div className="placeholder-icon-wrapper">
              <span style={{ fontSize: '2rem', fontWeight: '500', color: 'var(--accent-solid)', lineHeight: 1 }}>+</span>
            </div>
            <span className="placeholder-title">Tap + to snap fit with camera</span>
            <span className="placeholder-subtitle">Or choose photo from device below</span>
          </div>
        )}

        {/* Change image floating button */}
        {selectedImage && !isAnalyzing && !analysisResult && (
          <button
            type="button"
            className="change-img-floating-btn"
            onClick={() => galleryInputRef.current?.click()}
            style={{ border: 'none', cursor: 'pointer' }}
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {/* Dynamic Action Sheet */}
      <div className="upload-action-sheet">
        {!analysisResult ? (
          <>
            <h3 className="sheet-title">Analyze Fit</h3>
            <p className="sheet-subtitle">
              Our AI will review your silhouette, color blocking, and details to provide a real-time rating.
            </p>

            {/* AI-generated rejection banner — distinct from generic errors */}
            {aiGeneratedError && (
              <div
                style={{
                  background: 'rgba(255, 180, 0, 0.10)',
                  border: '1px solid rgba(255, 180, 0, 0.40)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f0b429', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚠️</span> AI-Generated Image Detected
                </span>
                <span style={{ fontSize: '0.80rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                  {aiGeneratedError}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAiGeneratedError(null);
                    setAnalysisResult(null);
                    setSelectedFile(null);
                    if (selectedImage && selectedImage.startsWith('blob:')) URL.revokeObjectURL(selectedImage);
                    setSelectedImage(null);
                    setUploadedUrl(null);
                    galleryInputRef.current?.click();
                  }}
                  style={{
                    marginTop: '4px',
                    alignSelf: 'flex-start',
                    background: 'rgba(255,180,0,0.15)',
                    border: '1px solid rgba(255,180,0,0.4)',
                    borderRadius: '6px',
                    color: '#f0b429',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '5px 10px',
                    cursor: 'pointer',
                  }}
                >
                  Upload a Different Photo
                </button>
              </div>
            )}

            {/* Generic error banner */}
            {analysisError && (
              <div
                style={{
                  background: 'rgba(255, 60, 60, 0.12)',
                  border: '1px solid rgba(255, 60, 60, 0.35)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  marginBottom: '12px',
                  color: '#ff6b6b',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                }}
              >
                {analysisError}
              </div>
            )}

            <div className="sheet-inputs-row">
              {!selectedImage ? (
                <button
                  type="button"
                  className="sheet-upload-btn"
                  onClick={() => galleryInputRef.current?.click()}
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  <Upload size={16} />
                  <span>Choose Photo</span>
                </button>
              ) : (
                <button
                  className="btn-get-rating"
                  onClick={startAnalysis}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? stepLabel.toUpperCase() : 'GET AI RATING'}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="analysis-result-panel">
            {/* Overall Score Circle */}
            <div className="overall-score-section">
              <div className="overall-score-circle">
                <span className="overall-score-num">{analysisResult.overall}</span>
                <span className="overall-score-max">/ 10</span>
              </div>
              <h4 className="overall-score-title">Aesthetic Fit Score</h4>
              <p className="overall-score-subtitle">
                {analysisResult.summary || 'AI analysis complete.'}
              </p>
            </div>

            <div className="divider-line" />

            {/* Category scores */}
            <div className="categories-list">
              {analysisResult.categories.map((cat, idx) => (
                <div key={idx} className="category-score-item">
                  <div className="category-header-row">
                    <span className="category-name">{cat.name}</span>
                    <span className="category-value">{cat.score}</span>
                  </div>
                  <div className="category-progress-track">
                    <div
                      className="category-progress-fill"
                      style={{ width: `${cat.score * 10}%` }}
                    />
                  </div>
                  <div className="category-comment-box">
                    <p className="category-comment-text">{cat.comment}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Style Archetype Selector (Replaces raw Add Caption input) */}
            <div className="upload-style-selector-container">
              <div className="upload-style-header-row">
                <div className="upload-style-label-group">
                  <Sparkles size={15} className="upload-style-icon" />
                  <label className="upload-style-label" htmlFor="outfit-style-select">
                    Outfit Type & Aesthetic
                  </label>
                </div>
                {aiSuggestedStyle && (
                  <div className="ai-suggested-pill">
                    <span className="ai-pill-dot" />
                    <span>AI Match: <strong>{aiSuggestedStyle}</strong></span>
                  </div>
                )}
              </div>

              <div className="upload-style-select-wrapper">
                <select
                  id="outfit-style-select"
                  className="upload-style-select"
                  value={selectedStyle || caption}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedStyle(val);
                    setCaption(val);
                  }}
                >
                  <option value="" disabled>Select Outfit Type / Aesthetic...</option>
                  {OUTFIT_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style} {style === aiSuggestedStyle ? '✨ (AI Best Match)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <span className="upload-style-hint">
                AI automatically identified this style archetype. Tap to select or change.
              </span>
            </div>

            {/* Tag Outfit Items Section (Optional Toggle) */}
            <div className="tag-items-section">
              <div className="tag-items-section-header">
                <div className="tag-items-title-group">
                  <h4 className="tag-items-heading">Tag Items / Add Affiliate Links</h4>
                  <span className="tag-items-subheading">Optional — lets viewers shop your look</span>
                </div>
                <button
                  type="button"
                  className={`tag-toggle-btn ${enableTagging ? 'active' : ''}`}
                  onClick={toggleTagging}
                >
                  {enableTagging ? (
                    <>
                      <X size={14} />
                      <span>Don't Tag Items</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>+ Tag Items</span>
                    </>
                  )}
                </button>
              </div>

              {enableTagging && (
                <div className="tag-items-dropdown-container">
                  <div className="tag-items-list">
                    {taggedItems.map((item, idx) => (
                      <div key={item.id} className="tag-item-row">
                        <div className="tag-item-row-header">
                          <span className="tag-item-row-num">Item {idx + 1}</span>
                          {taggedItems.length > 1 && (
                            <button
                              type="button"
                              className="tag-item-remove-btn"
                              onClick={() => removeTaggedItem(item.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <div className="tag-item-fields">
                          <select
                            className="tag-item-select"
                            value={item.category}
                            onChange={(e) => handleTaggedItemChange(item.id, 'category', e.target.value)}
                          >
                            <option value="" disabled>Select Category</option>
                            {ITEM_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            className="tag-item-input"
                            placeholder="Item Name (e.g. Cargo Pants)"
                            value={item.name}
                            onChange={(e) => handleTaggedItemChange(item.id, 'name', e.target.value)}
                          />
                          <input
                            type="text"
                            className="tag-item-input tag-item-price"
                            placeholder="Price ($/₹)"
                            value={item.price}
                            onChange={(e) => handleTaggedItemChange(item.id, 'price', e.target.value)}
                          />
                          <input
                            type="url"
                            className="tag-item-input tag-item-link"
                            placeholder="Product / Affiliate Link (https://...)"
                            value={item.link}
                            onChange={(e) => handleTaggedItemChange(item.id, 'link', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="tag-item-add-btn"
                    onClick={addTaggedItem}
                  >
                    <Plus size={14} />
                    <span>Add Another Item</span>
                  </button>
                </div>
              )}
            </div>

            {/* Improvement Tip Card */}
            {analysisResult.suggestion && (
              <div className="tip-card">
                <h5 className="tip-title">💡 Tip to Improve</h5>
                <p className="tip-text">{analysisResult.suggestion}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="result-actions-column">
              <button
                className="btn-submit-post"
                onClick={handlePostSubmit}
                disabled={isPublishing}
              >
                {isPublishing ? 'PUBLISHING...' : 'PUBLISH TO FEED'}
              </button>
              <button
                className="btn-reset-analysis-outline"
                onClick={() => {
                  setAnalysisResult(null);
                  setAnalysisError(null);
                }}
                disabled={isPublishing}
              >
                Re-analyze / Tweak Fit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
