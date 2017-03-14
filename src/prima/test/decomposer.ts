import { assert } from 'chai';
import Mock from './common/mock';
import * as debugprint from './common/debugprint';
import * as decomposer from '../src/decomposer';

function visualizeAllPattern(image: decomposer.DecomposedImage): Promise<void> {
    return new Promise<void>(resolve => {
        console.log('visualize all patterns result');
        const length = image.length;
        let i = 0;
        const render = () => {
            if (i >= length) {
                return resolve();
            }
            image.render(i).then(canvas => {
                debugprint.putCanvasToConsole(canvas);
                ++i;
            }).then(render);
        };
        render();
    });
}

function visualizeAllChip(image: decomposer.DecomposedImage): Promise<void> {
    return new Promise<void>(resolve => {
        console.log('visualize all chips result');
        const [chips] = image.getChipIndices();
        const length = chips.length;
        let i = 0;
        const render = () => {
            if (i >= length) {
                return resolve();
            }
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = image.tileSize;
            const ctx = canvas.getContext('2d')!;
            ctx.putImageData(image.getChipImage(chips[i]), 0, 0);
            debugprint.putCanvasToConsole(canvas);
            ++i;
            Promise.resolve().then(render);
        };
        render();
    });
}

describe('primar', function () {
    this.timeout(0);
    it('should equal', () => {
        const printPatterns = false;
        const printChips = false;
        const m = new Mock();
        return decomposer.decompose(
            16,
            m.parts,
            pattern => m.render(pattern),
            pattern => m.renderSolo(pattern),
            () => Promise.resolve(),
        ).then(p => {
            assert.equal(p.memory, 664480); // TODO: check actual result
            console.log(`memory: ${p.memory / 1024 | 0}KB`);
            return (printPatterns ? visualizeAllPattern(p) : Promise.resolve()).
                then(() => printChips ? visualizeAllChip(p) : Promise.resolve());
        });
    });
});