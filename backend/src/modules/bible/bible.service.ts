import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import * as schema from '@db/schema';
import { eq, and, sql, like } from 'drizzle-orm';

export interface BibleTranslationInfo {
  shortName: string;
  fullName: string;
  language: string;
  isPopular?: boolean;
}

export interface VerseResult {
  id: number;
  bookNumber: number;
  chapter: number;
  verse: number;
  text: string;
  translation?: string;
  bookName?: string;
}

export const POPULAR_TRANSLATIONS: BibleTranslationInfo[] = [
  { shortName: 'KJV', fullName: 'King James Version (1769)', language: 'English', isPopular: true },
  { shortName: 'NKJV', fullName: 'New King James Version (1982)', language: 'English', isPopular: true },
  { shortName: 'NIV', fullName: 'New International Version (1984)', language: 'English', isPopular: true },
  { shortName: 'ESV', fullName: 'English Standard Version (2016)', language: 'English', isPopular: true },
  { shortName: 'NLT', fullName: 'New Living Translation (2015)', language: 'English', isPopular: true },
  { shortName: 'WEB', fullName: 'World English Bible', language: 'English', isPopular: true },
  { shortName: 'AMP', fullName: 'Amplified Bible (2015)', language: 'English', isPopular: true },
  { shortName: 'ASV', fullName: 'American Standard Version (1901)', language: 'English', isPopular: false },
  { shortName: 'BBE', fullName: 'Bible in Basic English', language: 'English', isPopular: false },
  { shortName: 'YLT', fullName: "Young's Literal Translation", language: 'English', isPopular: false },
  { shortName: 'RV1960', fullName: 'Reina-Valera 1960', language: 'Spanish Español', isPopular: true },
  { shortName: 'NVI', fullName: 'Nueva Versión Internacional', language: 'Spanish Español', isPopular: true },
  { shortName: 'LBLA', fullName: 'La Biblia de las Américas', language: 'Spanish Español', isPopular: false },
  { shortName: 'FRLSG', fullName: 'Bible Segond 1910', language: 'French Français', isPopular: true },
  { shortName: 'BDS', fullName: 'La Bible du Semeur', language: 'French Français', isPopular: true },
  { shortName: 'ARC09', fullName: 'Almeida Revista e Corrigida 2009', language: 'Portuguese', isPopular: true },
  { shortName: 'NVIPT', fullName: 'Nova Versão Internacional', language: 'Portuguese', isPopular: true },
  { shortName: 'SUV', fullName: 'Swahili Union Version (1997)', language: 'Swahili Kiswahili', isPopular: true },
  { shortName: 'LUT', fullName: 'Luther Bibel (1912)', language: 'German Deutsch', isPopular: true },
  { shortName: 'S00', fullName: 'Schlachter 2000', language: 'German Deutsch', isPopular: false },
  { shortName: 'CUV', fullName: 'Chinese Union (Traditional) 和合本', language: 'Chinese 中文', isPopular: true },
  { shortName: 'CUNPS', fullName: 'Chinese Union (Simplified) 简体', language: 'Chinese 中文', isPopular: true },
  { shortName: 'SYNOD', fullName: 'русский Синодальный Перевод', language: 'Russian русский', isPopular: true },
  { shortName: 'NAV', fullName: 'كتاب الحياة (Book of Life)', language: 'Arabic العربية', isPopular: true },
];

@Injectable()
export class BibleService {
  private readonly logger = new Logger(BibleService.name);
  private chapterCache = new Map<string, { data: VerseResult[]; expiresAt: number }>();
  private translationsCache: BibleTranslationInfo[] | null = null;
  private translationsCacheExpiresAt = 0;
  private readonly CACHE_TTL_MS = 1000 * 60 * 60 * 12;

  constructor(private readonly dbService: DatabaseService) {}

