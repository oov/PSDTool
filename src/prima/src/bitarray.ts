export class BitArray {
    public readonly buffer: Uint32Array;
    public readonly length: number;
    constructor(buffer: ArrayBuffer, length: number);
    constructor(length: number);
    constructor(p: ArrayBuffer | number, len?: number) {
        if (p instanceof ArrayBuffer) {
            this.buffer = new Uint32Array(p);
            this.length = len ? len : this.buffer.length << 5;
            return;
        }
        this.buffer = new Uint32Array(bufferLength(p));
        this.length = p;
    }
    set(index: number, v: boolean) {
        const bufIndex = index >>> 5;
        const bitIndex = index - (bufIndex << 5);
        if (v) {
            this.buffer[bufIndex] |= 1 << bitIndex;
        } else {
            this.buffer[bufIndex] &= ~(1 << bitIndex);
        }
    }
    get(index: number): boolean {
        const bufIndex = index >>> 5;
        const bitIndex = index - (bufIndex << 5);
        return (this.buffer[bufIndex] & (1 << bitIndex)) !== 0;
    }
}

export function bufferLength(bits: number): number {
    return (bits + 31) >>> 5;
}

export function set(buf: Uint32Array, index: number, v: boolean): void {
    const bufIndex = index >>> 5;
    const bitIndex = index - (bufIndex << 5);
    if (v) {
        buf[bufIndex] |= 1 << bitIndex;
    } else {
        buf[bufIndex] &= ~(1 << bitIndex);
    }
}

export function get(buf: Uint32Array, index: number): boolean {
    const bufIndex = index >>> 5;
    const bitIndex = index - (bufIndex << 5);
    return (buf[bufIndex] & (1 << bitIndex)) !== 0;
}