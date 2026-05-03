import React from 'react';
import { motion } from '@/lib/motion-compat';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * EmptyState - Consistent empty state component
 *
 * Used for:
 * - No monitors/tasks
 * - No executions
 * - No notifications
 * - Empty search results
 */

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  const commonContent = (
    <>
      <div className="w-12 h-12 rounded-full bg-[var(--ww-ink-7)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6" />
      </div>
      <span className="font-mono text-xs uppercase tracking-widest font-bold text-[var(--ww-ink-2)]">
        {title}
      </span>
      {description && (
        <p className="text-xs text-[var(--ww-ink-3)] mt-2 max-w-md text-center">
          {description}
        </p>
      )}
    </>
  );

  if (action) {
    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={action.onClick}
        className={cn(
          'w-full border border-dashed border-[var(--ww-ink-6)] rounded-sm flex flex-col items-center justify-center p-12 text-[var(--ww-ink-4)] transition-all min-h-[200px]',
          'hover:border-[var(--ww-ink-4)] hover:text-[var(--ww-ink-2)] cursor-pointer group',
          className
        )}
      >
        {commonContent}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'w-full border border-dashed border-[var(--ww-ink-6)] rounded-sm flex flex-col items-center justify-center p-12 text-[var(--ww-ink-4)] transition-all min-h-[200px]',
        className
      )}
    >
      {commonContent}
    </motion.div>
  );
};
