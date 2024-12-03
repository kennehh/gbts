import { Cpu } from "./cpu";
import { InterruptManager } from "./interrupt-manager";
import { IMmu, Mmu } from "./mmu";
import { IPpu, Ppu } from "./ppu";
import { ITimer, Timer } from "./timer";

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
}