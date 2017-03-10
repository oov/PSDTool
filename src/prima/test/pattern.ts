import { assert } from 'chai';
import Mock from './common/mock';
import * as pattern from '../src/pattern';

describe('pattern.toIndex', function () {
    it('should equal', () => {
        const m = new Mock();
        assert.equal(pattern.toIndex([0, 0, 0, 0], m.parts), 0);
        assert.equal(pattern.toIndex([1, 0, 0, 0], m.parts), 27);
        assert.equal(pattern.toIndex([1, 0, 0, 1], m.parts), 28);
        assert.equal(pattern.toIndex([1, 0, 2, 0], m.parts), 33);
    });
});

describe('pattern.fromIndex', function () {
    it('should equal', () => {
        const m = new Mock();
        assert.deepEqual(pattern.fromIndex(0, m.parts), [0, 0, 0, 0]);
        assert.deepEqual(pattern.fromIndex(27, m.parts), [1, 0, 0, 0]);
        assert.deepEqual(pattern.fromIndex(28, m.parts), [1, 0, 0, 1]);
        assert.deepEqual(pattern.fromIndex(33, m.parts), [1, 0, 2, 0]);
    });
});