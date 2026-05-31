import { cn } from '@/lib/utils';

export function StarRating({ stars, max = 5 }: { stars: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${stars} из ${max} звёзд`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={cn(
            'text-xs',
            i < stars ? 'text-value-400' : 'text-pitch-700',
          )}
        >
          ★
        </span>
      ))}
    </span>
  );
}
