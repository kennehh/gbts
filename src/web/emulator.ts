// emulator.ts

export class Emulator {
    private worker: Worker;

    constructor(parent: HTMLElement, scale: number = 4) {
        if (!parent) throw new Error('Parent element not found');

        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 144;
        canvas.style.width = `${160 * scale}px`;
        canvas.style.height = `${144 * scale}px`;
        canvas.style.imageRendering = 'pixelated';
        parent.appendChild(canvas);

        // Create worker
        this.worker = new Worker(new URL('../worker/emulator-worker.ts', import.meta.url), { type: 'module' });

        this.worker.onmessage = (e) => {
            if (e.data.type === 'performance') {
                console.log(e.data);
            }
        };

        // Initialize the worker
        const offscreen = canvas.transferControlToOffscreen();
        this.worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);
    }

    loadRom(rom: Uint8Array) {
        this.worker.postMessage({ 
            type: 'loadRom',
            rom: rom 
        });
    }

    run() {
        this.worker.postMessage({ type: 'run' });
    }

    stop() {
        this.worker.postMessage({ type: 'stop' });
    }

    step() {
        this.worker.postMessage({ type: 'step' });
    }
}