import { api } from '@/lib/api-client';
import type { LvsDay } from '@ai-score/shared';
import { LvsContent } from './lvs-content';

export const metadata = { title: 'ЛВС | betanalyse.pro' };

export default async function LvsPage() {
  let days: LvsDay[] = [];
  try {
    days = await api.lvs.fixtures().catch(() => []);
  } catch {
    // API unavailable
  }

  return <LvsContent days={days} />;
}
