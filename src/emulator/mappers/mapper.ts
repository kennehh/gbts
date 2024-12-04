import { CartridgeHeader } from "../cartridge-header";

export abstract class Mapper {
    protected ram: Uint8Array;

    constructor(protected cartHeader: CartridgeHeader, protected rom: Uint8Array) {
        this.ram = new Uint8Array(cartHeader.ram.size);
    }

    abstract readRom(address: number): number;
    abstract writeRom(address: number, value: number): void
    abstract readRam(address: number): number;
    abstract writeRam(address: number, value: number): void;
}

