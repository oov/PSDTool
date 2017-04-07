declare var require: (name: string) => string;
const downScalerDefinition = require('raw-loader!uglify-loader!./downscaler/src/downscaler');

export class DownScaler {
    get destWidth(): number { return 0 | Math.max(1, this.src.width * this.scale); }
    get destHeight(): number { return 0 | Math.max(1, this.src.height * this.scale); }
    private dest: HTMLCanvasElement = document.createElement('canvas');
    constructor(private src: HTMLCanvasElement, private scale: number) { }

    public fast(): HTMLCanvasElement {
        this.adjustSize();
        const ctx = this.dest.getContext('2d');
        if (!ctx) {
            throw new Error('cannot get CanvasRenderingContext2D from dest');
        }
        ctx.drawImage(
            this.src,
            0, 0, this.src.width, this.src.height,
            0, 0, this.destWidth, this.destHeight
        );
        return this.dest;
    }

    private adjustSize(): void {
        const dw = this.destWidth;
        if (this.dest.width !== dw) {
            this.dest.width = dw;
        }
        const dh = this.destHeight;
        if (this.dest.height !== dh) {
            this.dest.height = dh;
        }
    }

    public beautifulWorker(callback: (dest: HTMLCanvasElement) => void): void {
        const w = new Worker(DownScaler.createWorkerURL());
        DownScaler.activeWorker = w;
        w.onmessage = e => {
            this.adjustSize();
            const ctx = this.dest.getContext('2d');
            if (!ctx) {
                throw new Error('cannot get CanvasRenderingContext2D from dest');
            }
            const destImageData = ctx.createImageData(this.destWidth, this.destHeight);
            const s = new Uint8Array(e.data.dest.ab);
            const d = new Uint8Array(destImageData.data.buffer, destImageData.data.byteOffset, destImageData.data.byteLength);
            for (let i = 0, len = d.length; i < len; i += 4) {
                d[i] = s[i];
                d[i + 1] = s[i + 1];
                d[i + 2] = s[i + 2];
                d[i + 3] = s[i + 3];
            }
            ctx.putImageData(destImageData, 0, 0);
            callback(this.dest);
        };
        const srcCtx = this.src.getContext('2d');
        if (!srcCtx) {
            throw new Error('cannot get CanvasRenderingContext2D from src');
        }
        const srcImageData = srcCtx.getImageData(0, 0, this.src.width, this.src.height);
        const destCtx = this.dest.getContext('2d');
        if (!destCtx) {
            throw new Error('cannot get CanvasRenderingContext2D from dest');
        }
        const destImageData = destCtx.createImageData(this.destWidth, this.destHeight);
        w.postMessage({
            src: {
                ab: srcImageData.data.buffer,
                width: srcImageData.width,
                height: srcImageData.height
            },
            dest: {
                ab: destImageData.data.buffer,
                width: destImageData.width,
                height: destImageData.height
            },
            scale: this.scale
        }, [srcImageData.data.buffer, destImageData.data.buffer]);
    }

    static workerURL: string;
    static activeWorker: Worker;

    static createWorkerURL(): string {
        if (DownScaler.workerURL) {
            return DownScaler.workerURL;
        }
        const sourceCode = `
'use strict';
var DownScaler = (function(exports){${downScalerDefinition}return exports;})({});
onmessage = function(e) {
    var d = e.data;
    DownScaler.scale({
        data: new Uint8ClampedArray(d.src.ab),
        width: d.src.width,
        height: d.src.height
    }, {
        data: new Uint8ClampedArray(d.dest.ab),
        width: d.dest.width,
        height: d.dest.height
    }, 2.2);
    postMessage({dest: d.dest}, [d.dest.ab]);
};`;
        DownScaler.workerURL = URL.createObjectURL(new Blob([sourceCode], { type: 'text/javascript' }));
        return DownScaler.workerURL;
    }

    static revokeWorkerURL(): void {
        if (DownScaler.workerURL) {
            URL.revokeObjectURL(DownScaler.workerURL);
            DownScaler.workerURL = '';
        }
    }
}
