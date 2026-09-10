export type StorageMode = 'mongodb' | 'local';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3002';

let storageModePromise: Promise<StorageMode> | null = null;

export function getStorageMode(): Promise<StorageMode> {
  if (!storageModePromise) {
    storageModePromise = fetch(`${API_BASE_URL}/api/config`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load storage configuration (${response.status})`);
        }
        const config = await response.json() as { storageMode?: string };
        if (config.storageMode !== 'mongodb' && config.storageMode !== 'local') {
          throw new Error(`Unsupported storage mode: ${config.storageMode ?? 'missing'}`);
        }
        return config.storageMode;
      });
  }
  return storageModePromise;
}
