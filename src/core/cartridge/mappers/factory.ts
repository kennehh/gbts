import { CartridgeMapperType, type CartridgeHeader } from "../header";
import type { IMapper } from "./types";

export async function createMapper(cartHeader: CartridgeHeader, rom: Uint8Array, ram: Uint8Array | null): Promise<IMapper> {
    switch (cartHeader.type.mapper) {
        case CartridgeMapperType.NoMbc: {
            const { NoMbc } = await import("./no-mbc");
            return new NoMbc(cartHeader, rom, ram);
        }
        case CartridgeMapperType.Mbc1: {
            const { Mbc1 } = await import("./mbc1");
            return new Mbc1(cartHeader, rom, ram);
        }
        case CartridgeMapperType.Mbc2: {
            ram ??= new Uint8Array(512); // MBC2 has a fixed 512 half-bytes of RAM
            const { Mbc2 } = await import("./mbc2");
            return new Mbc2(cartHeader, rom, ram);
        }
        case CartridgeMapperType.Mbc3: {
            const { Mbc3 } = await import("./mbc3");
            return new Mbc3(cartHeader, rom, ram);
        }
        case CartridgeMapperType.Mbc5: {
            const { Mbc5 } = await import("./mbc5");
            return new Mbc5(cartHeader, rom, ram);
        }
        default: throw new Error(`Unsupported mapper type`);
    }
}
