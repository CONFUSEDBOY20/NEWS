import React from "react";

/** Shared official TruthLens logo image used across the site. */
export function TruthLensLogo({ className = "", imageClassName = "" }) {
  return (
    <span className={`inline-flex items-center ${className}`} aria-label="TruthLens News Verification">
      <img
        src="/truthlens-logo.png"
        alt="TruthLens News Verification"
        className={`block h-auto w-[96px] shrink-0 rounded-lg object-contain ${imageClassName}`}
      />
    </span>
  );
}
