'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ChevronDown, BarChart3, Bot, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useLocale } from '@/components/i18n/locale-provider';
import { cn } from '@/lib/utils';

const FEATURE_ICONS: LucideIcon[] = [BarChart3, Bot, ShieldCheck];

export default function AboutPage() {
  const { t } = useLocale();
  const L = t.landing;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      {/* Hero */}
      <section className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--accent))' }}>BETANALYSE.PRO</p>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl" style={{ color: 'rgb(var(--fg-primary))' }}>
          {L.heroTitle}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'rgb(var(--fg-secondary))' }}>
          {L.heroSubtitle}
        </p>
        <Link
          href="/"
          className="mt-9 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold transition-transform hover:scale-[1.02]"
          style={{ background: 'rgb(var(--fg-primary))', color: 'rgb(var(--pitch-950))' }}
        >
          {L.heroCta} <ArrowRight className="h-5 w-5" />
        </Link>
        <p className="mt-10 text-sm font-semibold" style={{ color: 'rgb(var(--fg-secondary))' }}>{L.heroTagline}</p>
      </section>

      {/* Feature cards */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {L.features.map((f, i) => {
          const Icon = FEATURE_ICONS[i] ?? BarChart3;
          return (
            <div
              key={i}
              className="rounded-2xl p-5 text-center"
              style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' }}
            >
              <div
                className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: 'rgb(var(--accent) / 0.12)' }}
              >
                <Icon className="h-6 w-6" style={{ color: 'rgb(var(--accent))' }} />
              </div>
              <h3 className="text-sm font-bold" style={{ color: 'rgb(var(--fg-card))' }}>{f.title}</h3>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: 'rgb(var(--fg-muted))' }}>{f.desc}</p>
            </div>
          );
        })}
      </section>

      {/* Announcement banner */}
      <section
        className="mt-6 rounded-2xl p-6 text-center"
        style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' }}
      >
        <h2 className="text-lg font-bold sm:text-xl" style={{ color: 'rgb(var(--fg-primary))' }}>{L.bannerTitle}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: 'rgb(var(--fg-secondary))' }}>{L.bannerText}</p>
      </section>

      {/* What is betanalyse.pro + FAQ — unified accordion list */}
      <section className="mt-14">
        <h2 className="text-center text-2xl font-bold sm:text-3xl" style={{ color: 'rgb(var(--fg-primary))' }}>{L.faqTitle}</h2>
        <div className="mt-6 space-y-3">
          {/* About block as first accordion item, open by default */}
          <AboutItem title={L.aboutTitle} paragraphs={L.aboutParagraphs} />
          {L.faq.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} defaultOpen={false} />
          ))}
        </div>
      </section>
    </div>
  );
}

function AboutItem({ title, paragraphs }: { title: string; paragraphs: readonly string[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold sm:text-base" style={{ color: 'rgb(var(--fg-card))' }}>{title}</span>
        <ChevronDown
          className={cn('h-5 w-5 shrink-0 transition-transform', open && 'rotate-180')}
          style={{ color: 'rgb(var(--fg-muted))' }}
        />
      </button>
      {open && (
        <div className="space-y-3 px-5 pb-5">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className={cn(
                'text-sm leading-relaxed',
                i === paragraphs.length - 1 && 'mt-1 rounded-xl px-3 py-2.5',
              )}
              style={
                i === paragraphs.length - 1
                  ? { color: 'rgb(var(--fg-muted))', background: 'rgb(var(--pitch-800))' }
                  : { color: 'rgb(var(--fg-secondary))' }
              }
            >
              {p}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function FaqItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold sm:text-base" style={{ color: 'rgb(var(--fg-card))' }}>{q}</span>
        <ChevronDown
          className={cn('h-5 w-5 shrink-0 transition-transform', open && 'rotate-180')}
          style={{ color: 'rgb(var(--fg-muted))' }}
        />
      </button>
      {open && (
        <div className="space-y-2.5 px-5 pb-4">
          {a.split('\n\n').map((para, i) => (
            <p key={i} className="text-sm leading-relaxed" style={{ color: 'rgb(var(--fg-secondary))' }}>{para}</p>
          ))}
        </div>
      )}
    </div>
  );
}
