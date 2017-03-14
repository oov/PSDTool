// import { assert } from 'chai';
import Mock from './common/mock';
// import * as debugprint from './common/debugprint';
import * as decomposer from '../src/decomposer';
import * as primar from '../src/primar';

describe('primar', function () {
    this.timeout(0);
    it('should equal', () => {
        const m = new Mock();
        return decomposer.decompose(
            16,
            m.parts,
            pattern => m.render(pattern),
            pattern => m.renderSolo(pattern),
            () => Promise.resolve(),
        ).then(p => {
            return primar.generate(p, m.parts, () => Promise.resolve()).then(b => {
                const a = document.createElement('a');
                a.href = window.URL.createObjectURL(b);
                a.download = 'test.prima';
                a.click();
            });
        });
    });
});