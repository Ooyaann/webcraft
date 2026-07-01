import React from 'react';

export default function WebCraftLogo({ className = "w-10 h-10" }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={`${className} select-none shrink-0`} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 3D Drop Shadow */}
      <ellipse cx="50" cy="88" rx="28" ry="7" fill="#0F172A" fillOpacity="0.15" />

      {/* Left Face (Pink: representing HTML/Structure block) */}
      <polygon 
        points="15,35 50,53 50,83 15,65" 
        fill="#EC4899" 
        stroke="#0F172A" 
        strokeWidth="5" 
        strokeLinejoin="round" 
      />

      {/* Right Face (Yellow: representing CSS/Design block) */}
      <polygon 
        points="50,53 85,35 85,65 50,83" 
        fill="#FACC15" 
        stroke="#0F172A" 
        strokeWidth="5" 
        strokeLinejoin="round" 
      />

      {/* Top Face (Blue: representing Browser/Web view) */}
      <polygon 
        points="50,17 85,35 50,53 15,35" 
        fill="#3B82F6" 
        stroke="#0F172A" 
        strokeWidth="5" 
        strokeLinejoin="round" 
      />

      {/* Browser control dots on Top Face (simulating webpage) */}
      <circle cx="34" cy="32" r="2.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
      <circle cx="42" cy="35" r="2.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
      <circle cx="50" cy="38" r="2.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />

      {/* Left Face Symbol: Code bracket '<' */}
      <path 
        d="M 38,51 L 27,56 L 38,62" 
        stroke="#FFFFFF" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Right Face Symbol: Curly brace '}' */}
      <path 
        d="M 62,51 C 65,52 65,55 67,56 C 65,57 65,60 62,61" 
        stroke="#0F172A" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}
