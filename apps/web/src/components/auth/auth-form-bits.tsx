'use client';

import type { ReactNode } from 'react';

/** Brand logo block shown above auth forms. */
export function AuthLogo({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-2xl"
          style={{ background: 'rgb(var(--accent) / 0.14)', border: '1px solid rgb(var(--accent) / 0.25)', color: 'rgb(var(--accent))' }}
        >
          {icon}
        </span>
        <span className="text-2xl font-bold tracking-tight" style={{ color: 'rgb(var(--fg-primary))' }}>
          AI-Score
        </span>
      </div>
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
  'w-full rounded-xl py-2.5 text-sm font-semibold transition-all bg-[rgb(var(--accent))] text-[#0a0f1e] hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--pitch-900))]';
