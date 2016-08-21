'use strict';
module tileder {

   interface ImageData {
      name: string;
      width: number;
      height: number;
      originalWidth: number;
      originalHeight: number;
      tileWidth: number;
      tileHeight: number;
      data: ArrayBuffer;
      deflated: boolean;
   }

   export class Image implements ImageData {
      public name: string;
      public width: number;
      public height: number;
      public originalWidth: number;
      public originalHeight: number;
      public tileWidth: number;
      public tileHeight: number;
      public data: ArrayBuffer;
      public deflated: boolean;

      public tileSet: Tsx[];

      constructor(data: ImageData, tileSet: Tsx[]) {
         this.name = data.name;
         this.width = data.width;
         this.height = data.height;
         this.originalWidth = data.originalWidth;
         this.originalHeight = data.originalHeight;
         this.tileWidth = data.tileWidth;
         this.tileHeight = data.tileHeight;
         this.data = data.data;
         this.deflated = data.deflated;

         this.tileSet = tileSet;
      }

      public export(fileFormat: string, tileFormat: string, useTSX: boolean): Blob {
         if (this.deflated && tileFormat !== 'binz') {
            throw new Error(`cannot export by '${tileFormat}' when have the compressed data`);
         }

         if (!this.deflated && tileFormat === 'binz') {
            throw new Error(`cannot export by '${tileFormat}' when have the uncompressed data`);
         }

         switch (fileFormat) {
            case 'tmx':
               return this.exportTMX(tileFormat, useTSX);
            case 'json':
               return this.exportJSON(tileFormat, useTSX);
            case 'raw':
               return this.exportRaw(tileFormat);
         }
         throw new Error('unknown file format: ' + fileFormat);
      }

      private exportRaw(tileFormat: string): Blob {
         switch (tileFormat) {
            case 'csv':
               return new Blob([int32ArrayToCSV(new Int32Array(this.data), this.width, '\n')], { type: 'text/csv; charset=utf-8' });
            case 'bin':
               return new Blob([this.data], { type: 'application/octet-binary' });
            default:
               throw new Error('unknown tile format: ' + tileFormat);
         }
      }

      private exportJSON(tileFormat: string, useTSX: boolean): Blob {
         const ts: any[] = [];
         const path = new Array(this.name.split('\\').length).join('..\\');
         for (let i = 0; i < this.tileSet.length; ++i) {
            if (useTSX) {
               ts.push(this.tileSet[i].getTileSetReference(path));
            } else {
               ts.push(this.tileSet[i].getTileSet(path));
            }
         }
         const o: any = {
            width: this.width,
            height: this.height,
            tilewidth: this.tileWidth,
            tileheight: this.tileHeight,
            nextobjectid: 1,
            orientation: 'orthogonal',
            renderorder: 'right-down',
            version: 1,
            propertytypes: {
               originalwidth: 'int',
               originalheight: 'int'
            },
            properties: {
               originalwidth: this.originalWidth,
               originalheight: this.originalHeight
            },
            tilesets: ts,
            layers: [{
               height: this.height,
               name: this.name,
               opacity: 1,
               type: 'tilelayer',
               visible: true,
               width: this.width,
               x: 0,
               y: 0
            }]
         };
         switch (tileFormat) {
            case 'csv':
               o.layers[0].data = Array.prototype.slice.call(new Int32Array(this.data));
               break;
            case 'bin':
               o.layers[0].encoding = 'base64';
               o.layers[0].data = Base64.encode(this.data);
               break;
            case 'binz':
               o.layers[0].encoding = 'base64';
               o.layers[0].compression = 'zlib';
               o.layers[0].data = Base64.encode(this.data);
               break;
            default:
               throw new Error('unknown tile format: ' + tileFormat);
         }
         return new Blob([JSON.stringify(o)], { type: 'application/json; charset=utf-8' });
      }