  public cleanVerseText(raw: string): string {
    if (!raw) return '';
    return raw
      .replace(/<S>\d+<\/S>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getTranslations(): Promise<BibleTranslationInfo[]> {
    const now = Date.now();
    if (this.translationsCache && now < this.translationsCacheExpiresAt) {
      return this.translationsCache;
    }

    try {
      const res = await fetch('https://bolls.life/static/bolls/app/views/languages.json', {
        headers: { 'User-Agent': 'DailyLoveForJesus/1.0' },
      });
      if (!res.ok) return POPULAR_TRANSLATIONS;

      const data = (await res.json()) as Array<{
        language: string;
        translations: Array<{ short_name: string; full_name: string }>;
      }>;

      const results: BibleTranslationInfo[] = [];
      const popularSet = new Set(POPULAR_TRANSLATIONS.map((t) => t.shortName.toUpperCase()));

      for (const langGroup of data) {
        for (const t of langGroup.translations) {
          const isPop = popularSet.has(t.short_name.toUpperCase());
          results.push({
            shortName: t.short_name,
            fullName: t.full_name,
            language: langGroup.language,
            isPopular: isPop,
          });
        }
      }

      this.translationsCache = results;
      this.translationsCacheExpiresAt = now + this.CACHE_TTL_MS;
      return results;
    } catch {
      return POPULAR_TRANSLATIONS;
    }
  }

  getPopularTranslations(): BibleTranslationInfo[] {
    return POPULAR_TRANSLATIONS;
  }

  async getBooks() {
    const db = this.dbService.getDb();
    return db.select().from(schema.bibleBooks).orderBy(schema.bibleBooks.order);
  }

  async getBookById(id: number) {
    const db = this.dbService.getDb();
    const rows = await db
      .select()
      .from(schema.bibleBooks)
      .where(eq(schema.bibleBooks.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async getChapters(bookNumber: number): Promise<number[]> {
    const db = this.dbService.getDb();
    try {
      const books = await db
        .select()
        .from(schema.bibleBooks)
        .where(eq(schema.bibleBooks.bookNumber, bookNumber))
        .limit(1);

      const book = books[0];
      if (book && book.chapters && book.chapters > 0) {
        return Array.from({ length: book.chapters }, (_, i) => i + 1);
      }

      const result = await db
        .select({ chapter: schema.bibleVerses.chapter })
        .from(schema.bibleVerses)
        .where(eq(schema.bibleVerses.bookNumber, bookNumber))
        .groupBy(schema.bibleVerses.chapter)
        .orderBy(schema.bibleVerses.chapter);

      return result.map((r: any) => r.chapter);
    } catch {
      return Array.from({ length: 50 }, (_, i) => i + 1);
    }
  }

  async getChapter(translation: string, bookNumber: number, chapter: number): Promise<VerseResult[]> {
    const normTranslation = (translation || 'KJV').toUpperCase();

    // If KJV, check local DB first
    if (normTranslation === 'KJV') {
      try {
        const db = this.dbService.getDb();
        const rows = await db
          .select()
          .from(schema.bibleVerses)
          .where(
            and(
              eq(schema.bibleVerses.bookNumber, bookNumber),
              eq(schema.bibleVerses.chapter, chapter),
            ),
          )
          .orderBy(schema.bibleVerses.verse);

        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id,
            bookNumber: r.bookNumber,
            chapter: r.chapter,
            verse: r.verse,
            text: r.text,
            translation: 'KJV',
          }));
        }
      } catch {
        // Fall back to HTTP fetch
      }
    }

    const cacheKey = `${normTranslation}:${bookNumber}:${chapter}`;
    const now = Date.now();
    const cached = this.chapterCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return cached.data;
    }

    const url = `https://bolls.life/get-chapter/${normTranslation}/${bookNumber}/${chapter}/`;
    const res = await fetch(url, { headers: { 'User-Agent': 'DailyLoveForJesus/1.0' } });

    if (!res.ok) {
      throw new Error(`Failed to fetch chapter from Bible API: HTTP ${res.status}`);
    }

    const rows = (await res.json()) as Array<{ pk: number; verse: number; text: string }>;
    const verses: VerseResult[] = rows.map((r) => ({
      id: r.pk,
      bookNumber,
      chapter,
      verse: r.verse,
      text: this.cleanVerseText(r.text),
      translation: normTranslation,
    }));

    this.chapterCache.set(cacheKey, { data: verses, expiresAt: now + this.CACHE_TTL_MS });
    return verses;
  }

