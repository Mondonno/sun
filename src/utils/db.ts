export interface ProSettings {
  isPro: boolean;
  sunriseWallpaper?: string;
  sunsetWallpaper?: string;
  fontFamily?: string;
  themeColor?: string;
  interactionCount?: number;
}

const DB_NAME = 'SunProDB';
const STORE_NAME = 'settings';
const KEY = 'pro_settings';

export const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getSettings = async (): Promise<ProSettings> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(KEY);
      request.onsuccess = () => {
        resolve(request.result || { isPro: false });
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to get settings from IndexedDB', e);
    return { isPro: false };
  }
};

export const saveSettings = async (settings: ProSettings): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(settings, KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to save settings to IndexedDB', e);
  }
};
