import { SaveManager } from "../save";
import { EmptyCartridge } from "./empty-cartridge";
import { CartridgeHeader } from "./header/cartridge-header";
import createMapper from "./mappers";
import { Mapper } from "./mappers/mapper";
import type { ICartridge } from "./types";

export class Cartridge implements ICartridge {
    private constructor(
        readonly header: CartridgeHeader,
        readonly mapper: Mapper,
        private readonly saveManager: SaveManager
    ) {}

    static async create(rom: Uint8Array, saveManager: SaveManager): Promise<Cartridge> {
        const header = await CartridgeHeader.fromRom(rom);
        const ram = await saveManager.loadRam(header);
        const mapper = createMapper(header, rom, ram);
        return new Cartridge(header, mapper, saveManager);
    }

    static get emptyCartridge() {
        return EmptyCartridge.getInstance();
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