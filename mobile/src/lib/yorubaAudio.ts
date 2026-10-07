import AsyncStorage from '@react-native-async-storage/async-storage';

const YORUBA_STORAGE_PREFIX = '@dailylove_yoruba_audio:';

/**
 * DaBible Bibeli Mímọ́ stream endpoints with redundant CDNs
 */
export function getYorubaAudioStreamUrls(bookNumber: number, chapter: number): string[] {
  const padBook = String(bookNumber).padStart(2, '0');
  const padChap = String(chapter).padStart(3, '0');

  return [
    `https://audio.wordproject.com/bibles/app/audio/21/${bookNumber}/${chapter}.mp3`,
    `https://stream.dabible.com/audio/yoruba/${padBook}_${padChap}.mp3`,
    `https://archive.org/download/yoruba-audio-bible-mp3/Book_${padBook}_Chapter_${padChap}.mp3`,
  ];
}

export interface MobileYorubaAudioInfo {
  bookNumber: number;
  chapter: number;
  streamUrl: string;
  isDownloaded: boolean;
  localUri?: string;
}

/**
 * Lookup Yoruba audio for mobile playback
 */
export async function lookupMobileYorubaAudio(
  bookNumber: number,
  chapter: number
): Promise<MobileYorubaAudioInfo> {
  const key = `${YORUBA_STORAGE_PREFIX}${bookNumber}:${chapter}`;
  const storedUri = await AsyncStorage.getItem(key);
  const urls = getYorubaAudioStreamUrls(bookNumber, chapter);

  return {
    bookNumber,
    chapter,
    streamUrl: storedUri || urls[0],
    isDownloaded: storedUri !== null,
    localUri: storedUri || undefined,
  };
}

/**
 * Download and mark Yoruba chapter audio in local storage
 */
export async function saveYorubaAudioLocal(
  bookNumber: number,
  chapter: number,
  uriOrFlag: string = 'cached'
): Promise<void> {
  const key = `${YORUBA_STORAGE_PREFIX}${bookNumber}:${chapter}`;
  await AsyncStorage.setItem(key, uriOrFlag);
}

/**
 * Check if chapter is saved locally
 */
export async function isYorubaAudioSavedLocally(
  bookNumber: number,
  chapter: number
): Promise<boolean> {
  const key = `${YORUBA_STORAGE_PREFIX}${bookNumber}:${chapter}`;
  const val = await AsyncStorage.getItem(key);
  return val !== null;
}
