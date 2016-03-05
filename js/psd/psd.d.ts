declare module psd {
   interface LayerBase {
      X: number;
      Y: number;
      Width: number;
      Height: number;
      Children: Layer[];
   }
   interface Layer extends LayerBase {
      Name: string;
      BlendMode: string;
      Opacity: number; // 0-255
      Clipping: boolean;
      BlendClippedElements: boolean;
      TransparencyProtected: boolean;
      Visible: boolean;
      Canvas: HTMLCanvasElement;
      MaskX: number;
      MaskY: number;
      MaskCanvas: HTMLCanvasElement;
      MaskDefaultColor: boolean;
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
          progress: (phase: string, progress: number, layer: Layer) => void,
          complete: (psd: Root) => void,
          failed: (error: any) => void
          ) => void;
   }
}
declare var PSD: psd.PSD;
