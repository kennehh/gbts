import { CartridgeHeader } from "./cartridge-header";
import Mapper from "./mappers/mapper";

export class Cartridge {
    readonly header: CartridgeHeader;
    readonly mapper: Mapper;
    readonly rom: Uint8Array;

    constructor(rom: Uint8Array) {
        this.rom = rom;
        this.header = new CartridgeHeader(rom);
        this.mapper = Mapper.create(this.header, rom);
    }

    read(address: number) {
        return this.mapper.readRom(address);
    }
    write(address: number, value: number) {
        this.mapper.writeRom(address, value);
    }
    reset() {
        this.mapper.reset();
    }
}