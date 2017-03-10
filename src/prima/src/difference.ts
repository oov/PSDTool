export function calcHash(a: Uint32Array): number {
    const hashBits = 32;
    const sum: number[] = new Array(hashBits + 1);
    const per = a.length / hashBits | 0;
    sum[0] = 0;
    for (let i = 0, n = 0, v = 0, ti = 0; i < a.length; ++i) {
        v += a[i];
        if (++n === per) {
            sum[++ti] = v;
            n = 0;
            v = 0;
        }
    }
    let h = 0;
    for (let i = 1; i < sum.length; ++i) {
        h = (h << 1) | (sum[i] > sum[i - 1] ? 1 : 0);
    }
    return h;
}

export function getComparer(base: number): (a: number, b: number) => number {
    function distance(v: number): number {
        v = (v & 0x55555555) + (v >>> 1 & 0x55555555);
        v = (v & 0x33333333) + (v >>> 2 & 0x33333333);
        v = (v & 0x0f0f0f0f) + (v >>> 4 & 0x0f0f0f0f);
        v = (v & 0x00ff00ff) + (v >>> 8 & 0x00ff00ff);
        return (v & 0x0000ffff) + (v >>> 16 & 0x0000ffff);
    }
    return (a, b) => a === b ? 0 : distance(a ^ base) > distance(b ^ base) ? 1 : -1;
}