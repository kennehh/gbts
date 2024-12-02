export interface Memory {
    read(address: number): number;
    write(address: number, value: number): void;
}

export interface Mmu {
    read(address: number): number;
    write(address: number, value: number): void;
    reset(): void;
    loadBootRom(rom: Uint8Array): void;
    loadCartridge(rom: Uint8Array): void;
}

export class GameBoyMmu implements Mmu {
    private buffer: ArrayBuffer;
    private view: DataView;

    private static readonly MEMORY_SIZE = 0x10000;

    constructor() {
        this.buffer = new ArrayBuffer(GameBoyMmu.MEMORY_SIZE);
        this.view = new DataView(this.buffer);
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
