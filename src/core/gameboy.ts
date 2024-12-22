// gameboy.ts

import { Cartridge } from "./cartridge/cartridge";
import { Cpu } from "./cpu/cpu";
import { InterruptManager } from "./cpu/interrupt-manager";
import { JoypadController } from "./joypad/joypad-controller";
import { IJoypadHandler, MockJoypadHandler } from "./joypad/joypad-handler";
import { SerialController } from "./serial/serial-controller";
import { Mmu } from "./memory/mmu";
import { IDisplay, MockDisplay } from "./ppu/display";
import { Ppu } from "./ppu/ppu";
import { Timer } from "./timer/timer";
import { Apu } from "./apu/apu";

const GB_CLOCK_SPEED = 4_194_304; // Hz
const CYCLES_PER_SECOND = GB_CLOCK_SPEED;
const CYCLES_PER_MS = CYCLES_PER_SECOND / 1000;
const MAX_CYCLES_TO_CATCH_UP = CYCLES_PER_MS * 34;

export class GameBoy {
    readonly cpu: Cpu;
    readonly mmu: Mmu;
    readonly ppu: Ppu;
    readonly apu: Apu;
    readonly timer: Timer;
    readonly joypadController: JoypadController;
    readonly serialController: SerialController;
    readonly interruptManager: InterruptManager;
    readonly display: IDisplay;
    
    // Timing state
    private running: boolean = false;
    private throttled: boolean = true;
    private lastTimestamp: number = 0;
    private cyclesPending: number = 0;

    constructor(display: IDisplay = new MockDisplay(), joypadHandler: IJoypadHandler = new MockJoypadHandler()) {
        this.display = display;
        this.serialController = new SerialController();
        this.interruptManager = new InterruptManager();
        this.timer = new Timer(this.interruptManager);
        this.joypadController = new JoypadController(joypadHandler, this.interruptManager);
        this.ppu = new Ppu(this.interruptManager, display);
        this.apu = new Apu();
        this.mmu = new Mmu(this.interruptManager, this.timer, this.ppu, this.apu, this.joypadController, this.serialController);
        this.cpu = new Cpu(this.interruptManager, this.mmu);
        this.reset();
    }

    stepInstruction(): number {
        return this.cpu.step();
    }

    run() {
        if (this.running) return;
        
        this.running = true;
        this.throttled = true;
        this.lastTimestamp = performance.now();
        this.cyclesPending = 0;

        this.throttledEmulationLoop();
    }

    stop() {
        this.running = false;
    }

    loadRom(rom: Uint8Array) {
        this.reset();
        const cart = new Cartridge(rom);
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

    throttle() {
        this.throttled = true;
    }

    unthrottle() {
        this.throttled = false;
    }

    private throttledEmulationLoop() {
        const now = performance.now();
        const elapsedMs = now - this.lastTimestamp;
        this.lastTimestamp = now;
        this.cyclesPending += elapsedMs * CYCLES_PER_MS;
        this.cyclesPending = Math.min(this.cyclesPending, MAX_CYCLES_TO_CATCH_UP);
    
        while (this.cyclesPending >= 4) {
            this.cyclesPending -= this.stepInstruction();
        }

        setTimeout(() => this.emulationLoop(), 0);
    }

    private unthrottledEmulationLoop() {
        for (let i = 0; i < CYCLES_PER_MS * 10; i++) {
            this.stepInstruction();
        }

        setTimeout(() => this.emulationLoop(), 0);
    }

    private emulationLoop() {
        if (!this.running) {
            return;
        }
    
        if (this.throttled) {
            this.throttledEmulationLoop();
        } else {
            this.unthrottledEmulationLoop();
        }
    }
}
