import type { ValuesOf } from "@/common/types";

export interface CartridgeChecksum {
    value: number;
    valid: boolean;
}

export interface CartridgeType {
    rawValue: number;
    mapper: CartridgeMapperTypeValue;
    hasRam: boolean;
    hasBattery: boolean;
    hasTimer: boolean;
    hasRumble: boolean;
    hasSensor: boolean;
}

export interface CartridgeLicensee {
    oldCode: number;
    newCode: string | null;
    name: string;
}

export interface CartridgeMemoryConfig {
    rawValue: number;
    size: number;
    banks: number;
}

export const CartridgeCgbFlag = {
    NotCgb: 0x00,
    CgbBackwardCompatible: 0x80,
    CgbOnly: 0xC0
} as const;

export type CartridgeCgbFlagValue = ValuesOf<typeof CartridgeCgbFlag>;

export const CartridgeDestinationCode = {
    JapaneseOrOverseas: 0x00,
    OverseasOnly: 0x01
} as const;

export type CartridgeDestinationCodeValue = ValuesOf<typeof CartridgeDestinationCode>;

export const CartridgeMapperType = {
    NoMbc: 0,
    Mbc1: 1,
    Mbc2: 2,
    Mmm01: 11,
    Mbc3: 3,
    Mbc5: 5,
    Mbc6: 6,
    Mbc7: 7,
    PocketCamera: 20,
    BandaiTama5: 35,
    Huc3: 43,
    Huc1: 41
} as const;

export type CartridgeMapperTypeValue = ValuesOf<typeof CartridgeMapperType>;
