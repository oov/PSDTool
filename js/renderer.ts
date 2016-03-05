/// <reference path="psd/psd.d.ts" />
/// <reference path="blend/blend.d.ts" />

'use strict';

class StateNode {
   get visible(): boolean { return this.getVisibleState(); }
   set visible(v: boolean) { this.setVisibleState(v); }

   public userData: any;

   public canvas: HTMLCanvasElement;
   public mask: HTMLCanvasElement;
   public buffer: HTMLCanvasElement;

   public getVisibleState = (): boolean => { return this.layer.Visible; };
   public setVisibleState = (v: boolean) => undefined;
   public state: string = '';
   public nextState: string = '';
   public children: StateNode[] = [];
   public clip: StateNode[];
   public clippedBy: StateNode;
   public clippingBuffer: HTMLCanvasElement;
   constructor(public layer: psd.Layer, public parent: StateNode, public id: string) {
      if (!layer) {
         return;
      }
      let w = layer.Width, h = layer.Height;
      if (w * h <= 0) {
         return;
      }
      if (layer.R && layer.G && layer.B) {
         this.canvas = StateNode.createCanvas(
            w, h,
            new Uint8Array(layer.R),
            new Uint8Array(layer.G),
            new Uint8Array(layer.B),
            layer.A ? new Uint8Array(layer.A) : undefined);
      }
      if (layer.Mask) {
         this.mask = StateNode.createMask(
            layer.MaskWidth,
            layer.MaskHeight,
            new Uint8Array(layer.Mask),
            layer.MaskDefaultColor
            );
      }
      this.buffer = document.createElement('canvas');
      this.buffer.width = w;
      this.buffer.height = h;
   }

   static createCanvas(w: number, h: number, r: Uint8Array, g: Uint8Array, b: Uint8Array, a?: Uint8Array): HTMLCanvasElement {
      let canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      let ctx = canvas.getContext('2d');
      let imgData = ctx.createImageData(w, h);
      let sx: number, dx: number, y: number, sbase: number, dbase: number, dw = imgData.width << 2;
      let data = imgData.data;
      if (a) {
         for (y = 0; y < h; ++y) {
            sbase = y * w;
            dbase = y * dw;
            for (sx = 0, dx = 0; sx < w; ++sx, dx += 4) {
               data[dbase + dx] = r[sbase + sx];
               data[dbase + dx + 1] = g[sbase + sx];
               data[dbase + dx + 2] = b[sbase + sx];
               data[dbase + dx + 3] = a[sbase + sx];
            }
         }
      } else {
         for (y = 0; y < h; ++y) {
            sbase = y * w;
            dbase = y * dw;
            for (sx = 0, dx = 0; sx < w; ++sx, dx += 4) {
               data[dbase + dx] = r[sbase + sx];
               data[dbase + dx + 1] = g[sbase + sx];
               data[dbase + dx + 2] = b[sbase + sx];
            }
         }
      }
      ctx.putImageData(imgData, 0, 0);
      return canvas;
   }

   static createMask(w: number, h: number, mask: Uint8Array, defaultColor: number): HTMLCanvasElement {
      let canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      let ctx = canvas.getContext('2d');
      let imgData = ctx.createImageData(w, h);
      let sx: number, dx: number, y: number, sbase: number, dbase: number, dw = imgData.width << 2;
      let data = imgData.data;
      if (defaultColor === 0) {
         for (y = 0; y < h; ++y) {
            sbase = y * w;
            dbase = y * dw;
            for (sx = 0, dx = 0; sx < w; ++sx, dx += 4) {
               data[dbase + dx + 3] = mask[sbase + sx];
            }
         }
      } else {
         for (y = 0; y < h; ++y) {
            sbase = y * w;
            dbase = y * dw;
            for (sx = 0, dx = 0; sx < w; ++sx, dx += 4) {
               data[dbase + dx + 3] = 255 - mask[sbase + sx];
            }
         }
      }
      ctx.putImageData(imgData, 0, 0);
      return canvas;
   }
}

