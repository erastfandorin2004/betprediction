import { api } from '@/lib/api-client';
import type { LvsHistoryItem } from '@ai-score/shared';
import { LvsHistoryContent } from './lvs-history-content';

export const metadata = { title: 'История ЛВС | betanalyse.pro' };

export default async function LvsHistoryPage() {
  let history: LvsHistoryItem[] = [];
  try {
    history = await api.lvs.history().catch(() => []);
  } catch {
    // API unavailable
  }

  return <LvsHistoryContent history={history} />;
}
