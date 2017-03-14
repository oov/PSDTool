import Regioner from './regioner';
import { Slicer, Hashes, ChipMap } from './slicer';
import * as bitarray from './bitarray';
import * as pattern from './pattern';
import * as crc32 from './crc32';
import * as difference from './difference';
import ArrayBufferStore from './arraybufferstore';

type RenderedImage = HTMLImageElement | HTMLCanvasElement;

type RenderFunc = (pattern: pattern.Pattern) => Promise<RenderedImage>;

type HashesMap = Map<pattern.Index, Hashes>;

type ChipIndexMap = Map<crc32.Hash, number>;

type AreaMap = Map<pattern.Index, ArrayBuffer>;

class Decomposer {
    private readonly slicer = new Slicer(this.tileSize);

    private readonly hashesMap: HashesMap = new Map();
    private readonly chipMap: ChipMap = new Map();

    private width = NaN;
    private height = NaN;
    private numTiles = NaN;

    private constructor(
        private readonly tileSize: number,
        private readonly patternSet: pattern.Set,
        private readonly renderFunc: RenderFunc,
        private readonly renderSoloFunc: RenderFunc,
    ) { }

    // TODO: supports multiple patternSet?
    static decompose(
        tileSize: number,
        patternSet: pattern.Set,
        renderFunc: RenderFunc,
        renderSoloFunc: RenderFunc
    ): Promise<DecomposedImage> {
        const d = new Decomposer(tileSize, patternSet, renderFunc, renderSoloFunc);
        return d.buildAreaMap()
            .then(areaMap => d.buildHashes(areaMap))
            .then(([abstore, hashes]) => new DecomposedImage(d.width, d.height, d.tileSize, d.chipMap, hashes, abstore));
    }

    private render(parts: pattern.Pattern): Promise<RenderedImage> {
        return this.renderFunc(parts).then(image => {
            return this.slicer.slice(image).then(([hashes, partialChipMap]) => {
                this.hashesMap.set(pattern.toIndexIncludingNone(parts, this.patternSet), hashes);
                partialChipMap.forEach((v, i) => {
                    const stored = this.chipMap.get(i);
                    if (!stored) {
                        this.chipMap.set(i, v);
                        return;
                    }
                    const s = new Uint32Array(v);
                    const d = new Uint32Array(stored);
                    if (d[0] > s[0]) {
                        d[0] = s[0];
                    }
                });
                return image;
            });
        });
    }

    private renderSolo(parts: pattern.Pattern): Promise<RenderedImage> {
        return this.renderSoloFunc(parts);
    }

    private buildAreaMap(): Promise<AreaMap> {
        return this.render(this.patternSet.map(() => -1)).then(image => {
            this.width = image.width;
            this.height = image.height;
            const tileSize = this.tileSize;
            this.numTiles =
                ((image.width + tileSize - 1) / tileSize | 0)
                * ((image.height + tileSize - 1) / tileSize | 0);
            return new Regioner(tileSize);
        }).then(regioner => {
            const areaMap: AreaMap = new Map();
            // Add the empty map to simplify latar processing.
            areaMap.set(0, new bitarray.BitArray(this.numTiles).buffer.buffer);

            const patternSet = this.patternSet;
            const promises: Promise<AreaMap>[] = [];
            patternSet.forEach((partsGroup, groupIndex) => {
                for (let i = 0; i < partsGroup.length; ++i) {
                    const patternParts = patternSet.map((_, j) => j !== groupIndex ? -1 : i);
                    promises.push(
                        this.renderSolo(patternParts)
                            .then(image => regioner.generate(image))
                            .then(diff => areaMap.set(pattern.toIndexIncludingNone(patternParts, patternSet), diff.buffer.buffer))
                    );
                }
            });
            return Promise.all(promises).then(() => areaMap);
        });
    }

    // TODO: This may take a very long time, so it need move to the worker.
    // For that, I'm already using ArrayBuffer instead of TypedArray in the everywhere.
    private buildHashes(areaMap: AreaMap): Promise<[ArrayBufferStore, Uint32Array]> {
        const patternSet = this.patternSet;
        const hashesMap = this.hashesMap;
        const patternLength = pattern.number(patternSet);
        const patternDiffHashes = new Uint32Array(patternLength);
        let patternIndex = 0;
        let byCache = 0, generated = 0;
        let retried = false;
        return ArrayBufferStore.create('prima-hashes', true).then(abstore => {
            const writer = abstore.bulkWriter(400);
            return new Promise<[ArrayBufferStore, Uint32Array]>(resolve => {
                const processNextPattern = () => {
                    if (patternIndex >= patternLength) {
                        // report statistics
                        // console.log(`generatedByCache: ${byCache} / rendered: ${generated}`);
                        this.hashesMap.clear();
                        writer.flush().then(() => resolve([abstore, patternDiffHashes]));
                        return;
                    }

                    const parts = pattern.fromIndex(patternIndex, patternSet);
                    const patternAreaMap = parts.map((itemIndex, groupIndex) => {
                        const index = pattern.toIndexIncludingNone(parts.map((_, i) => groupIndex === i ? itemIndex : -1), patternSet);
                        const ab = areaMap.get(index);
                        if (!ab) {
                            throw new Error(`#${index} AreaMap not found.`);
                        }
                        return new Uint32Array(ab);
                    });

                    const numTiles = this.numTiles;
                    const querying = new Map<number, Promise<RenderedImage>>();
                    const hashes = new Uint32Array(numTiles + 1 /* hash */);
                    for (let i = 0; i < numTiles; ++i) {
                        const sourceParts = patternAreaMap.map((area, j) => bitarray.get(area, i) ? parts[j] : -1);
                        const sourceIndex = pattern.toIndexIncludingNone(sourceParts, patternSet);
                        const refHashes = hashesMap.get(sourceIndex);
                        if (refHashes) {
                            hashes[i + 1] = new Uint32Array(refHashes)[i + 1];
                            continue;
                        }
                        if (querying.has(sourceIndex)) {
                            continue;
                        }
                        querying.set(sourceIndex, this.render(sourceParts));
                    }
                    if (querying.size > 0) {
                        const promises: Promise<RenderedImage>[] = [];
                        querying.forEach(v => promises.push(v));
                        retried = true;
                        Promise.all(promises).then(processNextPattern);
                        return;
                    }
                    hashes[0] = difference.calcHash(new Uint32Array(hashes.buffer, 4));
                    patternDiffHashes[patternIndex] = hashes[0];
                    retried ? ++generated : ++byCache;
                    retried = false;
                    writer.set(patternIndex, hashes.buffer).then(processNextPattern);
                    ++patternIndex;
                };
                processNextPattern();
            });
        });
    }
}

