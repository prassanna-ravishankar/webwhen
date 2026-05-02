import React from 'react';
import { motion, MotionProps } from '@/lib/motion-compat';
import { cn } from '@/lib/utils';

/**
 * Card — webwhen paper-on-paper card primitive.
 *
 * Visuals follow design/webwhen/README.md "Cards" + "Hover & press states":
 *   - white surface on canvas, 1px hairline border (--ww-ink-6)
 *   - resting shadow --ww-shadow-sm; hover shadow --ww-shadow-md + border darkens to --ww-ink-5
 *   - NO translate-up on hover (deliberate — calm, not bouncy)
 *   - press: translate-y-px and lose shadow
 *   - radius-md (10px); consumer owns internal padding
 *
 * Variants:
 *   - default:   non-interactive surface
 *   - clickable: cursor-pointer + hover/press affordances
 *   - ghost:     transparent, no border/shadow (structural wrapper)
 */

interface CardProps extends Omit<MotionProps, 'onClick'> {
  children: React.ReactNode;
  variant?: 'default' | 'clickable' | 'ghost';
  onClick?: () => void;
  className?: string;
  animate?: boolean; // Enable enter/exit motion
  hoverEffect?: boolean; // Opt-in extra hover emphasis (border darkens further)
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  onClick,
  className,
  animate = false,
  hoverEffect = false,
  ...motionProps
}) => {
  const baseStyles =
    'relative flex flex-col rounded-[var(--ww-radius-md)] transition-[box-shadow,border-color,transform] duration-ww-fast ease-ww-out';

  const variantStyles = {
    default:
      'bg-[var(--ww-paper)] border border-[color:var(--ww-ink-6)] shadow-ww-sm',
    clickable:
      'bg-[var(--ww-paper)] border border-[color:var(--ww-ink-6)] shadow-ww-sm cursor-pointer hover:shadow-ww-md hover:border-[color:var(--ww-ink-5)] active:translate-y-px active:shadow-none',
    ghost: 'bg-transparent',
  };

  // Optional extra hover emphasis — pulls border to ink-2 instead of ink-5.
  const hoverEmphasis =
    hoverEffect && variant !== 'ghost'
      ? 'hover:border-[color:var(--ww-ink-2)]'
      : '';

  const animationProps = animate
    ? {
        layout: true,
        initial: { opacity: 0, y: 4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 4 },
        transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
      }
    : {};

  return (
    <motion.div
      className={cn(
        baseStyles,
        variantStyles[variant],
        hoverEmphasis,
        onClick && variant === 'default' && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      {...animationProps}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
};
