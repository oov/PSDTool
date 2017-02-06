import * as blend from './blend/blend';
import * as downscaler from './downscaler';

export const enum FlipType {
    NoFlip,
    FlipX,
    FlipY,
    FlipXY
}

export class Node {
    public buffer = document.createElement('canvas');

    private _visible = false;
    public getVisibleState = (): boolean => { return this._visible; };
    get visible(): boolean { return this.getVisibleState(); }

    public readonly id: number;

    public state: string = '';
    get stateHash(): string { return Node.calcHash(this.state).toString(16); }
    public nextState: string = '';
    get nextStateHash(): string { return Node.calcHash(this.nextState).toString(16); }

    public readonly children: Node[] = [];

    public clipping: boolean = false;
    public readonly clip: Node[] = [];
    public clippedBy: Node;
    public clippingBuffer: HTMLCanvasElement;

    public readonly image: CanvasRenderingContext2D | undefined;
    public x = 0;
    public y = 0;
    public width = 0;
    public height = 0;

    public readonly mask: CanvasRenderingContext2D | undefined;
    public maskX = 0;
    public maskY = 0;
    public maskWidth = 0;
    public maskHeight = 0;
    public maskDefaultColor = 0; // 0 or 255

    public readonly blendMode: string;
    public readonly opacity: number; // 0 ~ 255
    public readonly blendClippedElements: boolean;

    public parent = this;
    constructor(layer: psd.Layer | undefined) {
        if (!layer) {
            this.id = -1;
            return;
        }
        this.id = layer.SeqID;
        let width = layer.Width, height = layer.Height;
        if (width * height <= 0) {
            return;
        }

        this.buffer = document.createElement('canvas');
        this.buffer.width = width;
        this.buffer.height = height;

        this.image = layer.Canvas;
        this.x = layer.X;
        this.y = layer.Y;
        this.width = width;
        this.height = height;

        this.mask = layer.Mask;
        this.maskX = layer.MaskX;
        this.maskY = layer.MaskY;
        this.maskWidth = layer.MaskWidth;
        this.maskHeight = layer.MaskHeight;
        this.maskDefaultColor = layer.MaskDefaultColor;

        this.clipping = layer.Clipping;
        this.blendMode = layer.BlendMode;
        this.opacity = layer.Opacity;
        this._visible = layer.Visible;
        this.blendClippedElements = layer.BlendClippedElements;
    }

