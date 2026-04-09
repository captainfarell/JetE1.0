import React from 'react';

interface SectionHeaderProps {
  title: string;
}

export default function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider text-app-accent mb-3 pb-1 border-b border-app-border">
      {title}
    </h3>
  );
}
