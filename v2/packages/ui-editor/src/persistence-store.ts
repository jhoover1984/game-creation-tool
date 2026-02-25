const PROJECT_KEY = 'gcs-v2-project';
const BACKUP_PREFIX = 'gcs-v2-backup-';
const MAX_BACKUPS = 5;

function nowStamp(): string {
  return new Date().toISOString().replaceAll(':', '-');
}

export interface PersistenceStore {
  saveProject(json: string): void;
  loadProject(): string | null;
}

export function createPersistenceStore(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>,
): PersistenceStore {
  function backupKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(BACKUP_PREFIX)) {
        keys.push(key);
      }
    }
    keys.sort();
    return keys;
  }

  return {
    saveProject(json: string): void {
      const current = storage.getItem(PROJECT_KEY);
      if (current) {
        storage.setItem(`${BACKUP_PREFIX}${nowStamp()}`, current);
      }
      storage.setItem(PROJECT_KEY, json);

      const backups = backupKeys();
      const overflow = backups.length - MAX_BACKUPS;
      for (let i = 0; i < overflow; i++) {
        storage.removeItem(backups[i]);
      }
    },
    loadProject(): string | null {
      const current = storage.getItem(PROJECT_KEY);
      if (current) return current;

      const backups = backupKeys();
      if (backups.length === 0) return null;
      const latest = backups[backups.length - 1];
      return latest ? storage.getItem(latest) : null;
    },
  };
}
