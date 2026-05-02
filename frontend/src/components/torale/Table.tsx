import React from 'react';
import { motion, MotionProps } from '@/lib/motion-compat';
import { cn } from '@/lib/utils';

/**
 * Table - webwhen editorial table primitive
 *
 * Visual rules (per design/webwhen/README.md "VISUAL FOUNDATIONS"):
 * - Hairlines only (1px, --ww-ink-6). No 2px borders, no offset shadows.
 * - Sections separated by whitespace; the only divider is a row hairline.
 * - Header cells use the .ww-eyebrow semantics (mono, uppercase, 11px,
 *   wide tracking, --ww-ink-4).
 * - No zebra striping. Hover darkens text one step (ink-3 → ink-1).
 */

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface TableRowProps extends Omit<MotionProps, 'onClick'> {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

interface TableHeadProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface TableCellProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

const alignmentClass = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

export const Table: React.FC<TableProps> = ({ children, className }) => {
  return (
    <table
      className={cn(
        'w-full border-collapse text-[color:var(--ww-ink-2)]',
        className,
      )}
    >
      {children}
    </table>
  );
};

export const TableHeader: React.FC<TableHeaderProps> = ({
  children,
  className,
}) => {
  return (
    <thead
      className={cn('border-b border-[color:var(--ww-ink-6)]', className)}
    >
      {children}
    </thead>
  );
};

export const TableBody: React.FC<TableBodyProps> = ({ children, className }) => {
  return <tbody className={className}>{children}</tbody>;
};

export const TableRow: React.FC<TableRowProps> = ({
  children,
  onClick,
  className,
  ...motionProps
}) => {
  return (
    <motion.tr
      onClick={onClick}
      className={cn(
        'border-b border-[color:var(--ww-ink-6)] last:border-0',
        'text-[color:var(--ww-ink-3)]',
        'transition-colors duration-150 ease-out',
        'hover:text-[color:var(--ww-ink-1)] hover:border-[color:var(--ww-ink-5)]',
        onClick && 'cursor-pointer',
        className,
      )}
      {...motionProps}
    >
      {children}
    </motion.tr>
  );
};

export const TableHead: React.FC<TableHeadProps> = ({
  children,
  align = 'left',
  className,
}) => {
  return (
    <th
      className={cn(
        'py-3 px-4 font-mono font-medium uppercase tracking-wider text-[11px] text-[color:var(--ww-ink-4)]',
        alignmentClass[align],
        className,
      )}
    >
      {children}
    </th>
  );
};

export const TableCell: React.FC<TableCellProps> = ({
  children,
  align = 'left',
  className,
}) => {
  return (
    <td
      className={cn(
        'py-3 px-4 text-sm text-[color:var(--ww-ink-2)]',
        alignmentClass[align],
        className,
      )}
    >
      {children}
    </td>
  );
};
