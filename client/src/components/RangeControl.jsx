import React, { useId } from 'react';
import { SoundFX } from './SoundFX';

export default function RangeControl({ label, value, min, max, step = 1, unit = '', showSlider = true, disabled = false, onChange }) {
  const id = useId();
  const update = (next) => {
    if (!Number.isFinite(next)) return;
    const rounded = min + Math.round((next - min) / step) * step;
    const bounded = Math.max(min, Math.min(max, rounded));
    onChange(bounded);
    SoundFX.playAdjust((bounded - min) / (max - min || 1) * 100);
  };
  return (
    <div className="range-control">
      <label htmlFor={id}>{label}</label>
      <div className="range-control-values">
        <button type="button" aria-label={`Уменьшить: ${label}`} disabled={disabled || value <= min} onClick={() => update(value - step)}>−</button>
        <input disabled={disabled} id={id} type="number" min={min} max={max} step={step} value={value} onChange={(e) => { if (e.target.value !== '') update(e.target.valueAsNumber); }} />
        <span>{unit}</span>
        <button type="button" aria-label={`Увеличить: ${label}`} disabled={disabled || value >= max} onClick={() => update(value + step)}>+</button>
      </div>
      {showSlider && <input disabled={disabled} type="range" aria-label={label} aria-valuetext={`${value} ${unit}`} min={min} max={max} step={step} value={value} onChange={(e) => update(Number(e.target.value))} />}
    </div>
  );
}
