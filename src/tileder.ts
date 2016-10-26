'use strict';
import * as crc32 from './crc32';

export interface ImageData {
    index: number;
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
    public index: number;
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
        this.index = data.index;
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
            case 'js':
                return this.exportJS(tileFormat, useTSX);
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
                // TODO: support big-endian system
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
                o.layers[0].data = arrayBufferToString(Base64.encode(this.data));
                break;
            case 'binz':
                o.layers[0].encoding = 'base64';
                o.layers[0].compression = 'zlib';
                o.layers[0].data = arrayBufferToString(Base64.encode(this.data));
                break;
            default:
                throw new Error('unknown tile format: ' + tileFormat);
        }
        return new Blob([JSON.stringify(o)], { type: 'application/json; charset=utf-8' });
    }

    private exportJS(tileFormat: string, useTSX: boolean): Blob {
        return new Blob([`(function(name,data){
 if(typeof onTileMapLoaded === 'undefined') {
  if(typeof TileMaps === 'undefined') TileMaps = {};
  TileMaps[name] = data;
 } else {
  onTileMapLoaded(name, data);
 }})(`,
            JSON.stringify(this.name), `, `, this.exportJSON(tileFormat, useTSX), ');'],
            { type: 'text/javascript; charset=utf-8' });
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

export interface TsxData {
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
<tileset name="${this.filename}" tilewidth="${this.tileWidth}" \
tileheight="${this.tileHeight}" tilecount="${this.tileCount}" columns="${this.columns}">
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
    private _tileSize = 16;

    private _chopper: Chopper[] = [];
    private _tile = new Map<number, Tile>();
    private _images: ImageData[] = [];

    private _waitReadyChopper(waits: number, found: (chopper: Chopper) => void): void {
        let find = () => {
            for (let i = 0; i < this._chopper.length; ++i) {
                if (this._chopper[i].tasks <= waits) {
                    found(this._chopper[i]);
                    return;
                }
            }
            setTimeout(() => find(), 100);
        };
        find();
    }

    private _add(index: number, name: string, buffer: ArrayBuffer, width: number, height: number): Promise<void> {
        return new Promise(resolve => {
            this._waitReadyChopper(this.queueMax, chopper => {
                chopper.chop(index, name, buffer, width, height, this._tileSize, (data, tile) => {
                    tile.forEach((v, hash) => {
                        if (!this._tile.has(hash)) {
                            this._tile.set(hash, v);
                        }
                    });
                    this._images.push(data);
                });
                resolve();
            });
        });
    }

    private readonly numWorkers = 4;
    private readonly queueMax = 3;

    constructor() {
        for (let i = 0; i < this.numWorkers; ++i) {
            this._chopper.push(new Chopper());
        }
    }

    private index = 0;
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
        this._add(this.index++, name, imgData.data.buffer, image.width, image.height).then(next);
    }

    public finish(
        compressMap: boolean,
        tsxCallback: (tsx: Tsx, progress: number) => void,
        imageCallback: (image: ImageData, progress: number) => void,
        complete: () => void
    ): void {
        const tileSet: Tsx[] = [];
        let gid = 1;
        Builder.build(
            compressMap,
            this._tile,
            this._images,
            this._tileSize,
            (tsx, index, total) => {
                const o = new Tsx(tsx, gid, index.toString());
                tileSet.push(o);
                gid += tsx.tileCount;
                tsxCallback(o, index / total);
            },
            (image, index, total) => {
                const o = new Image(image, tileSet);
                imageCallback(o, index / total);
            },
            complete
        );
    }
}

interface Tile {
    h: number; // hash
    p: number; // block position index
    b: ArrayBuffer; // image data
}

class Chopper {
    private worker = new Worker(Chopper.createWorkerURL());
    constructor() {
        this.worker.onmessage = e => {
            const callback = this._callbacks.shift();
            if (callback) {
                callback(e.data.data, e.data.tile);
            }
        };
    }

    private _callbacks: ((data: ImageData, tile: Map<number, Tile>) => void)[] = [];
    public chop(
        index: number,
        name: string,
        buffer: ArrayBuffer,
        width: number,
        height: number,
        tileSize: number,
        success: (data: ImageData, tile: Map<number, Tile>) => void
    ): void {
        this._callbacks.push(success);
        this.worker.postMessage({
            index, name, buffer, width, height, tileSize
        }, [buffer]);
    }
    public get tasks(): number { return this._callbacks.length; }

    private static _chop(
        index: number,
        name: string,
        b: ArrayBuffer,
        w: number,
        h: number,
        tileSize: number,
        crc32: (b: ArrayBuffer, table?: Uint32Array) => number,
        crc32Table: Uint32Array
    ): [ImageData, Map<number, Tile>, ArrayBuffer[]] {
        const buffers: ArrayBuffer[] = [];
        const tile = new Map<number, Tile>();
        const tileSize4 = tileSize << 2;
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
                    let sx = ((sy + y) * w + bx * tileSize) * 4;
                    let dx = y * tileSize * 4;
                    for (let x = 0; x < tileSize; ++x) {
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                    }
                }
                const hash = crc32(buf.buffer, crc32Table);
                if (!tile.has(hash)) {
                    const bb = buf.slice().buffer;
                    buffers.push(bb);
                    tile.set(hash, { h: hash, p: by * 1000000 + bx, b: bb });
                }
                imageHash[by * bwc + bx] = hash;
            }
        }
        if (restw) {
            buf.fill(0);
            for (let by = 0; by < bhf; ++by) {
                const sy = by * tileSize;
                for (let y = 0; y < tileSize; ++y) {
                    let sx = ((sy + y) * w + bwf * tileSize) * 4;
                    let dx = y * tileSize4;
                    for (let x = 0; x < restw; ++x) {
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                    }
                }
                const hash = crc32(buf.buffer, crc32Table);
                if (!tile.has(hash)) {
                    const bb = buf.slice().buffer;
                    buffers.push(bb);
                    tile.set(hash, { h: hash, p: by * 1000000 + bwf, b: bb });
                }
                imageHash[by * bwc + bwf] = hash;
            }
        }
        if (resth) {
            buf.fill(0);
            const sy = bhf * tileSize;
            for (let bx = 0; bx < bwf; ++bx) {
                for (let y = 0; y < resth; ++y) {
                    let sx = ((sy + y) * w + bx * tileSize) * 4;
                    let dx = y * tileSize4;
                    for (let x = 0; x < tileSize; ++x) {
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                    }
                }
                const hash = crc32(buf.buffer, crc32Table);
                if (!tile.has(hash)) {
                    const bb = buf.slice().buffer;
                    buffers.push(bb);
                    tile.set(hash, { h: hash, p: bhf * 1000000 + bx, b: bb });
                }
                imageHash[bhf * bwc + bx] = hash;
            }
        }
        if (restw && resth) {
            buf.fill(0);
            const sy = bhf * tileSize;
            for (let y = 0; y < resth; ++y) {
                let sx = ((sy + y) * w + bwf * tileSize) * 4;
                let dx = y * tileSize4;
                for (let x = 0; x < restw; ++x) {
                    buf[dx++] = ab[sx++];
                    buf[dx++] = ab[sx++];
                    buf[dx++] = ab[sx++];
                    buf[dx++] = ab[sx++];
                }
            }
            const hash = crc32(buf.buffer, crc32Table);
            if (!tile.has(hash)) {
                const bb = buf.slice().buffer;
                buffers.push(bb);
                tile.set(hash, { h: hash, p: bhf * 1000000 + bwf, b: bb });
            }
            imageHash[bhf * bwc + bwf] = hash;
        }

        buffers.push(imageHash.buffer);
        return [{
            index,
            name,
            width: bwc,
            height: bhc,
            originalWidth: w,
            originalHeight: h,
            tileWidth: tileSize,
            tileHeight: tileSize,
            data: imageHash.buffer,
            deflated: false
        }, tile, buffers];
    }

    private static workerURL: string;
    private static createWorkerURL(): string {
        if (Chopper.workerURL) {
            return Chopper.workerURL;
        }
        Chopper.workerURL = URL.createObjectURL(new Blob([`
'use strict';
var crcTable = new Uint32Array(${JSON.stringify(Array.from(new Int32Array(crc32.getCRCTable().buffer)))});
var crc32 = ${crc32.crc32.toString()};
var chop = ${Chopper._chop.toString()};
onmessage = function(e){
    var d = e.data;
    var ret = chop(d.index, d.name, d.buffer, d.width, d.height, d.tileSize, crc32, crcTable);
    postMessage({data: ret[0], tile: ret[1]}, ret[2]);
};`], { type: 'text/javascript' }));
        return Chopper.workerURL;
    }
}