    // http://stackoverflow.com/a/7616484
    private static calcHash(s: string): number {
        if (s.length === 0) {
            return 0;
        }
        let hash = 0, chr: number;
        for (let i = 0; i < s.length; ++i) {
            chr = s.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
}

export class Renderer {
    private static draw(dest: CanvasRenderingContext2D, src: HTMLCanvasElement, x: number, y: number, opacity: number, blendMode: string): void {
        switch (blendMode) {
            case 'clear':
            case 'copy':
            case 'destination':
            case 'source-over':
            case 'destination-over':
            case 'source-in':
            case 'destination-in':
            case 'source-out':
            case 'destination-out':
            case 'source-atop':
            case 'destination-atop':
            case 'xor':
                dest.globalAlpha = opacity;
                dest.globalCompositeOperation = blendMode;
                dest.drawImage(src, x, y);
                return;
        }
        const ctx = src.getContext('2d');
        if (!ctx) {
            throw new Error('cannot get CanvasRenderingContext2D');
        }
        blend.blend(dest, ctx, x, y, src.width, src.height, opacity, blendMode);
        return;
    }

    private static clear(ctx: CanvasRenderingContext2D): void {
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    get Width(): number { return this.psd.Width; }
    get Height(): number { return this.psd.Height; }
    get CanvasWidth(): number { return this.psd.CanvasWidth; }
    get CanvasHeight(): number { return this.psd.CanvasHeight; }

    private canvas: HTMLCanvasElement = document.createElement('canvas');
    public root = new Node(undefined);
    public nodes: { [seqId: number]: Node } = {};
    constructor(private psd: psd.Root) {
        this.buildTree(this.root, psd);
        this.root.buffer = document.createElement('canvas');
        this.root.buffer.width = psd.Width;
        this.root.buffer.height = psd.Height;
        this.registerClippingGroup(this.root);
    }

    private buildTree(n: Node, layer: psd.LayerBase): void {
        let nc: Node;
        for (let lc of layer.Children) {
            nc = new Node(lc);
            nc.parent = n;
            this.buildTree(nc, lc);
            n.children.push(nc);
            this.nodes[nc.id] = nc;
        }
    }

    private registerClippingGroup(n: Node): void {
        let clip: Node[] = [];
        for (let nc: Node, i = n.children.length - 1; i >= 0; --i) {
            nc = n.children[i];
            this.registerClippingGroup(nc);
            if (nc.clipping) {
                clip.unshift(nc);
            } else {
                if (clip.length) {
                    for (let c of clip) {
                        c.clippedBy = nc;
                    }
                    nc.clippingBuffer = document.createElement('canvas');
                    nc.clippingBuffer.width = nc.width;
                    nc.clippingBuffer.height = nc.height;
                    Array.prototype.push.apply(nc.clip, clip);
                }
                clip = [];
            }
        }
    }

    public render(scale: number, autoTrim: boolean, flip: FlipType, useOldResizer: boolean,
        callback: (progress: number, canvas: HTMLCanvasElement) => void): void {
        let s = Date.now();

        this.root.nextState = '';
        for (let cn of this.root.children) {
            if (!cn.clipping || cn.blendMode === 'pass-through') {
                if (this.calculateNextState(cn, cn.opacity / 255, cn.blendMode)) {
                    this.root.nextState += cn.nextStateHash + '+';
                }
            }
        }

        let bb = this.root.buffer;
        if (this.root.state !== this.root.nextState) {
            let bbctx = bb.getContext('2d');
            if (!bbctx) {
                throw new Error('cannot get CanvasRenderingContext2D');
            }
            Renderer.clear(bbctx);
            for (let cn of this.root.children) {
                this.drawLayer(bbctx, cn, -this.psd.X, -this.psd.Y, cn.opacity / 255, cn.blendMode);
            }
            this.root.state = this.root.nextState;
        }
        console.log('rendering: ' + (Date.now() - s));

        s = Date.now();
        this.downScale(bb, scale, useOldResizer, (progress, c) => {
            console.log('scaling: ' + (Date.now() - s) + '(phase:' + progress + ')');
            const w = autoTrim ? this.psd.Width : this.psd.CanvasWidth;
            const h = autoTrim ? this.psd.Height : this.psd.CanvasHeight;
            const canvas = this.canvas;
            canvas.width = 0 | w * scale;
            canvas.height = 0 | h * scale;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('cannot get CanvasRenderingContext2D');
            }
            Renderer.clear(ctx);
            ctx.save();
            switch (flip) {
                case FlipType.FlipX:
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                    break;
                case FlipType.FlipY:
                    ctx.translate(0, canvas.height);
                    ctx.scale(1, -1);
                    break;
                case FlipType.FlipXY:
                    ctx.translate(canvas.width, canvas.height);
                    ctx.scale(-1, -1);
                    break;
            }
            ctx.drawImage(
                c,
                autoTrim ? 0 : 0 | this.psd.X * scale,
                autoTrim ? 0 : 0 | this.psd.Y * scale
            );
            ctx.restore();
            callback(progress, canvas);
        });
    }

    private downScale(
        src: HTMLCanvasElement,
        scale: number,
        useOldResizer: boolean,
        callback: (progress: number, image: HTMLCanvasElement) => void
    ): void {
        if (scale === 1) {
            callback(1, src);
            return;
        }
        const ds = new downscaler.DownScaler(src, scale, useOldResizer);
        callback(0, ds.fast());
        setTimeout((): void => ds.beautifulWorker(canvas => callback(1, canvas)), 0);
    }

    private calculateNextState(n: Node, opacity: number, blendMode: string) {
        if (!n.visible || opacity === 0 || n.clipping || (!n.children.length && !n.image)) {
            return false;
        }

        n.nextState = '';
        if (n.children.length) {
            if (blendMode === 'pass-through') {
                n.nextState += n.parent.nextStateHash + '+';
            }
            for (let i = 0; i < n.children.length; ++i) {
                const child = n.children[i];
                if (this.calculateNextState(n.children[i], child.opacity / 255, child.blendMode)) {
                    n.nextState += n.children[i].nextStateHash + '+';
                }
            }
        } else if (n.image) {
            n.nextState = n.id.toString();
        }

        if (n.mask) {
            n.nextState += '|lm';
        }

        if (!n.clip.length || blendMode === 'pass-through') {
            return true;
        }

        n.nextState += '|cm' + (n.blendClippedElements ? '1' : '0') + ':';
        if (n.blendClippedElements) {
            for (let i = 0, cn: Node; i < n.clip.length; ++i) {
                cn = n.clip[i];
                cn.clipping = false;
                if (this.calculateNextState(n.clip[i], cn.opacity / 255, cn.blendMode)) {
                    n.nextState += n.clip[i].nextStateHash + '+';
                }
                cn.clipping = true;
            }
            return true;
        }

        // we cannot cache in this mode
        n.nextState += Date.now() + '_' + Math.random() + ':';

        for (let cn of n.clip) {
            if (this.calculateNextState(cn, 1, 'source-over')) {
                n.nextState += cn.nextStateHash + '+';
            }
        }
        return true;
    }

    private drawLayer(ctx: CanvasRenderingContext2D, n: Node, x: number, y: number, opacity: number, blendMode: string): boolean {
        if (!n.visible || opacity === 0 || n.clipping || (!n.children.length && !n.image)) {
            return false;
        }
        let bb = n.buffer;
        if (n.state === n.nextState) {
            if (blendMode === 'pass-through') {
                Renderer.draw(ctx, bb, x + n.x, y + n.y, 1, 'copy-all');
            } else {
                Renderer.draw(ctx, bb, x + n.x, y + n.y, opacity, blendMode);
            }
            return true;
        }

        let bbctx = bb.getContext('2d');
        if (!bbctx) {
            throw new Error('cannot get CanvasRenderingContext2D for BackBuffer');
        }
        Renderer.clear(bbctx);
        if (n.children.length) {
            if (blendMode === 'pass-through') {
                Renderer.draw(bbctx, ctx.canvas, -x - n.x, -y - n.y, 1, 'source-over');
                for (let cn of n.children) {
                    this.drawLayer(bbctx, cn, -n.x, -n.y, cn.opacity * opacity / 255, cn.blendMode);
                }
            } else {
                for (let cn of n.children) {
                    this.drawLayer(bbctx, cn, -n.x, -n.y, cn.opacity / 255, cn.blendMode);
                }
            }
        } else if (n.image) {
            Renderer.draw(bbctx, n.image.canvas, 0, 0, 1, 'source-over');
        }

        if (n.mask) {
            Renderer.draw(
                bbctx,
                n.mask.canvas,
                n.maskX - n.x,
                n.maskY - n.y,
                1,
                n.maskDefaultColor ? 'destination-out' : 'destination-in'
            );
        }

        if (!n.clip.length) {
            if (blendMode === 'pass-through') {
                Renderer.draw(ctx, bb, x + n.x, y + n.y, 1, 'copy-all');
            } else {
                Renderer.draw(ctx, bb, x + n.x, y + n.y, opacity, blendMode);
            }
            n.state = n.nextState;
            return true;
        }

        let cbb = n.clippingBuffer;
        if (!cbb) {
            throw new Error('clippingBuffer not found');
        }
        let cbbctx = cbb.getContext('2d');
        if (!cbbctx) {
            throw new Error('cannot get CanvasRenderingContext2D for ClipBackBuffer');
        }

        if (n.blendClippedElements) {
            Renderer.draw(cbbctx, bb, 0, 0, 1, 'copy-opaque');
            for (let cn of n.clip) {
                cn.clipping = false;
                this.drawLayer(
                    cbbctx,
                    cn, -n.x, -n.y,
                    cn.opacity / 255,
                    cn.blendMode
                );
                cn.clipping = true;
            }
            Renderer.draw(cbbctx, bb, 0, 0, 1, 'copy-alpha');
            // swap buffer for next time
            n.clippingBuffer = bb;
            n.buffer = cbb;

            if (blendMode === 'pass-through') {
                Renderer.draw(ctx, cbb, x + n.x, y + n.y, 1, 'copy-all');
            } else {
                Renderer.draw(ctx, cbb, x + n.x, y + n.y, opacity, blendMode);
            }

            n.state = n.nextState;
            return true;
        }

        // this is minor code path.
        // it is only used when "Blend Clipped Layers as Group" is unchecked in Photoshop's Layer Style dialog.
        // TODO: pass-through support
        Renderer.draw(ctx, bb, x + n.x, y + n.y, opacity, blendMode);
        Renderer.clear(cbbctx);
        for (let cn of n.clip) {
            cn.clipping = false;
            if (!this.drawLayer(cbbctx, cn, -n.x, -n.y, 1, 'source-over')) {
                cn.clipping = true;
                continue;
            }
            cn.clipping = true;
            Renderer.draw(cbbctx, bb, 0, 0, 1, 'destination-in');
            Renderer.draw(ctx, cbb, x + n.x, y + n.y, cn.opacity / 255, cn.blendMode);
            Renderer.clear(cbbctx);
        }
        n.state = n.nextState;
        return true;
    }
}
