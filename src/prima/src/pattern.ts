// * The first item is must be 'none' on each list.
// Example:
// [
//   ['none', 'wear1', 'wear2'],
//   ['none', 'normal', 'good', 'angry'],
//   ['none', 'normal', 'good', 'sad'],
//   ['none', 'normal', 'good', 'hungry'],
// ]
export type Set = string[][];

// Example:
// ['wear', 'eyebrows', 'eyes', 'mouths']
export type Caption = string[];

// Example:
// [0, 0, 0, 0] = none + none + none + none
// [1, 1, 3, 3] = wear1 + normal + sad + hungry
export type Pattern = number[];

// Example:
// 0 = none + none + none + none
export type Index = number;

export function number(src: Set): number {
    const groupLength = src.length;
    if (groupLength === 0) {
        return 0;
    }

    let n = 1;
    for (let g = groupLength - 1; g >= 0; --g) {
        n *= src[g].length;
    }
    if (n > Number.MAX_SAFE_INTEGER) {
        throw new Error('too many patterns');
    }
    return n;
}

export function toIndex(pattern: Pattern, src: Set): Index {
    const groupLength = src.length;
    let r = 0, n = 1;
    for (let g = groupLength - 1; g >= 0; --g) {
        if (pattern[g] >= src[g].length) {
            throw new Error('parts index out of range');
        }
        r += pattern[g] * n;
        n *= src[g].length;
    }
    return r;
}

export function fromIndex(index: Index, src: Set): Pattern {
    if (index >= number(src)) {
        throw new Error('pattern index out of range');
    }
    const groupLength = src.length;
    let r: Pattern = new Array(groupLength);
    for (let g = groupLength - 1, len: number, tmp: number; g >= 0; --g) {
        len = src[g].length;
        tmp = index / len | 0;
        r[g] = index - (tmp * len);
        index = tmp;
    }
    return r;
}