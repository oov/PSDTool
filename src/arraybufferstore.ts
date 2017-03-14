
class DB {
    private static readonly storeName = 'file';
    static deleteDatabase(databaseName: string): Promise<void> {
        return new Promise<void>(resolve => {
            const req = indexedDB.deleteDatabase(databaseName);
            req.onerror = e => resolve();
            req.onsuccess = e => resolve();
        });
    }

    static openDatabase(databaseName: string): Promise<IDBDatabase> {
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
                    db.deleteObjectStore(this.storeName);
                } catch (e) {
                    //
                }
                db.createObjectStore(this.storeName);
            };
        });
    }

    static transactionReadOnly(db: IDBDatabase): IDBTransaction {
        return db.transaction(this.storeName, 'readonly');
    }

    static transactionReadWrite(db: IDBDatabase): IDBTransaction {
        return db.transaction(this.storeName, 'readwrite');
    }

    static delete(tx: IDBTransaction, name: string | number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const req = tx.objectStore(this.storeName).delete(name);
            req.onsuccess = e => resolve();
            req.onerror = e => reject(e);
        });
    }

    static set(tx: IDBTransaction, name: string | number, ab: ArrayBuffer): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const req = tx.objectStore(this.storeName).put(ab, name);
            req.onsuccess = e => resolve();
            req.onerror = e => reject(e);
        });
    }

    static get(tx: IDBTransaction, name: string | number): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const req = tx.objectStore(this.storeName).get(name);
            req.onsuccess = e => resolve(req.result);
            req.onerror = e => reject(e);
        });
    }

    static clean(tx: IDBTransaction): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const os = tx.objectStore(this.storeName);
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
}

class TransactionReadOnly {
    constructor(public readonly tx: IDBTransaction) { }
    get = (name: string | number) => DB.get(this.tx, name);
}

class TransactionReadWrite {
    constructor(public readonly tx: IDBTransaction) { }
    get = (name: string | number) => DB.get(this.tx, name);
    set = (name: string | number, ab: ArrayBuffer) => DB.set(this.tx, name, ab);
    delete = (name: string | number) => DB.delete(this.tx, name);
    pop = (name: string | number) => this.get(name).then(ab => this.delete(name).then(() => ab));
    clean = () => DB.clean(this.tx);
}

class BulkWriter {
    private buffer: [string | number, ArrayBuffer][] = [];
    constructor(private readonly abstore: ArrayBufferStore, private readonly bufferSize: number) { }
    set(name: string | number, ab: ArrayBuffer): Promise<void> {
        this.buffer.push([name, ab]);
        if (this.buffer.length < this.bufferSize) {
            return Promise.resolve();
        }
        return this.flush();
    }
    flush(): Promise<void> {
        const tx = this.abstore.transactionReadWrite();
        const r = Promise.all(this.buffer.map(([name, ab]) => tx.set(name, ab))).then(() => undefined);
        this.buffer = [];
        return r;
    }
}

export default class ArrayBufferStore {
    constructor(public readonly db: IDBDatabase) { }
    set = (name: string | number, ab: ArrayBuffer) => this.transactionReadWrite().set(name, ab);
    delete = (name: string | number) => this.transactionReadWrite().delete(name);
    get = (name: string | number) => this.transactionReadOnly().get(name);
    pop = (name: string | number) => this.transactionReadWrite().pop(name);
    clean = () => this.transactionReadWrite().clean();
    transactionReadOnly = () => new TransactionReadOnly(DB.transactionReadOnly(this.db));
    transactionReadWrite = () => new TransactionReadWrite(DB.transactionReadWrite(this.db));
    bulkWriter = (bufferSize: number) => new BulkWriter(this, bufferSize);

    static create(databaseName: string, newDB: boolean): Promise<ArrayBufferStore> {
        return (newDB ? DB.deleteDatabase(databaseName) : Promise.resolve())
            .then(() => DB.openDatabase(databaseName))
            .then(db => new ArrayBufferStore(db));
    }
}