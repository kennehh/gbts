import { CartridgeHeader } from "./cartridge-header";
import { Mapper } from "./mappers/mapper";
import { MapperFactory } from "./mappers/mapper-factory";

export interface ICartridge {
    readRom(address: number): number;
    writeRom(address: number, value: number): void;
    readRam(address: number): number;
    writeRam(address: number, value: number): void;
    reset(): void;
}

export class Cartridge implements ICartridge {
    readonly header: CartridgeHeader;
    readonly mapper: Mapper;

    constructor(rom: Uint8Array, ram: Uint8Array | null = null) {
        this.header = new CartridgeHeader(rom);
        this.mapper = MapperFactory.create(this.header, rom, ram);
    }

    readRom(address: number) {
        return this.mapper.readRom(address);
    }
    writeRom(address: number, value: number) {
        this.mapper.writeRom(address, value);
    }
    readRam(address: number) {
        return this.mapper.readRam(address);
    }
    writeRam(address: number, value: number) {
        this.mapper.writeRam(address, value);
    }

    reset() {
        //this.mapper.reset();
    }
}