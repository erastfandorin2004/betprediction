export function LiveBadge({ minute }: { minute: number | null }) {
  return (
    <span className="badge-live">
      <span className="h-1.5 w-1.5 animate-pulse-slow rounded-full bg-loss-400" />
      {minute !== null ? `${minute}′` : 'LIVE'}
    </span>
  );
}
