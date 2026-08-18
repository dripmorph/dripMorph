import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { DollarSign, Flame, ExternalLink, Link2, X } from 'lucide-react';
import techwearImg from '../assets/techwear_look.png';
import cyberpunkImg from '../assets/cyberpunk_look.png';
import minimalistImg from '../assets/minimalist_look.png';

export default function ShopTheLookDrawer({ post, onClose, showToast }) {
  // Initialize from post products if available, otherwise default tagging list
  const initialItems = (post && post.products && post.products.length > 0) ? post.products.map((p, idx) => ({
    id: p.id || `item-${idx}`,
    name: p.name || 'Outfit Item',
    brand: p.brand || 'DripMorph Affiliate',
    price: p.price || '$99.99',
    link: p.link || '',
    image: p.image || post.image || post.image_url
  })) : [
    {
      id: 'item-1',
      name: 'Cargo Pants',
      brand: 'H&M',
      price: '$49.99',
      link: 'https://www.hm.com',
      image: cyberpunkImg,
    },
    {
      id: 'item-2',
      name: 'Oversized Tee',
      brand: 'Zara',
      price: '$25.90',
      link: 'https://www.zara.com',
      image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=100&h=100&fit=crop',
    },
    {
      id: 'item-3',
      name: 'Platform Boots',
      brand: 'Demonia',
      price: '$120.00',
      link: 'https://demoniacult.com',
      image: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=100&h=100&fit=crop',
    }
  ];

  const [items, setItems] = useState(initialItems);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newLink, setNewLink] = useState('');

  // Handle external link click
  const handleRedirect = (item) => {
    if (!item || !item.link || !item.link.trim()) {
      if (showToast) showToast(`No purchase link available for ${item?.name || 'this item'}.`);
      return;
    }
    let url = item.link.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    if (showToast) showToast(`Opening store link for ${item.name}...`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Add a tagged item dynamically
  const handleTagItem = (e) => {
    e.preventDefault();
    if (!newName || !newBrand || !newPrice) {
      showToast("Please fill in all required fields to tag!");
      return;
    }
    const newItem = {
      id: `item-${Date.now()}`,
      name: newName,
      brand: newBrand,
      price: newPrice.startsWith('$') || newPrice.startsWith('₹') ? newPrice : `$${newPrice}`,
      link: newLink ? newLink.trim() : '',
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=100&h=100&fit=crop',
    };
    setItems([...items, newItem]);
    setNewName('');
    setNewBrand('');
    setNewPrice('');
    setNewLink('');
    setShowAddForm(false);
    showToast(`Tagged new item: ${newItem.name}!`);
  };

  const modalContent = (
    <div 
      className="stl-overlay shop-modal-backdrop" 
      onClick={onClose} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      <div className="stl-drawer shop-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle decoration */}
        <div className="stl-drag-handle" />

        {/* Close Button */}
        <button className="stl-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        {/* Header Title Section */}
        <div className="stl-header">
          <h2 className="stl-title">Shop the Look</h2>
          
          <div className="stl-meta-row">
            <div className="stl-earning-badge">
              <DollarSign size={15} className="earning-icon" />
              <span>Earning via <span className="stl-handle">{((post && post.username) || 'style_icon').replace(/^@/, '')}</span></span>
            </div>
            
            <div className="stl-count-badge">
              <Flame size={13} className="flame-icon" />
              <span>{items.length} Items</span>
            </div>
          </div>
        </div>

        {/* Product Items List */}
        <div className="stl-items-list">
          {items.map((item) => (
            <div key={item.id} className="stl-item-card">
              <div className="stl-item-left">
                <div className="stl-thumb-wrapper">
                  <img src={item.image} alt={item.name} className="stl-item-img" />
                </div>
                <div className="stl-item-details">
                  <span className="stl-item-name">{item.name}</span>
                  <span className="stl-item-brand">{item.brand}</span>
                  <div className="stl-item-price-tag">
                    <span>{item.price}</span>
                  </div>
                </div>
              </div>

              <button 
                className="stl-redirect-btn"
                onClick={() => handleRedirect(item)}
                aria-label={`Redirect to store for ${item.name}`}
                title={item.link ? `Open link: ${item.link}` : 'No purchase link available'}
                style={{
                  opacity: item.link ? 1 : 0.45,
                  cursor: item.link ? 'pointer' : 'not-allowed'
                }}
              >
                <ExternalLink size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Form to tag another item */}
        {showAddForm && (
          <form className="stl-add-form" onSubmit={handleTagItem}>
            <div className="stl-form-row">
              <input 
                type="text" 
                placeholder="Item Name (e.g. Cargo Pants)" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className="stl-input"
                required
              />
            </div>
            <div className="stl-form-row double">
              <input 
                type="text" 
                placeholder="Brand (e.g. H&M)" 
                value={newBrand} 
                onChange={(e) => setNewBrand(e.target.value)}
                className="stl-input"
                required
              />
              <input 
                type="text" 
                placeholder="Price (e.g. 49.99)" 
                value={newPrice} 
                onChange={(e) => setNewPrice(e.target.value)}
                className="stl-input"
                required
              />
            </div>
            <div className="stl-form-row">
              <input 
                type="url" 
                placeholder="Purchase Link (optional, e.g. https://...)" 
                value={newLink} 
                onChange={(e) => setNewLink(e.target.value)}
                className="stl-input"
              />
            </div>
            <div className="stl-form-buttons">
              <button type="button" className="stl-form-cancel" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
              <button type="submit" className="stl-form-submit">
                Add Tag
              </button>
            </div>
          </form>
        )}

        {/* Bottom CTA Tag Button */}
        {!showAddForm && (
          <div className="stl-bottom-cta">
            <button 
              className="stl-tag-btn"
              onClick={() => setShowAddForm(true)}
            >
              <Link2 size={16} />
              <span>Tag Another Item</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
