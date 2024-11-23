export interface Memory {
    read(address: number): number;
    write(address: number, value: number): void;
}

export default class Mmu implements Memory {
    private buffer: ArrayBuffer;
    private view: DataView;

    private static readonly MEMORY_SIZE = 0x10000;

    constructor() {
        this.buffer = new ArrayBuffer(Mmu.MEMORY_SIZE);
        this.view = new DataView(this.buffer);
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