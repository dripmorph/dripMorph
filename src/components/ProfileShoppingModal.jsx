import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingBag, ExternalLink, Plus, Trash2, Tag, Globe, Sparkles } from 'lucide-react';

export default function ProfileShoppingModal({
  isOpen,
  onClose,
  isOwnProfile,
  userId,
  username,
  userOutfits = [],
  showToast
}) {
  const storageKey = `dripmorph_shop_links_${userId || username || 'default'}`;

  const [shopLinks, setShopLinks] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved shop links:', e);
    }
    // Default initial links for demonstration if owner
    return [
      {
        id: 'init-1',
        name: 'Oversized Boxy Tee',
        brand: 'Represent Clo',
        url: 'https://representclo.com',
        price: '$95.00'
      },
      {
        id: 'init-2',
        name: 'Tactical Cargo Pants',
        brand: 'Acronym',
        url: 'https://acrnm.com',
        price: '$240.00'
      }
    ];
  });

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    url: '',
    price: ''
  });

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(shopLinks));
    } catch (e) {
      console.warn('Failed to persist shop links:', e);
    }
  }, [shopLinks, storageKey]);

  if (!isOpen) return null;

  const handleOpenLink = (rawUrl) => {
    if (!rawUrl) return;
    let target = rawUrl.trim();
    if (!/^https?:\/\//i.test(target)) {
      target = `https://${target}`;
    }
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) {
      if (showToast) showToast('Please enter an item name and store link');
      return;
    }

    const newLink = {
      id: `shop-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: formData.name.trim(),
      brand: formData.brand.trim() || 'Custom Find',
      url: formData.url.trim(),
      price: formData.price.trim() || ''
    };

    setShopLinks(prev => [newLink, ...prev]);
    setFormData({ name: '', brand: '', url: '', price: '' });
    setIsAdding(false);
    if (showToast) showToast('Shopping link added to your wardrobe!');
  };

  const handleDelete = (id) => {
    setShopLinks(prev => prev.filter(l => l.id !== id));
    if (showToast) showToast('Link removed');
  };

  const modalContent = (
    <div 
      className="profile-shop-modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '16px'
      }}
    >
      <div 
        className="profile-shop-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '85vh',
          borderRadius: '24px',
          backgroundColor: '#16161a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '24px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
          position: 'relative'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(166, 252, 41, 0.12)',
              border: '1px solid rgba(166, 252, 41, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShoppingBag size={18} color="#a6fc29" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>
                {isOwnProfile ? 'My Wardrobe & Shop Links' : `${username}'s Shop Links`}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#a0a0a0' }}>
                {isOwnProfile ? 'Add links to your clothing, accessories & stores' : 'Curated fashion & store finds'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Add Link Section (Only for Profile Owner) */}
        {isOwnProfile && (
          <div>
            {!isAdding ? (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(166, 252, 41, 0.08)',
                  border: '1px dashed rgba(166, 252, 41, 0.4)',
                  color: '#a6fc29',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Plus size={16} /> Add New Shopping Link
              </button>
            ) : (
              <form 
                onSubmit={handleAddSubmit}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '14px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#a6fc29' }}>New Wardrobe Item</span>
                
                <input
                  type="text"
                  placeholder="Item Name (e.g. Vintage Leather Jacket) *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    backgroundColor: '#0d0d10',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Brand / Store (e.g. Zara)"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    style={{
                      backgroundColor: '#0d0d10',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Price (e.g. $120)"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    style={{
                      backgroundColor: '#0d0d10',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <input
                  type="text"
                  placeholder="Store Link / URL (e.g. https://... or store.com) *"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  style={{
                    backgroundColor: '#0d0d10',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                  required
                />

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    style={{
                      flex: 1,
                      padding: '9px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      color: '#e4e4e7',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '9px',
                      borderRadius: '10px',
                      backgroundColor: '#a6fc29',
                      border: 'none',
                      color: '#121214',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Save Link
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Links List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {shopLinks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '30px 16px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShoppingBag size={32} color="#71717a" />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#a0a0a0' }}>
                No shopping links added yet.
              </p>
              {isOwnProfile && (
                <p style={{ margin: 0, fontSize: '12px', color: '#71717a' }}>
                  Click "+ Add New Shopping Link" above to share where you get your drip!
                </p>
              )}
            </div>
          ) : (
            shopLinks.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>
                      {item.name}
                    </span>
                    {item.price && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#a6fc29',
                        backgroundColor: 'rgba(166, 252, 41, 0.12)',
                        padding: '2px 6px',
                        borderRadius: '6px'
                      }}>
                        {item.price}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', color: '#a0a0a0', display: 'block', marginTop: '2px' }}>
                    {item.brand}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Visit Link Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenLink(item.url)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(166, 252, 41, 0.14)',
                      border: '1px solid rgba(166, 252, 41, 0.4)',
                      color: '#a6fc29',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>Shop</span>
                    <ExternalLink size={13} />
                  </button>

                  {/* Delete button (owner only) */}
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#71717a',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
                      aria-label="Delete link"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
