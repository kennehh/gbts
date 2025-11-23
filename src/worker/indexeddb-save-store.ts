import type { ISaveStore, RamSave, SaveState } from "@/core/save";

const DB_NAME = "gameboy-saves";
const DB_VERSION = 1;

export class IndexedDBSaveStore implements ISaveStore {
    private db: IDBDatabase | null = null;

    private constructor() { /* empty */ }

    static create() {
        return new Promise<IndexedDBSaveStore>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error!);
            request.onsuccess = () => {
                const instance = new IndexedDBSaveStore();
                instance.db = request.result;
                resolve(instance);
            };

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains("ramSaves")) {
                    const store = db.createObjectStore("ramSaves", { keyPath: "cartId" });
                    store.createIndex("timestamp", "timestamp");
                }
                if (!db.objectStoreNames.contains("stateSaves")) {
                    const store = db.createObjectStore("stateSaves", { keyPath: ["cartId", "slot"] });
                    store.createIndex("timestamp", "timestamp");
                }
            }
        });
    }

    saveRam(save: RamSave): Promise<void> {
        return this.runWriteTransaction("ramSaves", store => store.put(save));
    }

    loadRam(cartId: number): Promise<RamSave | null> {
        return this.runReadTransaction("ramSaves", store => store.get(cartId));
    }

    saveState(save: SaveState): Promise<void> {
        return this.runWriteTransaction("stateSaves", store => store.put(save));
    }

    loadState(cartId: number, slot: number): Promise<SaveState | null> {
        return this.runReadTransaction("stateSaves", store => store.get([cartId, slot]));  
    }

    private runWriteTransaction<T>(storeName: string, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<void> {
        if (!this.db) {
            return Promise.reject(new Error("Database not initialized"));
        }
        
        const transaction = this.db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        operation(store);

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error!);
            transaction.onabort = () => reject(new Error("Transaction aborted"));
        });
    }

    private runReadTransaction<T>(storeName: string, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
        if (!this.db) {
            return Promise.reject(new Error("Database not initialized"));
        }

        const transaction = this.db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = operation(store);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            transaction.onerror = () => reject(transaction.error!);
            transaction.onabort = () => reject(new Error("Transaction aborted"));
        });
    }
}