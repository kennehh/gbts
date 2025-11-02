import { JoypadButton } from '../common/enums';
import { FromWorkerMessage, ToWorkerMessage } from '../common/types';
import Worker from '../worker/emulator-worker?worker&inline';
import { unzipSync } from 'fflate';

const KeyMap = new Map<string, JoypadButton>([
    ['ArrowUp',     JoypadButton.Up],
    ['ArrowDown',   JoypadButton.Down],
    ['ArrowLeft',   JoypadButton.Left],
    ['ArrowRight',  JoypadButton.Right],
    ['x',           JoypadButton.A],
    ['z',           JoypadButton.B],
    ['Enter',       JoypadButton.Start],
    ['Backspace',   JoypadButton.Select],
]);

export class Emulator {
    private worker = new Worker();
    private audioContext?: AudioContext;

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

        this.setupInputEventListeners();
        this.setupWorkerMessageListeners();
    }

    createAudioContext() {
        if (this.audioContext) {
            return;
        }

        this.audioContext = new AudioContext({
            latencyHint: 'interactive',
            sampleRate: 44100
        });
    }

    async loadRom(romFile: File) {
        const buffer = await romFile.arrayBuffer();
        let data = new Uint8Array(buffer);

        if (romFile.name.endsWith('.zip')) {
            const unzipped = unzipSync(data, {
                filter: (file) => file.name.endsWith('.gb')// || file.name.endsWith('.gbc'),
            })

            data = Object.entries(unzipped)[0]?.[1].slice(0);
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
                e.preventDefault();
            }
            if (e.key === ' ') {
                this.postMessage({ type: 'TURBO', payload: { turbo: true } });
                e.preventDefault();
            }
            
        });

        window.addEventListener('keyup', (e) => {
            if (KeyMap.has(e.key)) {
                const button = KeyMap.get(e.key)!;
                this.postMessage({ type: 'JOYPAD_UP', payload: { button } });
                e.preventDefault();
            }
            if (e.key === ' ') {
                this.postMessage({ type: 'TURBO', payload: { turbo: false } });
                e.preventDefault();
            }
        });
    }

    private setupWorkerMessageListeners() {
        this.worker.onmessage = (e: MessageEvent<FromWorkerMessage>) => {
            const message = e.data;
            switch (message?.type) {
                case 'AUDIO_BUFFER':
                    if (message.payload.left.every(v => v === 0) && message.payload.right.every(v => v === 0)) {
                        console.log('Audio buffer received but all zeros');
                        return;
                    }
                    const buffer = this.createAudioBuffer(message.payload.left, message.payload.right);
                    if (buffer) {
                        this.playAudioBuffer(buffer);
                    }
                    break;
            }
        };
    }

    private createAudioBuffer(left: Float32Array<ArrayBuffer>, right: Float32Array<ArrayBuffer>) {
        if (!this.audioContext) {
            return null;
        }

        const buffer = this.audioContext.createBuffer(2, left.length, this.audioContext.sampleRate);
        buffer.copyToChannel(left, 0);
        buffer.copyToChannel(right, 1);
        return buffer;
    }

    private playAudioBuffer(buffer: AudioBuffer) {
        if (!this.audioContext) {
            return;
        }
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start();
    }

    private postMessage(message: ToWorkerMessage, transfer: Transferable[] = []) {
        this.worker.postMessage(message, transfer);
    }
}