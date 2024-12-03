import { InterruptManager } from "./interrupt-manager";

export interface IPpu {
    tick(): void;
}

export class Ppu implements IPpu {
    constructor(private interruptManager: InterruptManager) {
    }
    
    tick() {
    }
}