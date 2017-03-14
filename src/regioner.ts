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

export default class Regioner {
    private worker = new PromiseWorker(Regioner.createWorkerURL());
    constructor(private readonly tileSize: number) {
    }

    generate(image: SourceImage): Promise<BitArray> {
        const tileSize = this.tileSize;
        // it makes easier on edge processing 
        const width = ((image.width + tileSize - 1) / tileSize | 0) * tileSize;
        const height = ((image.height + tileSize - 1) / tileSize | 0) * tileSize;
        const imageData = getImageData(image, width, height);
        return this.worker.postMessage({
            image: imageData.data.buffer,
            width,
            height,
            tileSize,
        }, [imageData.data.buffer]).then(data => new BitArray(data.buffer, data.length));
    }
    get tasks(): number { return this.worker.waits; }

    private static _findRegion(
        imageBuffer: ArrayBuffer,
        width: number,
        height: number,
        tileSize: number,
    ): [ArrayBuffer, number] {
        const buf = new Uint8Array(imageBuffer);
        const blockWidth = width / tileSize | 0;
        const blockHeight = height / tileSize | 0;
        const blockLength = blockWidth * blockHeight;
        const result = new Uint32Array((blockLength + 31) >>> 5);
        let index: number, bufIndex: number, bitIndex: number;
        for (let by = 0; by < blockHeight; ++by) {
            const lry = by * tileSize;
            for (let bx = 0; bx < blockWidth; ++bx) {
                block:
                for (let y = 0; y < tileSize; ++y) {
                    let lrx = ((lry + y) * width + bx * tileSize) * 4;
                    for (let x = 0; x < tileSize; ++x, lrx += 4) {
                        if (buf[lrx + 3] > 0) {
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
        if (Regioner.workerURL) {
            return Regioner.workerURL;
        }
        Regioner.workerURL = URL.createObjectURL(new Blob([`
'use strict';
var findRegion = ${Regioner._findRegion.toString()};
onmessage = function(e){
    var d = e.data[1];
    var ret = findRegion(d.image, d.width, d.height, d.tileSize);
    postMessage({buffer: ret[0], length: ret[1]}, [ret[0]]);
};`], { type: 'text/javascript' }));
        return Regioner.workerURL;
    }
}
