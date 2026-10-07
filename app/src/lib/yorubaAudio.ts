// Yoruba Audio Bible (DaBible / Bibeli Mímọ́) lookup, streaming, and offline local storage download

const YORUBA_AUDIO_DB = "DailyLoveYorubaAudioDB";
const AUDIO_STORE = "audio_chapters";

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported"));
      return;
    }
    const req = indexedDB.open(YORUBA_AUDIO_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * DaBible / Bibeli Mímọ́ stream endpoints with redundant CDNs
 */
export function getYorubaAudioStreamUrls(bookNumber: number, chapter: number): string[] {
  const padBook = String(bookNumber).padStart(2, "0");
  const padChap = String(chapter).padStart(3, "0");

  return [
    // 1. Primary Wordproject Yoruba (Language 21) audio stream CDN
    `https://audio.wordproject.com/bibles/app/audio/21/${bookNumber}/${chapter}.mp3`,
    // 2. DaBible Web mirror CDN
    `https://stream.dabible.com/audio/yoruba/${padBook}_${padChap}.mp3`,
    // 3. Archive.org Bibeli Mímọ́ audio repository
    `https://archive.org/download/yoruba-audio-bible-mp3/Book_${padBook}_Chapter_${padChap}.mp3`,
  ];
}

export interface YorubaAudioInfo {
  bookNumber: number;
  chapter: number;
  title: string;
  streamUrl: string;
  isDownloaded: boolean;
  localBlobUrl?: string;
}

/**
 * Look up Yoruba audio for a specific book and chapter
 */
export async function lookupYorubaAudio(
  bookNumber: number,
  chapter: number,
  bookName: string = "Bibeli Mímọ́"
): Promise<YorubaAudioInfo> {
  const isDownloaded = await isYorubaAudioDownloaded(bookNumber, chapter);
  let localBlobUrl: string | undefined;

  if (isDownloaded) {
    const blob = await getDownloadedYorubaAudioBlob(bookNumber, chapter);
    if (blob) {
      localBlobUrl = URL.createObjectURL(blob);
    }
  }

  const urls = getYorubaAudioStreamUrls(bookNumber, chapter);

  return {
    bookNumber,
    chapter,
    title: `${bookName} Orí ${chapter} (Yorùbá Audio)`,
    streamUrl: localBlobUrl || urls[0],
    isDownloaded,
    localBlobUrl,
  };
}

/**
 * Check if chapter audio is downloaded locally in IndexedDB
 */
export async function isYorubaAudioDownloaded(
  bookNumber: number,
  chapter: number
): Promise<boolean> {
  try {
    const db = await openAudioDB();
    const key = `${bookNumber}:${chapter}`;
    return new Promise((resolve) => {
      const tx = db.transaction(AUDIO_STORE, "readonly");
      const store = tx.objectStore(AUDIO_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Get downloaded audio blob from local storage
 */
export async function getDownloadedYorubaAudioBlob(
  bookNumber: number,
  chapter: number
): Promise<Blob | null> {
  try {
    const db = await openAudioDB();
    const key = `${bookNumber}:${chapter}`;
    return new Promise((resolve) => {
      const tx = db.transaction(AUDIO_STORE, "readonly");
      const store = tx.objectStore(AUDIO_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Download Yoruba audio chapter straight from the web into local storage (IndexedDB)
 */
export async function downloadYorubaAudioChapter(
  bookNumber: number,
  chapter: number,
  onProgress?: (receivedBytes: number, totalBytes: number) => void
): Promise<{ success: boolean; blob?: Blob }> {
  const streamUrls = getYorubaAudioStreamUrls(bookNumber, chapter);

  for (const url of streamUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const total = parseInt(res.headers.get("Content-Length") || "0", 10);
      const blob = await res.blob();

      onProgress?.(blob.size, total || blob.size);

      // Save into local IndexedDB
      const db = await openAudioDB();
      const key = `${bookNumber}:${chapter}`;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(AUDIO_STORE, "readwrite");
        const store = tx.objectStore(AUDIO_STORE);
        store.put(blob, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      return { success: true, blob };
    } catch {
      // Continue to next mirror
    }
  }

  return { success: false };
}

/**
 * Delete a downloaded Yoruba chapter from local storage
 */
export async function deleteDownloadedYorubaAudio(
  bookNumber: number,
  chapter: number
): Promise<void> {
  try {
    const db = await openAudioDB();
    const key = `${bookNumber}:${chapter}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(AUDIO_STORE, "readwrite");
      tx.objectStore(AUDIO_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to delete local Yoruba audio:", err);
  }
}