class Builder {
    public static build(
        compressMap: boolean,
        tile: Map<number, Tile>,
        images: ImageData[],
        tileSize: number,
        tsx: (tsx: TsxData, index: number, total: number) => void,
        image: (tsx: ImageData, index: number, total: number) => void,
        complete: () => void
    ) {
        const w = new Worker(Builder.createWorkerURL());
        w.onmessage = e => {
            const d = e.data;
            if (d.image) {
                image(d.image, d.index, d.total);
                if (d.index === d.total - 1) {
                    complete();
                }
            } else {
                tsx(d.tsx, d.index, d.total);
            }

        };
        const buffers: ArrayBuffer[] = [];
        tile.forEach(v => {
            buffers.push(v.b);
        });
        for (const image of images) {
            buffers.push(image.data);
        }
        w.postMessage({ compressMap, tile, images, tileSize }, buffers);
    }

    private static _finish(
        compressMap: boolean,
        tile: Map<number, Tile>,
        images: ImageData[],
        tileSize: number,
        buildTsx: (
            tile: Map<number, Tile>,
            tileSize: number,
            tsxCallback: (tsx: TsxData, index: number, total: number) => void,
            calcImageSize: (tileSize: number, n: number) => number,
        ) => Map<number, number>,
        calcImageSize: (tileSize: number, n: number) => number,
        compress: (a: Uint8Array) => Uint8Array,
        tsxCallback: (tsx: TsxData, index: number, total: number) => void,
        imageCallback: (tsx: ImageData, index: number, total: number) => void,
    ): void {
        const map = buildTsx(tile, tileSize, tsxCallback, calcImageSize);
        images.sort((a, b) => {
            return a.index === b.index ? 0 : a.index < b.index ? -1 : 1;
        });
        for (let i = 0; i < images.length; ++i) {
            const image = images[i];
            const d = new Uint32Array(image.data);
            for (let j = 0; j < d.length; ++j) {
                d[j] = map.get(d[j]) + 1;
            }
            if (compressMap) {
                image.data = compress(new Uint8Array(image.data)).buffer;
                image.deflated = true;
            }
            imageCallback(image, i, images.length);
        }
    }

    private static _calcImageSize(tileSize: number, n: number): number {
        const x = n * tileSize * tileSize;
        for (let p = 64; p <= 1024; p += p) {
            if (x <= p * p) {
                return p;
            }
        }
        return 1024;
    }

    private static _buildTsx(
        tile: Map<number, Tile>,
        tileSize: number,
        tsxCallback: (tsx: TsxData, index: number, total: number) => void,
        calcImageSize: (tileSize: number, n: number) => number,
    ): Map<number, number> {
        const a: Tile[] = [];
        tile.forEach(v => a.push(v));
        const aLen = a.length;

        a.sort((a, b) => {
            return a.p === b.p ? 0 : a.p < b.p ? -1 : 1;
        });

        let aPos = 0, numTsxes = 0;
        while (aPos < aLen) {
            const bLen = calcImageSize(tileSize, aLen - aPos) >> 4;
            aPos += bLen * bLen;
            ++numTsxes;
        }

        aPos = 0;
        const map = new Map<number, number>();
        for (let i = 0; i < numTsxes; ++i) {
            const size = calcImageSize(tileSize, aLen - aPos), size4 = size * 4, columns = size / tileSize;
            const image = new Uint8Array(size * size4);
            const bLen = size >> 4;
            for (let by = 0; by < bLen && aPos < aLen; ++by) {
                const dy = by * tileSize;
                for (let bx = 0; bx < bLen && aPos < aLen; ++bx) {
                    const src = a[aPos], srcBuf = new Uint8Array(src.b);
                    for (let y = 0; y < tileSize; ++y) {
                        let dx = ((dy + y) * size + bx * tileSize) * 4;
                        let sx = y * tileSize * 4;
                        for (let x = 0; x < tileSize; ++x) {
                            image[dx++] = srcBuf[sx++];
                            image[dx++] = srcBuf[sx++];
                            image[dx++] = srcBuf[sx++];
                            image[dx++] = srcBuf[sx++];
                        }
                    }
                    map.set(src.h, aPos++);
                }
            }
            tsxCallback({
                tileWidth: tileSize,
                tileHeight: tileSize,
                tileCount: columns * columns,
                columns: columns,
                width: size,
                height: size,
                data: image.buffer
            }, i, numTsxes);
        }
        return map;
    }

    private static workerURL: string;
    private static createWorkerURL(): string {
        if (Builder.workerURL) {
            return Builder.workerURL;
        }
        Builder.workerURL = URL.createObjectURL(new Blob([`
'use strict';
importScripts('https://cdnjs.cloudflare.com/ajax/libs/pako/1.0.3/pako_deflate.min.js');
var calcImageSize = ${Builder._calcImageSize.toString()};
var buildTsx = ${Builder._buildTsx.toString()};
var compress = function(a){ return pako.deflate(a); };
var finish = ${Builder._finish.toString()};
onmessage = function(e){
    var d = e.data;
    var ret = finish(
        d.compressMap,
        d.tile,
        d.images,
        d.tileSize,
        buildTsx,
        calcImageSize,
        compress,
        function(tsx, index, total){
            postMessage({tsx: tsx, index: index, total: total}, [tsx.data]);
        },
        function(image, index, total){
            postMessage({image: image, index: index, total: total}, [image.data]);
        }
    );
};`], { type: 'text/javascript' }));
        return Builder.workerURL;
    }
}

