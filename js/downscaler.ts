'use strict';
// this code is based on http://jsfiddle.net/gamealchemist/kpQyE/14/
// changes are:
//   added alpha-channel support
//   avoid "optimized too many times" in chrome
//   use web worker
//   convert to type script
class DownScaler {
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
            0, 0, Math.round(this.src.width * this.scale), Math.round(this.src.height * this.scale)
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

    public beautiful(): HTMLCanvasElement {
        const srcCtx = this.src.getContext('2d');
        if (!srcCtx) {
            throw new Error('cannot get CanvasRenderingContext2D from src');
        }
        const srcImageData = srcCtx.getImageData(0, 0, this.src.width, this.src.height);
        const tmp = new Float32Array(this.destWidth * this.destHeight << 2);
        DownScaler.calculate(tmp, srcImageData.data, this.scale, this.src.width, this.src.height);
        this.adjustSize();
        const ctx = this.dest.getContext('2d');
        if (!ctx) {
            throw new Error('cannot get CanvasRenderingContext2D from dest');
        }
        const imgData = ctx.createImageData(this.destWidth, this.destHeight);
        DownScaler.float32ToUint8ClampedArray(imgData.data, tmp, this.destWidth, this.destHeight, imgData.width);
        ctx.putImageData(imgData, 0, 0);
        return this.dest;
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
            const imgData = ctx.createImageData(this.destWidth, this.destHeight);
            DownScaler.copyBuffer(imgData.data, new Uint8Array(e.data.buffer), this.destWidth, this.destHeight, imgData.width);
            ctx.putImageData(imgData, 0, 0);
            callback(this.dest);
        };
        const srcCtx = this.src.getContext('2d');
        if (!srcCtx) {
            throw new Error('cannot get CanvasRenderingContext2D from src');
        }
        const srcImageData = srcCtx.getImageData(0, 0, this.src.width, this.src.height);
        w.postMessage({
            src: srcImageData.data.buffer,
            srcWidth: this.src.width,
            srcHeight: this.src.height,
            scale: this.scale,
            destWidth: this.destWidth,
            destHeight: this.destHeight
        }, [srcImageData.data.buffer]);
    }

    static copyBuffer(dest: Uint8ClampedArray, src: Uint8Array, srcWidth: number, srcHeight: number, destWidth: number) {
        srcWidth *= 4;
        destWidth *= 4;
        for (let x: number, y = 0, sl = 0, dl = 0; y < srcHeight; ++y) {
            sl = srcWidth * y;
            dl = destWidth * y;
            for (x = 0; x < srcWidth; x += 4) {
                dest[dl + x] = src[sl + x];
                dest[dl + x + 1] = src[sl + x + 1];
                dest[dl + x + 2] = src[sl + x + 2];
                dest[dl + x + 3] = src[sl + x + 3];
            }
        }
    }

    static workerURL: string;
    static activeWorker: Worker;

    static createWorkerURL(): string {
        if (DownScaler.workerURL) {
            return DownScaler.workerURL;
        }
        const sourceCode: string[] = [];
        sourceCode.push('\'use strict\';\n');
        sourceCode.push('var calculate = ');
        sourceCode.push(DownScaler.calculate.toString());
        sourceCode.push(';\n');
        sourceCode.push('var float32ToUint8ClampedArray = ');
        sourceCode.push(DownScaler.float32ToUint8ClampedArray.toString());
        sourceCode.push(';\n');
        sourceCode.push(`onmessage = function(e) {
    var d = e.data;
    var tmp = new Float32Array(d.destWidth * d.destHeight << 2);
    calculate(tmp, new Uint8Array(d.src), d.scale, d.srcWidth, d.srcHeight);
    var dest = new Uint8ClampedArray(d.destWidth * d.destHeight << 2);
    float32ToUint8ClampedArray(dest, tmp, d.destWidth, d.destHeight, d.destWidth);
    postMessage({buffer: dest.buffer}, [dest.buffer]);
};`);
        DownScaler.workerURL = URL.createObjectURL(new Blob([sourceCode.join('')], { type: 'text/javascript' }));
        return DownScaler.workerURL;
    }

    static revokeWorkerURL(): void {
        if (DownScaler.workerURL) {
            URL.revokeObjectURL(DownScaler.workerURL);
            DownScaler.workerURL = '';
        }
    }

    static float32ToUint8ClampedArray(dest: Uint8ClampedArray, src: Float32Array, srcWidth: number, srcHeight: number, destWidth: number) {
        srcWidth *= 4;
        destWidth *= 4;
        for (let ma: number, x: number, y = 0, sl = 0, dl = 0; y < srcHeight; ++y) {
            sl = srcWidth * y;
            dl = destWidth * y;
            for (x = 0; x < srcWidth; x += 4) {
                ma = 255 / src[sl + x + 3];
                dest[dl + x] = src[sl + x] * ma;
                dest[dl + x + 1] = src[sl + x + 1] * ma;
                dest[dl + x + 2] = src[sl + x + 2] * ma;
                dest[dl + x + 3] = src[sl + x + 3];
            }
        }
    }

    static calculate(tbuf: Float32Array, sbuf: Uint8ClampedArray, scale: number, sw: number, sh: number): void {
        const tw = 0 | sw * scale;
        const sqScale = scale * scale; // square scale = area of source pixel within target
        let sx = 0,
            sy = 0,
            sIndex = 0; // source x,y, index within source array
        let tx = 0,
            ty = 0,
            yIndex = 0,
            tIndex = 0,
            tIndex2 = 0; // target x,y, x,y index within target array
        let tX = 0,
            tY = 0; // rounded tx, ty
        let w = 0,
            nw = 0,
            wx = 0,
            nwx = 0,
            wy = 0,
            nwy = 0; // weight / next weight x / y
        // weight is weight of current source point within target.
        // next weight is weight of current source point within next target's point.
        let crossX = false; // does scaled px cross its current px right border ?
        let crossY = false; // does scaled px cross its current px bottom border ?
        let sR = 0,
            sG = 0,
            sB = 0,
            sA = 0;

        for (sy = 0; sy < sh; sy++) {
            ty = sy * scale; // y src position within target
            tY = 0 | ty; // rounded : target pixel's y
            yIndex = (tY * tw) << 2; // line index within target array
            crossY = (tY !== (0 | ty + scale));
            if (crossY) { // if pixel is crossing botton target pixel
                wy = (tY + 1 - ty); // weight of point within target pixel
                nwy = (ty + scale - tY - 1); // ... within y+1 target pixel
            }
            for (sx = 0; sx < sw; sx++ , sIndex += 4) {
                tx = sx * scale; // x src position within target
                tX = 0 | tx; // rounded : target pixel's x
                tIndex = yIndex + (tX << 2); // target pixel index within target array
                crossX = (tX !== (0 | tx + scale));
                if (crossX) { // if pixel is crossing target pixel's right
                    wx = (tX + 1 - tx); // weight of point within target pixel
                    nwx = (tx + scale - tX - 1); // ... within x+1 target pixel
                }
                sR = sbuf[sIndex]; // retrieving r,g,b for curr src px.
                sG = sbuf[sIndex + 1];
                sB = sbuf[sIndex + 2];
                sA = sbuf[sIndex + 3];
                if (sA === 0) {
                    continue;
                }
                if (sA < 255) {
                    // x * 32897 >> 23 == x / 255
                    sR = (sR * sA * 32897) >> 23;
                    sG = (sG * sA * 32897) >> 23;
                    sB = (sB * sA * 32897) >> 23;
                }

                if (!crossX && !crossY) { // pixel does not cross
                    // just add components weighted by squared scale.
                    tbuf[tIndex] += sR * sqScale;
                    tbuf[tIndex + 1] += sG * sqScale;
                    tbuf[tIndex + 2] += sB * sqScale;
                    tbuf[tIndex + 3] += sA * sqScale;
                } else if (crossX && !crossY) { // cross on X only
                    w = wx * scale;
                    // add weighted component for current px
                    tbuf[tIndex] += sR * w;
                    tbuf[tIndex + 1] += sG * w;
                    tbuf[tIndex + 2] += sB * w;
                    tbuf[tIndex + 3] += sA * w;
                    // add weighted component for next (tX+1) px
                    nw = nwx * scale;
                    tbuf[tIndex + 4] += sR * nw;
                    tbuf[tIndex + 5] += sG * nw;
                    tbuf[tIndex + 6] += sB * nw;
                    tbuf[tIndex + 7] += sA * nw;
                } else if (crossY && !crossX) { // cross on Y only
                    w = wy * scale;
                    // add weighted component for current px
                    tbuf[tIndex] += sR * w;
                    tbuf[tIndex + 1] += sG * w;
                    tbuf[tIndex + 2] += sB * w;
                    tbuf[tIndex + 3] += sA * w;
                    // add weighted component for next (tY+1) px
                    tIndex2 = tIndex + (tw << 2);
                    nw = nwy * scale;
                    tbuf[tIndex2] += sR * nw;
                    tbuf[tIndex2 + 1] += sG * nw;
                    tbuf[tIndex2 + 2] += sB * nw;
                    tbuf[tIndex2 + 3] += sA * nw;
                } else { // crosses both x and y : four target points involved
                    // add weighted component for current px
                    w = wx * wy;
                    tbuf[tIndex] += sR * w;
                    tbuf[tIndex + 1] += sG * w;
                    tbuf[tIndex + 2] += sB * w;
                    tbuf[tIndex + 3] += sA * w;
                    // for tX + 1; tY px
                    nw = nwx * wy;
                    tbuf[tIndex + 4] += sR * nw; // same for x
                    tbuf[tIndex + 5] += sG * nw;
                    tbuf[tIndex + 6] += sB * nw;
                    tbuf[tIndex + 7] += sA * nw;
                    // for tX ; tY + 1 px
                    tIndex2 = tIndex + (tw << 2);
                    nw = wx * nwy;
                    tbuf[tIndex2] += sR * nw; // same for mul
                    tbuf[tIndex2 + 1] += sG * nw;
                    tbuf[tIndex2 + 2] += sB * nw;
                    tbuf[tIndex2 + 3] += sA * nw;
                    // for tX + 1 ; tY +1 px
                    nw = nwx * nwy;
                    tbuf[tIndex2 + 4] += sR * nw; // same for both x and y
                    tbuf[tIndex2 + 5] += sG * nw;
                    tbuf[tIndex2 + 6] += sB * nw;
                    tbuf[tIndex2 + 7] += sA * nw;
                }
            } // end for sx
        } // end for sy
    }
}
