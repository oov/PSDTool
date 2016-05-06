'use strict';
module Renderer {
   export const enum FlipType {
      NoFlip,
      FlipX,
      FlipY,
      FlipXY
   }
   export class Node {
      get visible(): boolean { return this.getVisibleState(); }

      public buffer: HTMLCanvasElement;

      public getVisibleState = (): boolean => { return this.layer.Visible; };
      public id: number;
      public state: string = '';
      get stateHash(): string { return Node.calcHash(this.state).toString(16); }
      public nextState: string = '';
      get nextStateHash(): string { return Node.calcHash(this.nextState).toString(16); }
      public children: Node[] = [];
      public clip: Node[];
      public clippedBy: Node;
      public clippingBuffer: HTMLCanvasElement;
      constructor(public layer: psd.Layer, public parent: Node) {
         if (!layer) {
            this.id = -1;
            return;
         }
         this.id = layer.SeqID;
         let w = layer.Width, h = layer.Height;
         if (w * h <= 0) {
            return;
         }

         this.buffer = document.createElement('canvas');
         this.buffer.width = w;
         this.buffer.height = h;
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
      private draw(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, x: number, y: number, opacity: number, blendMode: string): void {
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
               ctx.globalAlpha = opacity;
               ctx.globalCompositeOperation = blendMode;
               ctx.drawImage(src, x, y);
               return;
         }
         blend(ctx.canvas, src, x, y, src.width, src.height, opacity, blendMode);
         return;
      }

      private clear(ctx: CanvasRenderingContext2D): void {
         ctx.globalAlpha = 1;
         ctx.globalCompositeOperation = 'source-over';
         ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }

      get Width(): number { return this.psd.Width; }
      get Height(): number { return this.psd.Height; }
      get CanvasWidth(): number { return this.psd.CanvasWidth; }
      get CanvasHeight(): number { return this.psd.CanvasHeight; }

