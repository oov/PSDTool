export default class Mock {
    public readonly captions = ['wear', 'eyebrows', 'eyes', 'mouths'];
    public readonly parts = [
        ['blue wear', 'green wear'],
        ['good', 'angry', 'normal'],
        ['sad', 'sleepy', 'good'],
        ['hungry', 'omega', 'good'],
    ];
    render(parts: number[]): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            if (parts.length !== this.parts.length) {
                reject(new Error(`unexcepted parts length: ${length}`));
                return;
            }
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`could not load image: ${img.src}`));
            img.src = `base/testdata/tester_${parts[0] + 1}_${parts[1] + 1}_${parts[2] + 1}_${parts[3] + 1}.png`;
        });
    }
    renderSolo(parts: number[]): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            if (parts.length !== this.parts.length) {
                reject(new Error(`unexcepted parts length: ${length}`));
                return;
            }
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`could not load image: ${img.src}`));
            img.src = `base/testdata/tester_solo_${parts[0] + 1}_${parts[1] + 1}_${parts[2] + 1}_${parts[3] + 1}.png`;
        });
    }
}