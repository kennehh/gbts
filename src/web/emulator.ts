import { JoypadButton } from '../common/enums';
import { WorkerMessage } from '../common/types';
import Worker from '../worker/emulator-worker?worker'
import { unzipSync } from 'fflate';

const KeyMap = new Map<string, JoypadButton>([
    ['ArrowUp',     JoypadButton.Up],
    ['ArrowDown',   JoypadButton.Down],
    ['ArrowLeft',   JoypadButton.Left],
    ['ArrowRight',  JoypadButton.Right],
    ['x',           JoypadButton.A],
    ['z',           JoypadButton.B],
    ['Enter',       JoypadButton.Start],
    ['Shift',       JoypadButton.Select],
]);


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

        this.setupInputEventListeners();

        const offscreen = canvas.transferControlToOffscreen();
        this.postMessage({ type: 'INIT', payload: { canvas: offscreen } }, [offscreen]);
    }

    async loadRom(romFile: File) {
        const buffer = await romFile.arrayBuffer();
        let data = new Uint8Array(buffer);

        if (romFile.name.endsWith('.zip')) {
            const unzipped = unzipSync(data, {
                filter: (file) => file.name.endsWith('.gb')// || file.name.endsWith('.gbc'),
            })

            data = Object.entries(unzipped)[0]?.[1];
            if (!data) {
                throw new Error('No ROM found in ZIP file');
            }
        }

        this.postMessage({ type: 'LOAD_ROM', payload: { rom: data } }, [data.buffer]);
    }

    run() {
        this.postMessage({ type: 'RUN' });
    }

    stop() {
        this.postMessage({ type: 'STOP' });
    }

    private setupInputEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (KeyMap.has(e.key)) {
                const button = KeyMap.get(e.key)!;
                this.postMessage({ type: 'JOYPAD_DOWN', payload: { button } });
            }
        });

        window.addEventListener('keyup', (e) => {
            if (KeyMap.has(e.key)) {
                const button = KeyMap.get(e.key)!;
                this.postMessage({ type: 'JOYPAD_UP', payload: { button } });
            }
        });
    }

    private postMessage(message: WorkerMessage, transfer: Transferable[] = []) {
        this.worker.postMessage(message, transfer);
    }
}