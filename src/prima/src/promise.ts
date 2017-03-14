interface EventListener {
    [eventName: string]: (data: any) => void;
}

type Notify = [number, string, any];
function isNotify(data: any): data is Notify {
    return data && data.length === 3 && typeof data[0] === 'number' && typeof data[1] === 'string';
}

// PromiseWorker is a Promise API based Worker.
// If you need, you can emit an event that like a progress by Worker.postMessage([taskId, 'myevent', {yourdata: 123}]).
// taskId will be passed such as [taskId, {yourdata: 123}] at the onmessage event.
export class PromiseWorker {
    private worker: Worker;
    private callbacks: ([(data: any) => void, (e: ErrorEvent) => void, number])[] = [];

    private taskIdCounter = 0;
    private tasks = new Map<number, EventListener>();

    constructor(url: string) {
        this.worker = new Worker(url);
        this.worker.onmessage = e => {
            if (e.data && isNotify(e.data)) {
                const [taskId, eventName, data] = e.data;
                const el = this.tasks.get(taskId);
                if (el) {
                    const f = el[eventName];
                    if (f) {
                        f(data);
                    }
                }
                return;
            }

            const callback = this.callbacks.shift();
            if (callback) {
                callback[0](e.data);
                if (!isNaN(callback[2])) {
                    this.tasks.delete(callback[2]);
                }
            }
        };
        this.worker.onerror = e => {
            const callback = this.callbacks.shift();
            if (callback) {
                callback[1](e);
                if (!isNaN(callback[2])) {
                    this.tasks.delete(callback[2]);
                }
            }
        };
    }

    postMessage(message: any, ports?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.callbacks.push([resolve, reject, NaN]);
            this.worker.postMessage([NaN, message], ports);
        });
    }

    postMessageWithEvent(message: any, events: EventListener, ports?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const taskId = ++this.taskIdCounter;
            this.callbacks.push([resolve, reject, taskId]);
            this.tasks.set(taskId, events);
            this.worker.postMessage([taskId, message], ports);
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

    postMessage(message: any, ports?: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
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