import { PromiseWorker } from './promise';
import { BitArray } from './bitarray';

type SourceImage = HTMLImageElement | HTMLCanvasElement;

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

export default class Differ {
    private worker = new PromiseWorker(Differ.createWorkerURL());
    constructor(private readonly tileSize: number) {
    }

    generate(baseImage: SourceImage, otherImage: SourceImage): Promise<BitArray> {
        const tileSize = this.tileSize;
        // it makes easier on edge processing 
        const width = ((baseImage.width + tileSize - 1) / tileSize | 0) * tileSize;
        const height = ((baseImage.height + tileSize - 1) / tileSize | 0) * tileSize;
        const base = getImageData(baseImage, width, height);
        const other = getImageData(otherImage, width, height);
        return this.worker.postMessage({
            base: base.data.buffer,
            other: other.data.buffer,
            width,
            height,
            tileSize,
        }, [base.data.buffer, other.data.buffer]).then(e => new BitArray(e.data.buffer, e.data.length));
    }
    get tasks(): number { return this.worker.waits; }

    private static _calcDiff(
        baseBuffer: ArrayBuffer,
        otherBuffer: ArrayBuffer,
        width: number,
        height: number,
        tileSize: number,
    ): [ArrayBuffer, number] {
        const lbuf = new Uint8Array(baseBuffer);
        const rbuf = new Uint8Array(otherBuffer);

        const blockWidth = width / tileSize | 0;
        const blockHeight = height / tileSize | 0;
        const blockLength = blockWidth * blockHeight;
        const result = new Uint32Array((blockLength + 31) >>> 5);
        for (let by = 0; by < blockHeight; ++by) {
            const lry = by * tileSize;
            for (let bx = 0; bx < blockWidth; ++bx) {
                block:
                for (let y = 0; y < tileSize; ++y) {
                    let lrx = ((lry + y) * width + bx * tileSize) * 4;
                    let la: number, ra: number, index: number, bufIndex: number, bitIndex: number;
                    for (let x = 0; x < tileSize; ++x, lrx += 4) {
                        la = lbuf[lrx + 3];
                        ra = rbuf[lrx + 3];
                        if (
                            la !== ra
                            || lbuf[lrx + 0] * la !== rbuf[lrx + 0] * ra
                            || lbuf[lrx + 1] * la !== rbuf[lrx + 1] * ra
                            || lbuf[lrx + 2] * la !== rbuf[lrx + 2] * ra
                        ) {
                            index = by * blockWidth + bx;
                            bufIndex = index >>> 5;
                            bitIndex = index - (bufIndex << 5);
                            result[bufIndex] |= 1 << bitIndex;
                            break block;
                        }
                    }
                }
            }
        }
        return [result.buffer, blockLength];
    }

    private static workerURL: string;
    private static createWorkerURL(): string {
        if (Differ.workerURL) {
            return Differ.workerURL;
        }
        Differ.workerURL = URL.createObjectURL(new Blob([`
'use strict';
var calcDiff = ${Differ._calcDiff.toString()};
onmessage = function(e){
    var d = e.data;
    var ret = calcDiff(d.base, d.other, d.width, d.height, d.tileSize);
    postMessage({buffer: ret[0], length: ret[1]}, [ret[0]]);
};`], { type: 'text/javascript' }));
        return Differ.workerURL;
    }
}
