'use strict';
var tileder;
(function (tileder) {
    var Tileder = (function () {
        function Tileder() {
            this.w = new Worker(Tileder.getScriptName());
        }
        Tileder.getScriptName = function () {
            if (Tileder.scriptName) {
                return Tileder.scriptName;
            }
            var elem = document.getElementById('tileder');
            if (!elem) {
                return 'tileder.js';
            }
            return elem.getAttribute('src') || 'tileder.js';
        };
        Tileder.prototype.add = function (name, image) {
            var ctx;
            if (image instanceof HTMLImageElement) {
                var cvs = document.createElement('canvas');
                cvs.width = image.width;
                cvs.height = image.height;
                ctx = cvs.getContext('2d');
                if (ctx) {
                    ctx.drawImage(image, 0, 0);
                }
            }
            else {
                ctx = image.getContext('2d');
            }
            if (!ctx) {
                throw new Error('cannot get CanvasRenderingContext2D');
            }
            var imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            this.w.postMessage({
                type: 'add',
                b: imgData.data.buffer,
                w: ctx.canvas.width,
                h: ctx.canvas.height
            }, [imgData.data.buffer]);
        };
        Tileder.prototype.finish = function () {
            this.w.onmessage = function (e) {
                var images = e.data;
                for (var _i = 0, images_1 = images; _i < images_1.length; _i++) {
                    var ab = images_1[_i];
                    var src = new Uint8Array(ab);
                    var imageSize = Math.sqrt(src.length >> 2);
                    var canvas = document.createElement('canvas');
                    canvas.width = imageSize;
                    canvas.height = imageSize;
                    var ctx = canvas.getContext('2d');
                    if (!ctx) {
                        throw new Error('cannot get CanvasRenderingContext2D');
                    }
                    var imageData = ctx.createImageData(imageSize, imageSize);
                    var dest = imageData.data, sw = imageSize * 4, dw = imageData.width * 4;
                    for (var y = 0; y < imageSize; ++y) {
                        var sx = y * sw, dx = y * dw;
                        for (var x = 0; x < sw; ++x) {
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
        };
        return Tileder;
    }());
    tileder.Tileder = Tileder;
    var TilederWorker = (function () {
        function TilederWorker(g) {
            this.g = g;
            this.tileSize = 16;
            this.tile = {};
        }
        ;
        TilederWorker.prototype.onMessage = function (e) {
            switch (e.data.type) {
                case 'add':
                    this.add(e.data.b, e.data.w, e.data.h);
                    break;
                case 'finish':
                    var images = this.finish();
                    this.g.postMessage(images, images);
                    break;
            }
        };
        TilederWorker.prototype.calcImageSize = function (n) {
            var x = n * this.tileSize * this.tileSize;
            for (var p = 64; p <= 1024; p += p) {
                if (n <= p * p) {
                    return p;
                }
            }
            return 1024;
        };
        TilederWorker.prototype.finish = function () {
            var tile = this.tile, tileSize = this.tileSize;
            var a = Object.keys(tile).map(function (key) { return tile[key]; });
            a.sort(function (a, b) {
                if (a.y === b.y) {
                    return a.x === b.x ? 0 : a.x < b.x ? -1 : 1;
                }
                return a.y < b.y ? -1 : 1;
            });
            var images = [], aLen = a.length;
            var aPos = 0;
            while (aPos < aLen) {
                var size = this.calcImageSize(aLen - aPos), size4 = size * 4;
                var image = new Uint8Array(size * size4);
                var bLen = size >> 4;
                for (var by = 0; by < bLen && aPos < aLen; ++by) {
                    var dy = by * tileSize;
                    for (var bx = 0; bx < bLen && aPos < aLen; ++bx) {
                        var src = a[aPos++], srcBuf = src.b;
                        for (var y = 0; y < tileSize; ++y) {
                            var dx = ((dy + y) * size + bx * tileSize) * 4;
                            var sx = y * tileSize * 4;
                            for (var x = 0; x < tileSize * 4; x += 4) {
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
        };
        TilederWorker.prototype.add = function (b, w, h) {
            var tile = this.tile;
            var tileSize = this.tileSize, tileSize4 = tileSize << 2;
            var ab = new Uint8ClampedArray(b);
            var buf = new Uint8Array(4 * tileSize * tileSize);
            var bwf = Math.floor(w / tileSize), bhf = Math.floor(h / tileSize);
            var bwc = Math.ceil(w / tileSize), bhc = Math.ceil(h / tileSize);
            var restw = w - bwf * tileSize, resth = h - bwf * tileSize;
            var imageHash = new Array(bwc * bhc);
            for (var by = 0; by < bhf; ++by) {
                var sy = by * tileSize;
                for (var bx = 0; bx < bwf; ++bx) {
                    for (var y = 0; y < tileSize; ++y) {
                        var sx = ((sy + y) * w + bx * tileSize) * 4;
                        var dx = y * tileSize * 4;
                        for (var x = 0; x < tileSize * 4; x += 4) {
                            buf[dx + x + 0] = ab[sx + x + 0];
                            buf[dx + x + 1] = ab[sx + x + 1];
                            buf[dx + x + 2] = ab[sx + x + 2];
                            buf[dx + x + 3] = ab[sx + x + 3];
                        }
                    }
                    var hash = CRC32.crc32(buf.buffer);
                    if (!(hash in tile)) {
                        tile[hash] = { hash: hash, x: bx, y: by, b: new Uint8Array(buf) };
                    }
                    imageHash[by * bwc + bx] = hash;
                }
            }
            if (restw) {
                buf.fill(0);
                for (var by = 0; by < bhf; ++by) {
                    var sy = by * tileSize;
                    for (var y = 0; y < tileSize; ++y) {
                        var sx = ((sy + y) * w + bwf * tileSize) * 4;
                        var dx = y * tileSize4;
                        for (var x = 0; x < restw * 4; x += 4) {
                            buf[dx + x + 0] = ab[sx + x + 0];
                            buf[dx + x + 1] = ab[sx + x + 1];
                            buf[dx + x + 2] = ab[sx + x + 2];
                            buf[dx + x + 3] = ab[sx + x + 3];
                        }
                    }
                    var hash = CRC32.crc32(buf.buffer);
                    if (!(hash in tile)) {
                        tile[hash] = { hash: hash, x: bwf, y: by, b: new Uint8Array(buf) };
                    }
                    imageHash[by * bwc + bwf] = hash;
                }
            }
            if (resth) {
                buf.fill(0);
                var sy = bhf * tileSize;
                for (var bx = 0; bx < bwf; ++bx) {
                    for (var y = 0; y < resth; ++y) {
                        var sx = ((sy + y) * w + bx * tileSize) * 4;
                        var dx = y * tileSize4;
                        for (var x = 0; x < tileSize4; x += 4) {
                            buf[dx + x + 0] = ab[sx + x + 0];
                            buf[dx + x + 1] = ab[sx + x + 1];
                            buf[dx + x + 2] = ab[sx + x + 2];
                            buf[dx + x + 3] = ab[sx + x + 3];
                        }
                    }
                    var hash = CRC32.crc32(buf.buffer);
                    if (!(hash in tile)) {
                        tile[hash] = { hash: hash, x: bx, y: bhf, b: new Uint8Array(buf) };
                    }
                    imageHash[bhf * bwc + bx] = hash;
                }
            }
            if (restw && resth) {
                buf.fill(0);
                var sy = bhf * tileSize;
                for (var y = 0; y < resth; ++y) {
                    var sx = ((sy + y) * w + bwf * tileSize) * 4;
                    var dx = y * tileSize4;
                    for (var x = 0; x < restw * 4; x += 4) {
                        buf[dx + x + 0] = ab[sx + x + 0];
                        buf[dx + x + 1] = ab[sx + x + 1];
                        buf[dx + x + 2] = ab[sx + x + 2];
                        buf[dx + x + 3] = ab[sx + x + 3];
                    }
                }
                var hash = CRC32.crc32(buf.buffer);
                if (!(hash in tile)) {
                    tile[hash] = { hash: hash, x: bwf, y: bhf, b: new Uint8Array(buf) };
                }
                imageHash[bhf * bwc + bwf] = hash;
            }
            // TODO: save imageHash to storage
        };
        return TilederWorker;
    }());
    var CRC32 = (function () {
        function CRC32() {
        }
        // Based on http://stackoverflow.com/a/18639999
        CRC32.makeCRCTable = function () {
            var c, n, k;
            var crcTable = new Uint32Array(256);
            for (n = 0; n < 256; n++) {
                c = n;
                for (k = 0; k < 8; k++) {
                    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
                }
                crcTable[n] = c;
            }
            return crcTable;
        };
        CRC32.crc32 = function (src) {
            var crcTable = CRC32.crcTable;
            var u8a = new Uint8Array(src);
            var crc = 0 ^ (-1);
            for (var i = 0; i < u8a.length; i++) {
                crc = (crc >>> 8) ^ crcTable[(crc ^ u8a[i]) & 0xFF];
            }
            return (crc ^ (-1)) >>> 0;
        };
        CRC32.crcTable = CRC32.makeCRCTable();
        return CRC32;
    }());
    function workerMain(global) {
        var tw = new TilederWorker(global);
        onmessage = function (e) { return tw.onMessage(e); };
    }
    tileder.workerMain = workerMain;
})(tileder || (tileder = {}));
if ('importScripts' in this) {
    tileder.workerMain(this);
}
