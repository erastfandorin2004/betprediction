'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';
import { useLocale } from '@/components/i18n/locale-provider';
import { register } from '@/lib/auth';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const { signIn } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const tokens = await register(email, password);
      signIn(tokens);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.registerError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <p className="text-2xl font-bold">⚡ AI-Score</p>
        <h1 className="mt-2 text-xl font-semibold text-zinc-200">{t.auth.createTitle}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t.auth.freeSub}</p>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="card-surface space-y-4 p-6">
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="you@example.com"
            required
            autoFocus
          />
        </Field>

        <Field label={t.auth.password}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder={t.auth.passwordHint}
            required
            minLength={8}
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-loss-500/10 px-3 py-2 text-sm text-loss-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full rounded-xl bg-electric-600 py-2.5 text-sm font-semibold text-white transition-all',
            'hover:bg-electric-500 disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {loading ? t.auth.creating : t.auth.createBtn}
        </button>

        <p className="text-center text-xs text-zinc-700">{t.auth.ageConfirm}</p>

        <p className="text-center text-sm text-zinc-500">
          {t.auth.hasAccount}{' '}
          <Link href="/login" className="text-electric-400 hover:text-electric-300">
            {t.auth.signInBtn}
          </Link>
        </p>
      </form>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-pitch-700 bg-pitch-800 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-electric-600 focus:ring-1 focus:ring-electric-600/30 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  );
}
