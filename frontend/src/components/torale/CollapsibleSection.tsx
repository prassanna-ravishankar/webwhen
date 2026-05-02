import React from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionLabel } from './SectionLabel';
import { motion, AnimatePresence } from '@/lib/motion-compat';

/**
 * CollapsibleSection - Unified collapsible section with consistent trigger styling
 *
 * Used for:
 * - Task configuration sections
 * - Execution metadata
 * - Dev/debug information
 */

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  variant?: 'default' | 'dark' | 'mobile';
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  open,
  onOpenChange,
  defaultOpen,
  variant = 'default',
  className,
  triggerClassName,
  contentClassName,
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen ?? false);
  const controlled = open !== undefined;
  const expanded = controlled ? open : isOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!controlled) {
      setIsOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const triggerStyles = {
    default:
      'flex items-center gap-2 text-sm font-mono text-[var(--ww-ink-3)] hover:text-[var(--ww-ink-0)] transition-colors w-full justify-between p-3 bg-[var(--ww-paper)] border border-[var(--ww-ink-6)]',
    dark: 'flex items-center gap-2 text-sm font-mono text-[var(--ww-ink-3)] hover:text-[var(--ww-ink-0)] transition-colors w-full justify-between p-3 bg-[var(--ww-ink-1)] border border-[var(--ww-ink-2)]',
    mobile:
      'flex items-center gap-2 text-sm font-mono text-[var(--ww-ink-3)] hover:text-[var(--ww-ink-0)] transition-colors w-full justify-between p-3 bg-[var(--ww-paper)] border border-[var(--ww-ink-6)] lg:hidden',
  };

  return (
    <Collapsible
      open={expanded}
      onOpenChange={handleOpenChange}
      className={className}
    >
      <CollapsibleTrigger
        className={cn(triggerStyles[variant], triggerClassName)}
      >
        <SectionLabel className="text-[var(--ww-ink-3)]">
          {title}
        </SectionLabel>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--ww-ink-3)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--ww-ink-3)]" />
        )}
      </CollapsibleTrigger>
      <AnimatePresence initial={false}>
        {expanded && (
          <CollapsibleContent forceMount asChild>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={cn("overflow-hidden", contentClassName)}
            >
              {children}
            </motion.div>
          </CollapsibleContent>
        )}
      </AnimatePresence>
    </Collapsible>
  );
};
