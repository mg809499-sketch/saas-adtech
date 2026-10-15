import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';

interface FontItem { family: string; category: string; variants: string[] }

// Proxy con caché 24h a Google Fonts Developer API (key solo en servidor).
@Injectable()
export class FontsService {
  private cache: { at: number; items: FontItem[] } | null = null;

  async list(q = '', limit = 500): Promise<{ total: number; items: FontItem[] }> {
    const now = Date.now();
    if (!this.cache || now - this.cache.at > 24 * 3600 * 1000) {
      const key = process.env.GOOGLE_FONTS_API_KEY || '';
      if (!key) return { total: 0, items: [] };
      const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${key}&sort=popularity`);
      if (!res.ok) throw new Error(`fonts api ${res.status}`);
      const data = (await res.json()) as { items: FontItem[] };
      this.cache = { at: now, items: (data.items || []).map((f) => ({ family: f.family, category: f.category, variants: f.variants || [] })) };
    }
    const query = q.toLowerCase();
    const items = this.cache.items.filter((f) => !query || f.family.toLowerCase().includes(query)).slice(0, Math.min(limit || 500, 500));
    return { total: this.cache.items.length, items };
  }
}

@Controller('fonts')
export class FontsController {
  constructor(private fonts: FontsService) {}

  @Get()
  list(@Query('q') q = '', @Query('limit') limit = '500') {
    return this.fonts.list(q, Number(limit) || 500);
  }
}

@Module({ controllers: [FontsController], providers: [FontsService], exports: [FontsService] })
export class FontsModule {}
