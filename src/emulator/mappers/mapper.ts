import { CartridgeHeader, CartridgeMapperType } from "../cartridge-header";
import { NoMbc } from "./no-mbc";

export default abstract class Mapper {
    protected rom: Uint8Array;
    protected ram: Uint8Array | null;

    constructor(rom: Uint8Array, protected ramSize: number) {        
        this.rom = rom;
        this.ram = ramSize > 0 ? new Uint8Array(ramSize) : null;
    }

    abstract readRom(address: number): number;
    abstract writeRom(address: number, value: number): void;
    abstract readRam(address: number): number;
    abstract writeRam(address: number, value: number): void;

    static create(cartHeader: CartridgeHeader, rom: Uint8Array): Mapper {
        switch (cartHeader.type.mapper) {
            case CartridgeMapperType.NoMbc:
                return new NoMbc(rom, cartHeader.ram.size);
            default:
                throw new Error(`Unsupported mapper type: ${cartHeader.type.mapper}`);
        }
    }

    reset(): void {
        // Default reset behavior
        this.ram?.fill(0);
    }
}
