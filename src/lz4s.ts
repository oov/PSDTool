function copy(dest: Uint8Array, src: Uint8Array, di: number, si: number, len: number) {
    for (let i = 0; i < len; ++i) {
        dest[di++] = src[si++];
    }
}

function copyInt32(dest: Uint8Array, src: Int32Array, di: number, si: number, lenBytes: number) {
    const dv = new DataView(dest.buffer);
    for (const diEnd = di + lenBytes; di < diEnd; di += 4, ++si) {
        dv.setInt32(di, src[si], true);
    }
}

function fillZero(dest: Uint8Array, di: number, len: number) {
    for (let i = 0; i < len; ++i) {
        dest[di++] = 0;
    }
}

class Compresser {
    private worker = new Worker(Compresser.createWorkerURL());
    constructor() {
        this.worker.onmessage = e => {
            const callback = this._callbacks.shift();
            if (callback) {
                callback(e.data.buffer.buffer);
            }
        };
    }

    private _callbacks: ((ab: ArrayBuffer) => void)[] = [];
    public compressHC(buffer: ArrayBuffer): Promise<ArrayBuffer> {
        return new Promise<ArrayBuffer>(resolve => {
            this._callbacks.push(ab => resolve(ab));
            this.worker.postMessage({ buffer }, [buffer]);
        });
    }
    public get tasks(): number { return this._callbacks.length; }

    private static _compress(src: ArrayBuffer, compBuffer: Uint8Array | undefined, LZ4: any): [ArrayBuffer, Uint8Array] {
        const len: number = LZ4.compressBlockBound(src.byteLength);
        if (!compBuffer || compBuffer.byteLength < len) {
            compBuffer = new Uint8Array(len);
        }
        const written: number = LZ4.compressBlockHC(new Uint8Array(src), compBuffer);
        return [compBuffer.slice(0, written), compBuffer];
    }

    private static workerURL: string;
    private static createWorkerURL(): string {
        if (Compresser.workerURL) {
            return Compresser.workerURL;
        }
        Compresser.workerURL = URL.createObjectURL(new Blob([`
'use strict';
importScripts('${location.protocol}//${location.host}/js/lz4.js');
var compBuffer, compress = ${Compresser._compress.toString()};
onmessage = function(e){
    var r = compress(e.data.buffer, compBuffer, LZ4);
    postMessage({ buffer: r[0] }, [r[0].buffer]);
    compBuffer = r[1];
};`], { type: 'text/javascript' }));
        return Compresser.workerURL;
    }
}

class CompressWorkers {
    private _compresser: Compresser[] = [];
    private _waitReadyCompressers(waits: number): Promise<Compresser> {
        return new Promise<Compresser>(resolve => {
            let find = () => {
                for (let i = 0; i < this._compresser.length; ++i) {
                    if (this._compresser[i].tasks <= waits) {
                        resolve(this._compresser[i]);
                        return;
                    }
                }
                setTimeout(find, 40);
            };
            find();
        });
    }

    private constructor(numWorkers: number, private readonly queueMax: number) {
        for (let i = 0; i < numWorkers; ++i) {
            this._compresser.push(new Compresser());
        }
    }

    private _compressHC(buffer: ArrayBuffer): Promise<ArrayBuffer> {
        return this._waitReadyCompressers(this.queueMax).then(c => c.compressHC(buffer));
    }

    private static _instance: CompressWorkers;
    public static compressHC(buffer: ArrayBuffer): Promise<ArrayBuffer> {
        if (!CompressWorkers._instance) {
            CompressWorkers._instance = new CompressWorkers(2, 3);
        }
        return CompressWorkers._instance._compressHC(buffer);
    }
}

export class Streamer {
    private buffers: Promise<ArrayBuffer>[] = [];
    private buffer = new Uint8Array(this.bufferSize);
    private used = 0;

    public onFilter: (buf: Uint8Array) => void;

    constructor(public readonly bufferSize: number) {
        if (bufferSize !== 1024 * 1024 && bufferSize !== 4 * 1024 * 1024) {
            throw new Error(`unsupported buffer size: ${bufferSize}`);
        }
    }

    private compress(bytes?: number): Promise<void> {
        if (bytes) {
            fillZero(this.buffer, bytes, this.buffer.length - bytes);
        }
        if (this.onFilter) {
            this.onFilter(bytes ? new Uint8Array(this.buffer.buffer, 0, bytes) : this.buffer);
        }
        const compBuf = this.buffer.buffer;
        this.buffer = new Uint8Array(this.bufferSize);
        this.used = 0;
        const p = CompressWorkers.compressHC(compBuf);
        this.buffers.push(p);
        return p;
    }

    public addInt32Array(src: Int32Array): Promise<void> {
        const p: Promise<void>[] = [];
        while (true) {
            if (this.bufferSize - this.used >= src.byteLength) {
                copyInt32(this.buffer, src, this.used, 0, src.byteLength);
                this.used += src.byteLength;
                return Promise.all(p);
            }

            const alen = this.bufferSize - this.used;
            copyInt32(this.buffer, src, this.used, 0, alen);
            src = new Int32Array(src.buffer, src.byteOffset + alen, (src.byteLength - alen) >> 2);
            p.push(this.compress());
        }
    }

    public addUint8Array(src: Uint8Array): Promise<void> {
        const p: Promise<void>[] = [];
        while (true) {
            if (this.bufferSize - this.used >= src.byteLength) {
                copy(this.buffer, src, this.used, 0, src.byteLength);
                this.used += src.byteLength;
                return Promise.all(p);
            }

            const alen = this.bufferSize - this.used;
            copy(this.buffer, src, this.used, 0, alen);
            src = new Uint8Array(src.buffer, src.byteOffset + alen, src.byteLength - alen);
            p.push(this.compress());
        }
    }

    public finish(): Promise<[ArrayBuffer[], number]> {
        if (this.used !== 0) {
            this.compress(this.used);
        }
        return Promise.all(this.buffers).then(r => {
            const abs: ArrayBuffer[] = [];
            let totalSize = 0;

            const header = new ArrayBuffer(7);
            const dv = new DataView(header);
            dv.setUint32(0, 0x184d2204, true);
            switch (this.bufferSize) {
                case 1024 * 1024:
                    dv.setUint8(4, 0x60);
                    dv.setUint8(5, 0x60);
                    dv.setUint8(6, 0x51);
                    break;
                case 4 * 1024 * 1024:
                    dv.setUint8(4, 0x60);
                    dv.setUint8(5, 0x70);
                    dv.setUint8(6, 0x73);
                    break;
            }
            abs.push(header);
            totalSize += header.byteLength;

            for (const ab of r) {
                const size = new ArrayBuffer(4);
                new DataView(size).setUint32(0, ab.byteLength, true);
                abs.push(size, ab);
                totalSize += size.byteLength + ab.byteLength;
            }

            // end marker
            abs.push(new ArrayBuffer(4));
            totalSize += 4;

            return [abs, totalSize];
        });
    }
}

