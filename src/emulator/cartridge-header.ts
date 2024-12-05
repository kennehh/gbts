import { MemorySize } from "./memory";

type CartridgeChecksum = {
    value: number;
    valid: boolean;
}

type CartridgeType = {
    rawValue: number;
    mapper: CartridgeMapperType;
    hasRam: boolean;
    hasBattery: boolean;
    hasTimer: boolean;
    hasRumble: boolean;
    hasSensor: boolean;
}

type CartridgeLicensee = {
    oldCode: number;
    newCode: string | null;
    name: string;
}

type CartridgeMemoryConfig = {
    rawValue: number;
    size: number;
    banks: number;
}

export enum CartridgeCgbFlag {
    NotCgb = 0x00,
    CgbBackwardCompatible = 0x80,
    CgbOnly = 0xC0
}

export enum CartridgeDestinationCode {
    JapaneseOrOverseas = 0x00,
    OverseasOnly = 0x01
}

export enum CartridgeMapperType {
    NoMbc,
    Mbc1,
    Mbc2,
    Mmm01,
    Mbc3,
    Mbc5,
    Mbc6,
    Mbc7,
    PocketCamera,
    BandaiTama5,
    Huc3,
    Huc1
}

export class CartridgeHeader {
    readonly title: string;
    readonly licensee: CartridgeLicensee;
    readonly cgbFlag: CartridgeCgbFlag;
    readonly isSgb: boolean;
    readonly type: CartridgeType;
    readonly rom: CartridgeMemoryConfig;
    readonly ram: CartridgeMemoryConfig;
    readonly destinationCode: CartridgeDestinationCode;
    readonly maskRomVersion: number;
    readonly headerChecksum: CartridgeChecksum;
    readonly globalChecksum: CartridgeChecksum;
    readonly romSizeDoesNotMatch: boolean;

