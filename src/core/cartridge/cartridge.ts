import { SaveManager } from "../save/save-manager";
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
    private constructor(
        readonly header: CartridgeHeader,
        readonly mapper: Mapper,
        private readonly saveManager: SaveManager
    ) {}

    static async create(rom: Uint8Array, saveManager: SaveManager): Promise<Cartridge> {
        const header = new CartridgeHeader(rom);
        const ram = await saveManager.loadRam(header);
        const mapper = MapperFactory.create(header, rom, ram);
        return new Cartridge(header, mapper, saveManager);
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
        if (this.header.type.hasBattery) {
            this.saveManager.saveRam(this.header, this.mapper.ram.bytes);
        }
    }

    reset() {
        //this.mapper.reset();
    }
}