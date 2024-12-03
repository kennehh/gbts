import { InterruptManager } from "./interrupt-manager";
import { Ppu } from "./ppu";
import { Timer } from "./timer";

export interface IMmu {
    read(address: number): number;
    write(address: number, value: number): void;
    reset(): void;
    loadBootRom(rom: Uint8Array): void;
    loadCartridge(rom: Uint8Array): void;
}

export class Mmu implements IMmu {
    constructor(
        readonly interruptManager: InterruptManager,
        readonly timer: Timer,
        readonly ppu: Ppu,
    ) {

    }

    loadBootRom(rom: Uint8Array): void {
        throw new Error("Method not implemented.");
    }
    loadCartridge(rom: Uint8Array): void {
        throw new Error("Method not implemented.");
    }

    reset() {

    }

    read(address: number): number {
        return 0;
    }

    write(address: number, value: number) {
    }
}
