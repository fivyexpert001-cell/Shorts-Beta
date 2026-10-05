import React from "react";

// Phase 1 placeholder sprite drawn inline (no API). In Phase 3 this is replaced
// by a PNG generated via ai33.pro image generation (Seedream).
export const ShipSprite: React.FC<{ size?: number }> = ({ size = 64 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }}
    >
      <circle cx="32" cy="32" r="30" fill="#111827" opacity="0.55" />
      {/* hull */}
      <path d="M14 40 h36 l-6 10 h-24 z" fill="#8b5e3c" />
      {/* mast */}
      <rect x="31" y="14" width="2" height="26" fill="#5b3a21" />
      {/* sail */}
      <path d="M33 16 q14 8 0 20 z" fill="#f8fafc" />
      <path d="M31 16 q-12 8 0 20 z" fill="#e2e8f0" />
    </svg>
  );
};
