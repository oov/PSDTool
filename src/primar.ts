import * as lz4s from './lz4s';
import * as tileder from './tileder';

export class Primar {
    constructor(private readonly bufferSize: number) {
        if (bufferSize !== 1024 * 1024 && bufferSize !== 4 * 1024 * 1024) {
            throw new Error(`unsupported buffer size: ${bufferSize}`);
        }
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

    private imageWriterFilter(buf: Uint8Array): void {
        if (this.skipped < this.bufferSize) {
            // TODO: skip first map
        }
        // TODO: apply sub filter
        // for (let di = this.used, si = 0, diEnd = di + src.byteLength; di < diEnd; ++si, di += 4) {
        //     bufView.setInt32(di, src[si] - firstMap[si], true);
        // }
    }

    public addImage(image: tileder.Image): void {
        const src = new Int32Array(image.data);
        if (!this.firstMap) {
            const firstMap = this.firstMap = new Int32Array(src.length);
            for (let i = 0, len = src.length; i < len; ++i) {
                firstMap[i] = src[i];
            }
        }
        this.imageWriter.addInt32Array(src);
    }

    public generate(structure: any): Promise<Blob> {
        return Promise.all([
            Promise.all(this.tsxes),
            this.imageWriter.finish()
        ]).then(r => {
            const [tsxes, imageSet] = r;
            const [imageSetBuffers, imageSetSize] = imageSet;
            let total = imageSetSize;
            for (const [, totalSize] of tsxes) {
                total += 8 + totalSize;
            }

            const archive: (Blob | ArrayBuffer)[] = [];
            {
                const blob = new Blob([JSON.stringify(structure)], { type: 'application/json; charset=utf-8' });
                const header = new ArrayBuffer(16);
                const dv = new DataView(header);
                dv.setUint32(0, 0x614e6e44, true);
                dv.setUint32(4, total + 8 + blob.size, true);
                dv.setUint32(8, 0x184d2a50, true);
                dv.setUint32(12, blob.size, true);
                archive.push(header, blob);
            }
            for (const [abs, totalSize] of tsxes) {
                const header = new ArrayBuffer(8);
                const dv = new DataView(header);
                dv.setUint32(0, 0x184d2a51, true);
                dv.setUint32(4, totalSize, true);
                archive.push(header);
                Array.prototype.push.apply(archive, abs);
            }
            Array.prototype.push.apply(archive, imageSetBuffers);
            return new Blob(archive, { type: 'application/octet-binary' });
        });
    }
}