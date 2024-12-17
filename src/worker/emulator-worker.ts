// emulator.worker.ts
/// <reference lib="webworker" />

import { WorkerMessage } from '../common/types';
import { GameBoy } from '../core/gameboy';
import { IDisplay } from '../core/ppu/display';
import { CanvasDisplay } from './canvas-display';
import { WebGLDisplay } from './webgl-display';

let display: IDisplay;
let gameboy: GameBoy;

// Handle worker messages
self.onmessage = (e: MessageEvent) => {
    const message = e.data as WorkerMessage;
    switch (message?.type) {
        case 'INIT':
            try {
                display = new WebGLDisplay(message.payload.canvas);
            } catch {
                console.warn('WebGL not supported, falling back to Canvas2D');
                display = new CanvasDisplay(message.payload.canvas);
            }
            gameboy = new GameBoy(display);
            break;
        case 'RUN':
            gameboy.run();
            break;
        case 'STOP':
            gameboy.stop();
            break;
        case 'LOAD_ROM':
            gameboy.loadRom(message.payload.rom);
            break;
    }
};

export {};