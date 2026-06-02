'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Goal } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { useLocale } from '@/components/i18n/locale-provider';
import { register } from '@/lib/auth';
import { AuthLogo, Field, authInputCls, authButtonCls } from '@/components/auth/auth-form-bits';

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
      <AuthLogo icon={<Goal className="h-5 w-5" />} title={t.auth.createTitle} subtitle={t.auth.freeSub} />

      <form
        onSubmit={(e) => { void handleSubmit(e); }}
        className="space-y-4 rounded-2xl p-6 shadow-sm"
        style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' }}
      >
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputCls}
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
            className={authInputCls}
            placeholder={t.auth.passwordHint}
            required
            minLength={8}
          />
        </Field>

        {error && (
          <p className="rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>{error}</p>
        )}

        <button type="submit" disabled={loading} className={authButtonCls}>
          {loading ? t.auth.creating : t.auth.createBtn}
        </button>

        <p className="text-center text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{t.auth.ageConfirm}</p>

        <p className="text-center text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>
          {t.auth.hasAccount}{' '}
          <Link href="/login" className="font-semibold transition-opacity hover:opacity-80" style={{ color: 'rgb(var(--accent))' }}>
            {t.auth.signInBtn}
          </Link>
        </p>
      </form>
    </div>
  );
}
