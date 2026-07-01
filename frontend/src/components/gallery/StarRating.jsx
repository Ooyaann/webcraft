import React, { useState } from 'react';

export default function StarRating({ rating = 0, max = 5, readOnly = false, onChange, size = 'md' }) {
  const [hoverRating, setHoverRating] = useState(0);

  const starSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  const handleMouseEnter = (val) => {
    if (!readOnly) setHoverRating(val);
  };

  const handleMouseLeave = () => {
    if (!readOnly) setHoverRating(0);
  };

  const handleClick = (val) => {
    if (!readOnly && onChange) {
      onChange(val);
    }
  };

  return (
    <div className="flex gap-1" onMouseLeave={handleMouseLeave}>
      {[...Array(max)].map((_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= (hoverRating || rating);
        
        return (
          <span 
            key={i}
            className={`material-symbols-rounded ${starSizes[size]} transition-transform ${isFilled ? 'text-[#FACC15] fill-[#FACC15]' : 'text-gray-300'} ${!readOnly ? 'cursor-pointer hover:scale-125' : ''}`}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onClick={() => handleClick(starValue)}
            style={{ fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0" }}
          >
            star
          </span>
        );
      })}
    </div>
  );
}