      private exportTMX(tileFormat: string, useTSX: boolean): Blob {
         const xml: (string | ArrayBuffer)[] = [
            `<?xml version="1.0" encoding="UTF-8"?>\n`,
            `<map version="1.0" orientation="orthogonal" renderorder="right-down"`,
            ` width="${this.width}" height="${this.height}"`,
            ` tilewidth="${this.tileWidth}" tileheight="${this.tileHeight}" nextobjectid="1">\n`,
            `\t<properties>\n`,
            `\t\t<property name="originalWidth" type="int" value="${this.originalWidth}"/>\n`,
            `\t\t<property name="originalHeight" type="int" value="${this.originalHeight}"/>\n`,
            `\t</properties>\n`
         ];

         const path = new Array(this.name.split('\\').length).join('..\\');
         for (let i = 0; i < this.tileSet.length; ++i) {
            if (useTSX) {
               xml.push(`\t${this.tileSet[i].getTileSetReferenceTag(path)}\n`);
            } else {
               xml.push(`\t${this.tileSet[i].getTileSetTag(path)}\n`);
            }
         }

         xml.push(`\t<layer name="${this.name}" width="${this.width}" height="${this.height}">\n`);
         switch (tileFormat) {
            case 'csv':
               xml.push(`\t\t<data encoding="csv">\n`);
               xml.push(int32ArrayToCSV(new Int32Array(this.data), this.width, ',\n'));
               break;
            case 'xml':
               xml.push(`\t\t<data>\n`);
               xml.push(int32ArrayToXML(new Int32Array(this.data), '\t\t\t', '\n'));
               break;
            case 'bin':
               xml.push(`\t\t<data encoding="base64">\n\t\t\t`);
               xml.push(Base64.encode(this.data));
               break;
            case 'binz':
               xml.push(`\t\t<data encoding="base64" compression="zlib">\n\t\t\t`);
               xml.push(Base64.encode(this.data));
               break;
            default:
               throw new Error('unknown tile format: ' + tileFormat);
         }
         xml.push(`\n\t\t</data>\n\t</layer>\n</map>`);
         return new Blob(xml, { type: 'text/xml; charset=utf-8' });
      }
   }

   interface WorkerGlobal {
      postMessage(message: any, transfer?: ArrayBuffer[]): void;
   }

   interface TsxData {
      tileWidth: number;
      tileHeight: number;
      tileCount: number;
      columns: number;
      width: number;
      height: number;
      data: ArrayBuffer;
   }

   export class Tsx implements TsxData {
      public tileWidth: number;
      public tileHeight: number;
      public tileCount: number;
      public columns: number;
      public width: number;
      public height: number;
      public data: ArrayBuffer;

      public gid: number;
      public filename: string; // without ext

      constructor(data: TsxData, gid: number, filename: string) {
         this.tileWidth = data.tileWidth;
         this.tileHeight = data.tileHeight;
         this.tileCount = data.tileCount;
         this.columns = data.columns;
         this.width = data.width;
         this.height = data.height;
         this.data = data.data;

         this.gid = gid;
         this.filename = filename;
      }

      public getImage(doc: Document): HTMLCanvasElement {
         const src = new Uint8Array(this.data);
         const imageSize = Math.sqrt(src.length >> 2);

         const image = doc.createElement('canvas');
         image.width = imageSize;
         image.height = imageSize;

         const ctx = image.getContext('2d');
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
         return image;
      }

      public export(): string {
         return `<?xml version="1.0" encoding="UTF-8"?>
<tileset name="${this.filename}" tilewidth="${this.tileWidth}" tileheight="${this.tileHeight}" tilecount="${this.tileCount}" columns="${this.columns}">
   <image source="${this.filename}.png" width="${this.width}" height="${this.height}"/>
</tileset>`;
      }

      public getTileSetReferenceTag(path: string): string {
         return `<tileset firstgid="${this.gid}" source="${path}${this.filename}.tsx"/>`;
      }

      public getTileSetTag(path: string): string {
         return `<tileset firstgid="${this.gid}" name="${this.filename}"` +
            ` tilewidth="${this.tileWidth}" tileheight="${this.tileHeight}"` +
            ` tilecount="${this.tileCount}" columns="${this.columns}">` +
            `<image source="${path}${this.filename}.png" width="${this.width}" height="${this.height}"/>` +
            `</tileset>`;
      }

      public getTileSetReference(path: string): {
         firstgid: number;
         source: string;
      } {
         return {
            firstgid: this.gid,
            source: path + this.filename + '.tsx'
         };
      }

      public getTileSet(path: string): {
         columns: number;
         firstgid: number;
         image: string;
         imageheight: number;
         imagewidth: number;
         margin: number;
         name: string;
         spacing: number;
         tilecount: number;
         tileheight: number;
         tilewidth: number;
      } {
         return {
            columns: this.columns,
            firstgid: this.gid,
            image: path + this.filename + '.png',
            imageheight: this.height,
            imagewidth: this.width,
            margin: 0,
            name: this.filename,
            spacing: 0,
            tilecount: this.tileCount,
            tileheight: this.tileHeight,
            tilewidth: this.tileWidth
         };
      }
   }

   function int32ArrayToXML(a: Int32Array, prefix: string, postfix: string): string {
      const r: string[] = new Array(a.length);
      for (let i = 0; i < a.length; ++i) {
         r[i] = `<tile gid="${a[i].toString()}"/>`;
      }
      return prefix + r.join(prefix + postfix) + postfix;
   }

