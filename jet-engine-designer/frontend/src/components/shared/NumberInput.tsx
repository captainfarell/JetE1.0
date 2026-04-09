import React, { useState, useEffect } from 'react';

interface NumberInputProps {
  value: number | string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export default function NumberInput({ value, onChange, min, max, step = 0.01, disabled, className = '' }: NumberInputProps) {
  const [localValue, setLocalValue] = useState(String(value));

  // Sync from parent only when the external value differs from what we have
  useEffect(() => {
    const parsed = parseFloat(localValue);
    if (isNaN(parsed) || parsed !== Number(value)) {
      setLocalValue(String(value));
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setLocalValue(raw);
    const n = parseFloat(raw);
    if (!isNaN(n)) {
      onChange(raw);
    }
  }

  function handleBlur() {
    const n = parseFloat(localValue);
    if (isNaN(n) || localValue.trim() === '') {
      // Revert to last valid parent value
      setLocalValue(String(value));
    } else {
      // Clamp to min/max, then normalise display
      let clamped = n;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      setLocalValue(String(clamped));
      onChange(String(clamped));
    }
  }

  return (
    <input
      type="number"
      className={`w-full bg-app-muted border border-app-border text-app-text rounded-md px-3 py-2 text-sm focus:outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent disabled:opacity-50 ${className}`}
      value={localValue}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
