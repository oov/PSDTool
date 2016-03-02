'use strict';

// this code is based on http://jsfiddle.net/gamealchemist/kpQyE/14/
// changes are:
//   added alpha-channel support
//   avoid "optimized too many times" in chrome
//   use web worker
//   convert to type script
class DownScaler {
   private destWidth: number;
   private destHeight: number;
   private dest: HTMLCanvasElement;

   constructor(private src: HTMLCanvasElement, private scale: number) {
      this.destWidth = 0 | this.src.width * scale;
      this.destHeight = 0 | this.src.height * scale;
      this.dest = document.createElement('canvas');
   }

   public fast(): HTMLCanvasElement {
      this.dest.width = this.destWidth;
      this.dest.height = this.destHeight;
      let ctx: CanvasRenderingContext2D = this.dest.getContext('2d');
      ctx.drawImage(
         this.src,
         0, 0, this.src.width, this.src.height,
         0, 0, Math.round(this.src.width * this.scale), Math.round(this.src.height * this.scale)
         );
      return this.dest;
   }

   public beautiful(): HTMLCanvasElement {
      let srcImageData = this.src.getContext('2d').getImageData(0, 0, this.src.width, this.src.height);
      let tmp = new Float32Array(this.destWidth * this.destHeight << 2);
      DownScaler.calculate(tmp, srcImageData.data, this.scale, this.src.width, this.src.height);
      this.dest.width = this.destWidth;
      this.dest.height = this.destHeight;
      let ctx = this.dest.getContext('2d');
      let imgData = ctx.createImageData(this.destWidth, this.destHeight);
      DownScaler.float32ToUint8ClampedArray(imgData.data, tmp, this.dest.width, this.dest.height, imgData.width);
      ctx.putImageData(imgData, 0, 0);
      return this.dest;
   }

   public beautifulWorker(callback: (dest: HTMLCanvasElement) => void): void {
      DownScaler.createWorkerURL();
      let w = new Worker(DownScaler.workerURL);
      w.onmessage = (e: MessageEvent): void => {
         this.dest.width = this.destWidth;
         this.dest.height = this.destHeight;
         let ctx = this.dest.getContext('2d');
         let imgData = ctx.createImageData(this.destWidth, this.destHeight);
         DownScaler.copyBuffer(imgData.data, new Uint8Array(e.data.buffer), this.destWidth, this.destHeight, imgData.width);
         ctx.putImageData(imgData, 0, 0);
         callback(this.dest);
      };
      let srcImageData = this.src.getContext('2d').getImageData(0, 0, this.src.width, this.src.height);
      w.postMessage({
         src: srcImageData.data.buffer,
         srcWidth: this.src.width,
         srcHeight: this.src.height,
         scale: this.scale,
         destWidth: 0 | this.src.width * this.scale,
         destHeight: 0 | this.src.height * this.scale
      }, [srcImageData.data.buffer]);
   }

   static copyBuffer(dest: Uint8ClampedArray, src: Uint8Array, srcWidth: number, srcHeight: number, destWidth: number) {
      srcWidth *= 4;
      destWidth *= 4;
      for (let y = 0, sl = 0, dl = 0; y < srcHeight; ++y) {
         sl = srcWidth * y;
         dl = destWidth * y;
         for (let x = 0; x < srcWidth; x += 4) {
            dest[dl + x] = src[sl + x];
            dest[dl + x + 1] = src[sl + x + 1];
            dest[dl + x + 2] = src[sl + x + 2];
            dest[dl + x + 3] = src[sl + x + 3];
         }
      }
   }

   static workerURL: string;

   static createWorkerURL(): void {
      if (DownScaler.workerURL) {
         return;
      }
      let sourceCode: string[] = [];
      sourceCode.push('\'use strict\';\n');
      sourceCode.push('var calculate = ');
      sourceCode.push(DownScaler.calculate.toString());
      sourceCode.push(';\n');
      sourceCode.push('var float32ToUint8ClampedArray = ');
      sourceCode.push(DownScaler.float32ToUint8ClampedArray.toString());
      sourceCode.push(';\n');
      sourceCode.push(`onmessage = function(e) {
    var tmp = new Float32Array(e.data.destWidth * e.data.destHeight << 2);
    calculate(tmp, new Uint8ClampedArray(e.data.src), e.data.scale, e.data.srcWidth, e.data.srcHeight);
    var dest = new Uint8ClampedArray(e.data.destWidth * e.data.destHeight << 2);
    float32ToUint8ClampedArray(dest, tmp, e.data.destWidth, e.data.destHeight, e.data.destWidth);
    postMessage({buffer: dest.buffer}, [dest.buffer]);
};`);
      DownScaler.workerURL = URL.createObjectURL(new Blob([sourceCode.join('')], { type: 'text/javascript' }));
   }

   static revokeWorkerURL(): void {
      if (DownScaler.workerURL) {
         URL.revokeObjectURL(DownScaler.workerURL);
         DownScaler.workerURL = '';
      }
   }

   static float32ToUint8ClampedArray(dest: Uint8ClampedArray, src: Float32Array, sw: number, sh: number, dw: number) {
      sw *= 4;
      dw *= 4;
      for (let x, y = 0, sl = 0, dl = 0; y < sh; ++y) {
         sl = sw * y;
         dl = dw * y;
         for (x = 0; x < sw; x += 4) {
            dest[dl + x] = src[sl + x];
            dest[dl + x + 1] = src[sl + x + 1];
            dest[dl + x + 2] = src[sl + x + 2];
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
