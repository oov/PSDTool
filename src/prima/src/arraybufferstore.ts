export default class ArrayBufferStore {
    private static deleteDatabase(databaseName: string): Promise<void> {
        return new Promise<void>(resolve => {
            const req = indexedDB.deleteDatabase(databaseName);
            req.onerror = e => resolve();
            req.onsuccess = e => resolve();
        });
    }

    private static openDatabase(databaseName: string): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(databaseName, 1);
            req.onerror = e => reject(e);
            req.onsuccess = e => {
                if (!(req.result instanceof IDBDatabase)) {
                    return reject(new Error('could not get IDBDatabase'));
                }
                return resolve(req.result);
            };
            req.onupgradeneeded = e => {
                if (!(req.result instanceof IDBDatabase)) {
                    return reject(new Error('could not get IDBDatabase'));
                }
                const db = req.result;
                try {
                    db.deleteObjectStore('file');
                } catch (e) {
                    //
                }
                db.createObjectStore('file');
            };
        });
    }

    static create(databaseName: string, newDB: boolean): Promise<ArrayBufferStore> {
        return (newDB ? ArrayBufferStore.deleteDatabase(databaseName) : Promise.resolve())
            .then(() => ArrayBufferStore.openDatabase(databaseName))
            .then(db => new ArrayBufferStore(db));
    }

    private constructor(private readonly db: IDBDatabase) { }

    public clean(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const tx = this.db.transaction('file', 'readwrite');
            tx.onerror = e => reject(e);
            const os = tx.objectStore('file');
            const req: IDBRequest = (os as any).openKeyCursor();
            req.onsuccess = e => {
                if (!(req.result instanceof IDBCursor)) {
                    return resolve();
                }
                os.delete(req.result.key);
                req.result.continue();
            };
            req.onerror = e => reject(e);
        });
    }

    private static delete(tx: IDBTransaction, name: string | number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const req = tx.objectStore('file').delete(name);
            req.onsuccess = e => resolve();
            req.onerror = e => reject(e);
        });
    }

    public delete(name: string | number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const tx = this.db.transaction('file', 'readwrite');
            tx.onerror = e => reject(e);
            return ArrayBufferStore.delete(tx, name).then(resolve, reject);
        });
    }

    private static set(tx: IDBTransaction, name: string | number, ab: ArrayBuffer): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const req = tx.objectStore('file').put(ab, name);
            req.onsuccess = e => resolve();
            req.onerror = e => reject(e);
        });
    }

    public set(name: string | number, ab: ArrayBuffer): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const tx = this.db.transaction('file', 'readwrite');
            tx.onerror = e => reject(e);
            return ArrayBufferStore.set(tx, name, ab).then(resolve, reject);
        });
    }

    private static get(tx: IDBTransaction, name: string | number): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const req = tx.objectStore('file').get(name);
            req.onsuccess = e => resolve(req.result);
            req.onerror = e => reject(e);
        });
    }

    public get(name: string | number): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('file', 'readonly');
            tx.onerror = e => reject(e);
            return ArrayBufferStore.get(tx, name).then(resolve, reject);
        });
    }

    public pop(name: string | number): Promise<ArrayBuffer> {
        return new Promise<ArrayBuffer>((resolve, reject) => {
            const tx = this.db.transaction('file', 'readwrite');
            tx.onerror = e => reject(e);
            ArrayBufferStore.get(tx, name)
                .then(ab => ArrayBufferStore.delete(tx, name).then(() => ab))
                .then(resolve, reject);
        });
    }
}