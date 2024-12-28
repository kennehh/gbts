// emulator.worker.ts
/// <reference lib="webworker" />

import { ToWorkerMessage } from '../common/types';
import { IAudioOutput, MockAudioOutput } from '../core/apu/audio-output';
import { GameBoy } from '../core/gameboy';
import { IDisplay } from '../core/ppu/rendering/display';
import { ISaveStore } from '../core/save/save-store';
import { AudioOutput } from './audio-output';
import { CanvasDisplay } from './canvas-display';
import { IndexedDBSaveStore } from './indexeddb-save-store';
import { JoypadHandler } from './joypad-handler';
import { WebGLDisplay } from './webgl-display';

let display: IDisplay;
let gameboy: GameBoy;
let joypadHandler: JoypadHandler;
let saveStore: ISaveStore;
let audioOutput: IAudioOutput

// Handle worker messages
self.onmessage = async (e: MessageEvent<ToWorkerMessage>) => {
    const message = e.data;
    switch (message?.type) {
        case 'INIT':
            try {
                display = new WebGLDisplay(message.payload.canvas);
            } catch {
                console.warn('WebGL not supported, falling back to Canvas2D');
                display = new CanvasDisplay(message.payload.canvas);
            }
            saveStore = await IndexedDBSaveStore.create();
            joypadHandler = new JoypadHandler();
            // audioOutput = new AudioOutput();
            audioOutput = new MockAudioOutput();
            gameboy = new GameBoy(display, joypadHandler, saveStore, audioOutput);
            break;
        case 'RUN':
            gameboy.run();
            break;
        case 'STOP':
            gameboy.stop();
            break;
        case 'LOAD_ROM':
            await gameboy.loadRom(message.payload.rom);
            gameboy.run();
            break;
        case 'JOYPAD_DOWN':
            joypadHandler.buttonDown(message.payload.button);
            break;
        case 'JOYPAD_UP':
            joypadHandler.buttonUp(message.payload.button);
            break;
        case 'TURBO':
            gameboy.turbo = message.payload.turbo;
            break;
    }
};

export {};