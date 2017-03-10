import { assert } from 'chai';
import { BitArray } from '../src/bitarray';

describe('bitarray', function () {
    [
        [
            true, false, false, false, false, false, false, false,
        ],
        [
            true, true, true, true, true, true, true, true,
            true, true, true, true, true, true, true, true,
            true, true, true, true, true, true, true, true,
            true, true, true, true, true, true, true, true,
        ],
        [
            true, true, true, true, true, true, true, true,
            true, true, true, true, true, true, true, true,
            true, true, true, true, true, true, true, true,
            true, true, true, true, true, true, true, true,
            true
        ],
        [
            false, false, false, false, false, false, false, false,
            false, false, false, false, false, false, false, false,
            false, false, false, false, false, false, false, false,
            false, false, false, false, false, false, false, true,
        ],
        [
            false, false, false, false, false, false, false, false,
            false, false, false, false, false, false, false, false,
            false, false, false, false, false, false, false, false,
            false, false, false, false, false, false, false, false,
            true
        ],
        [
            false, false, false, false, false, false, false, false,
            false, false, false, false, false, false, false, false,
            false, false, false, false, false, false, false, false,
            false, false, false, false, false, false, false, true,
            true
        ],
        [
            false, true, false, true, false, true, false, true,
            true, false, true, false, true, false, true, false,
            false, true, false, true, false, true, false, true,
            true, false, true, false, true, false, true, false,
        ],
    ].map(v => it('should equal', () => {
        const bi = new BitArray(v.length);
        v.map((v, index) => bi.set(index, v));
        v.map((v, index) => assert.equal(v, bi.get(index)));
    }));
});
