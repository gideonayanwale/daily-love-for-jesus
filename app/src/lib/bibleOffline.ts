// Client-side IndexedDB manager for 100% offline Bible storage and downloads

export interface OfflineVerse {
  id: number;
  bookNumber: number;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
}

const DB_NAME = "DailyLoveBibleDB";
const DB_VERSION = 1;
const CHAPTERS_STORE = "chapters";
const METADATA_STORE = "metadata";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CHAPTERS_STORE)) {
        // Key: "TRANSLATION:BOOK_NUMBER:CHAPTER"
        db.createObjectStore(CHAPTERS_STORE);
      }
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        // Key: "TRANSLATION"
        db.createObjectStore(METADATA_STORE);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Save a chapter to IndexedDB
 */
export async function saveOfflineChapter(
  translation: string,
  bookNumber: number,
  chapter: number,
  verses: OfflineVerse[]
): Promise<void> {
  try {
    const db = await openDB();
    const key = `${translation.toUpperCase()}:${bookNumber}:${chapter}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CHAPTERS_STORE, "readwrite");
      const store = tx.objectStore(CHAPTERS_STORE);
      store.put(verses, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to save offline chapter:", err);
  }
}

/**
 * Retrieve a chapter from IndexedDB
 */
export async function getOfflineChapter(
  translation: string,
  bookNumber: number,
  chapter: number
): Promise<OfflineVerse[] | null> {
  try {
    const db = await openDB();
    const key = `${translation.toUpperCase()}:${bookNumber}:${chapter}`;
    return new Promise((resolve) => {
      const tx = db.transaction(CHAPTERS_STORE, "readonly");
      const store = tx.objectStore(CHAPTERS_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result ?? null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Mark a translation as downloaded
 */
export async function markTranslationDownloaded(
  translation: string,
  metadata?: { downloadedAt: number; name?: string }
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(METADATA_STORE, "readwrite");
      const store = tx.objectStore(METADATA_STORE);
      store.put(
        metadata ?? { downloadedAt: Date.now() },
        translation.toUpperCase()
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to mark translation downloaded:", err);
  }
}

/**
 * Check if a translation is downloaded for offline use
 */
export async function isTranslationDownloaded(translation: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(METADATA_STORE, "readonly");
      const store = tx.objectStore(METADATA_STORE);
      const req = store.get(translation.toUpperCase());
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Get all downloaded translation codes
 */
export async function getDownloadedTranslations(): Promise<string[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(METADATA_STORE, "readonly");
      const store = tx.objectStore(METADATA_STORE);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) ?? []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Delete a downloaded translation from IndexedDB
 */
export async function deleteDownloadedTranslation(translation: string): Promise<void> {
  try {
    const db = await openDB();
    const trans = translation.toUpperCase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CHAPTERS_STORE, METADATA_STORE], "readwrite");
      const metaStore = tx.objectStore(METADATA_STORE);
      metaStore.delete(trans);

      const chapStore = tx.objectStore(CHAPTERS_STORE);
      const req = chapStore.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const key = String(cursor.key);
          if (key.startsWith(`${trans}:`)) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to delete downloaded translation:", err);
  }
}

/**
 * Downloads all chapters of a book into offline IndexedDB storage.
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

  // Process in small batches of 4 to avoid overwhelming the network
  const batchSize = 4;
  for (let start = 1; start <= totalChapters; start += batchSize) {
    const end = Math.min(start + batchSize - 1, totalChapters);
    const chapterPromises = [];

    for (let ch = start; ch <= end; ch++) {
      chapterPromises.push(
        (async (chapterNum: number) => {
          try {
            const res = await fetch(`/api/bible/verses?bookNumber=${bookNumber}&chapter=${chapterNum}&translation=${trans}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const verses = await res.json();
            if (Array.isArray(verses) && verses.length > 0) {
              await saveOfflineChapter(trans, bookNumber, chapterNum, verses);
            }
            completed++;
          } catch {
            errors++;
          } finally {
            onProgress?.(completed, totalChapters);
          }
        })(ch)
      );
    }

    await Promise.all(chapterPromises);
  }

  return { success: errors === 0, errors };
}

/**
 * Checks if all chapters of a book are cached in IndexedDB.
 */
export async function isBookDownloaded(
  translation: string,
  bookNumber: number,
  totalChapters: number
): Promise<boolean> {
  const trans = translation.toUpperCase();
  for (let ch = 1; ch <= totalChapters; ch++) {
    const chapterData = await getOfflineChapter(trans, bookNumber, ch);
    if (!chapterData || chapterData.length === 0) {
      return false;
    }
  }
  return true;
}

