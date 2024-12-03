import { CartridgeHeader, CartridgeMapperType } from "../cartridge-header";
import { Mbc1 } from "./mbc1";
import { NoMbc } from "./no-mbc";

export interface IMapper {
    readRom(address: number): number;
    writeRom(address: number, value: number): void;
    readRam(address: number): number;
    writeRam(address: number, value: number): void;
}

export class Mapper {
    private constructor() {}

    static create(cartHeader: CartridgeHeader, rom: Uint8Array): IMapper {
        switch (cartHeader.type.mapper) {
            case CartridgeMapperType.NoMbc: return new NoMbc(rom);
            case CartridgeMapperType.Mbc1: return new Mbc1(rom, cartHeader.ram.size);
            default: throw new Error(`Unsupported mapper type: ${CartridgeMapperType[cartHeader.type.mapper]}`);
        }
    }
}