import * as crc32 from './crc32';
import * as difference from './difference';
import { PromiseWorker } from './promise';

type RawImageData = ArrayBuffer;
type SourceImage = HTMLImageElement | HTMLCanvasElement;

export type Hashes = ArrayBuffer;
export type ChipMap = Map<crc32.Hash, RawImageData>;

function getImageData(image: SourceImage, width: number, height: number): ImageData {
    if (width === image.width && height === image.height && image instanceof HTMLCanvasElement) {
        const ctx = image.getContext('2d');
        if (!(ctx instanceof CanvasRenderingContext2D)) {
            throw new Error('could not get CanvasRenderingContext2D');
        }
        return ctx.getImageData(0, 0, width, height);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('could not get CanvasRenderingContext2D');
    }
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export class Slicer {
    private worker = new PromiseWorker(Slicer.createWorkerURL());
    constructor(private readonly tileSize: number) {
    }

    slice(image: SourceImage): Promise<[Hashes, ChipMap]> {
        const tileSize = this.tileSize;
        // it makes easier on edge processing 
        const width = ((image.width + tileSize - 1) / tileSize | 0) * tileSize;
        const height = ((image.height + tileSize - 1) / tileSize | 0) * tileSize;
        const imageData = getImageData(image, width, height);
        return this.worker.postMessage({
            imageData: imageData.data.buffer,
            width,
            height,
            tileSize
        }, [imageData.data.buffer]);
    }
    get tasks(): number { return this.worker.waits; }

    private static _slice(
        buffer: ArrayBuffer,
        width: number,
        height: number,
        tileSize: number,
        crc32: (b: Uint8Array, table?: Uint32Array) => crc32.Hash,
        crc32Table: Uint32Array,
        calcHash: (a: Uint32Array) => number,
    ): [ArrayBuffer, ChipMap, ArrayBuffer[]] {
        const buffers: ArrayBuffer[] = [];
        const tile: ChipMap = new Map();
        const src = new Uint8Array(buffer);

        const chipWidth = width / tileSize | 0;
        const chipHeight = height / tileSize | 0;

        const imageHash = new Uint32Array(1 /* hash */ + chipWidth * chipHeight);
        const chipBuf = new ArrayBuffer(4 /* chip location index */ + 4 * tileSize * tileSize);
        const imageBuf = new Uint8Array(chipBuf, 4);

        // add empty chip
        tile.set(crc32(imageBuf, crc32Table), chipBuf.slice(0));

        for (let cy = 0; cy < chipHeight; ++cy) {
            const sy = cy * tileSize;
            for (let cx = 0; cx < chipWidth; ++cx) {
                for (let y = 0; y < tileSize; ++y) {
                    let sx = ((sy + y) * width + cx * tileSize) * 4;
                    let dx = y * tileSize * 4;
                    for (let x = 0; x < tileSize; ++x) {
                        imageBuf[dx++] = src[sx++];
                        imageBuf[dx++] = src[sx++];
                        imageBuf[dx++] = src[sx++];
                        imageBuf[dx++] = src[sx++];
                    }
                }
                const hash = crc32(imageBuf, crc32Table);
                const index = cy * chipWidth + cx;
                if (!tile.has(hash)) {
                    const bb = chipBuf.slice(0);
                    new Uint32Array(bb)[0] = index + 1;
                    buffers.push(bb);
                    tile.set(hash, bb);
                }
                imageHash[index + 1] = hash;
            }
        }

        imageHash[0] = calcHash(new Uint32Array(imageHash.buffer, 4));
        buffers.push(imageHash.buffer);
        return [imageHash.buffer, tile, buffers];
    }

    private static workerURL: string;
    private static createWorkerURL(): string {
        if (Slicer.workerURL) {
            return Slicer.workerURL;
        }
        Slicer.workerURL = URL.createObjectURL(new Blob([`
'use strict';
var crcTable = new Uint32Array(${JSON.stringify(Array.from(new Int32Array(crc32.crcTable.buffer)))});
var crc32 = ${crc32.crc32.toString()};
var calcHash = ${difference.calcHash.toString()};
var slice = ${Slicer._slice.toString()};
onmessage = function(e){
    var d = e.data[1];
    var ret = slice(d.imageData, d.width, d.height, d.tileSize, crc32, crcTable, calcHash);
    postMessage([ret[0], ret[1]], ret[2]);
};`], { type: 'text/javascript' }));
        return Slicer.workerURL;
    }
}
