declare module psd {
   interface LayerBase {
      X: number;
      Y: number;
      Width: number;
      Height: number;
      Children: Layer[];
   }
   interface Layer extends LayerBase {
      SeqID: number;

      Canvas: HTMLCanvasElement;
      Mask: HTMLCanvasElement;

      Name: string;
      BlendMode: string;
      Opacity: number; // 0-255
      Clipping: boolean;
      BlendClippedElements: boolean;
      TransparencyProtected: boolean;
      Visible: boolean;
      MaskX: number;
      MaskY: number;
      MaskWidth: number;
      MaskHeight: number;
      MaskDefaultColor: number;
      Folder: boolean;
      FolderOpen: boolean;
   }
   interface Root extends LayerBase {
      CanvasWidth: number;
      CanvasHeight: number;

      Hash: string;
      PFV: string;
      Readme: string;
   }
   interface PSD {
      parse: (
      src: ArrayBuffer,
      progress: (progress: number, layerName: string) => void,
      complete: (psd: Root, canvasMap: {[x: string]: any}) => void,
      failed: (error: any) => void
      ) => void;
      parseWorker: (
      src: ArrayBuffer,
      progress: (progress: number, layerName: string) => void,
      complete: (psd: Root, canvasMap: {[x: string]: any}) => void,
      failed: (error: any) => void
      ) => void;
   }
}
declare var PSD: psd.PSD;
