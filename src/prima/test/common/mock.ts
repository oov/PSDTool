export default class Mock {
    public readonly captions = ['wear', 'eyebrows', 'eyes', 'mouths'];
    public readonly parts = [
        ['blue wear', 'green wear'],
        ['good', 'angry', 'normal'],
        ['sad', 'sleepy', 'good'],
        ['hungry', 'omega', 'good'],
    ];
    render(patternParts: number[]): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            if (patternParts.length !== this.parts.length) {
                reject(new Error(`unexcepted parts length: ${length}`));
                return;
            }
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`could not load image: ${img.src}`));
            img.src = `base/testdata/tester_${patternParts[0] + 1}_${patternParts[1] + 1}_${patternParts[2] + 1}_${patternParts[3] + 1}.png`;
        });
    }
}