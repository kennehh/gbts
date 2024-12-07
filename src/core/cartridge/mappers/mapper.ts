import { CartridgeHeader } from "../cartridge-header";
import { Memory } from "../../memory/memory";

export abstract class Mapper {
    protected readonly cartHeader: CartridgeHeader;
    protected readonly rom: Memory;
    protected readonly ram: Memory;

    constructor(cartHeader: CartridgeHeader, rom: Uint8Array, ram: Uint8Array | null) {
        this.rom = new Memory(rom);
        this.ram = new Memory(ram ?? cartHeader.ram.size);
        this.cartHeader = cartHeader;
    }

    abstract readRom(address: number): number;
    abstract writeRom(address: number, value: number): void
    abstract readRam(address: number): number;
    abstract writeRam(address: number, value: number): void;
}

