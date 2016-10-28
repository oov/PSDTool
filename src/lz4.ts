// lz4-ts @license BSD-3-Clause / Copyright (c) 2015, Pierre Curto / 2016, oov. All rights reserved.
/**
 * Copyright (c) 2015, Pierre Curto
 * Copyright (c) 2016, oov
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * 
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 * 
 * * Neither the name of xxHash nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const errInvalidSource = new Error('invalid source');
const errShortBuffer = new Error('short buffer');

// The following constants are used to setup the compression algorithm.
const minMatch   = 4;  // the minimum size of the match sequence size (4 bytes)
const winSizeLog = 16; // LZ4 64Kb window size limit
const winSize    = 1 << winSizeLog;
const winMask    = winSize - 1; // 64Kb window of previous data for dependent blocks

// hashSizeLog determines the size of the hash table used to quickly find a previous match position.
// Its value influences the compression speed and memory usage, the lower the faster,
// but at the expense of the compression ratio.
// 16 seems to be the best compromise.
const hashSizeLog   = 16;
const hashSize      = 1 << hashSizeLog;
const hashShift     = (minMatch * 8) - hashSizeLog;

const mfLimit      = 8 + minMatch; // The last match cannot start within the last 12 bytes.
const skipStrength = 6;            // variable step for fast scan

const hasher = 2654435761 | 0; // prime number used to hash minMatch

// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Math/imul#Polyfill
function imulPolyfill(a: number, b: number): number {
    const ah  = (a >>> 16) & 0xffff;
    const al = a & 0xffff;
    const bh  = (b >>> 16) & 0xffff;
    const bl = b & 0xffff;
    // the shift by 0 fixes the sign on the high part
    // the final |0 converts the unsigned value into a signed value
    return al * bl + (((ah * bl + al * bh) << 16) >>> 0) | 0;
};
const imul = Math.imul ? Math.imul : imulPolyfill;

function getUint32(a: Uint8Array, i: number): number {
    return (a[i + 3]) | (a[i + 2] << 8) | (a[i + 1] << 16) | (a[i] << 24);
}

function copy(dest: Uint8Array, src: Uint8Array, di: number, si: number, len: number) {
    for (let i = 0; i < len; ++i) {
        dest[di++] = src[si++];
    }
}

export function calcUncompressedLen(src: Uint8Array): number {
    const sn = src.length;
    if (sn === 0) {
        return 0;
    }

    for (let si = 0, di = 0; ; ) {
        // literals and match lengths (token)
        let lLen = src[si] >> 4;
        let mLen = src[si] & 0xf;
        if (++si === sn) {
            throw errInvalidSource;
        }

        // literals
        if (lLen > 0) {
            if (lLen === 0xf) {
                while (src[si] === 0xff) {
                    lLen += 0xff;
                    if (++si === sn) {
                        throw errInvalidSource;
                    }
                }
                lLen += src[si];
                if (++si === sn) {
                    throw errInvalidSource;
                }
            }
            di += lLen;
            si += lLen;
            if (si >= sn) {
                return di;
            }
        }

        si += 2;
        if (si >= sn) {
            throw errInvalidSource;
        }
        const offset = src[si - 2] | (src[si - 1] << 8);
        if (di - offset < 0 || offset === 0) {
            throw errInvalidSource;
        }

        // match
        if (mLen === 0xf) {
            while (src[si] === 0xff) {
                mLen += 0xff;
                if (++si === sn) {
                    throw errInvalidSource;
                }
            }
            mLen += src[si];
            if (++si === sn) {
                throw errInvalidSource;
            }
        }
        // minimum match length is 4
        mLen += 4;

        // copy the match (NB. match is at least 4 bytes long)
        for (; mLen >= offset; mLen -= offset) {
            di += offset;
        }
        di += mLen;
    }
}

export function uncompressBlock(src: Uint8Array, dest: Uint8Array): number {
    const sn = src.length;
    const dn = dest.length;
    if (sn === 0) {
        return 0;
    }

    for (let si = 0, di = 0; ; ) {
        // literals and match lengths (token)
        let lLen = src[si] >> 4;
        let mLen = src[si] & 0xf;
        if (++si === sn) {
            throw errInvalidSource;
        }

        // literals
        if (lLen > 0) {
            if (lLen === 0xf) {
                while (src[si] === 0xff) {
                    lLen += 0xff;
                    if (++si === sn) {
                        throw errInvalidSource;
                    }
                }
                lLen += src[si];
                if (++si === sn) {
                    throw errInvalidSource;
                }
            }
            if (dn - di < lLen || si + lLen > sn) {
                throw errShortBuffer;
            }
            copy(dest, src, di, si, lLen);
            di += lLen;
            si += lLen;
            if (si >= sn) {
                return di;
            }
        }

        si += 2;
        if (si >= sn) {
            throw errInvalidSource;
        }
        const offset = src[si - 2] | (src[si - 1] << 8);
        if (di - offset < 0 || offset === 0) {
            throw errInvalidSource;
        }

        // match
        if (mLen === 0xf) {
            while (src[si] === 0xff) {
                mLen += 0xff;
                if (++si === sn) {
                    throw errInvalidSource;
                }
            }
            mLen += src[si];
            if (++si === sn) {
                throw errInvalidSource;
            }
        }
        // minimum match length is 4
        mLen += 4;
        if (dn - di <= mLen) {
            throw errShortBuffer;
        }

        // copy the match (NB. match is at least 4 bytes long)
        for (; mLen >= offset; mLen -= offset) {
            copy(dest, dest, di, di - offset, offset);
            di += offset;
        }
        copy(dest, dest, di, di - offset, mLen);
        di += mLen;
    }
}

export function compressBlockBound(n: number): number {
    return n + (n / 255 | 0) + 16;
}

export function compressBlock(src: Uint8Array, dest: Uint8Array, soffset: number): number {
    const sn = src.length - mfLimit;
    const dn = dest.length;
    if (sn <= 0 || dn === 0 || soffset >= sn) {
        return 0;
    }
    let si = 0, di = 0;

    // fast scan strategy:
    // we only need a hash table to store the last sequences (4 bytes)
    const hashTable = new Uint32Array(hashSize);

    // Initialise the hash table with the first 64Kb of the input buffer
    // (used when compressing dependent blocks)
    while (si < soffset) {
        const h = imul(getUint32(src, si), hasher) >>> hashShift;
        hashTable[h] = ++si;
    }

    let anchor = si;
    let fma = 1 << skipStrength;
    while (si < sn - minMatch) {
        // hash the next 4 bytes (sequence)...
        const h = imul(getUint32(src, si), hasher) >>> hashShift;
        // -1 to separate existing entries from new ones
        const ref = hashTable[h] - 1;
        // ...and store the position of the hash in the hash table (+1 to compensate the -1 upon saving)
        hashTable[h] = si + 1;
        // no need to check the last 3 bytes in the first literal 4 bytes as
        // this guarantees that the next match, if any, is compressed with
        // a lower size, since to have some compression we must have:
        // ll+ml-overlap > 1 + (ll-15)/255 + (ml-4-15)/255 + 2 (uncompressed size>compressed size)
        // => ll+ml>3+2*overlap => ll+ml>= 4+2*overlap
        // and by definition we do have:
        // ll >= 1, ml >= 4
        // => ll+ml >= 5
        // => so overlap must be 0

        // the sequence is new, out of bound (64kb) or not valid: try next sequence
        if (ref < 0 || //(fma & ((1 << skipStrength) - 1)) < 4 || // this code seems has a big penalty for size...
            (si - ref) >> winSizeLog > 0 ||
            src[ref] !== src[si] ||
            src[ref + 1] !== src[si + 1] ||
            src[ref + 2] !== src[si + 2] ||
            src[ref + 3] !== src[si + 3]) {
            // variable step: improves performance on non-compressible data
            si += fma >> skipStrength;
            ++fma;
            continue;
        }
        // match found
        fma = 1 << skipStrength;
        const lLen = si - anchor;
        const offset = si - ref;

        // encode match length part 1
        si += minMatch;
        let mLen = si; // match length has minMatch already
        while (si <= sn && src[si] === src[si - offset]) {
            si++;
        }
        mLen = si - mLen;
        if (mLen < 0xf) {
            dest[di] = mLen;
        } else {
            dest[di] = 0xf;
        }

        // encode literals length
        if (lLen < 0xf) {
            dest[di] |= lLen << 4;
        } else {
            dest[di] |= 0xf0;
            if (++di === dn) {
                throw errShortBuffer;
            }
            let l = lLen - 0xf;
            for (; l >= 0xff; l -= 0xff) {
                dest[di] = 0xff;
                if (++di === dn) {
                    throw errShortBuffer;
                }
            }
            dest[di] = l & 0xff;
        }
        if (++di === dn) {
            throw errShortBuffer;
        }

        // literals
        if (di + lLen >= dn) {
            throw errShortBuffer;
        }
        copy(dest, src, di, anchor, lLen);
        di += lLen;
        anchor = si;

        // encode offset
        di += 2;
        if (di >= dn) {
            throw errShortBuffer;
        }
        dest[di - 2] = offset;
        dest[di - 1] = offset >> 8;

        // encode match length part 2
        if (mLen >= 0xf) {
            for (mLen -= 0xf; mLen >= 0xff; mLen -= 0xff) {
                dest[di] = 0xff;
                if (++di === dn) {
                    throw errShortBuffer;
                }
            }
            dest[di] = mLen;
            if (++di === dn) {
                throw errShortBuffer;
            }
        }
    }

    if (anchor === 0) {
        // incompressible
        return 0;
    }

    // last literals
    let lLen = src.length - anchor;
    if (lLen < 0xf) {
        dest[di] = lLen << 4;
    } else {
        dest[di] = 0xf0;
        if (++di === dn) {
            throw errShortBuffer;
        }
        for (lLen -= 0xf; lLen >= 0xff; lLen -= 0xff) {
            dest[di] = 0xff;
            if (++di === dn) {
                throw errShortBuffer;
            }
        }
        dest[di] = lLen;
    }
    if (++di === dn) {
        throw errShortBuffer;
    }

    // write literals
    const lastLen = src.length - anchor;
    const n = di + lastLen;
    if (n > dn) {
        throw errShortBuffer;
    } else if (n >= sn) {
        // incompressible
        return 0;
    }
    copy(dest, src, di, anchor, lastLen);
    di += lastLen;
    return di;
}

export function compressBlockHC(src: Uint8Array, dest: Uint8Array, soffset: number): number {
    const sn = src.length - mfLimit;
    const dn = dest.length;
    if (sn <= 0 || dn === 0 || soffset >= sn) {
        return 0;
    }
    let si = 0, di = 0;

    // Hash Chain strategy:
    // we need a hash table and a chain table
    // the chain table cannot contain more entries than the window size (64Kb entries)
    const hashTable = new Uint32Array(hashSize);
    const chainTable = new Uint32Array(winSize);

    // Initialise the hash table with the first 64Kb of the input buffer
    // (used when compressing dependent blocks)
    while (si < soffset) {
        const h = imul(getUint32(src, si), hasher) >>> hashShift;
        chainTable[si & winMask] = hashTable[h];
        hashTable[h] = ++si;
    }

    let anchor = si;
    while (si < sn - minMatch) {
        // hash the next 4 bytes (sequence)...
        const h = imul(getUint32(src, si), hasher) >>> hashShift;

        // follow the chain until out of window and give the longest match
        let mLen = 0;
        let offset = 0;
        for (let next = hashTable[h] - 1; next > 0 && next > si - winSize; next = chainTable[next & winMask] - 1) {
            // the first (mLen==0) or next byte (mLen>=minMatch) at current match length must match to improve on the match length
            if (src[next + mLen] === src[si + mLen]) {
                for (let ml = 0; ; ++ml) {
                    if (src[next + ml] !== src[si + ml] || si + ml > sn) {
                        // found a longer match, keep its position and length
                        if (mLen < ml && ml >= minMatch) {
                            mLen = ml;
                            offset = si - next;
                        }
                        break;
                    }
                }
            }
        }
        chainTable[si & winMask] = hashTable[h];
        hashTable[h] = si + 1;

        // no match found
        if (mLen === 0) {
            ++si;
            continue;
        }

        // match found
        // update hash/chain tables with overlaping bytes:
        // si already hashed, add everything from si+1 up to the match length
        for (let si2 = si + 1, ml = si + mLen; si2 < ml; ) {
            const h = imul(getUint32(src, si2), hasher) >>> hashShift;
            chainTable[si2 & winMask] = hashTable[h];
            hashTable[h] = ++si2;
        }

        const lLen = si - anchor;
        si += mLen;
        mLen -= minMatch; // match length does not include minMatch

        if (mLen < 0xf) {
            dest[di] = mLen;
        } else {
            dest[di] = 0xf;
        }

        // encode literals length
        if (lLen < 0xf) {
            dest[di] |= lLen << 4;
        } else {
            dest[di] |= 0xf0;
            if (++di === dn) {
                throw errShortBuffer;
            }
            let l = lLen - 0xf;
            for (; l >= 0xff; l -= 0xff) {
                dest[di] = 0xff;
                if (++di === dn) {
                    throw errShortBuffer;
                }
            }
            dest[di] = l & 0xff;
        }
        if (++di === dn) {
            throw errShortBuffer;
        }

        // literals
        if (di + lLen >= dn) {
            throw errShortBuffer;
        }
        copy(dest, src, di, anchor, lLen);
        di += lLen;
        anchor = si;

        // encode offset
        di += 2;
        if (di >= dn) {
            throw errShortBuffer;
        }
        dest[di - 2] = offset;
        dest[di - 1] = offset >> 8;

        // encode match length part 2
        if (mLen >= 0xf) {
            for (mLen -= 0xf; mLen >= 0xff; mLen -= 0xff) {
                dest[di] = 0xff;
                if (++di === dn) {
                    throw errShortBuffer;
                }
            }
            dest[di] = mLen;
            if (++di === dn) {
                throw errShortBuffer;
            }
        }
    }

    if (anchor === 0) {
        // incompressible
        return 0;
    }

    // last literals
    let lLen = src.length - anchor;
    if (lLen < 0xf) {
        dest[di] = lLen << 4;
    } else {
        dest[di] = 0xf0;
        if (++di === dn) {
            throw errShortBuffer;
        }
        for (lLen -= 0xf; lLen >= 0xff; lLen -= 0xff) {
            dest[di] = 0xff;
            if (++di === dn) {
                throw errShortBuffer;
            }
        }
        dest[di] = lLen;
    }
    if (++di === dn) {
        throw errShortBuffer;
    }

    // write literals
    const lastLen = src.length - anchor;
    const n = di + lastLen;
    if (n > dn) {
        throw errShortBuffer;
    } else if (n >= sn) {
        // incompressible
        return 0;
    }
    copy(dest, src, di, anchor, lastLen);
    di += lastLen;
    return di;
}