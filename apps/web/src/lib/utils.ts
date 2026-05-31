import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CONFIDENCE_STAR_THRESHOLDS } from '@ai-score/shared';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatProbability(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatOdds(value: number): string {
  return value.toFixed(2);
}

export function formatMinute(minute: number, extraMinute: number | null): string {
  return extraMinute ? `${minute}+${extraMinute}'` : `${minute}'`;
}

type StarThresholds = typeof CONFIDENCE_STAR_THRESHOLDS;
type StarValue = StarThresholds[number][1];

export function confidenceToStars(confidence: number): StarValue {
  if (confidence >= 0.85) return 5;
  if (confidence >= 0.7) return 4;
  if (confidence >= 0.55) return 3;
  if (confidence >= 0.4) return 2;
  return 1;
}

export function starsToLabel(stars: StarValue): string {
  const labels: Record<StarValue, string> = {
    5: 'Очень высокая',
    4: 'Высокая',
    3: 'Средняя',
    2: 'Низкая',
    1: 'Очень низкая',
  };
  return labels[stars];
}
