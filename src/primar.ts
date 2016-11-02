import * as lz4s from './lz4s';
import * as tileder from './tileder';

export class Primar {
    private readonly bufferSize = (this.width * this.height < 4096 * 4096 ? 1 : 4) * 1024 * 1024;
    constructor(
        private readonly width: number,
        private readonly height: number,
        private readonly tileSize: number
    ) {
        this.imageWriter.onFilter = buf => this.imageWriterFilter(buf);
    }

    private tsxes: Promise<[ArrayBuffer[], number]>[] = [];
    public addTsx(tsx: tileder.Tsx): void {
        const st = new lz4s.Streamer(4 * 1024 * 1024);
        let px0 = 0, px1 = 0, px2 = 0, px3 = 0;
        st.onFilter = buf => {
            let p0 = px0, p1 = px1, p2 = px2, p3 = px3, i = 0;
            const end = buf.byteLength;
            while (i < end) {
                buf[i] -= p0;
                p0 += buf[i++];
                buf[i] -= p1;
                p1 += buf[i++];
                buf[i] -= p2;
                p2 += buf[i++];
                buf[i] -= p3;
                p3 += buf[i++];
            }
            px0 = p0;
            px1 = p1;
            px2 = p2;
            px3 = p3;
        };
        st.addUint8Array(new Uint8Array(tsx.data));
        this.tsxes.push(st.finish().then(r => {
            const [buffers, totalSize] = r;
            const header = new ArrayBuffer(8);
            const dv = new DataView(header);
            dv.setUint32(0, tsx.width, true);
            dv.setUint32(4, tsx.height, true);
            buffers.unshift(header);
            return [buffers, totalSize + 8];
        }));
    }

    private imageWriter = new lz4s.Streamer(this.bufferSize);
    private firstMap: Uint8Array | undefined;
    private skipped = 0;
    private pos = 0;
    private readonly useSubFilter = false;

    private imageWriterFilter(buf: Uint8Array): void {
        if (!this.useSubFilter) {
            return;
        }
        if (!this.firstMap) {
            throw new Error('firstMap is not ready');
        }
        const siEnd = this.firstMap.byteLength;
        if (this.skipped < siEnd) {
            if (this.skipped + buf.byteLength <= siEnd) {
                this.skipped += buf.byteLength;
                return;
            }
            const skipSize = siEnd - this.skipped;
            buf = new Uint8Array(buf.buffer, buf.byteOffset + skipSize, buf.length - skipSize);
            this.skipped += skipSize;
        }
        const src = new DataView(this.firstMap.buffer, this.firstMap.byteOffset, this.firstMap.byteLength);
        const dest = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        const diEnd = dest.byteLength;
        let di = 0, si = this.pos;
        while (di < diEnd) {
            for (let i = 0, len = Math.min(diEnd - di, siEnd - si); i < len; di += 4, si += 4, i += 4) {
                dest.setInt32(di, dest.getInt32(di, true) - src.getInt32(si, true), true);
            }
            if (si === siEnd) {
                si = 0;
            }
        }
        this.pos = si;
    }

    private imageIndices: DataView | undefined;
    private imageIndex = 0;
    public setImageTotal(n: number): void {
        this.imageIndices = new DataView(new ArrayBuffer(n * 4));
    }

    public addImage(image: tileder.Image): void {
        if (this.imageIndices) {
            this.imageIndices.setUint32(image.index * 4, this.imageIndex++, true);
        }
        const src = new Int32Array(image.data);
        if (!this.firstMap) {
            const firstMap = this.firstMap = new Int32Array(src.length);
            for (let i = 0, len = src.length; i < len; ++i) {
                firstMap[i] = src[i];
            }
        }
        this.imageWriter.addInt32Array(src);
    }

    public generate(patterns: any): Promise<Blob> {
        const pData: Promise<[number, ArrayBuffer[], number]> = this.imageWriter.finish().then(r => {
            const [buffers, size] = r;
            const s = new lz4s.Streamer(4 * 1024 * 1024);
            for (const b of buffers) {
                s.addUint8Array(new Uint8Array(b));
            }
            return s.finish().then(r => {
                const [buffers2, size2] = r;
                return [size, buffers2, size2];
            });
        });
        return Promise.all([Promise.all(this.tsxes), pData]).then(r => {
            const [tsxes, imageSet] = r;
            const [originalSize, imageSetBuffers, imageSetSize] = imageSet;
            const imageIndices = this.imageIndices;
            if (!imageIndices) {
                throw new Error('image indexes is not initialized.');
            }
            let total = 8 + imageIndices.byteLength + 12 + imageSetSize;
            for (const [, totalSize] of tsxes) {
                total += 8 + totalSize;
            }

            const archive: (Blob | ArrayBuffer)[] = [];
            {
                const blob = new Blob([JSON.stringify(patterns)], { type: 'application/json; charset=utf-8' });
                const v = new DataView(new ArrayBuffer(34));
                v.setUint32(0, 0x46464952, true); // 'RIFF'
                v.setUint32(4, 8 + 10 + 8 + blob.size + total, true);
                v.setUint32(8, 0x414e4e44, true); // 'DNNA'
                v.setUint32(12, 10, true);
                v.setUint32(16, this.width, true);
                v.setUint32(20, this.height, true);
                v.setUint16(24, this.tileSize, true);
                v.setUint32(26, 0x4e525450, true); // 'PTRN'
                v.setUint32(30, blob.size, true);
                archive.push(v.buffer, blob);
            }
            for (const [abs, totalSize] of tsxes) {
                const v = new DataView(new ArrayBuffer(8));
                v.setUint32(0, 0x20474d49, true); // 'IMG '
                v.setUint32(4, totalSize, true);
                archive.push(v.buffer);
                Array.prototype.push.apply(archive, abs);
            }
            {
                const v = new DataView(new ArrayBuffer(8));
                v.setUint32(0, 0x504d4449, true); // 'IDMP'
                v.setUint32(4, imageIndices.byteLength, true);
                archive.push(v.buffer, imageIndices.buffer);
            }
            {
                const v = new DataView(new ArrayBuffer(12));
                v.setUint32(0, 0x454c4954, true); // 'TILE'
                v.setUint32(4, imageSetSize + 4, true);
                v.setUint32(8, originalSize, true);
                archive.push(v.buffer);
                Array.prototype.push.apply(archive, imageSetBuffers);
            }
            return new Blob(archive, { type: 'application/octet-binary' });
        });
    }
}