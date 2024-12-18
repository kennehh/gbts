// emulator.worker.ts
/// <reference lib="webworker" />

import { WorkerMessage } from '../common/types';
import { GameBoy } from '../core/gameboy';
import { IDisplay } from '../core/ppu/display';
import { CanvasDisplay } from './canvas-display';
import { JoypadHandler } from './joypad-handler';
import { WebGLDisplay } from './webgl-display';

let display: IDisplay;
let gameboy: GameBoy;
let joypadHandler: JoypadHandler;

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
            joypadHandler = new JoypadHandler();
            gameboy = new GameBoy(display, joypadHandler);
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
        case 'JOYPAD_DOWN':
            joypadHandler.buttonDown(message.payload.button);
            break;
        case 'JOYPAD_UP':
            joypadHandler.buttonUp(message.payload.button);
            break;
    }
};

export {};