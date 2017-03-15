import { ChipMap } from './slicer';
import * as pattern from './pattern';
import { DecomposedImage } from './decomposer';
import LZ4Streamer from '../src/lz4streamer';

function suggestImageSize(tileSize: number, n: number): number {
    const x = n * tileSize * tileSize;
    for (let p = 64; p <= 1024; p += p) {
        if (x <= p * p) {
            return p;
        }
    }
    return 1024;
}

function rebuildImages(tileSize: number, chips: Uint32Array, chipMap: ChipMap): [Uint8Array, number, number][] {
    const tileSize4 = tileSize * 4;
    const abs: [Uint8Array, number, number][] = [];
    let rest = chips.length;
    let chipIndex = 0;
    while (rest > 0) {
        const imageWidth = suggestImageSize(tileSize, rest);
        const dest = new Uint8Array(imageWidth * imageWidth * 4);
        const chipWidth = imageWidth / tileSize | 0;
        const numChips = Math.min(chipWidth * chipWidth, rest);
        for (let i = 0; i < numChips; ++i, ++chipIndex) {
            const cy = i / chipWidth | 0;
            const cx = i - cy * chipWidth;
            const chipImage = new Uint8Array(chipMap.get(chips[chipIndex])!, 4);
            let j = 0;
            for (let y = cy * imageWidth * tileSize4, yend = y + imageWidth * tileSize4; y < yend; y += imageWidth * 4) {
                for (let x = y + cx * tileSize4, xend = x + tileSize4; x < xend; ++x, ++j) {
                    dest[x] = chipImage[j];
                }
            }
        }
        abs.push([dest, imageWidth, imageWidth]);
        rest -= numChips;
    }
    return abs;
}

function applySubFilter(buf: Uint8Array): Uint8Array {
    const len = buf.length;
    let i = 0, r = 0, g = 0, b = 0, a = 0;
    while (i < len) {
        buf[i] -= r;
        r += buf[i++];
        buf[i] -= g;
        g += buf[i++];
        buf[i] -= b;
        b += buf[i++];
        buf[i] -= a;
        a += buf[i++];
    }
    return buf;
}

function buildPattern(
    image: DecomposedImage,
    chipsMap: Map<number, number>,
    progress: (cur: number, total: number) => Promise<void>,
): Promise<[ArrayBuffer, LZ4Streamer]> {
    return new Promise(resolve => {
        const streamer = new LZ4Streamer(
            // need more intelligent suggest(numTilesPerPattern * numPatterns?)
            (image.width * image.height < 4096 * 4096 ? 1 : 4) * 1024 * 1024
        );
        const numPatterns = image.patternDiffHashes.length;
        const patternIndices = image.getPatternIndices();
        const patternMap = new DataView(new ArrayBuffer(numPatterns * 4));
        let lastReportTime = 0;
        let patternIndex = 0;
        const next = () => {
            if (patternIndex >= numPatterns) {
                return image.abstore.clean().then(() => resolve([patternMap.buffer, streamer]));
            }
            patternMap.setUint32(patternIndices[patternIndex] * 4, patternIndex, true);
            image.getPatternHashes(patternIndices[patternIndex]).then(hashes => {
                const indices = new Uint32Array(hashes.length);
                hashes.forEach((hash, i) => indices[i] = chipsMap.get(hash)! + 1);
                streamer.addInt32Array(indices).then(() => {
                    ++patternIndex;
                    const n = Date.now();
                    if (n - lastReportTime > 100) {
                        progress(patternIndex, numPatterns);
                        lastReportTime = n;
                    }
                }).then(next);
            });
        };
        next();
    });
}

export function generate(
    src: DecomposedImage,
    patternSet: pattern.Set,
    progress: (cur: number, total: number) => Promise<void>,
): Promise<Blob> {
    const [chips, chipsMap] = src.getChipIndices();
    return buildPattern(src, chipsMap, progress).then(([patternMap, patternStreamer]) => {
        return Promise.all([
            Promise.resolve().then((): [ArrayBuffer[], number] => {
                const v = new DataView(new ArrayBuffer(18));
                v.setUint32(0, 0x414e4e44, true); // 'DNNA'
                v.setUint32(4, 4 /* width */ + 4 /* height */ + 2 /* tileSize */, true);
                v.setUint32(8, src.width, true);
                v.setUint32(12, src.height, true);
                v.setUint16(16, src.tileSize, true);
                return [[v.buffer], v.byteLength];
            }),
            Promise.all(rebuildImages(src.tileSize, chips, src.chipMap).map(([image, width, height]) => {
                const imageStreamer = new LZ4Streamer(4 * 1024 * 1024);
                imageStreamer.addUint8Array(applySubFilter(image));
                return imageStreamer.finish().then(([abs, compressedSize]): [ArrayBuffer[], number] => {
                    const header = new DataView(new ArrayBuffer(16));
                    header.setUint32(0, 0x20474d49, true); // 'IMG '
                    header.setUint32(4, 4 /* width */ + 4 /* height */ + compressedSize, true);
                    header.setUint32(8, width, true);
                    header.setUint32(12, height, true);
                    abs.unshift(header.buffer);
                    return [abs, header.byteLength + compressedSize];
                });
            })),
            Promise.resolve().then((): [(ArrayBuffer | Blob)[], number] => {
                const blob = new Blob([JSON.stringify(patternSet)], { type: 'application/json; charset=utf-8' });
                const header = new DataView(new ArrayBuffer(8));
                header.setUint32(0, 0x4e525450, true); // 'PTRN'
                header.setUint32(4, blob.size, true);
                return [[header.buffer, blob], header.byteLength + blob.size];
            }),
            Promise.resolve().then((): [ArrayBuffer[], number] => {
                const header = new DataView(new ArrayBuffer(8));
                header.setUint32(0, 0x504d4449, true); // 'IDMP'
                header.setUint32(4, patternMap.byteLength, true);
                return [[header.buffer, patternMap], header.byteLength + patternMap.byteLength];
            }),
            patternStreamer.finish().then(([abs, firstCompressedSize]) => {
                const s = new LZ4Streamer(4 * 1024 * 1024);
                abs.forEach(ab => s.addUint8Array(new Uint8Array(ab)));
                return s.finish().then(([abs, finalCompressedPatternSize]): [ArrayBuffer[], number] => {
                    const header = new DataView(new ArrayBuffer(12));
                    header.setUint32(0, 0x454c4954, true); // 'TILE'
                    header.setUint32(4, 4 /* firstCompressedSize */ + finalCompressedPatternSize, true);
                    header.setUint32(8, firstCompressedSize, true);
                    abs.unshift(header.buffer);
                    return [abs, header.byteLength + finalCompressedPatternSize];
                });
            }),
        ]).then(([
            [dnna, dnnaSize],
            images,
            [ptrn, ptrnSize],
            [idmp, idmpSize],
            [tile, tileSize],
        ]) => {
            const archive: (Blob | ArrayBuffer)[] = [];
            const v = new DataView(new ArrayBuffer(8));
            v.setUint32(0, 0x46464952, true); // 'RIFF'
            v.setUint32(4, dnnaSize
                + images.map(([, size]) => size).reduce((prev, cur) => prev + cur)
                + ptrnSize + idmpSize + tileSize, true);
            archive.push(v.buffer);
            dnna.forEach(b => archive.push(b));
            images.forEach(([bs]) => bs.forEach(b => archive.push(b)));
            ptrn.forEach(b => archive.push(b));
            idmp.forEach(b => archive.push(b));
            tile.forEach(b => archive.push(b));
            return new Blob(archive, { type: 'application/octet-binary' });
        });
    });
}