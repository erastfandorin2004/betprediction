import { TrendingUp, Zap, ShieldCheck, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <HeroSection />
      <DailyPicksSection />
      <StatsSection />
      <FeaturesSection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="py-16 text-center">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-electric-700/50 bg-electric-900/20 px-4 py-1.5 text-sm text-electric-400">
        <span className="h-1.5 w-1.5 animate-pulse-slow rounded-full bg-electric-400" />
        Ансамбль из 6 LLM · Обновляется в реальном времени
      </div>

      <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
        <span className="text-gradient-electric">AI-прогнозы</span>
        <br />
        <span className="text-zinc-100">для умных болельщиков</span>
      </h1>

      <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
        Несколько LLM анализируют форму, статистику и коэффициенты — и выдают единый прозрачный
        прогноз с оценкой уверенности и обоснованием.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <a
          href="/matches"
          className="electric-glow rounded-xl bg-electric-600 px-6 py-3 font-semibold text-white transition-all hover:bg-electric-500"
        >
          Смотреть матчи
        </a>
        <a
          href="/track-record"
          className="rounded-xl border border-pitch-700 bg-pitch-900 px-6 py-3 font-semibold text-zinc-300 transition-all hover:border-electric-700 hover:text-white"
        >
          Трек-рекорд точности
        </a>
      </div>
    </section>
  );
}

function DailyPicksSection() {
  return (
    <section className="py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">AI-выборы дня</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Топ-прогнозы по уверенности и value</p>
        </div>
        <a href="/picks" className="text-sm text-electric-400 hover:text-electric-300">
          Все выборы →
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <PickCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

function PickCardSkeleton() {
  return (
    <div className="card-surface animate-pulse p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-pitch-700" />
          <div className="h-5 w-40 rounded bg-pitch-700" />
        </div>
        <div className="h-7 w-16 rounded-full bg-pitch-700" />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-pitch-700" />
        <div className="flex-1 space-y-1">
          <div className="h-4 w-full rounded bg-pitch-700" />
          <div className="h-3 w-3/4 rounded bg-pitch-700" />
        </div>
        <div className="h-8 w-8 rounded-full bg-pitch-700" />
      </div>

      <div className="mt-4 space-y-2">
        <div className="h-3 w-28 rounded bg-pitch-700" />
        <div className="flex gap-2">
          {[60, 25, 15].map((w, i) => (
            <div
              key={i}
              className={cn('h-6 rounded bg-pitch-700')}
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 h-3 w-3/4 rounded bg-pitch-700" />
    </div>
  );
}

function StatsSection() {
  const stats = [
    { label: 'Точность прогнозов', value: '—', sub: 'накапливается', icon: BarChart3 },
    { label: 'Прогнозов выдано', value: '0', sub: 'начинаем считать', icon: Zap },
    { label: 'ROI flat-ставка', value: '—', sub: 'накапливается', icon: TrendingUp },
    { label: 'Верифицировано', value: '100%', sub: 'до старта матча', icon: ShieldCheck },
  ];

  return (
    <section className="py-10">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="card-surface p-5">
            <Icon className="h-5 w-5 text-electric-500" />
            <div className="tabular mt-3 text-3xl font-bold text-zinc-100">{value}</div>
            <div className="mt-1 text-sm font-medium text-zinc-300">{label}</div>
            <div className="mt-0.5 text-xs text-zinc-600">{sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      title: 'Ансамбль LLM',
      description:
        'До 6 моделей (GPT, Claude, Gemini, DeepSeek) анализируют каждый матч независимо. Консенсус = выше уверенность.',
      badge: 'Уникально',
    },
    {
      title: 'Честный трек-рекорд',
      description:
        'Все прогнозы фиксируются до старта матча и никогда не изменяются. Точность считается по реальным исходам.',
      badge: 'Прозрачно',
    },
    {
      title: 'Value-сигналы',
      description:
        'Сравниваем AI-вероятность с рыночными коэффициентами и автоматически подсвечиваем перевес (edge).',
      badge: 'Pro',
    },
    {
      title: 'Глубокая статистика',
      description:
        'Форма, H2H, составы, травмы, xG, движение коэффициентов — всё в одном экране без лишних вкладок.',
      badge: 'Бесплатно',
    },
  ];

  return (
    <section className="py-10">
      <h2 className="mb-2 text-center text-2xl font-bold text-zinc-100">
        Почему AI-Score
      </h2>
      <p className="mb-8 text-center text-sm text-zinc-500">
        Мы сделали то, чего нет у LiveScore, TIPSTOP и eScored
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map(({ title, description, badge }) => (
          <div key={title} className="card-surface p-6">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-zinc-100">{title}</h3>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-semibold',
                  badge === 'Pro'
                    ? 'bg-value-500/15 text-value-400'
                    : badge === 'Уникально'
                      ? 'bg-electric-500/15 text-electric-400'
                      : 'bg-goal-500/15 text-goal-400',
                )}
              >
                {badge}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
