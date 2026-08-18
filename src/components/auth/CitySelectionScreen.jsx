import React, { useState } from 'react';
import { MapPin, Search, Check, ArrowRight, Compass } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CITIES_METADATA as CITIES } from '../../lib/cities';

export default function CitySelectionScreen({ onCitySelected }) {
  const { updateCity } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const filteredCities = CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!selectedCity) return;
    setIsSubmitting(true);
    try {
      await updateCity(selectedCity);
      onCitySelected(selectedCity);
    } catch (err) {
      setError(err.message || 'Could not save city. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-screen city-selection-screen">
      <div className="auth-card city-card-container">
        <div className="city-header-icon">
          <Compass size={32} className="compass-icon" />
        </div>

        <div className="auth-header" style={{ textAlign: 'center' }}>
          <h2 className="auth-title">Where are you based?</h2>
          <p className="auth-subtitle">
            Select your local city hub to unlock regional fit rankings, community drops, and leaderboards.
          </p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <span>{error}</span>
          </div>
        )}

        {/* Search Input */}
        <div className="city-search-wrapper">
          <Search size={18} className="city-search-icon" />
          <input
            type="text"
            className="city-search-input"
            placeholder="Search Kolkata, Mumbai, Tokyo, etc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* City Selection List */}
        <div className="city-list-scrollable">
          {filteredCities.length === 0 ? (
            <div className="city-empty-state">
              <MapPin size={24} />
              <span>No cities found matching "{searchQuery}"</span>
            </div>
          ) : (
            filteredCities.map((city) => {
              const isSelected = selectedCity === city.name;
              return (
                <div
                  key={city.name}
                  className={`city-item-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedCity(city.name)}
                >
                  <div className="city-item-left">
                    <span className="city-flag">{city.flag}</span>
                    <div className="city-item-info">
                      <span className="city-item-name">{city.name}</span>
                      <span className="city-item-sub">{city.region}, {city.country}</span>
                    </div>
                  </div>

                  <div className={`city-item-radio ${isSelected ? 'checked' : ''}`}>
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Unskippable Notice & Continue Button */}
        <div className="city-footer-sticky">
          <div className="city-unskippable-notice">
            <MapPin size={14} />
            <span>City selection is required to customize your local feed</span>
          </div>

          <button
            type="button"
            className="auth-btn-primary"
            disabled={!selectedCity || isSubmitting}
            onClick={handleContinue}
          >
            <span>{isSubmitting ? 'Saving...' : 'Continue'}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
