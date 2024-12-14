// gameboy.ts

import { Cartridge } from "./cartridge/cartridge";
import { Cpu } from "./cpu/cpu";
import { InterruptManager } from "./cpu/interrupt-manager";
import { IMmu, Mmu } from "./memory/mmu";
import { IDisplay, MockDisplay } from "./ppu/display";
import { IPpu, Ppu } from "./ppu/ppu";
import { ITimer, Timer } from "./timer/timer";

export class GameBoy {
    private static readonly GB_CLOCK_SPEED = 4_194_304; // Hz
    private static readonly CYCLES_PER_SECOND = GameBoy.GB_CLOCK_SPEED;
    private static readonly CYCLES_PER_MS = GameBoy.CYCLES_PER_SECOND / 1000;

    readonly cpu: Cpu;
    readonly mmu: IMmu;
    readonly ppu: IPpu;
    readonly timer: ITimer;
    readonly interruptManager: InterruptManager;
    private readonly display: IDisplay;
    
    // Timing state
    private running: boolean = false;
    private lastTimestamp: number = 0;
    private cyclesPending: number = 0;

    constructor(display: IDisplay = new MockDisplay()) {
        this.display = display;
        this.interruptManager = new InterruptManager();
        this.timer = new Timer(this.interruptManager);
        this.ppu = new Ppu(this.interruptManager, display);
        this.mmu = new Mmu(this.interruptManager, this.timer, this.ppu);
        this.cpu = new Cpu(this.interruptManager, this.timer, this.ppu, this.mmu);
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

        this.ppu.reset();
        this.interruptManager.reset();
        this.cpu.reset();
        this.timer.reset();
        this.mmu.reset();
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
    
        requestAnimationFrame(() => this.emulationLoop());
    }
}
