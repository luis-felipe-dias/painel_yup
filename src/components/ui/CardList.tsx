import React from 'react';
import { cn } from '../../utils/cn';

interface CardListProps {
  children: React.ReactNode;
  className?: string;
}

export function CardList({ children, className }: CardListProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 gap-3 md:hidden",
      className
    )}>
      {children}
    </div>
  );
}

interface CardItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isActive?: boolean;
  priority?: 'critico' | 'precisa_repor' | 'ok';
}

export function CardItem({ children, className, onClick, isActive, priority }: CardItemProps) {
  const getPriorityColor = () => {
    if (priority === 'critico') return 'border-l-4 border-red-500 bg-red-50/50 dark:bg-red-950/20';
    if (priority === 'precisa_repor') return 'border-l-4 border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20';
    if (priority === 'ok') return 'border-l-4 border-green-500 bg-green-50/50 dark:bg-green-950/20';
    return 'border-l-4 border-gray-300 dark:border-gray-700';
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-4 rounded-lg border border-[#e5e5ea] dark:border-[#38383a] shadow-sm hover:shadow-md transition-all cursor-pointer",
        getPriorityColor(),
        isActive && "ring-2 ring-[#007aff]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between py-1.5 border-b border-[#e5e5ea]/50 dark:border-[#38383a]/50 last:border-0", className)}>
      <span className="text-sm text-[#86868b]">{label}</span>
      <span className="text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7] truncate ml-2">{value}</span>
    </div>
  );
}
