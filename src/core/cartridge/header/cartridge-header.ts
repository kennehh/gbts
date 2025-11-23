import { MemorySize } from "../../memory";
import {
    type CartridgeCgbFlagValue,
    type CartridgeType,
    type CartridgeMemoryConfig,
    type CartridgeDestinationCodeValue,
    type CartridgeChecksum,
    CartridgeMapperType,
    CartridgeCgbFlag,
    CartridgeDestinationCode,
    type CartridgeLicensee,
} from "./types";

export class CartridgeHeader {
    readonly title: string;
    readonly cgbFlag: CartridgeCgbFlagValue;
    readonly isSgb: boolean;
    readonly type: CartridgeType;
    readonly rom: CartridgeMemoryConfig;
    readonly ram: CartridgeMemoryConfig;
    readonly destinationCode: CartridgeDestinationCodeValue;
    readonly maskRomVersion: number;
    readonly headerChecksum: CartridgeChecksum;
    readonly globalChecksum: CartridgeChecksum;
    readonly romSizeDoesNotMatch: boolean;

    private _cartId = 0;
    get cartId(): number {
        return this._cartId;
    }

    private constructor(private readonly romBytes: Uint8Array) {
        this.title = this.parseTitle(romBytes);
        this.cgbFlag = this.parseCgbFlag(romBytes);
        this.isSgb = romBytes[0x146] === 0x03;
        this.type = this.parseCartridgeType(romBytes);
        this.destinationCode = this.parseDestinationCode(romBytes);
        this.rom = this.parseRom(romBytes);
        this.ram = this.parseRam(romBytes);
        this.maskRomVersion = romBytes[0x14C];
        this.headerChecksum = this.parseHeaderChecksum(romBytes);
        this.globalChecksum = this.parseGlobalChecksum(romBytes);
        this.romSizeDoesNotMatch = romBytes.length !== this.rom.size;
    }

    async getLicensee() {
        return await this.parseLicensee(this.romBytes);
    }

    static async fromRom(rom: Uint8Array): Promise<CartridgeHeader> {
        const header = new CartridgeHeader(rom);
        header._cartId = await CartridgeHeader.generateCartId(header);
        return header;
    }

    private static async generateCartId(header: CartridgeHeader): Promise<number> {
        const encoder = new TextEncoder();
        const title = header.title.trim().toUpperCase().padEnd(16, '\0');
        const data = new Uint8Array([
            ...encoder.encode(title),
            header.type.rawValue,
            header.rom.rawValue,
            header.ram.rawValue,
            header.maskRomVersion,
            header.destinationCode,
            header.cgbFlag,
        ]);

        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const view = new DataView(hashBuffer);

        // Get as much of the hash as we can that can fit in a javascript number (53 bits)
        const lower32 = view.getUint32(0);
        const upper21 = view.getUint32(4) & 0x1FFFFF;

        // Bitwise operations are done in 32 bit, so we need to use Number operations to get the full 53 bits
        return lower32 + (upper21 * 0x100000000); // 2^32
    }

    private parseTitle(rom: Uint8Array): string {
        let title = rom.slice(0x134, 0x144);
        const nullIndex = title.indexOf(0);
        if (nullIndex !== -1) {
            title = title.slice(0, nullIndex);
        }
        return String.fromCharCode(...title);
    }

