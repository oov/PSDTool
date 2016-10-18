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
        Name: string;

        Folder: boolean;
        FolderOpen: boolean;

        Visible: boolean;
        BlendMode: string;
        Opacity: number; // 0-255
        Clipping: boolean;

        BlendClippedElements: boolean;

        // X: number;
        // Y: number;
        // Width: number;
        // Height: number;
        Canvas: HTMLCanvasElement;

        MaskX: number;
        MaskY: number;
        MaskWidth: number;
        MaskHeight: number;
        MaskDefaultColor: number;
        Mask: HTMLCanvasElement;
    }
    interface Root extends LayerBase {
        CanvasWidth: number;
        CanvasHeight: number;

        Hash: string;
        PFV: string;
        PFVModDate: number;
        Readme: string;
    }
    interface PSD {
        parse: (
            src: ArrayBuffer | Blob,
            progress: (progress: number) => void,
            complete: (psd: Root) => void,
            failed: (error: any) => void
        ) => void;
        parseWorker: (
            src: ArrayBuffer | Blob,
            progress: (progress: number) => void,
            complete: (psd: Root) => void,
            failed: (error: any) => void
        ) => void;
    }
}
declare var PSD: psd.PSD;