   function int32ArrayToCSV(a: Int32Array, width: number, sep: string): string {
      const r: string[] = new Array(a.length - (a.length / (width - 1)) | 0);
      for (let i = 0, j = 0, n = 0; i < a.length; ++i, ++j, ++n) {
         if (n + 1 === width && i + 1 < a.length) {
            r[j] = a[i].toString() + sep + a[++i].toString();
            n = 0;
            continue;
         }
         r[j] = a[i].toString();
      }
      return r.join(',');
   }

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
         this.w.onmessage = e => this.onMessage(e);
      }

      private onMessage(e: MessageEvent): void {
         switch (e.data.type) {
            case 'add':
               this.onAdd();
               break;
            case 'tsx':
               this.onTsx(e.data.t, e.data.i, e.data.n);
               break;
            case 'image':
               this.onImage(e.data.img, e.data.i, e.data.n);
               break;
         }
      }

      private queue: (() => void | undefined)[] = [];
      // private adding: () => void;
      public add(name: string, image: HTMLCanvasElement | HTMLImageElement, next: () => void): void {
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
         // this.adding = next;
         const q = this.queue.length > 5;
         if (q) {
            this.queue.push(next);
         } else {
            this.queue.push(undefined);
            setTimeout(next, 0);
         }
         this.w.postMessage({
            type: 'add',
            n: name,
            b: imgData.data.buffer,
            w: ctx.canvas.width,
            h: ctx.canvas.height
         }, [imgData.data.buffer]);
      }

      private onAdd(): void {
         // this.adding();
         const f = this.queue.shift();
         if (f) {
            setTimeout(f, 0);
         }
      }

      private tsxHandler: (tsx: Tsx, progress: number) => void;
      private imageHandler: (image: Image, progress: number) => void;
      private completeHandler: () => void;
      public finish(
         compressMap: boolean,
         tsx: (tsx: Tsx, progress: number) => void,
         image: (image: ImageData, progress: number) => void,
         complete: () => void
      ): void {
         this.tsxHandler = tsx;
         this.imageHandler = image;
         this.completeHandler = complete;
         this.w.postMessage({
            type: 'finish',
            c: compressMap,
         });

         this.tileSet = [];
         this.gid = 1;
      }

      private tileSet: Tsx[] = [];
      private gid = 1;
      private onTsx(tsx: TsxData, index: number, total: number): void {
         const t = new Tsx(tsx, this.gid, index.toString());
         this.tileSet.push(t);
         this.gid += tsx.tileCount;
         this.tsxHandler(t, index / total);
      }

      private onImage(image: Image, index: number, total: number): void {
         const i = new Image(image, this.tileSet);
         this.imageHandler(i, index / total);
         if (index === total - 1) {
            this.completeHandler();
         }
      }
   }

   class TilederWorker {
      private tileSize = 16;
      private tile: {
         [hash: string]: {
            h: number; // hash
            p: number; // block position index
            b: Uint8Array; // image data
         }
      } = {};

      private images: ImageData[] = [];

      constructor(private g: WorkerGlobal) { };

      public onMessage(e: MessageEvent): void {
         switch (e.data.type) {
            case 'add':
               this.onAdd(e.data.n, e.data.b, e.data.w, e.data.h);
               break;
            case 'finish':
               this.onFinish(e.data.c);
               break;
         }
      }

      private calcImageSize(n: number): number {
         const x = n * this.tileSize * this.tileSize;
         for (let p = 64; p <= 1024; p += p) {
            if (x <= p * p) {
               return p;
            }
         }
         return 1024;
      }

      private buildTsx(r: (tsx: TsxData, index: number, total: number) => void): {
         [hash: number]: number
      } {
         const tile = this.tile, tileSize = this.tileSize;
         const a = Object.keys(tile).map(key => tile[key]), aLen = a.length;

         a.sort((a, b) => {
            return a.p === b.p ? 0 : a.p < b.p ? -1 : 1;
         });

         let aPos = 0, numTsxes = 0;
         while (aPos < aLen) {
            const bLen = this.calcImageSize(aLen - aPos) >> 4;
            aPos += bLen * bLen;
            ++numTsxes;
         }

         aPos = 0;
         const map: { [hash: number]: number } = {};
         for (let i = 0; i < numTsxes; ++i) {
            const size = this.calcImageSize(aLen - aPos), size4 = size * 4, columns = size / tileSize;
            const image = new Uint8Array(size * size4);
            const bLen = size >> 4;
            for (let by = 0; by < bLen && aPos < aLen; ++by) {
               const dy = by * tileSize;
               for (let bx = 0; bx < bLen && aPos < aLen; ++bx) {
                  const src = a[aPos], srcBuf = src.b;
                  if (!srcBuf) {
                     throw new Error('unexpected undefined buffer');
                  }
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
                  map[src.h] = aPos++;
               }
            }
            r({
               tileWidth: tileSize,
               tileHeight: tileSize,
               tileCount: columns * columns,
               columns: columns,
               width: size,
               height: size,
               data: image.buffer
            }, i, numTsxes);
         }
         this.tile = {};
         return map;
      }

      private onFinish(compressMap: boolean): void {
         const map = this.buildTsx((tsx: TsxData, index: number, total: number) => {
            this.g.postMessage({ type: 'tsx', t: tsx, i: index, n: total }, [tsx.data]);
         });
         for (let i = 0; i < this.images.length; ++i) {
            const image = this.images[i];
            const d = new Uint32Array(image.data);
            for (let j = 0; j < d.length; ++j) {
               d[j] = map[d[j]] + 1;
            }
            if (compressMap) {
               image.data = pako.deflate(image.data).buffer;
               image.deflated = true;
            }
            this.g.postMessage({ type: 'image', img: image, i: i, n: this.images.length }, [image.data]);
         }
      }

      private onAdd(fileName: string, b: ArrayBuffer, w: number, h: number): void {
         const tile = this.tile;
         const tileSize = this.tileSize, tileSize4 = tileSize << 2;
         const ab = new Uint8ClampedArray(b);
         const buf = new Uint8Array(4 * tileSize * tileSize);

         const bwf = Math.floor(w / tileSize), bhf = Math.floor(h / tileSize);
         const bwc = Math.ceil(w / tileSize), bhc = Math.ceil(h / tileSize);
         const restw = w - bwf * tileSize, resth = h - bwf * tileSize;

         const imageHash = new Uint32Array(bwc * bhc);
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
                  tile[hash] = { h: hash, p: by * 1000000 + bx, b: new Uint8Array(buf) };
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
                  tile[hash] = { h: hash, p: by * 1000000 + bwf, b: new Uint8Array(buf) };
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
                  tile[hash] = { h: hash, p: bhf * 1000000 + bx, b: new Uint8Array(buf) };
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
               tile[hash] = { h: hash, p: bhf * 1000000 + bwf, b: new Uint8Array(buf) };
            }
            imageHash[bhf * bwc + bwf] = hash;
         }

         this.images.push({
            name: fileName,
            width: bwc,
            height: bhc,
            originalWidth: w,
            originalHeight: h,
            tileWidth: tileSize,
            tileHeight: tileSize,
            data: imageHash.buffer,
            deflated: false
         });
         this.g.postMessage({ type: 'add' });
      }
   }

   class Base64 {
      // Based on https://gist.github.com/jonleighton/958841
      private static table = new Uint8Array([
         // A-Z
         0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48,
         0x49, 0x4a, 0x4b, 0x4c, 0x4d, 0x4e, 0x4f, 0x50,
         0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a,
         // a-z
         0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68,
         0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70,
         0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a,
         // 0-9
         0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39,
         // + /
         0x2b, 0x2f
      ]);

      public static encode(input: ArrayBuffer): ArrayBuffer {
         const bytes = new Uint8Array(input);
         const byteLength = bytes.byteLength;
         const byteRemainder = byteLength % 3;
         const mainLength = byteLength - byteRemainder;

         const table = Base64.table;
         const base64 = new Uint8Array(mainLength / 3 * 4 + (byteRemainder ? 4 : 0));

         let chunk: number;

         // Main loop deals with bytes in chunks of 3
         let p = -1;
         for (let i = 0; i < mainLength; i = i + 3) {
            // Combine the three bytes into a single integer
            chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

            // Use bitmasks to extract 6-bit segments from the triplet
            // and convert the raw binary segments to the appropriate ASCII encoding
            base64[++p] = table[(chunk & 16515072) >> 18]; // 16515072 = (2^6 - 1) << 18
            base64[++p] = table[(chunk & 258048) >> 12]; // 258048   = (2^6 - 1) << 12
            base64[++p] = table[(chunk & 4032) >> 6]; // 4032     = (2^6 - 1) << 6
            base64[++p] = table[chunk & 63];               // 63       = 2^6 - 1
         }

         // Deal with the remaining bytes and padding
         if (byteRemainder === 1) {
            chunk = bytes[mainLength];
            base64[++p] = table[(chunk & 252) >> 2]; // 252 = (2^6 - 1) << 2
            base64[++p] = table[(chunk & 3) << 4]; // 3   = 2^2 - 1
            base64[++p] = 0x3d;
            base64[++p] = 0x3d;
         } else if (byteRemainder === 2) {
            chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
            base64[++p] = table[(chunk & 64512) >> 10]; // 64512 = (2^6 - 1) << 10
            base64[++p] = table[(chunk & 1008) >> 4]; // 1008  = (2^6 - 1) << 4
            base64[++p] = table[(chunk & 15) << 2]; // 15    = 2^4 - 1
            base64[++p] = 0x3d;
         }

         return base64.buffer;
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
   importScripts('https://cdnjs.cloudflare.com/ajax/libs/pako/1.0.3/pako_deflate.min.js');
   tileder.workerMain(this);
}
