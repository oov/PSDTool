import { assert } from 'chai';
import { Slicer } from '../src/slicer';

describe('slicer', function () {
    it('should equal', () => {
        const s = new Slicer(16);
        const canvas = document.createElement('canvas');
        canvas.width = 56;
        canvas.height = 56;
        const ctx = canvas.getContext('2d');
        if (!(ctx instanceof CanvasRenderingContext2D)) {
            throw new Error('could not create canvas context');
        }
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 40, 40);
        return s.slice(canvas).then(([hashesBuffer]) => {
            const hashes = new Uint32Array(hashesBuffer, 4);
            assert.equal(hashes.length, 16);
            const filled = hashes[0], halfLR = hashes[2], halfTB = hashes[8], edge = hashes[10], empty = hashes[3];
            const m = new Uint32Array([
                filled, filled, halfLR, empty,
                filled, filled, halfLR, empty,
                halfTB, halfTB, edge, empty,
                empty, empty, empty, empty
            ]);
            assert.deepEqual(hashes, m);
        });
    });
});