export function getViewer(): string {
    return `<!DOCTYPE html>
<meta charset="utf-8">
<title>Tiled Viewer</title>
<style>
body{margin:0}
#ui,#view{float:left}
#selects{padding:0 0.5em}
#selects li{padding:0;margin:0 0 1em 0;list-style:none}
#selects select,input[type=range]{display:block;margin: 2px 0;min-width:192px}
#view{background-image: url(data:image/gif;base64,R0lGODlhYABgAKEBAMzMzP///////////yH/C05FVFNDQVBF\
Mi4wAwEAAAAh+QQACgD/ACwAAAAAYABgAAAC/oxvoKuIzNyBSyYKbMDZcv15GDiKFHmaELqqkVvBjdxJoV3iqd7yrx8DzoQ\
1x82YQ+6UPebPGYQOpcVH0rrENrVPbtQ7BVcnV3LWvEV31V922D2+cM7ydH19b+ff+/im3MeC90dHaGc4eCQmqIfYqAjHyO\
c4CRlII+lnSakJyJkJiilKFEo6SlWKerq4Gtl6aRqrqiHLWut6Czu7a8uL66vbK/w7HEx8bJz8+bqc2wz8XByNPK28ee2JX\
ah9yJ2YDb4dPvctbt49Xo5+rt7+mP7OHr9O714Jfy+fXz9v36n/j98+f6mkeeuHcGDCgASZHVQI0U9Bag8ZLpxoDZ/F+ogY\
q3ms2BGkQ40hSY4EWBLlSYEbW6Zk+bKhM5EzycFcKRMaTZ0ma6r0eRNoToM9ef40GhTpUIpFiR51mhTq0oxPqcW8iBOrUK1\
KuUr1yrQq1ahhyY6d+rFpWbQ7v3LM+nZr3K5zxbRdC/Zs3rRi+Zr1y1at3rp4CQ92CRexXMV0Gbt1XBjy4auGad2dnJiyZM\
B7L3Ou7Dm04M+bRfc1/Rd14NOjVXfW6Bp069msa6emfdv26ty8d/t+rRt4b+G/ZQevrDl55uWLlTdn3th5dOiPpVenHtl6d\
uyYn3tvHLs07uLij5cfbhz9efLau0//fh3+dvnu47+HVgAAIfkEAQoAAgAsAAAAAGAAYAAAAv4MjhfLm9naQ5FNVc3NembA\
XeC3kZ75hGUlqie7Ri0K0ZSNwa8cS731cwQ7KdxIV0TWlDdmjrfzRYFTYZW4hCa1WenW26V+xWHr2FzGNrlrcJv8RsfVT3c\
dfpfn6Uf2fjPj1Gc3iFeod8jncqZotJgW6JcYSfg4R2lo+TeEiag5yRl61dko+HnqmGqqKom6+trKWimbSetpWxor46rbOw\
v761sLPCx8S3xsnBvMXNyc/LzsPA1NLV2Nfa1Nyi3K2D3qDSl+Sb4Zjv7tAa6ePu5eDn/eTv9eH38/b7+Pz6/fD/CfQFDyC\
OYz6A9hQIUDeUVjl9ChNYgLJWbrxDCjxf1t5jTiotjwY8eNID0i41iQ5EiRKVkeVNnyZEmYL11GtFkRJ4iZOk0q4ylzZdCY\
P4UWJfrQaFKkE5U2ZXrRaVSoKGsOtXoU6zOfS7U+9ToVbNWbV8lmNdsV7Ve1YdmOzVkW7lm5aemutdsW79udUvdyvRsybuC\
5g+sWBvw372HFif3SdAuUcOPIhif3pYzYomWqmBk/1tvZcc/Pi0UL3iw2tOrLrDm3Tv0acuyApiWTRi3btW7Yu3Pz/u07OO\
jZpVf3Hn68OHHccZgrT+48+u3po6ufpn7dum3tlbFvzw7+u/juOmuTD39+fGbu69G3V++ZfXz38+Gbf58+/4ICACH5BAEKA\
AMALAAAAABgAGAAAAL+TICJxqza2kvRTVDNxXnnc31eF5KTWFajxKlptMIve5oPWru5vNO3DQFShAtii/fTJZFBZZM5dEah\
RWmVevQ9tVPu1Zu19MRLMK5M3qa76287rJm9z+r42I7G10F3ft6/F2NmRMemxyE4R7hoBQdo+Oh2KBnpmDhpKYdZSHlZyZn\
Z5zmq+cmIBZp6Otio2rqq+CqLCrtZazrLSpsbu+urG+f62wtMbGzLizysXMx8jLsM3Sz9TCpaav2XHYjdff2t7R0Ozk0OuX\
0uXj7Ovu6eHoTeqQ7fXv8+b55vv48fyv/Pn7Bp8gLeO9gPocGEDBc6HFiNXkOIzipSs1iQ4sX8jYkm3sr4UeLDkPpGJuMoU\
iPIkyujtSSYkiRAlTFZ1nR5E2ZJmjtlFnkZsadNoTiJ6pzpUyFPpEOZFnV6VGBSj02lVlU61eRTq1ux8qLaFWxUr2G1jhUb\
FGparmfNriXbdinbt2gx5qTr1q5RvHLhrtGrFvBcwX4J10W513BexIEZD3ZcGPJhoIr7Tr5bOavlxUAvJ5bMGTPozaQ1m77\
quTHl0afLlkYd+vPq2aJpm8sM+7Xr1nF58/WNe3du4KyHGxeOvPdx5cl/Lwehm7l0582DT7dO/Xrx6tu121ZdO7xs8eDHm7\
eHPX337OzVf3/8PnL81PDJ1z9/X20BACH5BAEKAAMALAAAAABgAGAAAAL+jIGJxqza2kvRTVDPzeHi7HEhuJGTWFajmkar2\
0qxdZoP/LG1ftuQTwEuhDlcj/dDBpVDZlG2MyalS2rT+qQdsagodPudhqvjazmr8WrFa3Lb/EZ3ZmlwvGuvs/VuPtwv93KG\
tzenBkjYZ5i3WCh45wPplPjXqPiISEQZSGdZienJeRi6Wap5OonKpTrIKrmaGgs72ypbS/t6q5vLm2nbS+rqizuse9kJmoy\
8PKrczMzoHA3tSH38jD2dXb19rf3NDe4dTj5u/mmN3q0uzl7ufi7aLv9ODyxdb/pbfJ9OH6+PWLB9AwXiAyis4C5+DBX2W/\
cPnsSIFAMudNjw4ET7iw/ncSyGkKDGiglHfsSI0mRJfydVimS5EmJLmC9lxvR4M1/OkAZp9rRZs4nLnziD6jTK8+JQpT6ZA\
iV6FGrSjlGdFpW6cWdWpFuxkuT6ldbUjE2pjk1ZluxTq1XNdmV7dqnbsHDfzp259q5WunrB4r0apq/Xv23VAhZcl6/hwmjz\
Lo6btvHhx3YpK5bMWK5lwpAdK+w8GTPozJE1i658+rLp1aVbe2b92nVo2LNlk469DbHuzXs5o6Z9uzZu4cSDGx+N/Lft5Kq\
XKx9+3Axz382hT++N3W/2wdsTU//efXdq8NrLczfvPad44NfRr3devXj78/TTu+fNoAAAIfkEAQoAAwAsAAAAAGAAYAAAAv\
6MA6l5javcgVE+ai/MlNkOcJ2IfaNZSiC5oa16wqmzugt725X80rE/a9QMOV4R2BP+lMHJ0tkkPqVRzZGZhGapW+sOedWGu\
WOvx/jFlofgtNhNhptDunPbrpaz8/h3P/43h6M3JVhHhxa454d418j3yDioWLgIGHnJAjmJaZjYaenpyEl6WPp5Omq6isqq\
2gr7KrvpShtrOytZq3vLm5u5C9wr/CuKe+yLTIy7VulcFRr93CUNPd1snU19TaiNve3dDT7+XS5uThmeTn7evo4Oyv3uHq9\
ezz6ff/+tbJz8vwygv4AEBxqshm8fvVT9EMJjKNDhwmAH5SnUB7GgRPyMFDde/Jixor2QbB52tEgS5cmRKxOmZDlMpMuWJm\
N6fDnTpkqdMIvdpDmRZ06fO5E0LHq0Z9KhS2sSVRoRaVSoGqVWpSrTadOgT5lO9XoVbFauWzlywan1a9qwa8ea7dr2p9C4V\
t2CBPq27N25ZNX2ZfvXLtrAco36zXt4L1zCdQvrHYwYcGTBeBU/rgzZcuLMnDF75ju5MF2sjjd/Xhy6sWrSq8WWlqwZdmfQ\
sSnTno269mvbhmWfvnz7t+ngxHPjBm5cuO/iyJsPT878ufPl0DUcl46d+nTe23d7bz3aNXjGrMuLNx8+Pfnz7Pll5/7+O/r\
16lPPt9+eawEAIfkEAQoAAwAsAAAAAGAAYAAAAv6MDal5HbvcgUoiCuzDGmfrdRw4SiFJiSkKqS0bwZXM0J9ZOie+8q8fA8\
6ENeJNl2vskD3m7+cMRofTYvWoTE60l2bWuwV3oV9y2DyWltVndpq6hrflb2vcPsfXsXn+3uW2ISaIRhi4dOdnSLeo16iI2\
AfIGPlnM+lY+YgJybV5CcpzxUkaOmqaWGqkerqKKvlq6TrbWpsa+0l7qwvLK2vbC/y7K5xbrInsmTy4XNh8qFziHM1MPV2N\
fa0Nnc29TWntLQ7eTf6dGW4+jl7Oft7ZDv/OSlwfbD98r5/Pb4zvv0/QsXTu1skzSC/gM3UMCzY8+DBhv4UOK0K0KBHgRPy\
CFztmpOgRF8iPHEnGMzkvDUqEIku2PPkypS+NNEfGZDnTZk6XO2H2lDnQZ1Cg/3QOxXk0IoqkGG8q/Ym0KE+mIaE+pbryql\
ShW4kqnNo16leuY71uJHvWbC61RsNqLSs2bdyaYOG+lXuXLlq9bOvibWoVMFangt0Wtnv47ODAVRc7NtwYctbEfOe2RRwZ8\
+TMfzlXznu58+bRhD3v6Ls39GfKqlv7XW36tevUsmvTvo06t2XbukHz3o1ldm/Wv33jBj489nHjyUkzdv5Yc2nokqdbfx6q\
+fXoordXxw6eO2zq0sN/Fy8cuXrm64kvd38NfXH47ZVrN1++VQEAIfkEAQoAAwAsAAAAAGAAYAAAAv6MD6l5Hbscgkw+Cuy\
lGmfrdZjIgaNZSiEKkS0bwYobq6edOiv+8rV+A+YaO2HP+CMGlcNJ01BkHqVJ59RahZ6em6uWG8XOZBXf2FxGntVp6trdFs\
e/3m7W/pZ/0Ht2H/6nR5NHdxdWSIg3pxiIuHjIOPi4JEjWGGkpeQnJSem46YnJp0maaWozeupXmtq6qgrI+uoaC1tJezurW\
4v7Kcu7mws8LFzsa3vcKxqczLxM3Az9bDwdTb0CFtqZzV237a0d3m0oDj6e+E1+PrkO2v57Xa5uTj9vjy6P/45c3Z+uXw/g\
PXYBJyn7R3Cgu4ILFcKzBtFfvoQCK1K82NBiRvqMDyXuOzhxo8iOCEfyK0kyZMqPzrAxXPnypEqZLKWhpBkTZM14OyPe1Jm\
z5UygDnEWJaoR5lGhPSUi5Wg0aVSoT01WVSr16lSrTIPaHNp16demP8NmNUsVLdexMcmCZSuWp1e5cX2+pXsWbl68afX25b\
sWMNa/dt0anlsYsUdwWhurHRw4cd3Fk8v6jUx5r2TNmQl3xmxZ8FbIpEeb1nq48t3NnkOzBr36c2nHl2c/Pn2btmjdr23Xx\
v0bVe7hwYnvNt4b+PHizJc7T85btnLoyKVHd239dmrO2LvH9r699ffx4WGX9/08e3Pq69WnB6+403Xy8emr3lcAACH5BAEK\
AAMALAAAAABgAGAAAAL+jB+gq4jM3IFLGtosBjbhvoGfNkohSYkpCqktG8GVnJmlc9qr/vKxPwPWcLdHcXK8JD07YtP4REa\
VU2bPeYVmpVtq1/rDhrVjbmSZEwfVQ/La3Ta/5XFv2T7H18F5/j4Nx0EjKETIZhjocueHSNeo98io2AfoOPmHlllVCXkZyS\
k56DkqWlpIemp6iLqqoZr4ahnbORuaetuKC6sry0vra5srvDvcW/x7HEy8bMyM7KzcLP08HU19bZ0Nuq3Z0r3IvflNOY4pf\
v4Vnl7+yc4KrQ7uXhtPji5/b7+eb77vj/9PH8CBAgv2I3jQYLtN9OYBq5cw4sKAEt9VgzgRYUb4hRaxYeyozWGyjw35baxY\
kuLJlSBJPhQJ7wPMizM91gxpsuVNlyN3+syZUqNOoC+J9jQaEylNpTaZ4lTZMihHqSiLQqXKEuvQq1aFav3adWrYqke5lvU\
6NmvarWjPil3102xSuUvpNrX7tO1cvXX53vWb9+1ewX0J/zUcmOxgxYUZH/4D1q3jxGolV158uXHmx5sps0XME/PnyaE1j+\
5cmvPp1aLiAk7tObJo2aZpq7Ydey1u2Lxdg/ZNGjhq4VF1G7fM+vhs5bWZ33aeG/lu4tOd9rZOHfp1qNmla+++3Lv48OSbj\
zdf/vl59emjt9/+GvzF6ng/FgAAOw==)}
</style>
<div id="ui">
  <div id="root"></div>
  <ul id="selects"></ul>
</div>
<canvas id="view"></canvas>
<script>
var tileMapLoadedCallbacks = {};
function onTileMapLoaded(name, data) {
  if (!(name in tileMapLoadedCallbacks)) {
    return;
  }
  tileMapLoadedCallbacks[name](data);
  delete tileMapLoadedCallbacks[name];
}
function loadTileMap(url, callback){
  var m = url.match(/\\..+$/);
  switch (m && m[0]) {
  case '.json':
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function(e) {
      callback(JSON.parse(this.response));
    };
    xhr.send();
    return;
  case '.js':
    tileMapLoadedCallbacks[url.replace(/\\//g, '\\\\').replace(/\\..+$/, '')] = callback;
    var sc = document.createElement('script');
    sc.src = url;
    document.body.appendChild(sc);
    setTimeout(function(){
      document.body.removeChild(sc);
    }, 0);
    return;
  }
  throw new Error('unsupported filetype: '+url);
}
function decodeData(layer){
  if (!('encoding' in layer)) {
    return layer.data;
  }
  switch (layer.encoding) {
  case 'base64':
    var ab = base64ToArrayBuffer(layer.data);
    if ('compression' in layer) {
      switch (layer.compression) {
      case 'zlib':
        ab = pako.inflate(ab).buffer;
        break;
      default:
        throw new Error('unsupported compression: '+layer.compression);
      }
    }
    var i32a = new Int32Array(ab), r = new Array(i32a.length);
    for (var i = 0; i < i32a.length; ++i) {
      r[i] = i32a[i];
    }
    return r;
  default:
    throw new Error('unsupported encoding: '+layer.encoding);
  }
}
function base64ToArrayBuffer(s){
  var bin = atob(s), u8a = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; ++i) {
    u8a[i] = bin.charCodeAt(i);
  }
  return u8a.buffer;
}
var selectId = 0;
function createSelect(caption, items, onChange){
  var id = 'sel' + (++selectId);

  var label = document.createElement('label');
  label.textContent = caption;
  label.htmlFor = id;

  var sel = document.createElement('select');
  sel.id = id;
  items.map(function(item, index){
    var opt = document.createElement('option');
    opt.textContent = item;
    opt.value = item;
    sel.appendChild(opt);
  });

  var slider = document.createElement('input');
  slider.type = 'range';
  slider.max = items.length-1;
  slider.value = 0;

  sel.addEventListener('change', function(e){
    slider.value = sel.selectedIndex;
    onChange(e);
  }, false);
  slider.addEventListener('input', function(e){
    sel.selectedIndex = slider.value;
    var ev = document.createEvent("HTMLEvents");
    ev.initEvent("change", false, true);
    sel.dispatchEvent(ev);
  }, false);

  var li = document.createElement('li');
  li.appendChild(label);
  li.appendChild(sel);
  li.appendChild(slider);
  return li;
}
function updateSelects(faview, rootIndex) {
  var elem = document.getElementById('selects');
  elem.innerHTML = '';
  function changed(){
    updateCanvas(faview, document.getElementById('view'));
  }
  var root = faview.roots[rootIndex];
  root.selects.map(function(sel, i){
    elem.appendChild(createSelect(root.captions[i], sel, changed));
  });
}
function buildName(flatten, namingStyle, ext) {
  var items = [], sels = document.querySelectorAll('select');
  for (var i = 0; i < sels.length; ++i){
    switch (namingStyle) {
    case 'standard':
      items.push(
        (i ? document.querySelector("label[for='"+sels[i].id+"']").textContent+'-' : '')+
        sels[i].options[sels[i].selectedIndex].value
      );
      break;
    case 'compact':
      items.push(sels[i].options[sels[i].selectedIndex].value);
      break;
    case 'index':
      items.push(sels[i].selectedIndex);
      break;
    }
  }
  return items.join(flatten ? '_' : '/') + '.' + ext;
}
function renderCanvas(tiled, canvas, images, layer){
  var tsx = tiled.tilesets, tw = tiled.tilewidth, th = tiled.tileheight;
  canvas.width = tiled.properties.originalwidth;
  canvas.height = tiled.properties.originalheight;
  var ctx = canvas.getContext('2d');
  var dx = 0, dy = 0, data = decodeData(layer);
  for (var i = 0; i < data.length; ++i) {
    var d = data[i]-1, img = 0;
    while(d >= tsx[img].tilecount) {
      d -= tsx[img++].tilecount;
    }
    var sx = d % tsx[img].columns, sy = (d - sx) / tsx[img].columns;
    ctx.drawImage(images[img], sx * tw, sy * th, tw, th, dx * tw, dy * th, tw, th);
    if (++dx == layer.width) {
      dx = 0;
      ++dy;
    }
  }
}
function updateCanvas(faview, canvas){
  var path = buildName(faview.flatten, faview.namingStyle, faview.format);
  loadTileMap(path, function(tiled){
    var images, loading = 0;
    function loaded(){
      if (--loading) return;
      tiled.layers.map(function(layer){
        renderCanvas(tiled, canvas, images, layer);
      });
    }
    images = tiled.tilesets.map(function(tsx){
      ++loading;
      var img = new Image();
      img.src = path.replace(/[^\\/]+$/, '') + tsx.image.replace(/\\\\/g, '/');
      img.onload = loaded;
      return img;
    });
  });
}
function onFaviewLoaded(faview){
  var sel = document.createElement('select');
  faview.roots.map(function(root){
    var opt = document.createElement('option');
    opt.textContent = root.name;
    opt.value = root.name;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', function(e){
    updateSelects(faview, e.currentTarget.selectedIndex);
  }, false);
  if (faview.roots.length <= 1) {
    sel.style.display = 'none';
  }
  document.getElementById('root').appendChild(sel);
  updateSelects(faview, 0);
  updateCanvas(faview, document.getElementById('view'));
}
</script>
<script>
/* pako 1.0.3 nodeca/pako */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();\
else if("function"==typeof define&&define.amd)define([],e);else{var t;t="undefined"!=typ\
eof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,t\
.pako=e()}}(function(){return function e(t,i,n){function a(o,s){if(!i[o]){if(!t[o]){var \
f="function"==typeof require&&require;if(!s&&f)return f(o,!0);if(r)return r(o,!0);var l=\
new Error("Cannot find module '"+o+"'");throw l.code="MODULE_NOT_FOUND",l}var d=i[o]={ex\
ports:{}};t[o][0].call(d.exports,function(e){var i=t[o][1][e];return a(i?i:e)},d,d.expor\
ts,e,t,i,n)}return i[o].exports}for(var r="function"==typeof require&&require,o=0;o<n.le\
ngth;o++)a(n[o]);return a}({1:[function(e,t,i){"use strict";var n="undefined"!=typeof Ui\
nt8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;i.assign=funct\
ion(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var i=t.shift();if(i\
){if("object"!=typeof i)throw new TypeError(i+"must be non-object");for(var n in i)i.has\
OwnProperty(n)&&(e[n]=i[n])}}return e},i.shrinkBuf=function(e,t){return e.length===t?e:e\
.subarray?e.subarray(0,t):(e.length=t,e)};var a={arraySet:function(e,t,i,n,a){if(t.subar\
ray&&e.subarray)return void e.set(t.subarray(i,i+n),a);for(var r=0;r<n;r++)e[a+r]=t[i+r]\
},flattenChunks:function(e){var t,i,n,a,r,o;for(n=0,t=0,i=e.length;t<i;t++)n+=e[t].lengt\
h;for(o=new Uint8Array(n),a=0,t=0,i=e.length;t<i;t++)r=e[t],o.set(r,a),a+=r.length;retur\
n o}},r={arraySet:function(e,t,i,n,a){for(var r=0;r<n;r++)e[a+r]=t[i+r]},flattenChunks:f\
unction(e){return[].concat.apply([],e)}};i.setTyped=function(e){e?(i.Buf8=Uint8Array,i.B\
uf16=Uint16Array,i.Buf32=Int32Array,i.assign(i,a)):(i.Buf8=Array,i.Buf16=Array,i.Buf32=A\
rray,i.assign(i,r))},i.setTyped(n)},{}],2:[function(e,t,i){"use strict";function n(e,t){\
if(t<65537&&(e.subarray&&o||!e.subarray&&r))return String.fromCharCode.apply(null,a.shri\
nkBuf(e,t));for(var i="",n=0;n<t;n++)i+=String.fromCharCode(e[n]);return i}var a=e("./co\
mmon"),r=!0,o=!0;try{String.fromCharCode.apply(null,[0])}catch(e){r=!1}try{String.fromCh\
arCode.apply(null,new Uint8Array(1))}catch(e){o=!1}for(var s=new a.Buf8(256),f=0;f<256;f\
++)s[f]=f>=252?6:f>=248?5:f>=240?4:f>=224?3:f>=192?2:1;s[254]=s[254]=1,i.string2buf=func\
tion(e){var t,i,n,r,o,s=e.length,f=0;for(r=0;r<s;r++)i=e.charCodeAt(r),55296===(64512&i)\
&&r+1<s&&(n=e.charCodeAt(r+1),56320===(64512&n)&&(i=65536+(i-55296<<10)+(n-56320),r++)),\
f+=i<128?1:i<2048?2:i<65536?3:4;for(t=new a.Buf8(f),o=0,r=0;o<f;r++)i=e.charCodeAt(r),55\
296===(64512&i)&&r+1<s&&(n=e.charCodeAt(r+1),56320===(64512&n)&&(i=65536+(i-55296<<10)+(\
n-56320),r++)),i<128?t[o++]=i:i<2048?(t[o++]=192|i>>>6,t[o++]=128|63&i):i<65536?(t[o++]=\
224|i>>>12,t[o++]=128|i>>>6&63,t[o++]=128|63&i):(t[o++]=240|i>>>18,t[o++]=128|i>>>12&63,\
t[o++]=128|i>>>6&63,t[o++]=128|63&i);return t},i.buf2binstring=function(e){return n(e,e.\
length)},i.binstring2buf=function(e){for(var t=new a.Buf8(e.length),i=0,n=t.length;i<n;i\
++)t[i]=e.charCodeAt(i);return t},i.buf2string=function(e,t){var i,a,r,o,f=t||e.length,l\
=new Array(2*f);for(a=0,i=0;i<f;)if(r=e[i++],r<128)l[a++]=r;else if(o=s[r],o>4)l[a++]=65\
533,i+=o-1;else{for(r&=2===o?31:3===o?15:7;o>1&&i<f;)r=r<<6|63&e[i++],o--;o>1?l[a++]=655\
33:r<65536?l[a++]=r:(r-=65536,l[a++]=55296|r>>10&1023,l[a++]=56320|1023&r)}return n(l,a)\
},i.utf8border=function(e,t){var i;for(t=t||e.length,t>e.length&&(t=e.length),i=t-1;i>=0\
&&128===(192&e[i]);)i--;return i<0?t:0===i?t:i+s[e[i]]>t?i:t}},{"./common":1}],3:[functi\
on(e,t,i){"use strict";function n(e,t,i,n){for(var a=65535&e|0,r=e>>>16&65535|0,o=0;0!==\
i;){o=i>2e3?2e3:i,i-=o;do a=a+t[n++]|0,r=r+a|0;while(--o);a%=65521,r%=65521}return a|r<<\
16|0}t.exports=n},{}],4:[function(e,t,i){"use strict";t.exports={Z_NO_FLUSH:0,Z_PARTIAL_\
FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END\
:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRE\
SSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFF\
MAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFL\
ATED:8}},{}],5:[function(e,t,i){"use strict";function n(){for(var e,t=[],i=0;i<256;i++){\
e=i;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[i]=e}return t}function a(e,t,i,n)\
{var a=r,o=n+i;e^=-1;for(var s=n;s<o;s++)e=e>>>8^a[255&(e^t[s])];return e^-1}var r=n();t\
.exports=a},{}],6:[function(e,t,i){"use strict";function n(){this.text=0,this.time=0,thi\
s.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.\
hcrc=0,this.done=!1}t.exports=n},{}],7:[function(e,t,i){"use strict";var n=30,a=12;t.exp\
orts=function(e,t){var i,r,o,s,f,l,d,u,c,h,b,w,m,k,_,g,v,p,x,y,S,E,B,Z,A;i=e.state,r=e.n\
ext_in,Z=e.input,o=r+(e.avail_in-5),s=e.next_out,A=e.output,f=s-(t-e.avail_out),l=s+(e.a\
vail_out-257),d=i.dmax,u=i.wsize,c=i.whave,h=i.wnext,b=i.window,w=i.hold,m=i.bits,k=i.le\
ncode,_=i.distcode,g=(1<<i.lenbits)-1,v=(1<<i.distbits)-1;e:do{m<15&&(w+=Z[r++]<<m,m+=8,\
w+=Z[r++]<<m,m+=8),p=k[w&g];t:for(;;){if(x=p>>>24,w>>>=x,m-=x,x=p>>>16&255,0===x)A[s++]=\
65535&p;else{if(!(16&x)){if(0===(64&x)){p=k[(65535&p)+(w&(1<<x)-1)];continue t}if(32&x){\
i.mode=a;break e}e.msg="invalid literal/length code",i.mode=n;break e}y=65535&p,x&=15,x&\
&(m<x&&(w+=Z[r++]<<m,m+=8),y+=w&(1<<x)-1,w>>>=x,m-=x),m<15&&(w+=Z[r++]<<m,m+=8,w+=Z[r++]\
<<m,m+=8),p=_[w&v];i:for(;;){if(x=p>>>24,w>>>=x,m-=x,x=p>>>16&255,!(16&x)){if(0===(64&x)\
){p=_[(65535&p)+(w&(1<<x)-1)];continue i}e.msg="invalid distance code",i.mode=n;break e}\
if(S=65535&p,x&=15,m<x&&(w+=Z[r++]<<m,m+=8,m<x&&(w+=Z[r++]<<m,m+=8)),S+=w&(1<<x)-1,S>d){\
e.msg="invalid distance too far back",i.mode=n;break e}if(w>>>=x,m-=x,x=s-f,S>x){if(x=S-\
x,x>c&&i.sane){e.msg="invalid distance too far back",i.mode=n;break e}if(E=0,B=b,0===h){\
if(E+=u-x,x<y){y-=x;do A[s++]=b[E++];while(--x);E=s-S,B=A}}else if(h<x){if(E+=u+h-x,x-=h\
,x<y){y-=x;do A[s++]=b[E++];while(--x);if(E=0,h<y){x=h,y-=x;do A[s++]=b[E++];while(--x);\
E=s-S,B=A}}}else if(E+=h-x,x<y){y-=x;do A[s++]=b[E++];while(--x);E=s-S,B=A}for(;y>2;)A[s\
++]=B[E++],A[s++]=B[E++],A[s++]=B[E++],y-=3;y&&(A[s++]=B[E++],y>1&&(A[s++]=B[E++]))}else\
{E=s-S;do A[s++]=A[E++],A[s++]=A[E++],A[s++]=A[E++],y-=3;while(y>2);y&&(A[s++]=A[E++],y>\
1&&(A[s++]=A[E++]))}break}}break}}while(r<o&&s<l);y=m>>3,r-=y,m-=y<<3,w&=(1<<m)-1,e.next\
_in=r,e.next_out=s,e.avail_in=r<o?5+(o-r):5-(r-o),e.avail_out=s<l?257+(l-s):257-(s-l),i.\
hold=w,i.bits=m}},{}],8:[function(e,t,i){"use strict";function n(e){return(e>>>24&255)+(\
e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function a(){this.mode=0,this.last=!1,this.wra\
p=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,t\
his.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bit\
s=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.l\
enbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=nul\
l,this.lens=new _.Buf16(320),this.work=new _.Buf16(288),this.lendyn=null,this.distdyn=nu\
ll,this.sane=0,this.back=0,this.was=0}function r(e){var t;return e&&e.state?(t=e.state,e\
.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=D,t.last=0,t.\
havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new _.Buf32(we)\
,t.distcode=t.distdyn=new _.Buf32(me),t.sane=1,t.back=-1,z):C}function o(e){var t;return\
 e&&e.state?(t=e.state,t.wsize=0,t.whave=0,t.wnext=0,r(e)):C}function s(e,t){var i,n;ret\
urn e&&e.state?(n=e.state,t<0?(i=0,t=-t):(i=(t>>4)+1,t<48&&(t&=15)),t&&(t<8||t>15)?C:(nu\
ll!==n.window&&n.wbits!==t&&(n.window=null),n.wrap=i,n.wbits=t,o(e))):C}function f(e,t){\
var i,n;return e?(n=new a,e.state=n,n.window=null,i=s(e,t),i!==z&&(e.state=null),i):C}fu\
nction l(e){return f(e,_e)}function d(e){if(ge){var t;for(m=new _.Buf32(512),k=new _.Buf\
32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(\
;t<288;)e.lens[t++]=8;for(x(S,e.lens,0,288,m,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;\
x(E,e.lens,0,32,k,0,e.work,{bits:5}),ge=!1}e.lencode=m,e.lenbits=9,e.distcode=k,e.distbi\
ts=5}function u(e,t,i,n){var a,r=e.state;return null===r.window&&(r.wsize=1<<r.wbits,r.w\
next=0,r.whave=0,r.window=new _.Buf8(r.wsize)),n>=r.wsize?(_.arraySet(r.window,t,i-r.wsi\
ze,r.wsize,0),r.wnext=0,r.whave=r.wsize):(a=r.wsize-r.wnext,a>n&&(a=n),_.arraySet(r.wind\
ow,t,i-n,a,r.wnext),n-=a,n?(_.arraySet(r.window,t,i-n,n,0),r.wnext=n,r.whave=r.wsize):(r\
.wnext+=a,r.wnext===r.wsize&&(r.wnext=0),r.whave<r.wsize&&(r.whave+=a))),0}function c(e,\
t){var i,a,r,o,s,f,l,c,h,b,w,m,k,we,me,ke,_e,ge,ve,pe,xe,ye,Se,Ee,Be=0,Ze=new _.Buf8(4),\
Ae=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input\
&&0!==e.avail_in)return C;i=e.state,i.mode===X&&(i.mode=W),s=e.next_out,r=e.output,l=e.a\
vail_out,o=e.next_in,a=e.input,f=e.avail_in,c=i.hold,h=i.bits,b=f,w=l,ye=z;e:for(;;)swit\
ch(i.mode){case D:if(0===i.wrap){i.mode=W;break}for(;h<16;){if(0===f)break e;f--,c+=a[o+\
+]<<h,h+=8}if(2&i.wrap&&35615===c){i.check=0,Ze[0]=255&c,Ze[1]=c>>>8&255,i.check=v(i.che\
ck,Ze,2,0),c=0,h=0,i.mode=F;break}if(i.flags=0,i.head&&(i.head.done=!1),!(1&i.wrap)||(((\
255&c)<<8)+(c>>8))%31){e.msg="incorrect header check",i.mode=ce;break}if((15&c)!==U){e.m\
sg="unknown compression method",i.mode=ce;break}if(c>>>=4,h-=4,xe=(15&c)+8,0===i.wbits)i\
.wbits=xe;else if(xe>i.wbits){e.msg="invalid window size",i.mode=ce;break}i.dmax=1<<xe,e\
.adler=i.check=1,i.mode=512&c?q:X,c=0,h=0;break;case F:for(;h<16;){if(0===f)break e;f--,\
c+=a[o++]<<h,h+=8}if(i.flags=c,(255&i.flags)!==U){e.msg="unknown compression method",i.m\
ode=ce;break}if(57344&i.flags){e.msg="unknown header flags set",i.mode=ce;break}i.head&&\
(i.head.text=c>>8&1),512&i.flags&&(Ze[0]=255&c,Ze[1]=c>>>8&255,i.check=v(i.check,Ze,2,0)\
),c=0,h=0,i.mode=L;case L:for(;h<32;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}i.head&&(i.\
head.time=c),512&i.flags&&(Ze[0]=255&c,Ze[1]=c>>>8&255,Ze[2]=c>>>16&255,Ze[3]=c>>>24&255\
,i.check=v(i.check,Ze,4,0)),c=0,h=0,i.mode=H;case H:for(;h<16;){if(0===f)break e;f--,c+=\
a[o++]<<h,h+=8}i.head&&(i.head.xflags=255&c,i.head.os=c>>8),512&i.flags&&(Ze[0]=255&c,Ze\
[1]=c>>>8&255,i.check=v(i.check,Ze,2,0)),c=0,h=0,i.mode=M;case M:if(1024&i.flags){for(;h\
<16;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}i.length=c,i.head&&(i.head.extra_len=c),512\
&i.flags&&(Ze[0]=255&c,Ze[1]=c>>>8&255,i.check=v(i.check,Ze,2,0)),c=0,h=0}else i.head&&(\
i.head.extra=null);i.mode=j;case j:if(1024&i.flags&&(m=i.length,m>f&&(m=f),m&&(i.head&&(\
xe=i.head.extra_len-i.length,i.head.extra||(i.head.extra=new Array(i.head.extra_len)),_.\
arraySet(i.head.extra,a,o,m,xe)),512&i.flags&&(i.check=v(i.check,a,m,o)),f-=m,o+=m,i.len\
gth-=m),i.length))break e;i.length=0,i.mode=K;case K:if(2048&i.flags){if(0===f)break e;m\
=0;do xe=a[o+m++],i.head&&xe&&i.length<65536&&(i.head.name+=String.fromCharCode(xe));whi\
le(xe&&m<f);if(512&i.flags&&(i.check=v(i.check,a,m,o)),f-=m,o+=m,xe)break e}else i.head&\
&(i.head.name=null);i.length=0,i.mode=P;case P:if(4096&i.flags){if(0===f)break e;m=0;do \
xe=a[o+m++],i.head&&xe&&i.length<65536&&(i.head.comment+=String.fromCharCode(xe));while(\
xe&&m<f);if(512&i.flags&&(i.check=v(i.check,a,m,o)),f-=m,o+=m,xe)break e}else i.head&&(i\
.head.comment=null);i.mode=Y;case Y:if(512&i.flags){for(;h<16;){if(0===f)break e;f--,c+=\
a[o++]<<h,h+=8}if(c!==(65535&i.check)){e.msg="header crc mismatch",i.mode=ce;break}c=0,h\
=0}i.head&&(i.head.hcrc=i.flags>>9&1,i.head.done=!0),e.adler=i.check=0,i.mode=X;break;ca\
se q:for(;h<32;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}e.adler=i.check=n(c),c=0,h=0,i.m\
ode=G;case G:if(0===i.havedict)return e.next_out=s,e.avail_out=l,e.next_in=o,e.avail_in=\
f,i.hold=c,i.bits=h,N;e.adler=i.check=1,i.mode=X;case X:if(t===Z||t===A)break e;case W:i\
f(i.last){c>>>=7&h,h-=7&h,i.mode=le;break}for(;h<3;){if(0===f)break e;f--,c+=a[o++]<<h,h\
+=8}switch(i.last=1&c,c>>>=1,h-=1,3&c){case 0:i.mode=J;break;case 1:if(d(i),i.mode=ie,t=\
==A){c>>>=2,h-=2;break e}break;case 2:i.mode=$;break;case 3:e.msg="invalid block type",i\
.mode=ce}c>>>=2,h-=2;break;case J:for(c>>>=7&h,h-=7&h;h<32;){if(0===f)break e;f--,c+=a[o\
++]<<h,h+=8}if((65535&c)!==(c>>>16^65535)){e.msg="invalid stored block lengths",i.mode=c\
e;break}if(i.length=65535&c,c=0,h=0,i.mode=Q,t===A)break e;case Q:i.mode=V;case V:if(m=i\
.length){if(m>f&&(m=f),m>l&&(m=l),0===m)break e;_.arraySet(r,a,o,m,s),f-=m,o+=m,l-=m,s+=\
m,i.length-=m;break}i.mode=X;break;case $:for(;h<14;){if(0===f)break e;f--,c+=a[o++]<<h,\
h+=8}if(i.nlen=(31&c)+257,c>>>=5,h-=5,i.ndist=(31&c)+1,c>>>=5,h-=5,i.ncode=(15&c)+4,c>>>\
=4,h-=4,i.nlen>286||i.ndist>30){e.msg="too many length or distance symbols",i.mode=ce;br\
eak}i.have=0,i.mode=ee;case ee:for(;i.have<i.ncode;){for(;h<3;){if(0===f)break e;f--,c+=\
a[o++]<<h,h+=8}i.lens[Ae[i.have++]]=7&c,c>>>=3,h-=3}for(;i.have<19;)i.lens[Ae[i.have++]]\
=0;if(i.lencode=i.lendyn,i.lenbits=7,Se={bits:i.lenbits},ye=x(y,i.lens,0,19,i.lencode,0,\
i.work,Se),i.lenbits=Se.bits,ye){e.msg="invalid code lengths set",i.mode=ce;break}i.have\
=0,i.mode=te;case te:for(;i.have<i.nlen+i.ndist;){for(;Be=i.lencode[c&(1<<i.lenbits)-1],\
me=Be>>>24,ke=Be>>>16&255,_e=65535&Be,!(me<=h);){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}\
if(_e<16)c>>>=me,h-=me,i.lens[i.have++]=_e;else{if(16===_e){for(Ee=me+2;h<Ee;){if(0===f)\
break e;f--,c+=a[o++]<<h,h+=8}if(c>>>=me,h-=me,0===i.have){e.msg="invalid bit length rep\
eat",i.mode=ce;break}xe=i.lens[i.have-1],m=3+(3&c),c>>>=2,h-=2}else if(17===_e){for(Ee=m\
e+3;h<Ee;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}c>>>=me,h-=me,xe=0,m=3+(7&c),c>>>=3,h-\
=3}else{for(Ee=me+7;h<Ee;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}c>>>=me,h-=me,xe=0,m=1\
1+(127&c),c>>>=7,h-=7}if(i.have+m>i.nlen+i.ndist){e.msg="invalid bit length repeat",i.mo\
de=ce;break}for(;m--;)i.lens[i.have++]=xe}}if(i.mode===ce)break;if(0===i.lens[256]){e.ms\
g="invalid code -- missing end-of-block",i.mode=ce;break}if(i.lenbits=9,Se={bits:i.lenbi\
ts},ye=x(S,i.lens,0,i.nlen,i.lencode,0,i.work,Se),i.lenbits=Se.bits,ye){e.msg="invalid l\
iteral/lengths set",i.mode=ce;break}if(i.distbits=6,i.distcode=i.distdyn,Se={bits:i.dist\
bits},ye=x(E,i.lens,i.nlen,i.ndist,i.distcode,0,i.work,Se),i.distbits=Se.bits,ye){e.msg=\
"invalid distances set",i.mode=ce;break}if(i.mode=ie,t===A)break e;case ie:i.mode=ne;cas\
e ne:if(f>=6&&l>=258){e.next_out=s,e.avail_out=l,e.next_in=o,e.avail_in=f,i.hold=c,i.bit\
s=h,p(e,w),s=e.next_out,r=e.output,l=e.avail_out,o=e.next_in,a=e.input,f=e.avail_in,c=i.\
hold,h=i.bits,i.mode===X&&(i.back=-1);break}for(i.back=0;Be=i.lencode[c&(1<<i.lenbits)-1\
],me=Be>>>24,ke=Be>>>16&255,_e=65535&Be,!(me<=h);){if(0===f)break e;f--,c+=a[o++]<<h,h+=\
8}if(ke&&0===(240&ke)){for(ge=me,ve=ke,pe=_e;Be=i.lencode[pe+((c&(1<<ge+ve)-1)>>ge)],me=\
Be>>>24,ke=Be>>>16&255,_e=65535&Be,!(ge+me<=h);){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}\
c>>>=ge,h-=ge,i.back+=ge}if(c>>>=me,h-=me,i.back+=me,i.length=_e,0===ke){i.mode=fe;break\
}if(32&ke){i.back=-1,i.mode=X;break}if(64&ke){e.msg="invalid literal/length code",i.mode\
=ce;break}i.extra=15&ke,i.mode=ae;case ae:if(i.extra){for(Ee=i.extra;h<Ee;){if(0===f)bre\
ak e;f--,c+=a[o++]<<h,h+=8}i.length+=c&(1<<i.extra)-1,c>>>=i.extra,h-=i.extra,i.back+=i.\
extra}i.was=i.length,i.mode=re;case re:for(;Be=i.distcode[c&(1<<i.distbits)-1],me=Be>>>2\
4,ke=Be>>>16&255,_e=65535&Be,!(me<=h);){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}if(0===(2\
40&ke)){for(ge=me,ve=ke,pe=_e;Be=i.distcode[pe+((c&(1<<ge+ve)-1)>>ge)],me=Be>>>24,ke=Be>\
>>16&255,_e=65535&Be,!(ge+me<=h);){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}c>>>=ge,h-=ge,\
i.back+=ge}if(c>>>=me,h-=me,i.back+=me,64&ke){e.msg="invalid distance code",i.mode=ce;br\
eak}i.offset=_e,i.extra=15&ke,i.mode=oe;case oe:if(i.extra){for(Ee=i.extra;h<Ee;){if(0==\
=f)break e;f--,c+=a[o++]<<h,h+=8}i.offset+=c&(1<<i.extra)-1,c>>>=i.extra,h-=i.extra,i.ba\
ck+=i.extra}if(i.offset>i.dmax){e.msg="invalid distance too far back",i.mode=ce;break}i.\
mode=se;case se:if(0===l)break e;if(m=w-l,i.offset>m){if(m=i.offset-m,m>i.whave&&i.sane)\
{e.msg="invalid distance too far back",i.mode=ce;break}m>i.wnext?(m-=i.wnext,k=i.wsize-m\
):k=i.wnext-m,m>i.length&&(m=i.length),we=i.window}else we=r,k=s-i.offset,m=i.length;m>l\
&&(m=l),l-=m,i.length-=m;do r[s++]=we[k++];while(--m);0===i.length&&(i.mode=ne);break;ca\
se fe:if(0===l)break e;r[s++]=i.length,l--,i.mode=ne;break;case le:if(i.wrap){for(;h<32;\
){if(0===f)break e;f--,c|=a[o++]<<h,h+=8}if(w-=l,e.total_out+=w,i.total+=w,w&&(e.adler=i\
.check=i.flags?v(i.check,r,w,s-w):g(i.check,r,w,s-w)),w=l,(i.flags?c:n(c))!==i.check){e.\
msg="incorrect data check",i.mode=ce;break}c=0,h=0}i.mode=de;case de:if(i.wrap&&i.flags)\
{for(;h<32;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}if(c!==(4294967295&i.total)){e.msg="\
incorrect length check",i.mode=ce;break}c=0,h=0}i.mode=ue;case ue:ye=R;break e;case ce:y\
e=O;break e;case he:return I;case be:default:return C}return e.next_out=s,e.avail_out=l,\
e.next_in=o,e.avail_in=f,i.hold=c,i.bits=h,(i.wsize||w!==e.avail_out&&i.mode<ce&&(i.mode\
<le||t!==B))&&u(e,e.output,e.next_out,w-e.avail_out)?(i.mode=he,I):(b-=e.avail_in,w-=e.a\
vail_out,e.total_in+=b,e.total_out+=w,i.total+=w,i.wrap&&w&&(e.adler=i.check=i.flags?v(i\
.check,r,w,e.next_out-w):g(i.check,r,w,e.next_out-w)),e.data_type=i.bits+(i.last?64:0)+(\
i.mode===X?128:0)+(i.mode===ie||i.mode===Q?256:0),(0===b&&0===w||t===B)&&ye===z&&(ye=T),\
ye)}function h(e){if(!e||!e.state)return C;var t=e.state;return t.window&&(t.window=null\
),e.state=null,z}function b(e,t){var i;return e&&e.state?(i=e.state,0===(2&i.wrap)?C:(i.\
head=t,t.done=!1,z)):C}function w(e,t){var i,n,a,r=t.length;return e&&e.state?(i=e.state\
,0!==i.wrap&&i.mode!==G?C:i.mode===G&&(n=1,n=g(n,t,r,0),n!==i.check)?O:(a=u(e,t,r,r))?(i\
.mode=he,I):(i.havedict=1,z)):C}var m,k,_=e("../utils/common"),g=e("./adler32"),v=e("./c\
rc32"),p=e("./inffast"),x=e("./inftrees"),y=0,S=1,E=2,B=4,Z=5,A=6,z=0,R=1,N=2,C=-2,O=-3,\
I=-4,T=-5,U=8,D=1,F=2,L=3,H=4,M=5,j=6,K=7,P=8,Y=9,q=10,G=11,X=12,W=13,J=14,Q=15,V=16,$=1\
7,ee=18,te=19,ie=20,ne=21,ae=22,re=23,oe=24,se=25,fe=26,le=27,de=28,ue=29,ce=30,he=31,be\
=32,we=852,me=592,ke=15,_e=ke,ge=!0;i.inflateReset=o,i.inflateReset2=s,i.inflateResetKee\
p=r,i.inflateInit=l,i.inflateInit2=f,i.inflate=c,i.inflateEnd=h,i.inflateGetHeader=b,i.i\
nflateSetDictionary=w,i.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/com\
mon":1,"./adler32":3,"./crc32":5,"./inffast":7,"./inftrees":9}],9:[function(e,t,i){"use \
strict";var n=e("../utils/common"),a=15,r=852,o=592,s=0,f=1,l=2,d=[3,4,5,6,7,8,9,10,11,1\
3,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],u=[16,16,16,16,16,\
16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],c=[1,2,3,\
4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,\
12289,16385,24577,0,0],h=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25\
,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,i,b,w,m,k,_){var g,v,p,x,y,S,E\
,B,Z,A=_.bits,z=0,R=0,N=0,C=0,O=0,I=0,T=0,U=0,D=0,F=0,L=null,H=0,M=new n.Buf16(a+1),j=ne\
w n.Buf16(a+1),K=null,P=0;for(z=0;z<=a;z++)M[z]=0;for(R=0;R<b;R++)M[t[i+R]]++;for(O=A,C=\
a;C>=1&&0===M[C];C--);if(O>C&&(O=C),0===C)return w[m++]=20971520,w[m++]=20971520,_.bits=\
1,0;for(N=1;N<C&&0===M[N];N++);for(O<N&&(O=N),U=1,z=1;z<=a;z++)if(U<<=1,U-=M[z],U<0)retu\
rn-1;if(U>0&&(e===s||1!==C))return-1;for(j[1]=0,z=1;z<a;z++)j[z+1]=j[z]+M[z];for(R=0;R<b\
;R++)0!==t[i+R]&&(k[j[t[i+R]]++]=R);if(e===s?(L=K=k,S=19):e===f?(L=d,H-=257,K=u,P-=257,S\
=256):(L=c,K=h,S=-1),F=0,R=0,z=N,y=m,I=O,T=0,p=-1,D=1<<O,x=D-1,e===f&&D>r||e===l&&D>o)re\
turn 1;for(var Y=0;;){Y++,E=z-T,k[R]<S?(B=0,Z=k[R]):k[R]>S?(B=K[P+k[R]],Z=L[H+k[R]]):(B=\
96,Z=0),g=1<<z-T,v=1<<I,N=v;do v-=g,w[y+(F>>T)+v]=E<<24|B<<16|Z|0;while(0!==v);for(g=1<<\
z-1;F&g;)g>>=1;if(0!==g?(F&=g-1,F+=g):F=0,R++,0===--M[z]){if(z===C)break;z=t[i+k[R]]}if(\
z>O&&(F&x)!==p){for(0===T&&(T=O),y+=N,I=z-T,U=1<<I;I+T<C&&(U-=M[I+T],!(U<=0));)I++,U<<=1\
;if(D+=1<<I,e===f&&D>r||e===l&&D>o)return 1;p=F&x,w[p]=O<<24|I<<16|y-m|0}}return 0!==F&&\
(w[y+F]=z-T<<24|64<<16|0),_.bits=O,0}},{"../utils/common":1}],10:[function(e,t,i){"use s\
trict";t.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream\
 error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompati\
ble version"}},{}],11:[function(e,t,i){"use strict";function n(){this.input=null,this.ne\
xt_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=\
0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}t.exports=n\
},{}],"/lib/inflate.js":[function(e,t,i){"use strict";function n(e){if(!(this instanceof\
 n))return new n(e);this.options=s.assign({chunkSize:16384,windowBits:0,to:""},e||{});va\
r t=this.options;t.raw&&t.windowBits>=0&&t.windowBits<16&&(t.windowBits=-t.windowBits,0=\
==t.windowBits&&(t.windowBits=-15)),!(t.windowBits>=0&&t.windowBits<16)||e&&e.windowBits\
||(t.windowBits+=32),t.windowBits>15&&t.windowBits<48&&0===(15&t.windowBits)&&(t.windowB\
its|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new u,this.strm.a\
vail_out=0;var i=o.inflateInit2(this.strm,t.windowBits);if(i!==l.Z_OK)throw new Error(d[\
i]);this.header=new c,o.inflateGetHeader(this.strm,this.header)}function a(e,t){var i=ne\
w n(t);if(i.push(e,!0),i.err)throw i.msg;return i.result}function r(e,t){return t=t||{},\
t.raw=!0,a(e,t)}var o=e("./zlib/inflate"),s=e("./utils/common"),f=e("./utils/strings"),l\
=e("./zlib/constants"),d=e("./zlib/messages"),u=e("./zlib/zstream"),c=e("./zlib/gzheader\
"),h=Object.prototype.toString;n.prototype.push=function(e,t){var i,n,a,r,d,u,c=this.str\
m,b=this.options.chunkSize,w=this.options.dictionary,m=!1;if(this.ended)return!1;n=t===~\
~t?t:t===!0?l.Z_FINISH:l.Z_NO_FLUSH,"string"==typeof e?c.input=f.binstring2buf(e):"[obje\
ct ArrayBuffer]"===h.call(e)?c.input=new Uint8Array(e):c.input=e,c.next_in=0,c.avail_in=\
c.input.length;do{if(0===c.avail_out&&(c.output=new s.Buf8(b),c.next_out=0,c.avail_out=b\
),i=o.inflate(c,l.Z_NO_FLUSH),i===l.Z_NEED_DICT&&w&&(u="string"==typeof w?f.string2buf(w\
):"[object ArrayBuffer]"===h.call(w)?new Uint8Array(w):w,i=o.inflateSetDictionary(this.s\
trm,u)),i===l.Z_BUF_ERROR&&m===!0&&(i=l.Z_OK,m=!1),i!==l.Z_STREAM_END&&i!==l.Z_OK)return\
 this.onEnd(i),this.ended=!0,!1;c.next_out&&(0!==c.avail_out&&i!==l.Z_STREAM_END&&(0!==c\
.avail_in||n!==l.Z_FINISH&&n!==l.Z_SYNC_FLUSH)||("string"===this.options.to?(a=f.utf8bor\
der(c.output,c.next_out),r=c.next_out-a,d=f.buf2string(c.output,a),c.next_out=r,c.avail_\
out=b-r,r&&s.arraySet(c.output,c.output,a,r,0),this.onData(d)):this.onData(s.shrinkBuf(c\
.output,c.next_out)))),0===c.avail_in&&0===c.avail_out&&(m=!0)}while((c.avail_in>0||0===\
c.avail_out)&&i!==l.Z_STREAM_END);return i===l.Z_STREAM_END&&(n=l.Z_FINISH),n===l.Z_FINI\
SH?(i=o.inflateEnd(this.strm),this.onEnd(i),this.ended=!0,i===l.Z_OK):n!==l.Z_SYNC_FLUSH\
||(this.onEnd(l.Z_OK),c.avail_out=0,!0)},n.prototype.onData=function(e){this.chunks.push\
(e)},n.prototype.onEnd=function(e){e===l.Z_OK&&("string"===this.options.to?this.result=t\
his.chunks.join(""):this.result=s.flattenChunks(this.chunks)),this.chunks=[],this.err=e,\
this.msg=this.strm.msg},i.Inflate=n,i.inflate=a,i.inflateRaw=r,i.ungzip=a},{"./utils/com\
mon":1,"./utils/strings":2,"./zlib/constants":4,"./zlib/gzheader":6,"./zlib/inflate":8,"\
./zlib/messages":10,"./zlib/zstream":11}]},{},[])("/lib/inflate.js")});
</script>
<script src="faview.js"></script>`;
}
// https://gist.github.com/boushley/5471599
function arrayBufferToString(ab: ArrayBuffer): string {
    let data = new Uint8Array(ab);

    // If we have a BOM skip it
    let s = '', i = 0, c = 0, c2 = 0, c3 = 0;
    if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
        i = 3;
    }
    while (i < data.length) {
        c = data[i];

        if (c < 128) {
            s += String.fromCharCode(c);
            i++;
        } else if (c > 191 && c < 224) {
            if (i + 1 >= data.length) {
                throw 'UTF-8 Decode failed. Two byte character was truncated.';
            }
            c2 = data[i + 1];
            s += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            i += 2;
        } else {
            if (i + 2 >= data.length) {
                throw 'UTF-8 Decode failed. Multi byte character was truncated.';
            }
            c2 = data[i + 1];
            c3 = data[i + 2];
            s += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3;
        }
    }
    return s;
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