import { BitArray } from '../../src/bitarray';

export function areaMapToCanvas(ba: BitArray, originalWidth: number, tileSize: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const blockWidth = (originalWidth + tileSize - 1) / tileSize | 0;
    canvas.width = blockWidth * tileSize;
    canvas.height = ((ba.length + blockWidth - 1) / blockWidth | 0) * tileSize;
    const ctx = canvas.getContext('2d');
    if (!(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('could not get CanvasRenderingContext2D');
    }
    ctx.fillStyle = '#000';
    for (let i = 0; i < ba.length; ++i) {
        if (ba.get(i)) {
            const y = i / blockWidth | 0;
            ctx.fillRect((i - y * blockWidth) * tileSize, y * tileSize, tileSize, tileSize);
        }
    }
    return canvas;
}

export function renderedImageToCanvas(image: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
    if (image instanceof HTMLCanvasElement) {
        return image;
    }
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('could not get CanvasRenderingContext2D');
    }
    ctx.drawImage(image, 0, 0);
    return canvas;
}

export function putCanvasToConsole(canvas: HTMLCanvasElement) {
    const width = canvas.width;
    const height = canvas.height;
    console.log('%c.', `
font-size: 0;
padding: ${height >> 1}px ${width >> 1}px;
line-height: ${height}px;
background: url(${canvas.toDataURL()}) left top no-repeat
`);
}