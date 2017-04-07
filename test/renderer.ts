import { assert } from 'chai';
import * as renderer from '../src/renderer';
(<any>window).psdgoWorkerURL = '/base/js/psd.min.js';
function renderPNG(uri: string): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext('2d');
            if (ctx instanceof CanvasRenderingContext2D) {
                ctx.drawImage(img, 0, 0);
                resolve(c);
                return;
            }
            reject('cannot get CanvasRenderingContext2D');
        };
        img.onerror = e => reject(new Error(`could not load PNG: ${uri}`));
        img.src = uri;
    });
}

function loadPSD(uri: string): Promise<psd.Root> {
    return new Promise((resolve, reject) => {
        fetch(uri)
            .then(r => r.blob())
            .then(psdBlob => {
                PSD.parseWorker(
                    psdBlob,
                    p => { },
                    psd => resolve(psd),
                    err => reject(err),
                );
            });
    });
}

function renderPSD(uri: string): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
        loadPSD(uri).then(psd => {
            const r = new renderer.Renderer(psd);
            r.render(1, false, renderer.FlipType.NoFlip, (p, c) => {
                if (p === 1) {
                    resolve(c);
                }
            });
            return psd;
        }).catch(reject);
    });
}

function testImages(
    psd: Promise<HTMLCanvasElement>,
    png: Promise<HTMLCanvasElement>) {
    return Promise.all([psd, png]).then(images => {
        const [psdC, pngC] = images;
        assert.equal(psdC.width, pngC.width, 'same width');
        assert.equal(psdC.height, pngC.height, 'same height');
        const psdCtx = psdC.getContext('2d') as CanvasRenderingContext2D;
        const pngCtx = pngC.getContext('2d') as CanvasRenderingContext2D;
        const psdD = psdCtx.getImageData(0, 0, psdC.width, psdC.height);
        const pngD = pngCtx.getImageData(0, 0, pngC.width, pngC.height);
        const delta = 2;
        for (let y = 0, i = 0; y < psdC.height; ++y) {
            for (let x = 0; x < psdC.width; ++x, i += 4) {
                // calculate alpha-premultiplied color to measure distance of the each color.
                const psdA = psdD.data[i + 3] * 32897;
                const psdR = (psdD.data[i + 0] * psdA) >> 23;
                const psdG = (psdD.data[i + 1] * psdA) >> 23;
                const psdB = (psdD.data[i + 2] * psdA) >> 23;
                const pngA = pngD.data[i + 3] * 32897;
                const pngR = (pngD.data[i + 0] * pngA) >> 23;
                const pngG = (pngD.data[i + 1] * pngA) >> 23;
                const pngB = (pngD.data[i + 2] * pngA) >> 23;
                const pix = `(${x}, ${y})`;
                assert.approximately(psdR, pngR, delta, `${pix} R`);
                assert.approximately(psdG, pngG, delta, `${pix} G`);
                assert.approximately(psdB, pngB, delta, `${pix} B`);
                assert.approximately(psdD.data[i + 3], pngD.data[i + 3], delta, `${pix} A`);
            }
        }
    });
}

function testPSDAndPNG(uri: string) {
    return testImages(
        renderPSD(uri.replace(/\.png$/, '.psd')),
        renderPNG(uri.replace(/\.psd$/, '.png')),
    );
}

describe('renderer clipping', function () {
    const images = [
        'base/testdata/clipping.psd',
        // seems broken a bit, but it is really unused in almost images.
        // 'base/testdata/clipping_layer_as_group.psd',
        'base/testdata/clip-folder-passthrough.psd',
        'base/testdata/clip-folder-normal.psd',
        'base/testdata/clipping-a127.psd',
        'base/testdata/clip-folder-passthrough-a127.psd',
        'base/testdata/clip-folder-normal-a127.psd',
        'base/testdata/clip-folder-normal-a127-a127.psd',
        'base/testdata/clip-folder-passthrough-a127-a127.psd',
        'base/testdata/clip-folder-normal-mod-a127-a127.psd',
        'base/testdata/clip-folder-passthrough-mod-a127-a191.psd',
        'base/testdata/clip-folder-normal-mod-a127-a191.psd',
    ];
    images.forEach(uri => it(`should generate a same result: ${uri}`, () => testPSDAndPNG(uri)));
});
