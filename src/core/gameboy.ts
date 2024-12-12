import { Cartridge } from "./cartridge/cartridge";
import { Cpu } from "./cpu/cpu";
import { InterruptManager } from "./cpu/interrupt-manager";
import { IMmu, Mmu } from "./memory/mmu";
import { IDisplay, MockDisplay as DummyDisplay } from "./ppu/display";
import { IPpu, Ppu } from "./ppu/ppu";
import { ITimer, Timer } from "./timer/timer";

export class GameBoy {
    readonly cpu: Cpu;
    readonly mmu: IMmu;
    readonly ppu: IPpu;
    readonly timer: ITimer;
    readonly interruptManager: InterruptManager;
    
    private static readonly CYCLES_PER_FRAME = 70224;
    private static readonly FRAME_RATE = 59.73;
    
    private cyclesThisFrame = 0;
    private lastFrameTime = 0;
    private running = false;
    
    constructor(display: IDisplay) {
        this.interruptManager = new InterruptManager();
        this.timer = new Timer(this.interruptManager);
        this.ppu = new Ppu(this.interruptManager, display ?? new DummyDisplay());
        this.mmu = new Mmu(this.interruptManager, this.timer, this.ppu);
        this.cpu = new Cpu(this.interruptManager, this.timer, this.ppu, this.mmu);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastFrameTime = performance.now();
        requestAnimationFrame(() => this.emulateFrame());
    }

    stop() {
        this.running = false;
    }

    step() {
        const cycles = this.cpu.step();
        this.cyclesThisFrame += cycles;
        
        if (this.cyclesThisFrame >= GameBoy.CYCLES_PER_FRAME) {
            this.cyclesThisFrame = 0;
        }
        
        return cycles;
    }

    private emulateFrame() {
        if (!this.running) return;

        const currentTime = performance.now();
        const elapsed = currentTime - this.lastFrameTime;
        const targetFrameTime = 1000 / GameBoy.FRAME_RATE;

        if (elapsed >= targetFrameTime) {
            // Execute CPU cycles for one frame
            this.cyclesThisFrame = 0;
            while (this.cyclesThisFrame < GameBoy.CYCLES_PER_FRAME) {
                this.step();
            }
            
            this.lastFrameTime = currentTime - (elapsed % targetFrameTime);
        }

        requestAnimationFrame(() => this.emulateFrame());
    }

    loadRom(rom: Uint8Array) {
        const cart = new Cartridge(rom);
        this.mmu.loadCartridge(cart);
        this.cpu.state.reset(this.mmu.bootRomLoaded);
        this.cyclesThisFrame = 0;
        this.lastFrameTime = performance.now();
    }
}
