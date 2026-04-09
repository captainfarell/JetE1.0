import React from 'react';

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
  return (
    <input
      type="number"
      className={`w-full bg-app-muted border border-app-border text-app-text rounded-md px-3 py-2 text-sm focus:outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent disabled:opacity-50 ${className}`}
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
    />
  );
}
