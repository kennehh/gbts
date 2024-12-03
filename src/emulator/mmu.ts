import Ppu from "./ppu";

export interface Mmu {
    read(address: number): number;
    write(address: number, value: number): void;
    reset(): void;
    loadBootRom(rom: Uint8Array): void;
    loadCartridge(rom: Uint8Array): void;
}

export class GameBoyMmu implements Mmu {
    private ppu: Ppu;
    private timer: Ppu;

    constructor() {

    }

    loadBootRom(rom: Uint8Array): void {
        throw new Error("Method not implemented.");
    }
    loadCartridge(rom: Uint8Array): void {
        throw new Error("Method not implemented.");
    }

    reset() {
        new Uint8Array(this.buffer).fill(0);
    }

    read(address: number) {
        return this.view.getUint8(address);
    }

    write(address: number, value: number) {
        this.view.setUint8(address, value);
    }
}
