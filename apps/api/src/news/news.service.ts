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

  async getTeamNews(teamNames: string[], locale = 'en'): Promise<NewsArticle[]> {
    if (locale === 'ru') {
      return this.getTeamNewsRu(teamNames);
    }
    return this.getTeamNewsEn(teamNames);
  }

  private async getTeamNewsEn(teamNames: string[]): Promise<NewsArticle[]> {
    // Parenthesise the team group so the football anchor applies to BOTH teams,
    // otherwise a bare "South Korea" matches esports (LCK), gymnastics, etc.
    const teams = teamNames.filter(Boolean).map((n) => `"${n}"`).join(' OR ');
    const fullQuery = `(${teams}) (football OR soccer OR FIFA OR "World Cup") -esports -киберспорт -LoL -Dota`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(fullQuery)}&hl=en-US&gl=US&ceid=US:en`;
    return this.fetchRss(url);
  }

  private async getTeamNewsRu(teamNames: string[]): Promise<NewsArticle[]> {
    // Google News returns Russian-language articles when locale params are RU,
    // even with English team names in the query. No need to transliterate.
    const teams = teamNames.filter(Boolean).map((n) => `"${n}"`).join(' OR ');
    const fullQuery = `(${teams}) (football OR soccer OR FIFA OR "World Cup") -esports -киберспорт -LoL -Dota`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(fullQuery)}&hl=ru&gl=RU&ceid=RU:ru`;
    return this.fetchRss(url);
  }

  private async fetchRss(url: string): Promise<NewsArticle[]> {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ai-score-bot/1.0)' },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        this.logger.warn(`Google News RSS ${res.status}`);
        return [];
      }

      const xml = await res.text();
      const parsed = this.parseRss(xml).slice(0, 8);
      this.logger.log(`News fetched: ${parsed.length} articles (${url.includes('ceid=RU') ? 'ru' : 'en'})`);
      return parsed;
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
        s
          ? this.decodeEntities(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'))
              .replace(/<[^>]+>/g, '')
              .replace(/\s+/g, ' ')
              .trim()
          : '';

      const source = clean(this.extractTag(block, 'source')) || 'Google News';

      let title = clean(this.extractTag(block, 'title'));
      // Google News appends " - {source}" to every title — drop the duplication.
      if (source !== 'Google News' && title.endsWith(` - ${source}`)) {
        title = title.slice(0, -(source.length + 3)).trim();
      }

      const link = this.extractTag(block, 'link') ?? '';
      const pubDate = this.extractTag(block, 'pubDate') ?? '';

      // Google News descriptions are just the title repeated as an <a> link +
      // the source — no real summary. They render as raw markup, so drop them.
      const description = null;

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

  private decodeEntities(s: string): string {
    return s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');
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
