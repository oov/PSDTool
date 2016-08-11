'use strict';
module tileder {
   export class Tileder {
      public static scriptName: string;
      private static getScriptName(): string {
         if (Tileder.scriptName) {
            return Tileder.scriptName;
         }
         const elem = document.getElementById('tileder');
         if (!elem) {
            return 'tileder.js';
         }
         return elem.getAttribute('src') || 'tileder.js';
      }

      private w: Worker;
      constructor() {
         this.w = new Worker(Tileder.getScriptName());
      }

      public add(name: string, image: HTMLCanvasElement | HTMLImageElement): void {
         let ctx: CanvasRenderingContext2D | null;
         if (image instanceof HTMLImageElement) {
            const cvs = document.createElement('canvas');
            cvs.width = image.width;
            cvs.height = image.height;
            ctx = cvs.getContext('2d');
            if (ctx) {
               ctx.drawImage(image, 0, 0);
            }
         } else {
            ctx = image.getContext('2d');
         }
         if (!ctx) {
            throw new Error('cannot get CanvasRenderingContext2D');
         }
         const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
         this.w.postMessage({
            type: 'add',
            b: imgData.data.buffer,
            w: ctx.canvas.width,
            h: ctx.canvas.height
         }, [imgData.data.buffer]);
      }

      public finish(): void {
         this.w.onmessage = e => {
            const images: ArrayBuffer[] = e.data;
            for (const ab of images) {
               const src = new Uint8Array(ab);
               const imageSize = Math.sqrt(src.length >> 2);
               const canvas = document.createElement('canvas');
               canvas.width = imageSize;
               canvas.height = imageSize;
               const ctx = canvas.getContext('2d');
               if (!ctx) {
                  throw new Error('cannot get CanvasRenderingContext2D');
               }
               const imageData = ctx.createImageData(imageSize, imageSize);
               const dest = imageData.data, sw = imageSize * 4, dw = imageData.width * 4;
               for (let y = 0; y < imageSize; ++y) {
                  const sx = y * sw, dx = y * dw;
                  for (let x = 0; x < sw; ++x) {
                     dest[dx + x] = src[sx + x];
                  }
               }
               ctx.putImageData(imageData, 0, 0);
               document.body.innerHTML = '';
               document.body.appendChild(canvas);
            }
         };
         this.w.postMessage({
            type: 'finish'
         });
      }
   }

   interface WorkerGlobal {
      postMessage(message: any, transfer?: ArrayBuffer[]): void;
   }

   class TilederWorker {
      private tileSize = 16;
      private tile: {
         [hash: string]: { hash: number, x: number, y: number, b: Uint8Array }
      } = {};

      constructor(private g: WorkerGlobal) { };

      public onMessage(e: MessageEvent): void {
         switch (e.data.type) {
            case 'add':
               this.add(e.data.b, e.data.w, e.data.h);
               break;
            case 'finish':
               const images = this.finish();
               this.g.postMessage(images, images);
               break;
         }
      }

      private calcImageSize(n: number): number {
         const x = n * this.tileSize * this.tileSize;
         for (let p = 64; p <= 1024; p += p) {
            if (n <= p * p) {
               return p;
            }
         }
         return 1024;
      }

      private finish(): ArrayBuffer[] {
         const tile = this.tile, tileSize = this.tileSize;
         const a = Object.keys(tile).map(key => tile[key]);
         a.sort((a, b) => {
            if (a.y === b.y) {
               return a.x === b.x ? 0 : a.x < b.x ? -1 : 1;
            }
            return a.y < b.y ? -1 : 1;
         });
         const images: ArrayBuffer[] = [], aLen = a.length;
         let aPos = 0;
         while (aPos < aLen) {
            const size = this.calcImageSize(aLen - aPos), size4 = size * 4;
            const image = new Uint8Array(size * size4);
            const bLen = size >> 4;
            for (let by = 0; by < bLen && aPos < aLen; ++by) {
               const dy = by * tileSize;
               for (let bx = 0; bx < bLen && aPos < aLen; ++bx) {
                  const src = a[aPos++], srcBuf = src.b;
                  for (let y = 0; y < tileSize; ++y) {
                     const dx = ((dy + y) * size + bx * tileSize) * 4;
                     const sx = y * tileSize * 4;
                     for (let x = 0; x < tileSize * 4; x += 4) {
                        image[dx + x + 0] = srcBuf[sx + x + 0];
                        image[dx + x + 1] = srcBuf[sx + x + 1];
                        image[dx + x + 2] = srcBuf[sx + x + 2];
                        image[dx + x + 3] = srcBuf[sx + x + 3];
                     }
                  }
                  src.x = bx;
                  src.y = by;
               }
            }
            images.push(image.buffer);
         }
         return images;
      }

