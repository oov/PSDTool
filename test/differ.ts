import { assert } from 'chai';
import Differ from '../src/differ';
import * as debugprint from './common/debugprint';
import Mock from './common/mock';


describe('differ', function () {
    it('should equal simple', () => {
        const debugPrint = false;
        const canvas1 = document.createElement('canvas');
        canvas1.width = 56;
        canvas1.height = 56;
        const ctx1 = canvas1.getContext('2d');
        if (!(ctx1 instanceof CanvasRenderingContext2D)) {
            throw new Error('could not create canvas context');
        }
        ctx1.fillStyle = '#ff0000';
        ctx1.fillRect(0, 0, 40, 40);

        const canvas2 = document.createElement('canvas');
        canvas2.width = 56;
        canvas2.height = 56;
        const ctx2 = canvas2.getContext('2d');
        if (!(ctx2 instanceof CanvasRenderingContext2D)) {
            throw new Error('could not create canvas context');
        }
        ctx2.fillStyle = '#ff0000';
        ctx2.fillRect(0, 0, 44, 44);

        const tileSize = 16;
        const d = new Differ(tileSize);
        return d.generate(canvas1, canvas2).then(bitmap => {
            const golden = [
                0x00, 0x00, 0xff, 0x00,
                0x00, 0x00, 0xff, 0x00,
                0xff, 0xff, 0xff, 0x00,
                0x00, 0x00, 0x00, 0x00
            ];
            for (let i = 0; i < golden.length; ++i) {
                assert.equal(bitmap.get(i), golden[i] !== 0x00, `index ${i}`);
            }
            if (debugPrint) {
                console.log('visualize differ test result');
                debugprint.putCanvasToConsole(debugprint.areaMapToCanvas(bitmap, canvas1.width, tileSize));
            }
        });
    });
    it('should equal image', () => {
        const debugPrint = false;
        const tileSize = 16;
        const m = new Mock();
        return Promise.all([
            m.render([0, 0, 0, 0]),
            m.render([1, 0, 0, 0]),
        ]).then(([l, r]) => {
            new Differ(tileSize).generate(l, r).then(bitmap => {
                if (debugPrint) {
                    console.log('visualize differ test result');
                    debugprint.putCanvasToConsole(debugprint.areaMapToCanvas(bitmap, l.width, tileSize));
                }
            });
        });
    });
});