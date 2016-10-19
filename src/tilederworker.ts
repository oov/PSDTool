import * as pako from 'pako';
import * as tileder from './tileder';
import * as crc32 from './crc32';

declare function postMessage(data: any, transfer?: any): void;

interface Tile {
    h: number; // hash
    p: number; // block position index
    b: Uint8Array; // image data
}

interface TsxImageFunc {
    (tsx: tileder.TsxData, index: number, total: number): void;
}

class TilederWorker {
    private tileSize = 16;
    private tile = new Map<number, Tile>();

    private images: tileder.ImageData[] = [];

    public onMessage(e: MessageEvent): void {
        switch (e.data.type) {
            case 'add':
                this.onAdd(e.data.n, e.data.b, e.data.w, e.data.h);
                break;
            case 'finish':
                this.onFinish(e.data.c);
                break;
        }
    }

    private calcImageSize(n: number): number {
        const x = n * this.tileSize * this.tileSize;
        for (let p = 64; p <= 1024; p += p) {
            if (x <= p * p) {
                return p;
            }
        }
        return 1024;
    }

    private buildTsx(r: TsxImageFunc): {
        [hash: number]: number
    } {
        const tile = this.tile, tileSize = this.tileSize;
        const a: Tile[] = [];
        tile.forEach(v => a.push(v));
        const aLen = a.length;

        a.sort((a, b) => {
            return a.p === b.p ? 0 : a.p < b.p ? -1 : 1;
        });

        let aPos = 0, numTsxes = 0;
        while (aPos < aLen) {
            const bLen = this.calcImageSize(aLen - aPos) >> 4;
            aPos += bLen * bLen;
            ++numTsxes;
        }

        aPos = 0;
        const map: { [hash: number]: number } = {};
        for (let i = 0; i < numTsxes; ++i) {
            const size = this.calcImageSize(aLen - aPos), size4 = size * 4, columns = size / tileSize;
            const image = new Uint8Array(size * size4);
            const bLen = size >> 4;
            for (let by = 0; by < bLen && aPos < aLen; ++by) {
                const dy = by * tileSize;
                for (let bx = 0; bx < bLen && aPos < aLen; ++bx) {
                    const src = a[aPos], srcBuf = src.b;
                    if (!srcBuf) {
                        throw new Error('unexpected undefined buffer');
                    }
                    for (let y = 0; y < tileSize; ++y) {
                        let dx = ((dy + y) * size + bx * tileSize) * 4;
                        let sx = y * tileSize * 4;
                        for (let x = 0; x < tileSize; ++x) {
                            image[dx++] = srcBuf[sx++];
                            image[dx++] = srcBuf[sx++];
                            image[dx++] = srcBuf[sx++];
                            image[dx++] = srcBuf[sx++];
                        }
                    }
                    map[src.h] = aPos++;
                }
            }
            r({
                tileWidth: tileSize,
                tileHeight: tileSize,
                tileCount: columns * columns,
                columns: columns,
                width: size,
                height: size,
                data: image.buffer
            }, i, numTsxes);
        }
        this.tile.clear();
        return map;
    }

    private onFinish(compressMap: boolean): void {
        const map = this.buildTsx((tsx: tileder.TsxData, index: number, total: number) => {
            postMessage({ type: 'tsx', t: tsx, i: index, n: total }, [tsx.data]);
        });
        for (let i = 0; i < this.images.length; ++i) {
            const image = this.images[i];
            const d = new Uint32Array(image.data);
            for (let j = 0; j < d.length; ++j) {
                d[j] = map[d[j]] + 1;
            }
            if (compressMap) {
                const ret: any = pako.deflate(new Uint8Array(image.data));
                if (ret instanceof Uint8Array) {
                    image.data = new Uint8ClampedArray(ret.buffer);
                } else {
                    throw new Error(`unexpected return value type: ${typeof ret}`);
                }
                image.deflated = true;
            }
            postMessage({ type: 'image', img: image, i: i, n: this.images.length }, [image.data]);
        }
    }

    private onAdd(fileName: string, b: ArrayBuffer, w: number, h: number): void {
        const tile = this.tile;
        const tileSize = this.tileSize, tileSize4 = tileSize << 2;
        const ab = new Uint8ClampedArray(b);
        const buf = new Uint8Array(4 * tileSize * tileSize);

        const bwf = Math.floor(w / tileSize), bhf = Math.floor(h / tileSize);
        const bwc = Math.ceil(w / tileSize), bhc = Math.ceil(h / tileSize);
        const restw = w - bwf * tileSize, resth = h - bwf * tileSize;

        const imageHash = new Uint32Array(bwc * bhc);
        for (let by = 0; by < bhf; ++by) {
            const sy = by * tileSize;
            for (let bx = 0; bx < bwf; ++bx) {
                for (let y = 0; y < tileSize; ++y) {
                    let sx = ((sy + y) * w + bx * tileSize) * 4;
                    let dx = y * tileSize * 4;
                    for (let x = 0; x < tileSize; ++x) {
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                    }
                }
                const hash = crc32.crc32(buf.buffer);
                if (!tile.has(hash)) {
                    tile.set(hash, { h: hash, p: by * 1000000 + bx, b: new Uint8Array(buf) });
                }
                imageHash[by * bwc + bx] = hash;
            }
        }
        if (restw) {
            buf.fill(0);
            for (let by = 0; by < bhf; ++by) {
                const sy = by * tileSize;
                for (let y = 0; y < tileSize; ++y) {
                    let sx = ((sy + y) * w + bwf * tileSize) * 4;
                    let dx = y * tileSize4;
                    for (let x = 0; x < restw; ++x) {
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                    }
                }
                const hash = crc32.crc32(buf.buffer);
                if (!tile.has(hash)) {
                    tile.set(hash, { h: hash, p: by * 1000000 + bwf, b: new Uint8Array(buf) });
                }
                imageHash[by * bwc + bwf] = hash;
            }
        }
        if (resth) {
            buf.fill(0);
            const sy = bhf * tileSize;
            for (let bx = 0; bx < bwf; ++bx) {
                for (let y = 0; y < resth; ++y) {
                    let sx = ((sy + y) * w + bx * tileSize) * 4;
                    let dx = y * tileSize4;
                    for (let x = 0; x < tileSize; ++x) {
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                    }
                }
                const hash = crc32.crc32(buf.buffer);
                if (!tile.has(hash)) {
                    tile.set(hash, { h: hash, p: bhf * 1000000 + bx, b: new Uint8Array(buf) });
                }
                imageHash[bhf * bwc + bx] = hash;
            }
        }
        if (restw && resth) {
            buf.fill(0);
            const sy = bhf * tileSize;
            for (let y = 0; y < resth; ++y) {
                let sx = ((sy + y) * w + bwf * tileSize) * 4;
                let dx = y * tileSize4;
                for (let x = 0; x < restw; ++x) {
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                }
            }
            const hash = crc32.crc32(buf.buffer);
            if (!tile.has(hash)) {
                tile.set(hash, { h: hash, p: bhf * 1000000 + bwf, b: new Uint8Array(buf) });
            }
            imageHash[bhf * bwc + bwf] = hash;
        }

        this.images.push({
            name: fileName,
            width: bwc,
            height: bhc,
            originalWidth: w,
            originalHeight: h,
            tileWidth: tileSize,
            tileHeight: tileSize,
            data: imageHash.buffer,
            deflated: false
        });
        postMessage({ type: 'add' });
    }
}

const tw = new TilederWorker();
onmessage = e => tw.onMessage(e);