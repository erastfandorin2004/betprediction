'use client';

import Link from 'next/link';
import { Check, Zap, Crown } from 'lucide-react';
import { useLocale } from '@/components/i18n/locale-provider';

const ACCENT = '#e2823c';

export default function PricingPage() {
  const { t } = useLocale();
  const P = t.pricing;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl" style={{ color: 'rgb(var(--fg-primary))' }}>
          {P.title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base" style={{ color: 'rgb(var(--fg-secondary))' }}>{P.subtitle}</p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {/* Free */}
        <div
          className="flex flex-col rounded-3xl p-6"
          style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' }}
        >
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" style={{ color: ACCENT }} />
            <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--fg-primary))' }}>{P.free.name}</h2>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{P.free.tagline}</p>
          <div className="mt-4 flex items-end gap-1">
            <span className="text-3xl font-extrabold" style={{ color: 'rgb(var(--fg-primary))' }}>{P.free.price}</span>
          </div>
          <ul className="mt-5 space-y-2.5">
            {P.free.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'rgb(var(--fg-secondary))' }}>
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="mt-6 rounded-full py-2.5 text-center text-sm font-semibold transition-colors"
            style={{ background: 'rgb(var(--pitch-700))', color: 'rgb(var(--fg-primary))' }}
          >
            {P.free.cta}
          </Link>
        </div>

        {/* Pro — highlighted */}
        <div
          className="relative flex flex-col overflow-hidden rounded-3xl p-6"
          style={{
            background: 'rgb(var(--pitch-900))',
            border: '1px solid rgba(226,130,60,0.4)',
            boxShadow: '0 0 40px rgba(226,130,60,0.12)',
          }}
        >
          {/* corner glow */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(226,130,60,0.25), transparent 70%)' }}
          />
          <span
            className="absolute right-5 top-6 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider"
            style={{ background: 'rgba(226,130,60,0.2)', color: ACCENT }}
          >
            {P.soon}
          </span>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5" style={{ color: ACCENT }} />
            <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--fg-primary))' }}>{P.pro.name}</h2>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{P.pro.tagline}</p>
          <div className="mt-4 flex items-end gap-1">
            <span className="text-3xl font-extrabold" style={{ color: 'rgb(var(--fg-primary))' }}>{P.pro.price}</span>
            <span className="mb-1 text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>{P.perMonth}</span>
          </div>
          <ul className="mt-5 space-y-2.5">
            {P.pro.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'rgb(var(--fg-card))' }}>
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                {f}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled
            className="mt-6 cursor-not-allowed rounded-full py-2.5 text-center text-sm font-bold"
            style={{ background: `linear-gradient(90deg, #e2823c, #c46a2c)`, color: '#04140a', opacity: 0.85 }}
          >
            {P.pro.cta}
          </button>
        </div>
      </div>

      <p className="mt-8 text-center text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{P.note}</p>
    </div>
  );
}
