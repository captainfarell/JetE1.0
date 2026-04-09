import React, { useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export default function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="tooltip-content absolute z-50 left-full ml-2 top-0 w-72 bg-app-muted border border-app-secondary text-app-text text-xs rounded-lg p-3 shadow-xl">
          {text}
        </div>
      )}
    </span>
  );
}
