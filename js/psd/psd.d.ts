declare module psd {
   interface LayerBase {
      X: number;
      Y: number;
      Width: number;
      Height: number;
      Children: Layer[];
   }
   interface Layer extends LayerBase {
      //Buffer: HTMLCanvasElement;

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
      //Buffer: HTMLCanvasElement;

      CanvasWidth: number;
      CanvasHeight: number;

      Hash: string;
      PFV: string;
      Readme: string;
   }

}
declare var parsePSD: (
   src: ArrayBuffer,
   progress: (phase: string, progress: number, layer: psd.Layer) => void,
   complete: (psd: psd.Root) => void,
   failed: (error: any) => void
   ) => void;
