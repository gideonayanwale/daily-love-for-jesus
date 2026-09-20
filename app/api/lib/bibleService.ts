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
}

export interface BollsRawVerse {
  pk: number;
  verse: number;
  text: string;
}

// Curated list of high-priority popular translations for fast picker UI
export const POPULAR_TRANSLATIONS: BibleTranslationInfo[] = [
  // English
  { shortName: "KJV", fullName: "King James Version (1769)", language: "English", isPopular: true },
  { shortName: "NKJV", fullName: "New King James Version (1982)", language: "English", isPopular: true },
  { shortName: "NIV", fullName: "New International Version (1984)", language: "English", isPopular: true },
  { shortName: "ESV", fullName: "English Standard Version (2016)", language: "English", isPopular: true },
  { shortName: "NLT", fullName: "New Living Translation (2015)", language: "English", isPopular: true },
  { shortName: "WEB", fullName: "World English Bible", language: "English", isPopular: true },
  { shortName: "AMP", fullName: "Amplified Bible (2015)", language: "English", isPopular: true },
  { shortName: "ASV", fullName: "American Standard Version (1901)", language: "English", isPopular: false },
  { shortName: "BBE", fullName: "Bible in Basic English", language: "English", isPopular: false },
  { shortName: "YLT", fullName: "Young's Literal Translation", language: "English", isPopular: false },
  // Spanish
  { shortName: "RV1960", fullName: "Reina-Valera 1960", language: "Spanish Español", isPopular: true },
  { shortName: "NVI", fullName: "Nueva Versión Internacional", language: "Spanish Español", isPopular: true },
  { shortName: "LBLA", fullName: "La Biblia de las Américas", language: "Spanish Español", isPopular: false },
  // French
  { shortName: "FRLSG", fullName: "Bible Segond 1910", language: "French Français", isPopular: true },
  { shortName: "BDS", fullName: "La Bible du Semeur", language: "French Français", isPopular: true },
  // Portuguese
  { shortName: "ARC09", fullName: "Almeida Revista e Corrigida 2009", language: "Portuguese", isPopular: true },
  { shortName: "NVIPT", fullName: "Nova Versão Internacional", language: "Portuguese", isPopular: true },
  // African Languages
  { shortName: "SUV", fullName: "Swahili Union Version (1997)", language: "Swahili Kiswahili", isPopular: true },
  // German
  { shortName: "LUT", fullName: "Luther Bibel (1912)", language: "German Deutsch", isPopular: true },
  { shortName: "S00", fullName: "Schlachter 2000", language: "German Deutsch", isPopular: false },
  // Chinese
  { shortName: "CUV", fullName: "Chinese Union (Traditional) 和合本", language: "Chinese 中文", isPopular: true },
  { shortName: "CUNPS", fullName: "Chinese Union (Simplified) 简体", language: "Chinese 中文", isPopular: true },
  // Russian
  { shortName: "SYNOD", fullName: "русский Синодальный Перевод", language: "Russian русский", isPopular: true },
  // Arabic
  { shortName: "NAV", fullName: "كتاب الحياة (Book of Life)", language: "Arabic العربية", isPopular: true },
];

class BibleService {
  private chapterCache = new Map<string, { data: VerseResult[]; expiresAt: number }>();
  private translationsCache: BibleTranslationInfo[] | null = null;
  private translationsCacheExpiresAt = 0;
  private readonly CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours cache

  /**
   * Clean Strong's tags like <S>1234</S> and extra whitespaces from text
   */
  public cleanVerseText(raw: string): string {
    if (!raw) return "";
    return raw
      .replace(/<S>\d+<\/S>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Get all supported languages and translations from Bolls Life API
   */
  public async getTranslations(): Promise<BibleTranslationInfo[]> {
    const now = Date.now();
    if (this.translationsCache && now < this.translationsCacheExpiresAt) {
      return this.translationsCache;
    }

    try {
      const res = await fetch("https://bolls.life/static/bolls/app/views/languages.json", {
        headers: { "User-Agent": "DailyLoveForJesus/1.0" },
      });
      if (!res.ok) {
        return POPULAR_TRANSLATIONS;
      }
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

  /**
   * Get verses for a specific translation, book number (1-66), and chapter
   */
  public async getChapter(
    translation: string,
    bookNumber: number,
    chapter: number
  ): Promise<VerseResult[]> {
    const normTranslation = (translation || "KJV").toUpperCase();
    const cacheKey = `${normTranslation}:${bookNumber}:${chapter}`;
    const now = Date.now();

    const cached = this.chapterCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return cached.data;
    }

    const url = `https://bolls.life/get-chapter/${normTranslation}/${bookNumber}/${chapter}/`;
    const res = await fetch(url, {
      headers: { "User-Agent": "DailyLoveForJesus/1.0" },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch chapter from Bible API: HTTP ${res.status}`);
    }

    const rows = (await res.json()) as BollsRawVerse[];
    const verses: VerseResult[] = rows.map((r) => ({
      id: r.pk,
      bookNumber,
      chapter,
      verse: r.verse,
      text: this.cleanVerseText(r.text),
      translation: normTranslation,
    }));

    this.chapterCache.set(cacheKey, {
      data: verses,
      expiresAt: now + this.CACHE_TTL_MS,
    });

    return verses;
  }

  /**
   * Compare a single verse across multiple translations (e.g. KJV, NIV, ESV, WEB)
   */
  public async compareVerse(
    bookNumber: number,
    chapter: number,
    verseNumber: number,
    translations: string[]
  ): Promise<Array<{ translation: string; text: string; fullName?: string }>> {
    const versions = translations && translations.length > 0 ? translations : ["KJV", "WEB", "ESV", "NIV"];
    const results = await Promise.allSettled(
      versions.map(async (trans) => {
        const chapterVerses = await this.getChapter(trans, bookNumber, chapter);
        const match = chapterVerses.find((v) => v.verse === verseNumber);
        const popularMeta = POPULAR_TRANSLATIONS.find(
          (t) => t.shortName.toUpperCase() === trans.toUpperCase()
        );
        return {
          translation: trans.toUpperCase(),
          text: match?.text ?? "Verse not found in this translation",
          fullName: popularMeta?.fullName,
        };
      })
    );

    return results
      .filter((r): r is PromiseFulfilledResult<{ translation: string; text: string; fullName?: string }> => r.status === "fulfilled")
      .map((r) => r.value);
  }

  /**
   * Search within a specific translation
   */
  public async search(translation: string, query: string): Promise<VerseResult[]> {
    const normTranslation = (translation || "KJV").toUpperCase();
    const url = `https://bolls.life/search/${normTranslation}/?search=${encodeURIComponent(query)}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "DailyLoveForJesus/1.0" },
    });

    if (!res.ok) {
      return [];
    }

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
}

export const bibleService = new BibleService();