class Renderer {
   private draw(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, x: number, y: number, opacity: number, blendMode: string): void {
      switch (blendMode) {
         case 'source-over':
         case 'destination-in':
         case 'destination-out':
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
   public StateTreeRoot = new StateNode(null, null, 'r');
   constructor(private psd: psd.Root) {
      this.buildStateTree(this.StateTreeRoot, psd);
      this.StateTreeRoot.buffer = document.createElement('canvas');
      this.StateTreeRoot.buffer.width = psd.Width;
      this.StateTreeRoot.buffer.height = psd.Height;
      this.registerClippingGroup(this.StateTreeRoot);
   }

   private buildStateTree(n: StateNode, layer: psd.LayerBase): void {
      for (let nc: StateNode, i = 0; i < layer.Children.length; ++i) {
         nc = new StateNode(layer.Children[i], n, n.id + '.' + i);
         this.buildStateTree(nc, layer.Children[i]);
         n.children.push(nc);
      }
   }

   private registerClippingGroup(n: StateNode): void {
      let clip: StateNode[] = [];
      for (let nc: StateNode, i = n.children.length - 1, j = 0; i >= 0; --i) {
         nc = n.children[i];
         this.registerClippingGroup(nc);
         if (nc.layer.Clipping) {
            clip.unshift(nc);
         } else {
            if (clip.length) {
               for (j = 0; j < clip.length; ++j) {
                  clip[j].clippedBy = nc;
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

   public render(scale: number, autoTrim: boolean, mirror: boolean, callback: (progress: number, canvas: HTMLCanvasElement) => void): void {
      let s = Date.now();

      this.StateTreeRoot.nextState = '';
      for (let cn: StateNode, i = 0; i < this.StateTreeRoot.children.length; ++i) {
         cn = this.StateTreeRoot.children[i];
         if (!cn.layer.Clipping) {
            if (this.calculateNextState(cn, cn.layer.Opacity / 255, cn.layer.BlendMode)) {
               this.StateTreeRoot.nextState += cn.nextState + '+';
            }
         }
      }

      let bb = this.StateTreeRoot.buffer;
      if (this.StateTreeRoot.state !== this.StateTreeRoot.nextState) {
         let bbctx = bb.getContext('2d');
         this.clear(bbctx);
         for (let cn: StateNode, i = 0; i < this.StateTreeRoot.children.length; ++i) {
            cn = this.StateTreeRoot.children[i];
            if (!cn.layer.Clipping) {
               this.drawLayer(bbctx, cn, -this.psd.X, -this.psd.Y, cn.layer.Opacity / 255, cn.layer.BlendMode);
            }
         }
         this.StateTreeRoot.state = this.StateTreeRoot.nextState;
      }
      console.log('rendering: ' + (Date.now() - s));

      s = Date.now();
      this.downScale(bb, scale, (progress: number, c: HTMLCanvasElement): void => {
         console.log('scaling: ' + (Date.now() - s) + '(phase:' + progress + ')');
         const w = autoTrim ? this.psd.Width : this.psd.CanvasWidth;
         const h = autoTrim ? this.psd.Height : this.psd.CanvasHeight;
         let canvas = this.canvas;
         canvas.width = 0 | w * scale;
         canvas.height = 0 | h * scale;
         let ctx = canvas.getContext('2d');
         this.clear(ctx);
         ctx.save();
         if (mirror) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
         }
         ctx.drawImage(
            c,
            autoTrim ? 0 : Math.ceil(this.psd.X * scale),
            autoTrim ? 0 : Math.ceil(this.psd.Y * scale)
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
      setTimeout((): void => {
         ds.beautifulWorker((canvas: HTMLCanvasElement): void => {
            callback(1, canvas);
         });
      }, 0);
   }

   private calculateNextState(n: StateNode, opacity: number, blendMode: string) {
      if (!n.visible || opacity === 0) {
         return false;
      }

      n.nextState = '';
      if (n.layer.Children.length) {
         if (blendMode === 'pass-through') {
            n.nextState += n.parent.nextState + '+';
         }
         for (let i = 0, child: psd.Layer; i < n.layer.Children.length; ++i) {
            child = n.layer.Children[i];
            if (!child.Clipping) {
               if (this.calculateNextState(n.children[i], child.Opacity / 255, child.BlendMode)) {
                  n.nextState += n.children[i].nextState + '+';
               }
            }
         }
      } else if (n.canvas) {
         n.nextState = n.id;
      }

      if (n.mask) {
         n.nextState += '|lm';
      }

      if (!n.clip) {
         return true;
      }

      n.nextState += '|cm' + (n.layer.BlendClippedElements ? '1' : '0') + ':';
      if (n.layer.BlendClippedElements) {
         for (let i = 0, cn: StateNode; i < n.clip.length; ++i) {
            cn = n.clip[i];
            if (this.calculateNextState(n.clip[i], cn.layer.Opacity / 255, cn.layer.BlendMode)) {
               n.nextState += n.clip[i].nextState + '+';
            }
         }
         return true;
      }

      // we cannot cache in this mode
      n.nextState += Date.now() + '_' + Math.random() + ':';

      for (let i = 0, cn: StateNode; i < n.clip.length; ++i) {
         cn = n.clip[i];
         if (this.calculateNextState(cn, 1, 'source-over')) {
            n.nextState += cn.nextState + '+';
         }
      }
      return true;
   }

   private drawLayer(ctx: CanvasRenderingContext2D, n: StateNode, x: number, y: number, opacity: number, blendMode: string): boolean {
      if (!n.visible || opacity === 0 || (!n.children.length && !n.canvas)) {
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
         for (let i = 0, cn: StateNode; i < n.children.length; ++i) {
            cn = n.children[i];
            if (!cn.layer.Clipping) {
               this.drawLayer(bbctx, cn, -n.layer.X, -n.layer.Y, cn.layer.Opacity / 255, cn.layer.BlendMode);
            }
         }
      } else if (n.canvas) {
         this.draw(bbctx, n.canvas, 0, 0, 1, 'source-over');
      }

      if (n.mask) {
         this.draw(
            bbctx,
            n.mask,
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
         for (let i = 0, cn: StateNode; i < n.clip.length; ++i) {
            cn = n.clip[i];
            changed = this.drawLayer(
               cbbctx,
               cn, -n.layer.X, -n.layer.Y,
               cn.layer.Opacity / 255,
               cn.layer.BlendMode
               ) || changed;
         }
         if (changed) {
            this.draw(cbbctx, bb, 0, 0, 1, 'destination-in');
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
      for (let i = 0, cn: StateNode; i < n.clip.length; ++i) {
         cn = n.clip[i];
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
