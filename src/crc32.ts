// Based on http://stackoverflow.com/a/18639999
function makeCRCTable(): Uint32Array {
    let c: number, n: number, k: number;
    const crcTable = new Uint32Array(256);
    for (n = 0; n < 256; n++) {
        c = n;
        for (k = 0; k < 8; k++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
}
const crcTable = makeCRCTable();

export function crc32(src: ArrayBuffer): number {
    const table = crcTable;
    const u8a = new Uint8Array(src);
    let crc = 0 ^ (-1);
    for (let i = 0; i < u8a.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ u8a[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
}