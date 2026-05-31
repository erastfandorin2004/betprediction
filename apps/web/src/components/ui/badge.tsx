import { cn } from '@/lib/utils';

type BadgeVariant = 'electric' | 'goal' | 'loss' | 'value' | 'muted';

const variants: Record<BadgeVariant, string> = {
  electric: 'bg-electric-500/15 text-electric-400',
  goal: 'bg-goal-500/15 text-goal-400',
  loss: 'bg-loss-500/15 text-loss-400',
  value: 'bg-value-500/15 text-value-400',
  muted: 'bg-pitch-800 text-zinc-500',
};

export function Badge({
  children,
  variant = 'muted',
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
