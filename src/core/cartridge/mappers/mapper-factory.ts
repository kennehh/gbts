import { CartridgeHeader, CartridgeMapperType } from "../cartridge-header";
import { Mapper } from "./mapper";
import { Mbc1 } from "./mbc1";
import { Mbc2 } from "./mbc2";
import { Mbc5 } from "./mbc5";
import { NoMbc } from "./no-mbc";

export class MapperFactory {
    private constructor() {}

    static create(cartHeader: CartridgeHeader, rom: Uint8Array, ram: Uint8Array | null): Mapper {
        switch (cartHeader.type.mapper) {
            case CartridgeMapperType.NoMbc:
                return new NoMbc(cartHeader, rom, ram);
            case CartridgeMapperType.Mbc1:
                return new Mbc1(cartHeader, rom, ram);
            case CartridgeMapperType.Mbc2:
                ram ??= new Uint8Array(512); // MBC2 has a fixed 512 half-bytes of RAM
                return new Mbc2(cartHeader, rom, ram);
            case CartridgeMapperType.Mbc5:
                return new Mbc5(cartHeader, rom, ram);
            default: throw new Error(`Unsupported mapper type: ${CartridgeMapperType[cartHeader.type.mapper]}`);
        }
    }
}
