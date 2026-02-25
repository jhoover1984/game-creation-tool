const PROJECT_KEY = 'gcs-v2-project';
const BACKUP_PREFIX = 'gcs-v2-backup-';
const MAX_BACKUPS = 5;
function nowStamp() {
    return new Date().toISOString().replaceAll(':', '-');
}
export function createPersistenceStore(storage) {
    function backupKeys() {
        const keys = [];
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
        saveProject(json) {
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
        loadProject() {
            const current = storage.getItem(PROJECT_KEY);
            if (current)
                return current;
            const backups = backupKeys();
            if (backups.length === 0)
                return null;
            const latest = backups[backups.length - 1];
            return latest ? storage.getItem(latest) : null;
        },
    };
}
//# sourceMappingURL=persistence-store.js.map