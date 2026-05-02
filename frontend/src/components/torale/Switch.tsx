import React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>;

/**
 * Switch — webwhen.ai toggle primitive.
 *
 * Editorial calm: hairline track, soft shadow on the thumb, ember reserved
 * for the "on" moment (per design brief: ember marks a single trigger event,
 * which is exactly what flipping a switch is).
 *
 * Visuals:
 *  - Track: 1px hairline (var(--ww-ink-6)) on a subtle fill (var(--ww-ink-7)).
 *  - Checked: track fills with var(--ww-ember), border darkens to ember.
 *  - Thumb: paper-white, soft shadow, smooth slide.
 *  - Focus: ember-tinted focus ring via --ww-shadow-focus.
 */
export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, ...props }, ref) => {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        // Layout
        'peer inline-flex h-5 w-9 shrink-0 items-center rounded-full',
        // Hairline border + base fill
        'border border-[color:var(--ww-ink-6)] bg-[var(--ww-ink-7)]',
        // Motion (matches token surface)
        'transition-colors duration-[var(--ww-dur-normal)] ease-[var(--ww-ease-out)]',
        // Checked state — ember moment
        'data-[state=checked]:bg-[var(--ww-ember)] data-[state=checked]:border-[color:var(--ww-ember)]',
        // Focus ring via design-token shadow
        'outline-none focus-visible:shadow-ww-focus',
        // Disabled
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full',
          'bg-[var(--ww-paper)] shadow-ww-sm',
          'transition-transform duration-[var(--ww-dur-normal)] ease-[var(--ww-ease-out)]',
          // Slide: track is 36px wide, thumb 16px, 1px border each side → 2px / 18px.
          'translate-x-[2px] data-[state=checked]:translate-x-[18px]'
        )}
      />
    </SwitchPrimitive.Root>
  );
});

Switch.displayName = 'Switch';
