import React from 'react';
import {
  Activity,
  CheckCircle,
  CheckCircle2,
  Pause,
  PauseCircle,
  AlertCircle,
  Clock,
  XCircle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * StatusBadge - Unified status indicator for tasks, executions, and activity states
 *
 * Supports all status types found across the application:
 * - Task activity: active, paused, completed
 * - Execution status: success, failed, pending, running
 * - Condition status: met, not_met
 * - Custom status with icon
 */

export type StatusVariant =
  | 'active'
  | 'paused'
  | 'completed'
  | 'success'
  | 'failed'
  | 'pending'
  | 'running'
  | 'retrying'
  | 'triggered'
  | 'cancelled'
  | 'unknown';

interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

type VariantStyle = {
  background: string;
  color: string;
  border: string;
};

const SUCCESS: VariantStyle = {
  background: 'var(--ww-success-bg)',
  color: 'var(--ww-success)',
  border: '1px solid transparent',
};
const WARN: VariantStyle = {
  background: 'var(--ww-warn-soft)',
  color: 'var(--ww-warn)',
  border: '1px solid transparent',
};
const DANGER: VariantStyle = {
  background: 'var(--ww-danger-soft)',
  color: 'var(--ww-danger)',
  border: '1px solid transparent',
};
const INFO: VariantStyle = {
  background: 'var(--ww-info-soft)',
  color: 'var(--ww-info)',
  border: '1px solid transparent',
};
const NEUTRAL: VariantStyle = {
  background: 'var(--ww-paper)',
  color: 'var(--ww-ink-3)',
  border: '1px solid var(--ww-ink-6)',
};
const EMBER: VariantStyle = {
  background: 'var(--ww-ember-bg)',
  color: 'var(--ww-ember-ink)',
  border: '1px solid transparent',
};

const variantConfig: Record<
  StatusVariant,
  {
    style: VariantStyle;
    icon: React.ReactNode;
    label: string;
  }
> = {
  active: {
    style: SUCCESS,
    icon: <Activity className="w-3 h-3" />,
    label: 'Active',
  },
  paused: {
    style: NEUTRAL,
    icon: <PauseCircle className="w-3 h-3" />,
    label: 'Paused',
  },
  completed: {
    style: INFO,
    icon: <CheckCircle className="w-3 h-3" />,
    label: 'Completed',
  },
  success: {
    style: SUCCESS,
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: 'Success',
  },
  failed: {
    style: DANGER,
    icon: <XCircle className="h-3 w-3" />,
    label: 'Failed',
  },
  pending: {
    style: INFO,
    icon: <Clock className="h-3 w-3" />,
    label: 'Pending',
  },
  running: {
    style: INFO,
    icon: <Clock className="h-3 w-3" />,
    label: 'Running',
  },
  retrying: {
    style: WARN,
    icon: <Clock className="h-3 w-3" />,
    label: 'Retrying',
  },
  triggered: {
    style: EMBER,
    icon: <Zap className="h-3 w-3" />,
    label: 'Triggered',
  },
  cancelled: {
    style: NEUTRAL,
    icon: <Pause className="h-3 w-3" />,
    label: 'Cancelled',
  },
  unknown: {
    style: WARN,
    icon: <AlertCircle className="h-3 w-3" />,
    label: 'Unknown',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  label,
  icon,
  className,
  size = 'sm',
}) => {
  const config = variantConfig[variant];
  const displayLabel = label || config.label;
  const displayIcon = icon || config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-sm font-mono uppercase',
        size === 'sm' ? 'text-[10.5px]' : 'text-[11px]',
        className
      )}
      style={{
        background: config.style.background,
        color: config.style.color,
        border: config.style.border,
        letterSpacing: '0.06em',
      }}
    >
      {displayIcon}
      {displayLabel}
    </span>
  );
};
