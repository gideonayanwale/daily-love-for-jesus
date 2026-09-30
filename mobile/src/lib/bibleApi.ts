// Mobile Bible API client powered by Bolls Life API (zero-cost, multilingual, 50+ languages)

export interface BibleBook {
  id: number;
  name: string;
  shortName: string;
  testament: 'old' | 'new';
  chapters: number;
}

export interface MobileVerse {
  id: number;
  bookNumber: number;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
}

export interface MobileTranslation {
  shortName: string;
  fullName: string;
  language: string;
}

export const POPULAR_TRANSLATIONS: MobileTranslation[] = [
  { shortName: 'KJV', fullName: 'King James Version', language: 'English' },
  { shortName: 'WEB', fullName: 'World English Bible', language: 'English' },
  { shortName: 'ESV', fullName: 'English Standard Version', language: 'English' },
  { shortName: 'NIV', fullName: 'New International Version', language: 'English' },
  { shortName: 'NLT', fullName: 'New Living Translation', language: 'English' },
  { shortName: 'RV1960', fullName: 'Reina-Valera 1960', language: 'Spanish Español' },
  { shortName: 'FRLSG', fullName: 'Bible Segond 1910', language: 'French Français' },
  { shortName: 'ARC09', fullName: 'Almeida Revista e Corrigida', language: 'Portuguese' },
  { shortName: 'SUV', fullName: 'Swahili Union Version', language: 'Swahili Kiswahili' },
  { shortName: 'LUT', fullName: 'Luther Bibel', language: 'German Deutsch' },
  { shortName: 'CUV', fullName: 'Chinese Union Version', language: 'Chinese 中文' },
];

