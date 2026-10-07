import AsyncStorage from '@react-native-async-storage/async-storage';
import { BIBLE_BOOKS, MobileVerse } from './bibleApi';

const STORAGE_KEY_PREFIX = '@dailylove_bible_ch:';
const METADATA_KEY_PREFIX = '@dailylove_bible_meta:';

export interface DownloadProgress {
  completedChapters: number;
  totalChapters: number;
  percentage: number;
  status: 'idle' | 'downloading' | 'completed' | 'error';
  currentBookName?: string;
}

/**
 * Key format: @dailylove_bible_ch:KJV:1:1
 */
function makeChapterKey(translation: string, bookNumber: number, chapter: number): string {
  return `${STORAGE_KEY_PREFIX}${translation.toUpperCase()}:${bookNumber}:${chapter}`;
}

function makeMetaKey(translation: string): string {
  return `${METADATA_KEY_PREFIX}${translation.toUpperCase()}`;
}

/**
 * Save verses for a single chapter into local AsyncStorage
 */
export async function saveOfflineChapter(
  translation: string,
  bookNumber: number,
  chapter: number,
  verses: MobileVerse[]
): Promise<void> {
  try {
    const key = makeChapterKey(translation, bookNumber, chapter);
    await AsyncStorage.setItem(key, JSON.stringify(verses));
  } catch (err) {
    console.warn(`[MobileStorage] Failed to save chapter ${bookNumber}:${chapter}`, err);
  }
}

/**
 * Retrieve verses for a chapter from local AsyncStorage
 */
export async function getOfflineChapter(
  translation: string,
  bookNumber: number,
  chapter: number
): Promise<MobileVerse[] | null> {
  try {
    const key = makeChapterKey(translation, bookNumber, chapter);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as MobileVerse[];
  } catch {
    return null;
  }
}

/**
 * Check if a specific chapter is stored in local storage
 */
export async function isChapterDownloaded(
  translation: string,
  bookNumber: number,
  chapter: number
): Promise<boolean> {
  try {
    const key = makeChapterKey(translation, bookNumber, chapter);
    const raw = await AsyncStorage.getItem(key);
    return raw !== null;
  } catch {
    return false;
  }
}

/**
 * Check if an entire translation has been downloaded to local storage
 */
export async function isVersionDownloaded(translation: string): Promise<boolean> {
  try {
    const key = makeMetaKey(translation);
    const meta = await AsyncStorage.getItem(key);
    return meta !== null;
  } catch {
    return false;
  }
}

/**
 * Mark translation metadata as downloaded
 */
export async function markVersionDownloaded(
  translation: string,
  metadata?: { downloadedAt: number; totalChapters?: number }
): Promise<void> {
  try {
    const key = makeMetaKey(translation);
    await AsyncStorage.setItem(
      key,
      JSON.stringify(metadata ?? { downloadedAt: Date.now() })
    );
  } catch (err) {
    console.warn('[MobileStorage] Failed to mark version downloaded', err);
  }
}

/**
 * Download a whole book into local storage
 */
export async function downloadBook(
  translation: string,
  bookNumber: number,
  totalChapters: number,
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: boolean; errors: number }> {
  let completed = 0;
  let errors = 0;
  const trans = translation.toUpperCase();

  for (let ch = 1; ch <= totalChapters; ch++) {
    try {
      const url = `https://bolls.life/get-chapter/${trans}/${bookNumber}/${ch}/`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = (await res.json()) as Array<{ pk: number; verse: number; text: string }>;
      const verses: MobileVerse[] = rows.map((r) => ({
        id: r.pk,
        bookNumber,
        chapter: ch,
        verse: r.verse,
        text: r.text.replace(/<[^>]*>/g, '').trim(),
        translation: trans,
      }));
      await saveOfflineChapter(trans, bookNumber, ch, verses);
      completed++;
    } catch {
      errors++;
    }
    onProgress?.(completed, totalChapters);
  }

  return { success: errors === 0, errors };
}

/**
 * Download an entire whole Bible translation (all 66 books, 1,189 chapters) straight into local storage!
 */
export async function downloadWholeVersion(
  translation: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<{ success: boolean; completedChapters: number; totalChapters: number }> {
  const trans = translation.toUpperCase();
  const totalChapters = BIBLE_BOOKS.reduce((acc, b) => acc + b.chapters, 0); // 1,189 chapters
  let completedChapters = 0;

  for (const book of BIBLE_BOOKS) {
    onProgress?.({
      completedChapters,
      totalChapters,
      percentage: Math.round((completedChapters / totalChapters) * 100),
      status: 'downloading',
      currentBookName: book.name,
    });

    for (let ch = 1; ch <= book.chapters; ch++) {
      try {
        const isAlreadySaved = await isChapterDownloaded(trans, book.id, ch);
        if (!isAlreadySaved) {
          const url = `https://bolls.life/get-chapter/${trans}/${book.id}/${ch}/`;
          const res = await fetch(url);
          if (res.ok) {
            const rows = (await res.json()) as Array<{ pk: number; verse: number; text: string }>;
            const verses: MobileVerse[] = rows.map((r) => ({
              id: r.pk,
              bookNumber: book.id,
              chapter: ch,
              verse: r.verse,
              text: r.text.replace(/<[^>]*>/g, '').trim(),
              translation: trans,
            }));
            await saveOfflineChapter(trans, book.id, ch, verses);
          }
        }
        completedChapters++;
      } catch (err) {
        console.warn(`[MobileStorage] Error downloading ${book.name} ${ch}:`, err);
      }

      onProgress?.({
        completedChapters,
        totalChapters,
        percentage: Math.round((completedChapters / totalChapters) * 100),
        status: 'downloading',
        currentBookName: `${book.name} ${ch}`,
      });
    }
  }

  await markVersionDownloaded(trans, {
    downloadedAt: Date.now(),
    totalChapters: completedChapters,
  });

  onProgress?.({
    completedChapters,
    totalChapters,
    percentage: 100,
    status: 'completed',
  });

  return { success: true, completedChapters, totalChapters };
}

/**
 * List all downloaded version codes stored locally
 */
export async function getDownloadedVersions(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const metaKeys = keys.filter((k) => k.startsWith(METADATA_KEY_PREFIX));
    return metaKeys.map((k) => k.replace(METADATA_KEY_PREFIX, ''));
  } catch {
    return [];
  }
}
