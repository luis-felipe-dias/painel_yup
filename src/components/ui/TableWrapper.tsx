import React from 'react';
import { cn } from '../../utils/cn';

interface TableWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function TableWrapper({ children, className }: TableWrapperProps) {
  return (
    <div className={cn(
      "w-full overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0",
      className
    )}>
      <div className="min-w-[700px] md:min-w-0">
        {children}
      </div>
    </div>
  );
}
