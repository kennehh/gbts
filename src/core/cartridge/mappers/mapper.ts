import { CartridgeHeader } from "../cartridge-header";
import { Memory } from "../../memory/memory";

export abstract class Mapper {
    protected readonly cartHeader: CartridgeHeader;
    readonly rom: Memory;
    readonly ram: Memory;

    constructor(cartHeader: CartridgeHeader, rom: Uint8Array, ram: Uint8Array | null) {
        this.rom = new Memory(rom);
        if (ram === null) {
            this.ram = new Memory(cartHeader.ram.size);
            this.ram.fill(0xff);
        } else {
            this.ram = new Memory(ram);
        }
        this.cartHeader = cartHeader;
    }

    abstract readRom(address: number): number;
    abstract writeRom(address: number, value: number): void
    abstract readRam(address: number): number;
    abstract writeRam(address: number, value: number): void;
}

