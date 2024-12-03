import { CartridgeHeader } from "./cartridge-header";
import Mapper from "./mappers/mapper";

export interface ICartridge {
    readRom(address: number): number;
    writeRom(address: number, value: number): void;
    readRam(address: number): number;
    writeRam(address: number, value: number): void;
    reset(): void;
}

export class EmptyCartridge implements ICartridge {
    private static instance: EmptyCartridge;

    private constructor() {}

    static getInstance(): EmptyCartridge {
        if (!EmptyCartridge.instance) {
            EmptyCartridge.instance = new EmptyCartridge();
        }
        return EmptyCartridge.instance;
    }

    readRom(address: number): number {
        return 0xFF;
    }
    writeRom(address: number, value: number): void {
        // Do nothing
    }
    readRam(address: number): number {
        return 0xFF;
    }
    writeRam(address: number, value: number): void {
        // Do nothing
    }
    reset(): void {
        // Do nothing
    }
}

export class Cartridge implements ICartridge {
    readonly header: CartridgeHeader;
    readonly mapper: Mapper;
    readonly rom: Uint8Array;

    constructor(rom: Uint8Array) {
        this.rom = rom;
        this.header = new CartridgeHeader(rom);
        this.mapper = Mapper.create(this.header, rom);
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
        this.mapper.reset();
    }
}