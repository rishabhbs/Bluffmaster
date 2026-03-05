import { ReactNode } from 'react';

interface WalnutPanelProps {
  children: ReactNode;
  className?: string;
}

export default function WalnutPanel({ children, className = '' }: WalnutPanelProps) {
  return (
    <div
      className={`rounded-lg p-6 shadow-2xl ${className}`}
      style={{
        background: 'var(--walnut-wood)',
        border: '3px solid var(--gold-accent)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      {children}
    </div>
  );
}
