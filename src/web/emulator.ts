import Worker from '../worker/emulator-worker?worker'
import { WorkerMessageType } from "../common/enums";

export class Emulator {
    private worker = new Worker();

    constructor(parent: HTMLElement, scale: number = 4) {
        if (!parent) throw new Error('Parent element not found');

        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 144;
        canvas.style.width = `${160 * scale}px`;
        canvas.style.height = `${144 * scale}px`;
        canvas.style.imageRendering = 'pixelated';
        parent.appendChild(canvas);

        const offscreen = canvas.transferControlToOffscreen();
        this.worker.postMessage({ type: WorkerMessageType.Init, canvas: offscreen }, [offscreen]);
    }

    loadRom(rom: Uint8Array) {
        this.worker.postMessage({ 
            type: WorkerMessageType.LoadRom,
            rom: rom 
        });
    }

    run() {
        this.worker.postMessage({ type: WorkerMessageType.Run });
    }

    stop() {
        this.worker.postMessage({ type: WorkerMessageType.Stop });
    }

    step() {
        this.worker.postMessage({ type: WorkerMessageType.Step });
    }

    private setupInputEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.worker.postMessage({ type: 'keydown', key: e.key });
        });

        window.addEventListener('keyup', (e) => {
            this.worker.postMessage({ type: 'keyup', key: e.key });
        });
    }
}