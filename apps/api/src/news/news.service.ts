import { Injectable, Logger } from '@nestjs/common';

export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  source: string;
  publishedAt: string;
  urlToImage: string | null;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  async getTeamNews(teamNames: string[]): Promise<NewsArticle[]> {
    const query = teamNames
      .filter(Boolean)
      .map((n) => `"${n}"`)
      .join(' OR ');

    const fullQuery = `${query} (football OR soccer OR injury OR squad OR World Cup 2026)`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(fullQuery)}&hl=en-US&gl=US&ceid=US:en`;

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ai-score-bot/1.0)' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        this.logger.warn(`Google News RSS ${res.status}`);
        return [];
      }

      const xml = await res.text();
      return this.parseRss(xml).slice(0, 8);
    } catch (err) {
      this.logger.error('Google News RSS fetch failed', err instanceof Error ? err.message : String(err));
      return [];
    }
  }

  private parseRss(xml: string): NewsArticle[] {
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

    return items.map((match) => {
      const block = match[1] ?? '';

      const clean = (s: string | null) =>
        s ? s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim() : '';

      const title = clean(this.extractTag(block, 'title'));
      const link = this.extractTag(block, 'link') ?? '';
      const pubDate = this.extractTag(block, 'pubDate') ?? '';
      const source = clean(this.extractTag(block, 'source')) || 'Google News';
      const description = clean(this.extractTag(block, 'description')) || null;

      const imgUrl =
        this.extractAttr(block, 'enclosure', 'url') ??
        this.extractAttr(block, 'media:content', 'url') ??
        null;

      return {
        title,
        description,
        url: link,
        source,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        urlToImage: imgUrl,
      };
    }).filter((a) => a.title && a.url);
  }

  private extractTag(xml: string, tag: string): string | null {
    const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return m?.[1]?.trim() ?? null;
  }

  private extractAttr(xml: string, tag: string, attr: string): string | null {
    const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"`, 'i'));
    return m?.[1] ?? null;
  }
}
