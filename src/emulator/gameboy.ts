import { Cpu } from "./cpu";
import { InterruptManager } from "./interrupt-manager";
import { Mmu } from "./mmu";
import { Ppu } from "./ppu";
import { Timer } from "./timer";

export class GameBoy {
    readonly cpu: Cpu;
    readonly mmu: Mmu;
    readonly ppu: Ppu;
    readonly timer: Timer;
    readonly interruptManager: InterruptManager;

    constructor() {
        this.interruptManager = new InterruptManager();
        this.timer = new Timer(this.interruptManager);
        
        this.ppu = new Ppu(this.interruptManager);
        this.mmu = new Mmu(this.interruptManager, this.timer, this.ppu);
        this.cpu = new Cpu(this.interruptManager, this.timer, this.ppu, this.mmu);
    }
}