    private parseCartridgeType(rom: Uint8Array): CartridgeType {
        const value = rom[0x147];
        switch (value) {
            case 0x00: return { rawValue: value, mapper: CartridgeMapperType.NoMbc,        hasRam: false, hasBattery: false, hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x01: return { rawValue: value, mapper: CartridgeMapperType.Mbc1,         hasRam: false, hasBattery: false, hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x02: return { rawValue: value, mapper: CartridgeMapperType.Mbc1,         hasRam: true,  hasBattery: false, hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x03: return { rawValue: value, mapper: CartridgeMapperType.Mbc1,         hasRam: true,  hasBattery: true,  hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x05: return { rawValue: value, mapper: CartridgeMapperType.Mbc2,         hasRam: false, hasBattery: false, hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x06: return { rawValue: value, mapper: CartridgeMapperType.Mbc2,         hasRam: false, hasBattery: true,  hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x08: return { rawValue: value, mapper: CartridgeMapperType.NoMbc,        hasRam: true,  hasBattery: false, hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x09: return { rawValue: value, mapper: CartridgeMapperType.NoMbc,        hasRam: true,  hasBattery: true,  hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x0B: return { rawValue: value, mapper: CartridgeMapperType.Mmm01,        hasRam: false, hasBattery: false, hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x0C: return { rawValue: value, mapper: CartridgeMapperType.Mmm01,        hasRam: true,  hasBattery: false, hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x0D: return { rawValue: value, mapper: CartridgeMapperType.Mmm01,        hasRam: true,  hasBattery: true,  hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x0F: return { rawValue: value, mapper: CartridgeMapperType.Mbc3,         hasRam: false, hasBattery: true,  hasTimer: true,  hasRumble: false, hasSensor: false };
            case 0x10: return { rawValue: value, mapper: CartridgeMapperType.Mbc3,         hasRam: true,  hasBattery: true,  hasTimer: true,  hasRumble: false, hasSensor: false };
            case 0x11: return { rawValue: value, mapper: CartridgeMapperType.Mbc3,         hasRam: false, hasBattery: false, hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x12: return { rawValue: value, mapper: CartridgeMapperType.Mbc3,         hasRam: true,  hasBattery: false, hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x13: return { rawValue: value, mapper: CartridgeMapperType.Mbc3,         hasRam: true,  hasBattery: true,  hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x19: return { rawValue: value, mapper: CartridgeMapperType.Mbc5,         hasRam: false, hasBattery: false, hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x1A: return { rawValue: value, mapper: CartridgeMapperType.Mbc5,         hasRam: true,  hasBattery: false, hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x1B: return { rawValue: value, mapper: CartridgeMapperType.Mbc5,         hasRam: true,  hasBattery: true,  hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x1C: return { rawValue: value, mapper: CartridgeMapperType.Mbc5,         hasRam: false, hasBattery: false, hasTimer: false, hasRumble: true,  hasSensor: false };
            case 0x1D: return { rawValue: value, mapper: CartridgeMapperType.Mbc5,         hasRam: true,  hasBattery: false, hasTimer: false, hasRumble: true,  hasSensor: false };
            case 0x1E: return { rawValue: value, mapper: CartridgeMapperType.Mbc5,         hasRam: true,  hasBattery: true,  hasTimer: false, hasRumble: true,  hasSensor: false };
            case 0x20: return { rawValue: value, mapper: CartridgeMapperType.Mbc6,         hasRam: true,  hasBattery: true,  hasTimer: false, hasRumble: false, hasSensor: false };
            case 0x22: return { rawValue: value, mapper: CartridgeMapperType.Mbc7,         hasRam: true,  hasBattery: true,  hasTimer: false, hasRumble: true,  hasSensor: true  };
            case 0xFC: return { rawValue: value, mapper: CartridgeMapperType.PocketCamera, hasRam: true,  hasBattery: true,  hasTimer: false, hasRumble: false, hasSensor: false };
            case 0xFD: return { rawValue: value, mapper: CartridgeMapperType.BandaiTama5,  hasRam: true,  hasBattery: true,  hasTimer: false, hasRumble: false, hasSensor: false };
            case 0xFE: return { rawValue: value, mapper: CartridgeMapperType.Huc3,         hasRam: true,  hasBattery: true,  hasTimer: false, hasRumble: false, hasSensor: false };
            case 0xFF: return { rawValue: value, mapper: CartridgeMapperType.Huc1,         hasRam: true,  hasBattery: true,  hasTimer: false, hasRumble: false, hasSensor: false };
            default: throw new Error(`Unknown cartridge type: 0x${value.toString(16).padStart(2, '0').toUpperCase()}`);
        }
    }

    private parseCgbFlag(rom: Uint8Array): CartridgeCgbFlagValue {
        const value = rom[0x143] as CartridgeCgbFlagValue;
        if (Object.values(CartridgeCgbFlag).includes(value)) {
            return value;
        }
        return CartridgeCgbFlag.NotCgb;
    }

    private parseDestinationCode(rom: Uint8Array): CartridgeDestinationCodeValue {
        const value = rom[0x14A] as CartridgeDestinationCodeValue;
        if (Object.values(CartridgeDestinationCode).includes(value)) {
            return value;
        }
        console.warn(`Unknown destination code: 0x${value.toString(16).padStart(2, '0').toUpperCase()}`);
        return CartridgeDestinationCode.JapaneseOrOverseas;
    }

    private parseRom(rom: Uint8Array): CartridgeMemoryConfig {
        const value = rom[0x148];
        switch (value) {
            case 0x00: return { rawValue: value, size: MemorySize.Size32KB, banks: 2 }; 
            case 0x01: return { rawValue: value, size: MemorySize.Size64KB, banks: 4 };
            case 0x02: return { rawValue: value, size: MemorySize.Size128KB, banks: 8 };
            case 0x03: return { rawValue: value, size: MemorySize.Size256KB, banks: 16 };
            case 0x04: return { rawValue: value, size: MemorySize.Size512KB, banks: 32 };
            case 0x05: return { rawValue: value, size: MemorySize.Size1MB, banks: 64 };
            case 0x06: return { rawValue: value, size: MemorySize.Size2MB, banks: 128 };
            case 0x07: return { rawValue: value, size: MemorySize.Size4MB, banks: 256 };
            case 0x08: return { rawValue: value, size: MemorySize.Size8MB, banks: 512 };
            case 0x52: return { rawValue: value, size: MemorySize.Size1_1MB, banks: 72 };
            case 0x53: return { rawValue: value, size: MemorySize.Size1_2MB, banks: 80 };
            case 0x54: return { rawValue: value, size: MemorySize.Size1_5MB, banks: 96 };
            default: throw new Error(`Unknown ROM size: 0x${value.toString(16).padStart(2, '0').toUpperCase()}`);
        }
    }

    private parseRam(rom: Uint8Array): CartridgeMemoryConfig {
        const value = rom[0x149];
        switch (value) {
            case 0x00: return { rawValue: value, size: 0, banks: 0 };
            case 0x02: return { rawValue: value, size: MemorySize.Size8KB, banks: 1 };
            case 0x03: return { rawValue: value, size: MemorySize.Size32KB, banks: 4 };
            case 0x04: return { rawValue: value, size: MemorySize.Size128KB, banks: 16 };
            case 0x05: return { rawValue: value, size: MemorySize.Size64KB, banks: 8 };
            default: throw new Error(`Unknown RAM size: 0x${value.toString(16).padStart(2, '0').toUpperCase()}`);
        }
    }

    private async parseLicensee(rom: Uint8Array): Promise<CartridgeLicensee> {
        const licensee = {
            oldCode: rom[0x14B],
            newCode: null,
            name: 'Unknown'
        } as CartridgeLicensee;
        
        if (licensee.oldCode === 0x33) {
            licensee.newCode = String.fromCharCode(...rom.slice(0x144, 0x146));
            const { parseCode } = await import("./new-licensee-code-parser");
            licensee.name = parseCode(licensee.newCode);
        } else {
            const { parseCode } = await import("./old-licensee-code-parser");
            licensee.name = parseCode(licensee.oldCode);
        }

        return licensee;
    }

    private parseHeaderChecksum(rom: Uint8Array): CartridgeChecksum {
        const expected = rom[0x14D];

        // Verify the header checksum
        let actual = 0;
        for (let i = 0x134; i <= 0x14C; i++) {
            actual = (actual - rom[i] - 1) & 0xFF;
        }

        return {
            value: expected,
            valid: expected === actual
        };
    }

    private parseGlobalChecksum(rom: Uint8Array): CartridgeChecksum {
        const expected = (rom[0x14E] << 8) | rom[0x14F];

        // Verify the global checksum
        let actual = 0;
        for (let i = 0; i < rom.length; i++) {
            if (i === 0x14E || i === 0x14F) {
                continue;
            }
            actual = (actual + rom[i]) & 0xFFFF;
        }

        return {
            value: expected,
            valid: expected === actual
        };
    }
}
export { CartridgeMapperType };

