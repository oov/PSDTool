import * as lz4 from './lz4/src/lz4';

function copy(dest: Uint8Array, src: Uint8Array, di: number, si: number, len: number) {
    for (let i = 0; i < len; ++i) {
        dest[di++] = src[si++];
    }
}

function fillZero(dest: Uint8Array, di: number, len: number) {
    for (let i = 0; i < len; ++i) {
        dest[di++] = 0;
    }
}

export class Primar {
    private images: Blob[] = [];

    public addImage(blob: Blob): void {
        this.images.push(blob);
    }

    private blocks: ArrayBuffer[] = [];
    private buffer = new Uint8Array(1024 * 1024);
    private compBuf = new Uint8Array(lz4.compressBlockBound(this.buffer.length));
    private used = 0;
    public addMap(ab: ArrayBuffer): void {
        const src = new Uint8Array(ab);
        if (this.buffer.length - this.used >= src.length) {
            copy(this.buffer, src, this.used, 0, src.length);
            this.used += src.length;
        } else {
            const alen = this.buffer.length - this.used;
            copy(this.buffer, src, this.used, 0, alen);

            {
                const written = lz4.compressBlockHC(this.buffer.buffer, this.compBuf.buffer, 0);
                const block = new Uint8Array(written + 4);
                new DataView(block.buffer).setUint32(0, written, true);
                copy(block, this.compBuf, 4, 0, written);
                this.blocks.push(block.buffer);
            }

            this.used = src.length - alen;
            copy(this.buffer, src, 0, alen, this.used);
        }
    }

    private finishMap(): void {
        if (this.used === 0) {
            return;
        }
        fillZero(this.buffer, this.used, this.buffer.length - this.used);
        const written = lz4.compressBlockHC(this.buffer.buffer, this.compBuf.buffer, 0);
        const block = new Uint8Array(written + 4);
        new DataView(block.buffer).setUint32(0, written, true);
        copy(block, this.compBuf, 4, 0, written);
        this.blocks.push(block.buffer);
        this.used = 0;
    }

    public generate(structure: any): Blob {
        const archive: (Blob | ArrayBuffer)[] = [];
        {
            const blob = new Blob([JSON.stringify(structure)], { type: 'application/json; charset=utf-8' });
            const header = new ArrayBuffer(8);
            const dv = new DataView(header);
            dv.setUint32(0, 0x184d2a50, true);
            dv.setUint32(4, blob.size, true);
            archive.push(header, blob);
        }
        for (const image of this.images) {
            const header = new ArrayBuffer(8);
            const dv = new DataView(header);
            dv.setUint32(0, 0x184d2a51, true);
            dv.setUint32(4, image.size, true);
            archive.push(header, image);
        }
        const header = new ArrayBuffer(7);
        const dv = new DataView(header);
        dv.setUint32(0, 0x184d2204, true);
        dv.setUint8(4, 0x60);
        dv.setUint8(5, 0x60);
        dv.setUint8(6, 0x51);
        archive.push(header);

        this.finishMap();
        Array.prototype.push.apply(archive, this.blocks);
        archive.push(new ArrayBuffer(4));
        return new Blob(archive, { type: 'application/octet-binary' });
    }
}