// emulator.worker.ts
/// <reference lib="webworker" />

import { WorkerMessageType } from '../common/enums';
import { GameBoy } from '../core/gameboy';
import { WorkerDisplay } from './worker-display';

let display: WorkerDisplay;
let gameboy: GameBoy;

// Handle worker messages
self.onmessage = (e: MessageEvent) => {
    switch (e.data.type) {
        case WorkerMessageType.Init:
            display = new WorkerDisplay(e.data.canvas);
            gameboy = new GameBoy(display);
            break;
        case WorkerMessageType.Run:
            gameboy.run();
            break;
        case WorkerMessageType.Stop:
            gameboy.stop();
            break;
        case WorkerMessageType.LoadRom:
            gameboy.loadRom(e.data.rom);
            break;
    }
};

export {};