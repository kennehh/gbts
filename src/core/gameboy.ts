// gameboy.ts

import { Cartridge } from "./cartridge/cartridge";
import { Cpu } from "./cpu/cpu";
import { InterruptManager } from "./cpu/interrupt-manager";
import { JoypadController } from "./joypad/joypad-controller";
import { IJoypadHandler, MockJoypadHandler } from "./joypad/joypad-handler";
import { SerialController } from "./serial/serial-controller";
import { Mmu } from "./memory/mmu";
import { IDisplay, MockDisplay } from "./ppu/rendering/display";
import { Ppu } from "./ppu/ppu";
import { Timer } from "./timer/timer";
import { Apu } from "./apu/apu";
import { ISaveStore, MockSaveStore } from "./save/save-store";
import { SaveManager } from "./save/save-manager";
import { IAudioOutput, MockAudioOutput } from "./apu/audio-output";

const GB_CLOCK_SPEED = 4_194_304; // Hz
const CYCLES_PER_MS = GB_CLOCK_SPEED / 1000;
const CYCLES_PER_MS_TURBO = CYCLES_PER_MS * 20;
const CYCLES_PER_FRAME = GB_CLOCK_SPEED / 59.73;
const MAX_CYCLES_TO_CATCH_UP = CYCLES_PER_FRAME * 2; 
const MAX_CYCLES_TO_CATCH_UP_TURBO = CYCLES_PER_FRAME * 5;

export class GameBoy {
    turbo = false;

    readonly cpu: Cpu;
    readonly mmu: Mmu;
    readonly ppu: Ppu;
    readonly apu: Apu;
    readonly timer: Timer;
    readonly joypadController: JoypadController;
    readonly serialController: SerialController;
    readonly interruptManager: InterruptManager;
    readonly display: IDisplay;
    private readonly saveManager: SaveManager;
    
    // Timing state
    private running = false;
    private lastTimestamp = 0;
    private cyclesPending = 0;

    constructor(
        display: IDisplay = new MockDisplay(),
        joypadHandler: IJoypadHandler = new MockJoypadHandler(),
        saveStore: ISaveStore = new MockSaveStore(),
        audioOutput: IAudioOutput = new MockAudioOutput()
    ) {
        this.display = display;
        this.serialController = new SerialController();
        this.interruptManager = new InterruptManager();
        this.timer = new Timer(this.interruptManager);
        this.joypadController = new JoypadController(joypadHandler, this.interruptManager);
        this.ppu = new Ppu(this.interruptManager, display, this.joypadController);
        this.apu = new Apu(audioOutput);
        this.mmu = new Mmu(this.interruptManager, this.timer, this.ppu, this.apu, this.joypadController, this.serialController);
        this.cpu = new Cpu(this.interruptManager, this.mmu);
        this.saveManager = new SaveManager(saveStore);
        this.reset();
    }

    stepInstruction(): number {
        return this.cpu.step();
    }

    run() {
        if (this.running) return;
        
        this.running = true;
        this.turbo = false;
        this.lastTimestamp = performance.now();
        this.cyclesPending = 0;

        this.emulationLoop();
    }

    stop() {
        this.running = false;
    }

    async loadRom(rom: Uint8Array) {
        const cart = await Cartridge.create(rom, this.saveManager)
        this.reset();
        this.mmu.loadCartridge(cart);
    }

    reset() {
        this.stop();
        this.lastTimestamp = 0;
        this.cyclesPending = 0;

        this.mmu.reset();
        this.ppu.reset();
        this.interruptManager.reset();
        this.cpu.reset();
        this.timer.reset(this.mmu.bootRomLoaded);
        this.display.clear();
    }

    private emulationLoop() {
        if (!this.running) {
            return;
        }

        const cyclesPerMs = this.turbo ? CYCLES_PER_MS_TURBO : CYCLES_PER_MS;
        const maxCycles = this.turbo ? MAX_CYCLES_TO_CATCH_UP_TURBO : MAX_CYCLES_TO_CATCH_UP;

        const now = performance.now();
        const elapsedMs = now - this.lastTimestamp;
        this.lastTimestamp = now;

        this.cyclesPending += elapsedMs * cyclesPerMs;
        this.cyclesPending = Math.min(this.cyclesPending, maxCycles);
    
        while (this.cyclesPending >= 4) {
            this.cyclesPending -= this.stepInstruction();
        }

        requestAnimationFrame(() => this.emulationLoop());
    }
}
