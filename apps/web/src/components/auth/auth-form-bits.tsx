'use client';

import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/brand/brand-logo';

/** Brand logo block shown above auth forms. */
export function AuthLogo({ title, subtitle }: { icon?: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <BrandLogo size={36} />
      <h1 className="mt-4 text-xl font-semibold" style={{ color: 'rgb(var(--fg-primary))' }}>{title}</h1>
      {subtitle && <p className="mt-1 text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>{subtitle}</p>}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'rgb(var(--fg-secondary))' }}>{label}</label>
      {children}
    </div>
  );
}

export const authInputCls =
  'w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all bg-[rgb(var(--pitch-800))] border border-[rgb(var(--pitch-700))] text-[rgb(var(--fg-primary))] placeholder:text-[rgb(var(--fg-muted))] focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent)/0.25)]';

export const authButtonCls =
  'w-full rounded-xl py-2.5 text-sm font-semibold transition-all bg-[rgb(var(--accent))] text-[rgb(var(--on-accent))] hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--pitch-900))]';
