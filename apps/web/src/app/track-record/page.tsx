import { api } from '@/lib/api-client';
import type { TrackRecordStats, BacktestSummary } from '@ai-score/shared';
import { TrackRecordContent } from './track-record-content';

export const metadata = { title: 'Track Record | betanalyse.pro' };

export default async function TrackRecordPage() {
  let stats: TrackRecordStats | null = null;
  let backtest: BacktestSummary | null = null;
  try {
    [stats, backtest] = await Promise.all([
      api.trackRecord.get().catch(() => null),
      api.backtest.get().catch(() => null),
    ]);
  } catch {
    // API unavailable
  }

  return <TrackRecordContent stats={stats} backtest={backtest} />;
}
