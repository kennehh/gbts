import { CartridgeHeader, CartridgeMapperType } from "../cartridge-header";
import { Mapper } from "./mapper";
import { Mbc1 } from "./mbc1";
import { NoMbc } from "./no-mbc";

export class MapperFactory {
    private constructor() {}

    static create(cartHeader: CartridgeHeader, rom: Uint8Array): Mapper {
        switch (cartHeader.type.mapper) {
            case CartridgeMapperType.NoMbc: return new NoMbc(cartHeader, rom);
            case CartridgeMapperType.Mbc1: return new Mbc1(cartHeader, rom);
            default: throw new Error(`Unsupported mapper type: ${CartridgeMapperType[cartHeader.type.mapper]}`);
        }
    }
}
