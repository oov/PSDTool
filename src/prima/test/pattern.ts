import { assert } from 'chai';
import Mock from './common/mock';
import * as pattern from '../src/pattern';

describe('pattern.toIndex', function () {
    it('should equal', () => {
        const m = new Mock();
        assert.equal(pattern.toIndex([0, 0, 0, 0], m.parts), 0);
        assert.equal(pattern.toIndex([1, 0, 0, 0], m.parts), 64);
        assert.equal(pattern.toIndex([2, 0, 0, 0], m.parts), 128);
        assert.equal(pattern.toIndex([2, 0, 2, 0], m.parts), 136);
    });
});

describe('pattern.fromIndex', function () {
    it('should equal', () => {
        const m = new Mock();
        assert.deepEqual(pattern.fromIndex(0, m.parts), [0, 0, 0, 0]);
        assert.deepEqual(pattern.fromIndex(64, m.parts), [1, 0, 0, 0]);
        assert.deepEqual(pattern.fromIndex(128, m.parts), [2, 0, 0, 0]);
        assert.deepEqual(pattern.fromIndex(136, m.parts), [2, 0, 2, 0]);
    });
});