import React from 'react';

export default function CrtOverlay({ enabled = true }) {
  if (!enabled) return null;
  return (
    <>
      <div className="crt-overlay" aria-hidden="true" />
      <div className="crt-vignette" aria-hidden="true" />
    </>
  );
}
