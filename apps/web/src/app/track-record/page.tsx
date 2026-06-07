import { api } from '@/lib/api-client';
import type { PredictionHistoryItem } from '@ai-score/shared';
import { TrackRecordContent } from './track-record-content';

export const metadata = { title: 'История анализов | betanalyse.pro' };

export default async function TrackRecordPage() {
  let history: PredictionHistoryItem[] = [];
  try {
    history = await api.history.get().catch(() => []);
  } catch {
    // API unavailable
  }

  return <TrackRecordContent history={history} />;
}