      private add(b: ArrayBuffer, w: number, h: number): void {
         const tile = this.tile;
         const tileSize = this.tileSize, tileSize4 = tileSize << 2;
         const ab = new Uint8ClampedArray(b);
         const buf = new Uint8Array(4 * tileSize * tileSize);

         const bwf = Math.floor(w / tileSize), bhf = Math.floor(h / tileSize);
         const bwc = Math.ceil(w / tileSize), bhc = Math.ceil(h / tileSize);
         const restw = w - bwf * tileSize, resth = h - bwf * tileSize;

         const imageHash: number[] = new Array(bwc * bhc);
         for (let by = 0; by < bhf; ++by) {
            const sy = by * tileSize;
            for (let bx = 0; bx < bwf; ++bx) {
               for (let y = 0; y < tileSize; ++y) {
                  const sx = ((sy + y) * w + bx * tileSize) * 4;
                  const dx = y * tileSize * 4;
                  for (let x = 0; x < tileSize * 4; x += 4) {
                     buf[dx + x + 0] = ab[sx + x + 0];
                     buf[dx + x + 1] = ab[sx + x + 1];
                     buf[dx + x + 2] = ab[sx + x + 2];
                     buf[dx + x + 3] = ab[sx + x + 3];
                  }
               }
               const hash = CRC32.crc32(buf.buffer);
               if (!(hash in tile)) {
                  tile[hash] = { hash: hash, x: bx, y: by, b: new Uint8Array(buf) };
               }
               imageHash[by * bwc + bx] = hash;
            }
         }
         if (restw) {
            buf.fill(0);
            for (let by = 0; by < bhf; ++by) {
               const sy = by * tileSize;
               for (let y = 0; y < tileSize; ++y) {
                  const sx = ((sy + y) * w + bwf * tileSize) * 4;
                  const dx = y * tileSize4;
                  for (let x = 0; x < restw * 4; x += 4) {
                     buf[dx + x + 0] = ab[sx + x + 0];
                     buf[dx + x + 1] = ab[sx + x + 1];
                     buf[dx + x + 2] = ab[sx + x + 2];
                     buf[dx + x + 3] = ab[sx + x + 3];
                  }
               }
               const hash = CRC32.crc32(buf.buffer);
               if (!(hash in tile)) {
                  tile[hash] = { hash: hash, x: bwf, y: by, b: new Uint8Array(buf) };
               }
               imageHash[by * bwc + bwf] = hash;
            }
         }
         if (resth) {
            buf.fill(0);
            const sy = bhf * tileSize;
            for (let bx = 0; bx < bwf; ++bx) {
               for (let y = 0; y < resth; ++y) {
                  const sx = ((sy + y) * w + bx * tileSize) * 4;
                  const dx = y * tileSize4;
                  for (let x = 0; x < tileSize4; x += 4) {
                     buf[dx + x + 0] = ab[sx + x + 0];
                     buf[dx + x + 1] = ab[sx + x + 1];
                     buf[dx + x + 2] = ab[sx + x + 2];
                     buf[dx + x + 3] = ab[sx + x + 3];
                  }
               }
               const hash = CRC32.crc32(buf.buffer);
               if (!(hash in tile)) {
                  tile[hash] = { hash: hash, x: bx, y: bhf, b: new Uint8Array(buf) };
               }
               imageHash[bhf * bwc + bx] = hash;
            }
         }
         if (restw && resth) {
            buf.fill(0);
            const sy = bhf * tileSize;
            for (let y = 0; y < resth; ++y) {
               const sx = ((sy + y) * w + bwf * tileSize) * 4;
               const dx = y * tileSize4;
               for (let x = 0; x < restw * 4; x += 4) {
                  buf[dx + x + 0] = ab[sx + x + 0];
                  buf[dx + x + 1] = ab[sx + x + 1];
                  buf[dx + x + 2] = ab[sx + x + 2];
                  buf[dx + x + 3] = ab[sx + x + 3];
               }
            }
            const hash = CRC32.crc32(buf.buffer);
            if (!(hash in tile)) {
               tile[hash] = { hash: hash, x: bwf, y: bhf, b: new Uint8Array(buf) };
            }
            imageHash[bhf * bwc + bwf] = hash;
         }
         // TODO: save imageHash to storage
      }
   }

   class CRC32 {
      // Based on http://stackoverflow.com/a/18639999
      private static makeCRCTable(): Uint32Array {
         let c: number, n: number, k: number;
         const crcTable = new Uint32Array(256);
         for (n = 0; n < 256; n++) {
            c = n;
            for (k = 0; k < 8; k++) {
               c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            crcTable[n] = c;
         }
         return crcTable;
      }
      private static crcTable = CRC32.makeCRCTable();
      public static crc32(src: ArrayBuffer): number {
         const crcTable = CRC32.crcTable;
         let u8a = new Uint8Array(src);
         let crc = 0 ^ (-1);
         for (let i = 0; i < u8a.length; i++) {
            crc = (crc >>> 8) ^ crcTable[(crc ^ u8a[i]) & 0xFF];
         }
         return (crc ^ (-1)) >>> 0;
      }
   }

   export function workerMain(global: any): void {
      const tw = new TilederWorker(global);
      onmessage = (e) => tw.onMessage(e);
   }
}
if ('importScripts' in this) {
   tileder.workerMain(this);
}
