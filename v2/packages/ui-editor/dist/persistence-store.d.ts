export interface PersistenceStore {
    saveProject(json: string): void;
    loadProject(): string | null;
}
export declare function createPersistenceStore(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>): PersistenceStore;
//# sourceMappingURL=persistence-store.d.ts.map