  async getVerse(translation: string, bookNumber: number, chapter: number, verse: number): Promise<VerseResult | null> {
    const verses = await this.getChapter(translation, bookNumber, chapter);
    return verses.find((v) => v.verse === verse) ?? null;
  }

  async compareVerse(
    bookNumber: number,
    chapter: number,
    verse: number,
    translations: string[] = ['KJV', 'WEB', 'ESV', 'NIV'],
  ) {
    const versions = translations && translations.length > 0 ? translations : ['KJV', 'WEB', 'ESV', 'NIV'];
    const results = await Promise.allSettled(
      versions.map(async (trans) => {
        const chapterVerses = await this.getChapter(trans, bookNumber, chapter);
        const match = chapterVerses.find((v) => v.verse === verse);
        const popularMeta = POPULAR_TRANSLATIONS.find(
          (t) => t.shortName.toUpperCase() === trans.toUpperCase(),
        );
        return {
          translation: trans.toUpperCase(),
          text: match?.text ?? 'Verse not found in this translation',
          fullName: popularMeta?.fullName,
        };
      }),
    );

    const output: Array<{ translation: string; text: string; fullName?: string }> = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        output.push(r.value);
      }
    }
    return output;
  }

  async search(translation: string, query: string): Promise<VerseResult[]> {
    const normTranslation = (translation || 'KJV').toUpperCase();

    if (normTranslation === 'KJV') {
      try {
        const db = this.dbService.getDb();
        const rows = await db
          .select({
            id: schema.bibleVerses.id,
            bookNumber: schema.bibleVerses.bookNumber,
            chapter: schema.bibleVerses.chapter,
            verse: schema.bibleVerses.verse,
            text: schema.bibleVerses.text,
          })
          .from(schema.bibleVerses)
          .where(like(schema.bibleVerses.text, `%${query}%`))
          .limit(50);

        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({ ...r, translation: 'KJV' }));
        }
      } catch {
        // Fall back
      }
    }

    const url = `https://bolls.life/search/${normTranslation}/?search=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'DailyLoveForJesus/1.0' } });
    if (!res.ok) return [];

    const rows = (await res.json()) as Array<{
      pk: number;
      book: number;
      chapter: number;
      verse: number;
      text: string;
    }>;

    return rows.slice(0, 50).map((r) => ({
      id: r.pk,
      bookNumber: r.book,
      chapter: r.chapter,
      verse: r.verse,
      text: this.cleanVerseText(r.text),
      translation: normTranslation,
    }));
  }

  async getRandomVerse(translation: string = 'KJV'): Promise<VerseResult> {
    const db = this.dbService.getDb();
    try {
      const rows = await db
        .select()
        .from(schema.bibleVerses)
        .orderBy(sql`RANDOM()`)
        .limit(1);

      if (rows.length > 0) {
        const books = await db
          .select()
          .from(schema.bibleBooks)
          .where(eq(schema.bibleBooks.bookNumber, rows[0].bookNumber))
          .limit(1);

        return {
          id: rows[0].id,
          bookNumber: rows[0].bookNumber,
          chapter: rows[0].chapter,
          verse: rows[0].verse,
          text: rows[0].text,
          bookName: books[0]?.name ?? 'Scripture',
          translation: 'KJV',
        };
      }
    } catch {
      // Fallback
    }

    // Default John 3:16
    const verses = await this.getChapter(translation, 43, 3);
    const j16 = verses.find((v) => v.verse === 16);
    return {
      id: 43003016,
      bookNumber: 43,
      chapter: 3,
      verse: 16,
      text: j16?.text ?? 'For God so loved the world, that he gave his only begotten Son...',
      bookName: 'John',
      translation,
    };
  }
}
