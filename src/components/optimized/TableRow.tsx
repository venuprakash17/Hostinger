import { memo } from 'react';

/**
 * Memoized table row component to prevent unnecessary re-renders
 */
export const OptimizedTableRow = memo(function OptimizedTableRow({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={className} {...props}>{children}</tr>;
});