      private canvas: HTMLCanvasElement = document.createElement('canvas');
      public root = new Node(null, null);
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
            nc = new Node(lc, n);
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
            if (nc.layer.Clipping) {
               clip.unshift(nc);
            } else {
               if (clip.length) {
                  for (let c of clip) {
                     c.clippedBy = nc;
                  }
                  nc.clippingBuffer = document.createElement('canvas');
                  nc.clippingBuffer.width = nc.layer.Width;
                  nc.clippingBuffer.height = nc.layer.Height;
                  nc.clip = clip;
               }
               clip = [];
            }
         }
      }

      public render(scale: number, autoTrim: boolean, flip: FlipType,
         callback: (progress: number, canvas: HTMLCanvasElement) => void): void {
         let s = Date.now();

         this.root.nextState = '';
         for (let cn of this.root.children) {
            if (!cn.layer.Clipping) {
               if (this.calculateNextState(cn, cn.layer.Opacity / 255, cn.layer.BlendMode)) {
                  this.root.nextState += cn.nextStateHash + '+';
               }
            }
         }

         let bb = this.root.buffer;
         if (this.root.state !== this.root.nextState) {
            let bbctx = bb.getContext('2d');
            this.clear(bbctx);
            for (let cn of this.root.children) {
               if (!cn.layer.Clipping) {
                  this.drawLayer(bbctx, cn, -this.psd.X, -this.psd.Y, cn.layer.Opacity / 255, cn.layer.BlendMode);
               }
            }
            this.root.state = this.root.nextState;
         }
         console.log('rendering: ' + (Date.now() - s));

         s = Date.now();
         this.downScale(bb, scale, (progress, c) => {
            console.log('scaling: ' + (Date.now() - s) + '(phase:' + progress + ')');
            const w = autoTrim ? this.psd.Width : this.psd.CanvasWidth;
            const h = autoTrim ? this.psd.Height : this.psd.CanvasHeight;
            let canvas = this.canvas;
            canvas.width = 0 | w * scale;
            canvas.height = 0 | h * scale;
            let ctx = canvas.getContext('2d');
            this.clear(ctx);
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

      private downScale(src: HTMLCanvasElement, scale: number, callback: (progress: number, image: HTMLCanvasElement) => void): void {
         if (scale === 1) {
            callback(1, src);
            return;
         }
         let ds = new DownScaler(src, scale);
         callback(0, ds.fast());
         setTimeout((): void => ds.beautifulWorker(canvas => callback(1, canvas)), 0);
      }

      private calculateNextState(n: Node, opacity: number, blendMode: string) {
         if (!n.visible || opacity === 0) {
            return false;
         }

         n.nextState = '';
         if (n.layer.Children.length) {
            if (blendMode === 'pass-through') {
               n.nextState += n.parent.nextStateHash + '+';
            }
            for (let i = 0, child: psd.Layer; i < n.layer.Children.length; ++i) {
               child = n.layer.Children[i];
               if (!child.Clipping) {
                  if (this.calculateNextState(n.children[i], child.Opacity / 255, child.BlendMode)) {
                     n.nextState += n.children[i].nextStateHash + '+';
                  }
               }
            }
         } else if (n.layer.Canvas) {
            n.nextState = n.id.toString();
         }

         if (n.layer.Mask) {
            n.nextState += '|lm';
         }

         if (!n.clip) {
            return true;
         }

         n.nextState += '|cm' + (n.layer.BlendClippedElements ? '1' : '0') + ':';
         if (n.layer.BlendClippedElements) {
            for (let i = 0, cn: Node; i < n.clip.length; ++i) {
               cn = n.clip[i];
               if (this.calculateNextState(n.clip[i], cn.layer.Opacity / 255, cn.layer.BlendMode)) {
                  n.nextState += n.clip[i].nextStateHash + '+';
               }
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
         if (!n.visible || opacity === 0 || (!n.children.length && !n.layer.Canvas)) {
            return false;
         }
         let bb = n.buffer;
         if (n.state === n.nextState) {
            if (blendMode === 'pass-through') {
               blendMode = 'source-over';
            }
            this.draw(ctx, bb, x + n.layer.X, y + n.layer.Y, opacity, blendMode);
            return true;
         }

         let bbctx = bb.getContext('2d');
         this.clear(bbctx);
         if (n.children.length) {
            if (blendMode === 'pass-through') {
               this.draw(bbctx, n.parent.buffer, -x - n.layer.X, -y - n.layer.Y, 1, 'source-over');
               blendMode = 'source-over';
            }
            for (let cn of n.children) {
               if (!cn.layer.Clipping) {
                  this.drawLayer(bbctx, cn, -n.layer.X, -n.layer.Y, cn.layer.Opacity / 255, cn.layer.BlendMode);
               }
            }
         } else if (n.layer.Canvas) {
            this.draw(bbctx, n.layer.Canvas, 0, 0, 1, 'source-over');
         }

         if (n.layer.Mask) {
            this.draw(
               bbctx,
               n.layer.Mask,
               n.layer.MaskX - n.layer.X,
               n.layer.MaskY - n.layer.Y,
               1,
               n.layer.MaskDefaultColor ? 'destination-out' : 'destination-in'
               );
         }

         if (!n.clip) {
            this.draw(ctx, bb, x + n.layer.X, y + n.layer.Y, opacity, blendMode);
            n.state = n.nextState;
            return true;
         }

         let cbb = n.clippingBuffer;
         let cbbctx = cbb.getContext('2d');

         if (n.layer.BlendClippedElements) {
            this.clear(cbbctx);
            this.draw(cbbctx, bb, 0, 0, 1, 'source-over');
            let changed = false;
            for (let cn of n.clip) {
               changed = this.drawLayer(
                  cbbctx,
                  cn, -n.layer.X, -n.layer.Y,
                  cn.layer.Opacity / 255,
                  cn.layer.BlendMode
                  ) || changed;
            }
            if (changed) {
               this.draw(cbbctx, bb, 0, 0, 1, 'copy-alpha');
            }
            // swap buffer for next time
            n.clippingBuffer = bb;
            n.buffer = cbb;
            this.draw(ctx, cbb, x + n.layer.X, y + n.layer.Y, opacity, blendMode);
            n.state = n.nextState;
            return true;
         }

         // this is minor code path.
         // it is only used when "Blend Clipped Layers as Group" is unchecked in Photoshop's Layer Style dialog.
         this.draw(ctx, bb, x + n.layer.X, y + n.layer.Y, opacity, blendMode);
         this.clear(cbbctx);
         for (let cn of n.clip) {
            if (!this.drawLayer(cbbctx, cn, -n.layer.X, -n.layer.Y, 1, 'source-over')) {
               continue;
            }
            this.draw(cbbctx, bb, 0, 0, 1, 'destination-in');
            this.draw(ctx, cbb, x + n.layer.X, y + n.layer.Y, cn.layer.Opacity / 255, cn.layer.BlendMode);
            this.clear(cbbctx);
         }
         n.state = n.nextState;
         return true;
      }
   }

}
