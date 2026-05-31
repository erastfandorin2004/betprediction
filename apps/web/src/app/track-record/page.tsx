import { api } from '@/lib/api-client';
import type { TrackRecordStats } from '@ai-score/shared';
import { TrackRecordContent } from './track-record-content';

export const metadata = { title: 'Track Record | AI-Score' };

export default async function TrackRecordPage() {
  let stats: TrackRecordStats | null = null;
  try {
    stats = await api.trackRecord.get();
  } catch {
    // API unavailable
  }

  return <TrackRecordContent stats={stats} />;
}
