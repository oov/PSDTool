// this code is based on http://jsfiddle.net/gamealchemist/kpQyE/14/
// changes are:
//   added alpha-channel support
//   avoid "optimized too many times" in chrome
//   use web worker
//   convert to type script
export class DownScaler {
    get destWidth(): number { return 0 | Math.max(1, this.src.width * this.scale); }
    get destHeight(): number { return 0 | Math.max(1, this.src.height * this.scale); }
    private dest: HTMLCanvasElement = document.createElement('canvas');
    constructor(private src: HTMLCanvasElement, private scale: number, private useOld: boolean) { }

    public fast(): HTMLCanvasElement {
        this.adjustSize();
        const ctx = this.dest.getContext('2d');
        if (!ctx) {
            throw new Error('cannot get CanvasRenderingContext2D from dest');
        }
        if (this.useOld) {
            ctx.drawImage(
                this.src,
                0, 0, this.src.width, this.src.height,
                0, 0, Math.round(this.src.width * this.scale), Math.round(this.src.height * this.scale)
            );
        } else {
            ctx.drawImage(
                this.src,
                0, 0, this.src.width, this.src.height,
                0, 0, this.destWidth, this.destHeight
            );
        }
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
        const destImageData = srcCtx.createImageData(this.destWidth, this.destHeight);
        DownScaler.calculate(destImageData, srcImageData);
        this.adjustSize();
        const ctx = this.dest.getContext('2d');
        if (!ctx) {
            throw new Error('cannot get CanvasRenderingContext2D from dest');
        }
        ctx.putImageData(destImageData, 0, 0);
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
            useOld: this.useOld,
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
importScripts('${location.protocol}//${location.host}${location.pathname.replace(/[^/]*$/, '')}js/downscaler.js');
var calculate20160127 = ${DownScaler.calculate20160127.toString()};
onmessage = function(e) {
    var d = e.data;
    if (d.useOld) {
        calculate20160127({
            data: new Uint8ClampedArray(d.dest.ab),
            width: d.dest.width,
            height: d.dest.height
        }, {
            data: new Uint8ClampedArray(d.src.ab),
            width: d.src.width,
            height: d.src.height
        }, d.scale);
    } else {
        DownScaler.scale({
            data: new Uint8ClampedArray(d.src.ab),
            width: d.src.width,
            height: d.src.height
        }, {
            data: new Uint8ClampedArray(d.dest.ab),
            width: d.dest.width,
            height: d.dest.height
        }, 2.2);
    }
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

    // There is a bug in this routine, but it has not been fixed for backward compatibility.
    static calculate20160127(dest: ImageData, src: ImageData, scale: number): void {
        const tmp = new Float32Array(dest.data.length);
        const s = new Uint8Array(src.data.buffer, src.data.byteOffset, src.data.byteLength);
        const d = new Uint8Array(dest.data.buffer, dest.data.byteOffset, dest.data.byteLength);
        const dw = dest.width, dwx4 = dw << 2;
        const sw = src.width, sh = src.height;
        const sqScale = scale * scale;
        let sx = 0,
            si = 0; // source x,y, index within source array
        let tx = 0,
            ty = 0,
            yIndex = 0,
            di = 0; // target x,y, x,y index within target array
        let tX = 0,
            tY = 0; // rounded tx, ty
        let w = 0,
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

        for (let sy = 0; sy < sh; ++sy) {
            ty = sy * scale; // y src position within target
            tY = 0 | ty; // rounded : target pixel's y
            yIndex = tY * dwx4; // line index within target array
            crossY = (tY !== (0 | ty + scale));
            if (crossY) { // if pixel is crossing botton target pixel
                wy = (tY + 1 - ty); // weight of point within target pixel
                nwy = (ty + scale - tY - 1); // ... within y+1 target pixel
            }
            for (sx = 0; sx < sw; ++sx, si += 4) {
                tx = sx * scale; // x src position within target
                tX = 0 | tx; // rounded : target pixel's x
                di = yIndex + (tX << 2); // target pixel index within target array
                crossX = (tX !== (0 | tx + scale));
                if (crossX) { // if pixel is crossing target pixel's right
                    wx = (tX + 1 - tx); // weight of point within target pixel
                    nwx = (tx + scale - tX - 1); // ... within x+1 target pixel
                }
                sR = s[si]; // retrieving r,g,b for curr src px.
                sG = s[si + 1];
                sB = s[si + 2];
                sA = s[si + 3];
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
                    tmp[di] += sR * sqScale;
                    tmp[di + 1] += sG * sqScale;
                    tmp[di + 2] += sB * sqScale;
                    tmp[di + 3] += sA * sqScale;
                } else if (crossX && !crossY) { // cross on X only
                    w = wx * scale;
                    // add weighted component for current px
                    tmp[di] += sR * w;
                    tmp[di + 1] += sG * w;
                    tmp[di + 2] += sB * w;
                    tmp[di + 3] += sA * w;
                    // add weighted component for next (tX+1) px
                    w = nwx * scale;
                    tmp[di + 4] += sR * w;
                    tmp[di + 5] += sG * w;
                    tmp[di + 6] += sB * w;
                    tmp[di + 7] += sA * w;
                } else if (crossY && !crossX) { // cross on Y only
                    w = wy * scale;
                    // add weighted component for current px
                    tmp[di] += sR * w;
                    tmp[di + 1] += sG * w;
                    tmp[di + 2] += sB * w;
                    tmp[di + 3] += sA * w;
                    // add weighted component for next (tY+1) px
                    di += dwx4;
                    w = nwy * scale;
                    tmp[di] += sR * w;
                    tmp[di + 1] += sG * w;
                    tmp[di + 2] += sB * w;
                    tmp[di + 3] += sA * w;
                } else { // crosses both x and y : four target points involved
                    // add weighted component for current px
                    w = wx * wy;
                    tmp[di] += sR * w;
                    tmp[di + 1] += sG * w;
                    tmp[di + 2] += sB * w;
                    tmp[di + 3] += sA * w;
                    // for tX + 1; tY px
                    w = nwx * wy;
                    tmp[di + 4] += sR * w; // same for x
                    tmp[di + 5] += sG * w;
                    tmp[di + 6] += sB * w;
                    tmp[di + 7] += sA * w;
                    // for tX ; tY + 1 px
                    di += dwx4;
                    w = wx * nwy;
                    tmp[di] += sR * w; // same for mul
                    tmp[di + 1] += sG * w;
                    tmp[di + 2] += sB * w;
                    tmp[di + 3] += sA * w;
                    // for tX + 1 ; tY +1 px
                    w = nwx * nwy;
                    tmp[di + 4] += sR * w; // same for both x and y
                    tmp[di + 5] += sG * w;
                    tmp[di + 6] += sB * w;
                    tmp[di + 7] += sA * w;
                }
            } // end for sx
        } // end for sy

        const len = d.length;
        for (si = 0, w = 0; si < len; si += 4) {
            w = 255 / tmp[si + 3];
            d[si] = tmp[si] * w;
            d[si + 1] = tmp[si + 1] * w;
            d[si + 2] = tmp[si + 2] * w;
            d[si + 3] = tmp[si + 3];
        }
    }

    static calculate(dest: ImageData, src: ImageData): void {
        const tmp = new Float32Array(dest.data.length);
        const s = new Uint8Array(src.data.buffer, src.data.byteOffset, src.data.byteLength);
        const d = new Uint8Array(dest.data.buffer, dest.data.byteOffset, dest.data.byteLength);
        const dw = dest.width, dh = dest.height, dwx4 = dw << 2;
        const sw = src.width, sh = src.height;
        const scaleW = dw / sw, scaleH = dh / sh, boxScale = scaleW * scaleH;
        let sx = 0,
            si = 0; // source x,y, index within source array
        let tx = 0,
            ty = 0,
            yIndex = 0,
            di = 0; // target x,y, x,y index within target array
        let tX = 0,
            tY = 0; // rounded tx, ty
        let w = 0,
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

        for (let sy = 0; sy < sh; ++sy) {
            ty = sy * scaleH; // y src position within target
            tY = 0 | ty; // rounded : target pixel's y
            yIndex = tY * dwx4; // line index within target array
            crossY = (tY !== (0 | ty + scaleH));
            if (crossY) { // if pixel is crossing botton target pixel
                wy = (tY + 1 - ty); // weight of point within target pixel
                nwy = (ty + scaleH - tY - 1); // ... within y+1 target pixel
            }
            for (sx = 0; sx < sw; ++sx, si += 4) {
                tx = sx * scaleW; // x src position within target
                tX = 0 | tx; // rounded : target pixel's x
                di = yIndex + (tX << 2); // target pixel index within target array
                crossX = (tX !== (0 | tx + scaleW));
                if (crossX) { // if pixel is crossing target pixel's right
                    wx = (tX + 1 - tx); // weight of point within target pixel
                    nwx = (tx + scaleW - tX - 1); // ... within x+1 target pixel
                }
                sR = s[si]; // retrieving r,g,b for curr src px.
                sG = s[si + 1];
                sB = s[si + 2];
                sA = s[si + 3];
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
                    tmp[di] += sR * boxScale;
                    tmp[di + 1] += sG * boxScale;
                    tmp[di + 2] += sB * boxScale;
                    tmp[di + 3] += sA * boxScale;
                } else if (crossX && !crossY) { // cross on X only
                    w = wx * scaleW;
                    // add weighted component for current px
                    tmp[di] += sR * w;
                    tmp[di + 1] += sG * w;
                    tmp[di + 2] += sB * w;
                    tmp[di + 3] += sA * w;
                    // add weighted component for next (tX+1) px
                    w = nwx * scaleW;
                    tmp[di + 4] += sR * w;
                    tmp[di + 5] += sG * w;
                    tmp[di + 6] += sB * w;
                    tmp[di + 7] += sA * w;
                } else if (crossY && !crossX) { // cross on Y only
                    w = wy * scaleH;
                    // add weighted component for current px
                    tmp[di] += sR * w;
                    tmp[di + 1] += sG * w;
                    tmp[di + 2] += sB * w;
                    tmp[di + 3] += sA * w;
                    // add weighted component for next (tY+1) px
                    di += dwx4;
                    w = nwy * scaleH;
                    tmp[di] += sR * w;
                    tmp[di + 1] += sG * w;
                    tmp[di + 2] += sB * w;
                    tmp[di + 3] += sA * w;
                } else { // crosses both x and y : four target points involved
                    // add weighted component for current px
                    w = wx * wy;
                    tmp[di] += sR * w;
                    tmp[di + 1] += sG * w;
                    tmp[di + 2] += sB * w;
                    tmp[di + 3] += sA * w;
                    // for tX + 1; tY px
                    w = nwx * wy;
                    tmp[di + 4] += sR * w; // same for x
                    tmp[di + 5] += sG * w;
                    tmp[di + 6] += sB * w;
                    tmp[di + 7] += sA * w;
                    // for tX ; tY + 1 px
                    di += dwx4;
                    w = wx * nwy;
                    tmp[di] += sR * w; // same for mul
                    tmp[di + 1] += sG * w;
                    tmp[di + 2] += sB * w;
                    tmp[di + 3] += sA * w;
                    // for tX + 1 ; tY +1 px
                    w = nwx * nwy;
                    tmp[di + 4] += sR * w; // same for both x and y
                    tmp[di + 5] += sG * w;
                    tmp[di + 6] += sB * w;
                    tmp[di + 7] += sA * w;
                }
            } // end for sx
        } // end for sy

        const len = d.length;
        for (si = 0, w = 0; si < len; si += 4) {
            w = 255 / tmp[si + 3];
            d[si] = tmp[si] * w;
            d[si + 1] = tmp[si + 1] * w;
            d[si + 2] = tmp[si + 2] * w;
            d[si + 3] = tmp[si + 3];
        }
    }
}