export const BIBLE_BOOKS: BibleBook[] = [
  // Old Testament
  { id: 1, name: 'Genesis', shortName: 'Gen', testament: 'old', chapters: 50 },
  { id: 2, name: 'Exodus', shortName: 'Exo', testament: 'old', chapters: 40 },
  { id: 3, name: 'Leviticus', shortName: 'Lev', testament: 'old', chapters: 27 },
  { id: 4, name: 'Numbers', shortName: 'Num', testament: 'old', chapters: 36 },
  { id: 5, name: 'Deuteronomy', shortName: 'Deu', testament: 'old', chapters: 34 },
  { id: 6, name: 'Joshua', shortName: 'Jos', testament: 'old', chapters: 24 },
  { id: 7, name: 'Judges', shortName: 'Jdg', testament: 'old', chapters: 21 },
  { id: 8, name: 'Ruth', shortName: 'Rth', testament: 'old', chapters: 4 },
  { id: 9, name: '1 Samuel', shortName: '1Sa', testament: 'old', chapters: 31 },
  { id: 10, name: '2 Samuel', shortName: '2Sa', testament: 'old', chapters: 24 },
  { id: 11, name: '1 Kings', shortName: '1Ki', testament: 'old', chapters: 22 },
  { id: 12, name: '2 Kings', shortName: '2Ki', testament: 'old', chapters: 25 },
  { id: 13, name: '1 Chronicles', shortName: '1Ch', testament: 'old', chapters: 29 },
  { id: 14, name: '2 Chronicles', shortName: '2Ch', testament: 'old', chapters: 36 },
  { id: 15, name: 'Ezra', shortName: 'Ezr', testament: 'old', chapters: 10 },
  { id: 16, name: 'Nehemiah', shortName: 'Neh', testament: 'old', chapters: 13 },
  { id: 17, name: 'Esther', shortName: 'Est', testament: 'old', chapters: 10 },
  { id: 18, name: 'Job', shortName: 'Job', testament: 'old', chapters: 42 },
  { id: 19, name: 'Psalms', shortName: 'Psa', testament: 'old', chapters: 150 },
  { id: 20, name: 'Proverbs', shortName: 'Pro', testament: 'old', chapters: 31 },
  { id: 21, name: 'Ecclesiastes', shortName: 'Ecc', testament: 'old', chapters: 12 },
  { id: 22, name: 'Song of Solomon', shortName: 'Sng', testament: 'old', chapters: 8 },
  { id: 23, name: 'Isaiah', shortName: 'Isa', testament: 'old', chapters: 66 },
  { id: 24, name: 'Jeremiah', shortName: 'Jer', testament: 'old', chapters: 52 },
  { id: 25, name: 'Lamentations', shortName: 'Lam', testament: 'old', chapters: 5 },
  { id: 26, name: 'Ezekiel', shortName: 'Ezk', testament: 'old', chapters: 48 },
  { id: 27, name: 'Daniel', shortName: 'Dan', testament: 'old', chapters: 12 },
  { id: 28, name: 'Hosea', shortName: 'Hos', testament: 'old', chapters: 14 },
  { id: 29, name: 'Joel', shortName: 'Jol', testament: 'old', chapters: 3 },
  { id: 30, name: 'Amos', shortName: 'Amo', testament: 'old', chapters: 9 },
  { id: 31, name: 'Obadiah', shortName: 'Oba', testament: 'old', chapters: 1 },
  { id: 32, name: 'Jonah', shortName: 'Jon', testament: 'old', chapters: 4 },
  { id: 33, name: 'Micah', shortName: 'Mic', testament: 'old', chapters: 7 },
  { id: 34, name: 'Nahum', shortName: 'Nah', testament: 'old', chapters: 3 },
  { id: 35, name: 'Habakkuk', shortName: 'Hab', testament: 'old', chapters: 3 },
  { id: 36, name: 'Zephaniah', shortName: 'Zep', testament: 'old', chapters: 3 },
  { id: 37, name: 'Haggai', shortName: 'Hag', testament: 'old', chapters: 2 },
  { id: 38, name: 'Zechariah', shortName: 'Zec', testament: 'old', chapters: 14 },
  { id: 39, name: 'Malachi', shortName: 'Mal', testament: 'old', chapters: 4 },
  // New Testament
  { id: 40, name: 'Matthew', shortName: 'Mat', testament: 'new', chapters: 28 },
  { id: 41, name: 'Mark', shortName: 'Mrk', testament: 'new', chapters: 16 },
  { id: 42, name: 'Luke', shortName: 'Luk', testament: 'new', chapters: 24 },
  { id: 43, name: 'John', shortName: 'Jhn', testament: 'new', chapters: 21 },
  { id: 44, name: 'Acts', shortName: 'Act', testament: 'new', chapters: 28 },
  { id: 45, name: 'Romans', shortName: 'Rom', testament: 'new', chapters: 16 },
  { id: 46, name: '1 Corinthians', shortName: '1Co', testament: 'new', chapters: 16 },
  { id: 47, name: '2 Corinthians', shortName: '2Co', testament: 'new', chapters: 13 },
  { id: 48, name: 'Galatians', shortName: 'Gal', testament: 'new', chapters: 6 },
  { id: 49, name: 'Ephesians', shortName: 'Eph', testament: 'new', chapters: 6 },
  { id: 50, name: 'Philippians', shortName: 'Php', testament: 'new', chapters: 4 },
  { id: 51, name: 'Colossians', shortName: 'Col', testament: 'new', chapters: 4 },
  { id: 52, name: '1 Thessalonians', shortName: '1Th', testament: 'new', chapters: 5 },
  { id: 53, name: '2 Thessalonians', shortName: '2Th', testament: 'new', chapters: 3 },
  { id: 54, name: '1 Timothy', shortName: '1Ti', testament: 'new', chapters: 6 },
  { id: 55, name: '2 Timothy', shortName: '2Ti', testament: 'new', chapters: 4 },
  { id: 56, name: 'Titus', shortName: 'Tit', testament: 'new', chapters: 3 },
  { id: 57, name: 'Philemon', shortName: 'Phm', testament: 'new', chapters: 1 },
  { id: 58, name: 'Hebrews', shortName: 'Heb', testament: 'new', chapters: 13 },
  { id: 59, name: 'James', shortName: 'Jas', testament: 'new', chapters: 5 },
  { id: 60, name: '1 Peter', shortName: '1Pe', testament: 'new', chapters: 5 },
  { id: 61, name: '2 Peter', shortName: '2Pe', testament: 'new', chapters: 3 },
  { id: 62, name: '1 John', shortName: '1Jn', testament: 'new', chapters: 5 },
  { id: 63, name: '2 John', shortName: '2Jn', testament: 'new', chapters: 1 },
  { id: 64, name: '3 John', shortName: '3Jn', testament: 'new', chapters: 1 },
  { id: 65, name: 'Jude', shortName: 'Jud', testament: 'new', chapters: 1 },
  { id: 66, name: 'Revelation', shortName: 'Rev', testament: 'new', chapters: 22 },
];

function cleanText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<S>\d+<\/S>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchChapterVerses(
  translation: string,
  bookId: number,
  chapter: number
): Promise<MobileVerse[]> {
  const trans = (translation || 'KJV').toUpperCase();

  // 1. Try fetching from NestJS Backend
  try {
    const backendUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
    const res = await fetch(
      `${backendUrl}/api/bible/verses?bookNumber=${bookId}&chapter=${chapter}&translation=${trans}`,
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id || r.pk,
          bookNumber: bookId,
          chapter,
          verse: r.verse,
          text: cleanText(r.text),
          translation: trans,
        }));
      }
    }
  } catch {
    // Backend fetch failed or offline; continue to fallback
  }

  // 2. Direct Fallback to Bolls Life API (zero-cost, multilingual)
  const url = `https://bolls.life/get-chapter/${trans}/${bookId}/${chapter}/`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch scripture: HTTP ${res.status}`);
  }

  const rows = (await res.json()) as Array<{ pk: number; verse: number; text: string }>;
  return rows.map((r) => ({
    id: r.pk,
    bookNumber: bookId,
    chapter,
    verse: r.verse,
    text: cleanText(r.text),
    translation: trans,
  }));
}
