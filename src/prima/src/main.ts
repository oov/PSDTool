import * as pattern from './pattern';
import * as decomposer from '../src/decomposer';
import * as primar from '../src/primar';

export function generate(
    tileSize: number,
    caption: pattern.Caption,
    patternSet: pattern.Set,
    render: (patternParts: number[]) => Promise<HTMLImageElement | HTMLCanvasElement>,
    renderSolo: (patternParts: number[]) => Promise<HTMLImageElement | HTMLCanvasElement>,
): Promise<Blob> {
    return decomposer.decompose(
        tileSize,
        patternSet,
        pattern => render(pattern),
        pattern => renderSolo(pattern),
    ).then(image => primar.generate(image, patternSet));
}
