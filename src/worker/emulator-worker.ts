// emulator.worker.ts
/// <reference lib="webworker" />

import { GameBoy } from '../core/gameboy';
import { WorkerDisplay } from './worker-display';

let display: WorkerDisplay;
let gameboy: GameBoy;

// Handle worker messages
self.onmessage = (e: MessageEvent) => {
    switch (e.data.type) {
        case 'init':
            display = new WorkerDisplay(e.data.canvas);
            gameboy = new GameBoy(display);
            break;
        case 'run':
            gameboy.run();
            break;
        case 'stop':
            gameboy.stop();
            break;
        case 'loadRom':
            gameboy.loadRom(e.data.rom);
            break;
    }
};

export {};