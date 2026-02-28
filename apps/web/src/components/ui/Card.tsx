import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  highlighted?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Card({ title, children, highlighted = false, onClick, className = '' }: CardProps) {
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border p-5 shadow-sm
        ${highlighted ? 'border-gray-900 ring-2 ring-gray-900' : 'border-gray-200'}
        ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${className}
      `.trim()}
    >
      {title && (
        <h3 className="text-base font-semibold text-gray-900 mb-3">{title}</h3>
      )}
      {children}
    </div>
  );
}
