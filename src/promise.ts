export class PromiseWorker {
    private worker: Worker;
    private callbacks: ([(e: MessageEvent) => void, (e: ErrorEvent) => void])[] = [];
    constructor(url: string) {
        this.worker = new Worker(url);
        this.worker.onmessage = e => {
            const callback = this.callbacks.shift();
            if (callback) {
                callback[0](e);
            }
        };
        this.worker.onerror = e => {
            const callback = this.callbacks.shift();
            if (callback) {
                callback[1](e);
            }
        };
    }

    postMessage(message: any, ports?: any): Promise<MessageEvent> {
        return new Promise((resolve, reject) => {
            this.callbacks.push([resolve, reject]);
            this.worker.postMessage(message, ports);
        });
    }

    get waits(): number { return this.callbacks.length; }
}

export class ThrottlePromiseWorker {
    private workers: PromiseWorker[] = [];
    constructor(url: string, numWorkers: number, private readonly queueMax: number) {
        for (let i = 0; i < numWorkers; ++i) {
            this.workers.push(new PromiseWorker(url));
        }
    }

    postMessage(message: any, ports?: any): Promise<MessageEvent> {
        return new Promise<MessageEvent>((resolve, reject) => {
            const find = () => {
                let idx = -1, min = this.queueMax;
                for (let i = 0; i < this.workers.length; ++i) {
                    if (this.workers[i].waits < min) {
                        idx = i;
                        min = this.workers[i].waits;
                    }
                }
                if (min < this.queueMax) {
                    this.workers[idx].postMessage(message, ports).then(resolve, reject);
                    return;
                }
                setTimeout(find, 40);
            };
            find();
        });
    }

    get waits(): number { return this.workers.map(w => w.waits).reduce((a, b) => a + b); }
}