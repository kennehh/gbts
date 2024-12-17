import { WorkerMessage } from '../common/types';
import Worker from '../worker/emulator-worker?worker'

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
        this.postMessage({ type: 'INIT', payload: { canvas: offscreen } }, [offscreen]);
    }

    loadRom(rom: Uint8Array) {
        this.postMessage({ type: 'LOAD_ROM', payload: { rom } }, [rom.buffer]);
    }

    run() {
        this.postMessage({ type: 'RUN' });
    }

    stop() {
        this.postMessage({ type: 'STOP' });
    }

    private setupInputEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.worker.postMessage({ type: 'keydown', key: e.key });
        });

        window.addEventListener('keyup', (e) => {
            this.worker.postMessage({ type: 'keyup', key: e.key });
        });
    }

    private postMessage(message: WorkerMessage, transfer: Transferable[] = []) {
        this.worker.postMessage(message, transfer);
    }
}