    constructor(rom: Uint8Array) {
        this.title = this.parseTitle(rom);
        this.licensee = this.parseLicensee(rom);
        this.cgbFlag = this.parseCgbFlag(rom);
        this.isSgb = rom[0x146] === 0x03;
        this.type = this.parseCartridgeType(rom);
        this.destinationCode = this.parseDestinationCode(rom);
        this.rom = this.parseRom(rom);
        this.ram = this.parseRam(rom);
        this.maskRomVersion = rom[0x14C];
        this.headerChecksum = this.parseHeaderChecksum(rom);
        this.globalChecksum = this.parseGlobalChecksum(rom);
        this.romSizeDoesNotMatch = rom.length !== this.rom.size;
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

    private parseCgbFlag(rom: Uint8Array): CartridgeCgbFlag {
        const value = rom[0x143];
        if (Object.values(CartridgeCgbFlag).includes(value)) {
            return value as CartridgeCgbFlag;
        }
        return CartridgeCgbFlag.NotCgb;
    }

    private parseDestinationCode(rom: Uint8Array): CartridgeDestinationCode {
        const value = rom[0x14A];
        if (Object.values(CartridgeDestinationCode).includes(value)) {
            return value as CartridgeDestinationCode;
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

    private parseLicensee(rom: Uint8Array): CartridgeLicensee {
        const licensee = {
            oldCode: rom[0x14B],
            newCode: null,
            name: 'Unknown'
        } as CartridgeLicensee;
        
        if (licensee.oldCode === 0x33) {
            licensee.newCode = String.fromCharCode(...rom.slice(0x144, 0x146));
            licensee.name = this.parseNewLicenseeCode(licensee.newCode);
        } else {
            licensee.name = this.parseOldLicenseeCode(licensee.oldCode);
        }

        return licensee;
    }

    private parseOldLicenseeCode(oldCode: number) {
        switch (oldCode) {
            case 0x00: return 'None';
            case 0x01: return 'Nintendo';
            case 0x08: return 'Capcom';
            case 0x09: return 'HOT-B';
            case 0x0A: return 'Jaleco';
            case 0x0B: return 'Coconuts Japan';
            case 0x0C: return 'Elite Systems';
            case 0x13: return 'EA (Electronic Arts)';
            case 0x18: return 'Hudson Soft';
            case 0x19: return 'ITC Entertainment';
            case 0x1A: return 'Yanoman';
            case 0x1D: return 'Japan Clary';
            case 0x1F: return 'Virgin Games Ltd.';
            case 0x24: return 'PCM Complete';
            case 0x25: return 'San-X';
            case 0x28: return 'Kemco';
            case 0x29: return 'SETA Corporation';
            case 0x30: return 'Infogrames';
            case 0x31: return 'Nintendo';
            case 0x32: return 'Bandai';
            case 0x33: return 'New licensee code';
            case 0x34: return 'Konami';
            case 0x35: return 'HectorSoft';
            case 0x38: return 'Capcom';
            case 0x39: return 'Banpresto';
            case 0x3C: return 'Entertainment Interactive';
            case 0x3E: return 'Gremlin';
            case 0x41: return 'Ubi Soft';
            case 0x42: return 'Atlus';
            case 0x44: return 'Malibu Interactive';
            case 0x46: return 'Angel';
            case 0x47: return 'Spectrum HoloByte';
            case 0x49: return 'Irem';
            case 0x4A: return 'Virgin Games Ltd.';
            case 0x4D: return 'Malibu Interactive';
            case 0x4F: return 'U.S. Gold';
            case 0x50: return 'Absolute';
            case 0x51: return 'Acclaim Entertainment';
            case 0x52: return 'Activision';
            case 0x53: return 'Sammy USA Corporation';
            case 0x54: return 'GameTek';
            case 0x55: return 'Park Place';
            case 0x56: return 'LJN';
            case 0x57: return 'Matchbox';
            case 0x59: return 'Milton Bradley Company';
            case 0x5A: return 'Mindscape';
            case 0x5B: return 'Romstar';
            case 0x5C: return 'Naxat Soft';
            case 0x5D: return 'Tradewest';
            case 0x60: return 'Titus Interactive';
            case 0x61: return 'Virgin Games Ltd.';
            case 0x67: return 'Ocean Software';
            case 0x69: return 'EA (Electronic Arts)';
            case 0x6E: return 'Elite Systems';
            case 0x6F: return 'Electro Brain';
            case 0x70: return 'Infogrames';
            case 0x71: return 'Interplay Entertainment';
            case 0x72: return 'Broderbund';
            case 0x73: return 'Sculptured Software';
            case 0x75: return 'The Sales Curve Limited';
            case 0x78: return 'THQ';
            case 0x79: return 'Accolade';
            case 0x7A: return 'Triffix Entertainment';
            case 0x7C: return 'MicroProse';
            case 0x7F: return 'Kemco';
            case 0x80: return 'Misawa Entertainment';
            case 0x83: return 'LOZC G.';
            case 0x86: return 'Tokuma Shoten';
            case 0x8B: return 'Bullet-Proof Software';
            case 0x8C: return 'Vic Tokai Corp.';
            case 0x8E: return 'Ape Inc.';
            case 0x8F: return "I'Max";
            case 0x91: return 'Chunsoft Co.';
            case 0x92: return 'Video System';
            case 0x93: return 'Tsubaraya Productions';
            case 0x95: return 'Varie';
            case 0x96: return "Yonezawa/S'Pal";
            case 0x97: return 'Kemco';
            case 0x99: return 'Arc';
            case 0x9A: return 'Nihon Bussan';
            case 0x9B: return 'Tecmo';
            case 0x9C: return 'Imagineer';
            case 0x9D: return 'Banpresto';
            case 0x9F: return 'Nova';
            case 0xA1: return 'Hori Electric';
            case 0xA2: return 'Bandai';
            case 0xA4: return 'Konami';
            case 0xA6: return 'Kawada';
            case 0xA7: return 'Takara';
            case 0xA9: return 'Technos Japan';
            case 0xAA: return 'Broderbund';
            case 0xAC: return 'Toei Animation';
            case 0xAD: return 'Toho';
            case 0xAF: return 'Namco';
            case 0xB0: return 'Acclaim Entertainment';
            case 0xB1: return 'ASCII Corporation or Nexsoft';
            case 0xB2: return 'Bandai';
            case 0xB4: return 'Square Enix';
            case 0xB6: return 'HAL Laboratory';
            case 0xB7: return 'SNK';
            case 0xB9: return 'Pony Canyon';
            case 0xBA: return 'Culture Brain';
            case 0xBB: return 'Sunsoft';
            case 0xBD: return 'Sony Imagesoft';
            case 0xBF: return 'Sammy Corporation';
            case 0xC0: return 'Taito';
            case 0xC2: return 'Kemco';
            case 0xC3: return 'Square';
            case 0xC4: return 'Tokuma Shoten';
            case 0xC5: return 'Data East';
            case 0xC6: return 'Tonkin House';
            case 0xC8: return 'Koei';
            case 0xC9: return 'UFL';
            case 0xCA: return 'Ultra Games';
            case 0xCB: return 'VAP, Inc.';
            case 0xCC: return 'Use Corporation';
            case 0xCD: return 'Meldac';
            case 0xCE: return 'Pony Canyon';
            case 0xCF: return 'Angel';
            case 0xD0: return 'Taito';
            case 0xD1: return 'SOFEL (Software Engineering Lab)';
            case 0xD2: return 'Quest';
            case 0xD3: return 'Sigma Enterprises';
            case 0xD4: return 'ASK Kodansha Co.';
            case 0xD6: return 'Naxat Soft';
            case 0xD7: return 'Copya System';
            case 0xD9: return 'Banpresto';
            case 0xDA: return 'Tomy';
            case 0xDB: return 'LJN';
            case 0xDD: return 'Nippon Computer Systems';
            case 0xDE: return 'Human Ent.';
            case 0xDF: return 'Altron';
            case 0xE0: return 'Jaleco';
            case 0xE1: return 'Towa Chiki';
            case 0xE2: return 'Yutaka';
            case 0xE3: return 'Varie';
            case 0xE5: return 'Epoch';
            case 0xE7: return 'Athena';
            case 0xE8: return 'Asmik Ace Entertainment';
            case 0xE9: return 'Natsume';
            case 0xEA: return 'King Records';
            case 0xEB: return 'Atlus';
            case 0xEC: return 'Epic/Sony Records';
            case 0xEE: return 'IGS';
            case 0xF0: return 'A Wave';
            case 0xF3: return 'Extreme Entertainment';
            case 0xFF: return 'LJN';
            default:
                console.warn(`Unknown old licensee code: 0x${oldCode.toString(16).padStart(2, '0').toUpperCase()}`);
                return 'Unknown';
        }
    }
    
    private parseNewLicenseeCode(newCode: string): string {
        switch (newCode) {
            case '00': return 'None';
            case '01': return 'Nintendo Research & Development 1';
            case '08': return 'Capcom';
            case '13': return 'EA (Electronic Arts)';
            case '18': return 'Hudson Soft';
            case '19': return 'B-AI';
            case '20': return 'KSS';
            case '22': return 'Planning Office WADA';
            case '24': return 'PCM Complete';
            case '25': return 'San-X';
            case '28': return 'Kemco';
            case '29': return 'SETA Corporation';
            case '30': return 'Viacom';
            case '31': return 'Nintendo';
            case '32': return 'Bandai';
            case '33': return 'Ocean Software/Acclaim Entertainment';
            case '34': return 'Konami';
            case '35': return 'HectorSoft';
            case '37': return 'Taito';
            case '38': return 'Hudson Soft';
            case '39': return 'Banpresto';
            case '41': return 'Ubi Soft';
            case '42': return 'Atlus';
            case '44': return 'Malibu Interactive';
            case '46': return 'Angel';
            case '47': return 'Bullet-Proof Software';
            case '49': return 'Irem';
            case '50': return 'Absolute';
            case '51': return 'Acclaim Entertainment';
            case '52': return 'Activision';
            case '53': return 'Sammy USA Corporation';
            case '54': return 'Konami';
            case '55': return 'Hi Tech Expressions';
            case '56': return 'LJN';
            case '57': return 'Matchbox';
            case '58': return 'Mattel';
            case '59': return 'Milton Bradley Company';
            case '60': return 'Titus Interactive';
            case '61': return 'Virgin Games Ltd.';
            case '64': return 'Lucasfilm Games';
            case '67': return 'Ocean Software';
            case '69': return 'EA (Electronic Arts)';
            case '70': return 'Infogrames';
            case '71': return 'Interplay Entertainment';
            case '72': return 'Broderbund';
            case '73': return 'Sculptured Software';
            case '75': return 'The Sales Curve Limited';
            case '78': return 'THQ';
            case '79': return 'Accolade';
            case '80': return 'Misawa Entertainment';
            case '83': return 'lozc';
            case '86': return 'Tokuma Shoten';
            case '87': return 'Tsukuda Original';
            case '91': return 'Chunsoft Co.';
            case '92': return 'Video System';
            case '93': return 'Ocean Software/Acclaim Entertainment';
            case '95': return 'Varie';
            case '96': return "Yonezawa/s'pal";
            case '97': return 'Kaneko';
            case '99': return 'Pack-In-Video';
            case '9H': return 'Bottom Up';
            case 'A4': return 'Konami (Yu-Gi-Oh!)';
            case 'BL': return 'MTO';
            case 'DK': return 'Kodansha';
            default: 
                console.warn(`Unknown new licensee code: ${newCode}`);
                return 'Unknown';
        }
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
