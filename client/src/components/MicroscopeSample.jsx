import React from 'react';

// Stylized measurements for the fictional RP instrument, not a scientific image.
export default function MicroscopeSample({ tool = 'pliers', angle = 45, focus = 100, zoom = 100, color = '#6ddce5', opacity = 1 }) {
  const ridges = tool === 'hacksaw' ? [12, 28, 44, 60, 76, 92] : tool === 'knife' ? [32, 70] : [12, 24, 43, 57, 81];
  return (
    <svg viewBox="0 0 180 140" className="microscope-sample" role="img" aria-label={`Срез: ${tool === 'pliers' ? 'нерегулярные параллельные борозды' : tool === 'hacksaw' ? 'частые зубчатые борозды' : 'гладкая кромка'}, угол ${angle} градусов`} style={{ opacity }}>
      <g transform={`translate(90 70) scale(${zoom / 100}) rotate(${angle - 45}) translate(-90 -70)`} style={{ filter: `blur(${Math.max(0, (100 - focus) / 35)}px)` }}>
        <path d={tool === 'hacksaw' ? 'M25 112 L35 38 L46 44 L56 33 L67 39 L77 28 L88 34 L98 23 L110 29 L120 18 L148 14 L154 112 Z' : 'M25 112 L35 38 L148 14 L154 112 Z'} fill="none" stroke={color} strokeWidth="2" />
        {ridges.map((x, i) => <path key={x} d={`M${40 + x} ${37 - x * 0.2} l${tool === 'knife' ? -10 : i % 2 ? 5 : -3} ${tool === 'knife' ? 60 : 32 + i * 7}`} stroke={color} strokeWidth={i % 2 ? 1 : 2} opacity={0.45 + i * 0.1} />)}
      </g>
    </svg>
  );
}
