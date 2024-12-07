import { Cartridge } from "./cartridge/cartridge";
import { Cpu } from "./cpu/cpu";
import { InterruptManager } from "./cpu/interrupt-manager";
import { IMmu, Mmu } from "./memory/mmu";
import { IPpu, Ppu } from "./ppu/ppu";
import { ITimer, Timer } from "./timer/timer";

export class GameBoy {
    readonly cpu: Cpu;
    readonly mmu: IMmu;
    readonly ppu: IPpu;
    readonly timer: ITimer;
    readonly interruptManager: InterruptManager;

    constructor() {
        this.interruptManager = new InterruptManager();
        this.timer = new Timer(this.interruptManager);
        
        this.ppu = new Ppu(this.interruptManager);
        this.mmu = new Mmu(this.interruptManager, this.timer, this.ppu);
        this.cpu = new Cpu(this.interruptManager, this.timer, this.ppu, this.mmu);
    }

    step() {
        this.cpu.step();
    }

    loadRom(rom: Uint8Array) {
        const cart = new Cartridge(rom);
        this.mmu.loadCartridge(cart);
        this.cpu.state.reset(this.mmu.bootRomLoaded);
    }
}