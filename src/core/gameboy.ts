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

export class GameBoy {
    private static readonly GB_CLOCK_SPEED = 4_194_304; // Hz
    private static readonly CYCLES_PER_SECOND = GameBoy.GB_CLOCK_SPEED;
    private static readonly CYCLES_PER_MS = GameBoy.CYCLES_PER_SECOND / 1000;

    readonly cpu: Cpu;
    readonly mmu: Mmu;
    readonly ppu: Ppu;
    readonly timer: Timer;
    readonly joypadController: JoypadController;
    readonly serialController: SerialController;
    readonly interruptManager: InterruptManager;
    readonly display: IDisplay;
    
    // Timing state
    private running: boolean = false;
    private lastTimestamp: number = 0;
    private cyclesPending: number = 0;

    constructor(display: IDisplay = new MockDisplay(), joypadHandler: IJoypadHandler = new MockJoypadHandler()) {
        this.display = display;
        this.serialController = new SerialController();
        this.interruptManager = new InterruptManager();
        this.timer = new Timer(this.interruptManager);
        this.joypadController = new JoypadController(joypadHandler, this.interruptManager);
        this.ppu = new Ppu(this.interruptManager, display);
        this.mmu = new Mmu(this.interruptManager, this.timer, this.ppu, this.joypadController, this.serialController);
        this.cpu = new Cpu(this.interruptManager, this.mmu);
        this.reset();
    }

    stepInstruction(): number {
        return this.cpu.step();
    }

    run() {
        if (this.running) return;
        
        this.running = true;
        this.lastTimestamp = performance.now();
        this.cyclesPending = 0;

        this.emulationLoop();
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

    private emulationLoop() {
        if (!this.running) {
            return;
        }
    
        const now = performance.now();
        const elapsedMs = now - this.lastTimestamp;
        this.lastTimestamp = now;
        this.cyclesPending += elapsedMs * GameBoy.CYCLES_PER_MS;
    
        while (this.cyclesPending >= 4) {
            this.cyclesPending -= this.stepInstruction();
        }

        setTimeout(() => this.emulationLoop(), 0);
    }
}