export function decompose(tileSize: number, patternSet: pattern.Set, render: RenderFunc, renderSolo: RenderFunc): Promise<DecomposedImage> {
    return Decomposer.decompose(tileSize, patternSet, render, renderSolo);
}

export class DecomposedImage {
    get length(): number {
        return this.patternDiffHashes.length;
    }

    get memory(): number {
        const tileSize = this.tileSize;
        const chipSize = this.chipMap.size * (
            4 /* chip location index */
            + tileSize * tileSize * 4 /* chip(RGBA) */
            + 8 /* map key */
        );
        const hashSize = this.patternDiffHashes.length * (
            ((this.width + tileSize - 1) / tileSize | 0)
            * ((this.height + tileSize - 1) / tileSize | 0)
            * 4 /* Uint32 */ + 4 /* hash */ + 8 /* map key */
        );
        return chipSize + hashSize;
    }

    constructor(
        public readonly width: number,
        public readonly height: number,
        public readonly tileSize: number,
        public readonly chipMap: ChipMap,
        public readonly patternDiffHashes: Uint32Array,
        public readonly abstore: ArrayBufferStore,
    ) {
        if (width <= 0 || height <= 0) {
            throw new Error(`invalid image size: ${width}x${height}`);
        }
    }

    getPatternHashes(patternIndex: pattern.Index): Promise<Uint32Array> {
        return this.abstore.get(patternIndex).then(b => new Uint32Array(b, 4));
    }

    popPatternHashes(patternIndex: pattern.Index): Promise<Uint32Array> {
        return this.abstore.pop(patternIndex).then(b => new Uint32Array(b, 4));
    }
    // useful for debugging
    render(patternIndex: pattern.Index): Promise<HTMLCanvasElement> {
        return this.abstore.get(patternIndex).then(hashesBuffer => {
            const hashes = new Uint32Array(hashesBuffer, 4);
            const width = this.width, height = this.height, tileSize = this.tileSize;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!(ctx instanceof CanvasRenderingContext2D)) {
                throw new Error('could not get CanvasRenderingContext2D');
            }
            for (let y = 0, i = 0; y < height; y += tileSize) {
                for (let x = 0; x < width; x += tileSize) {
                    ctx.putImageData(this.getChipImage(hashes[i++]), x, y);
                }
            }
            return canvas;
        });
    }

    getChipImage(hash: crc32.Hash): ImageData {
        const ab = this.chipMap.get(hash);
        if (!ab) {
            throw new Error(`chip #${('00000000' + hash.toString(16)).slice(-8)} is not found`);
        }
        const r = new ImageData(this.tileSize, this.tileSize);
        const src = new Uint8Array(ab, 4);
        const dest = new Uint8Array(r.data.buffer);
        const length = src.length;
        for (let i = 0; i < length; ++i) {
            dest[i] = src[i];
        }
        return r;
    }

    getChipIndices(): [Uint32Array, ChipIndexMap] {
        const chipMap = this.chipMap;
        const chipIndices = new Uint32Array(chipMap.size);
        {
            let i = 0;
            chipMap.forEach((_, key) => chipIndices[i++] = key);
        }
        chipIndices.sort((a, b) => {
            const av = new Uint32Array(chipMap.get(a)!)[0];
            const bv = new Uint32Array(chipMap.get(b)!)[0];
            if (av !== bv) {
                return av < bv ? -1 : 1;
            }
            return a === b ? 0 : a < b ? -1 : 1;
        });
        const r: ChipIndexMap = new Map<number, number>();
        const length = chipIndices.length;
        for (let i = 0; i < length; ++i) {
            r.set(chipIndices[i], i);
        }
        return [chipIndices, r];
    }

    getPatternIndices(): Uint32Array {
        const hashes = this.patternDiffHashes;
        const length = hashes.length;
        const a = new Uint32Array(length);
        for (let i = 0; i < length; ++i) {
            a[i] = i;
        }
        const comparer = difference.getComparer(hashes[0]);
        a.sort((a, b) => {
            const ha = hashes[a], hb = hashes[b];
            const r = comparer(ha, hb);
            if (r !== 0) {
                return r;
            }
            return ha < hb ? -1 : 1;
        });
        return a;
    }
}
