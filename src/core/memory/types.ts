import type { ICartridge } from "../cartridge";

export interface IMmu {
    readonly bootRomLoaded: boolean;
    tick4(): void;
    read(address: number): number;
    readDma(address: number): number;
    write(address: number, value: number): void;
    writeDma(address: number, value: number): void;
    reset(): void;
    loadBootRom(rom: Memory): void;
    loadCartridge(cart: ICartridge): void;
    triggerOamBug(address: number): void;
}

export interface Memory {
    readonly bytes: Uint8Array;
    readonly length: number;    
    read(address: number): number;
    write(address: number, value: number): void;
    readDirect(address: number): number;
    writeDirect(address: number, value: number): void;
    read16(address: number): number;
    write16(address: number, value: number): void;
    readDirect16(address: number): number;
    writeDirect16(address: number, value: number): void;
    fill(value: number): void;
    set(data: Uint8Array): void;
    randomise(): void;
}

const kb = 1024;
const mb = kb * 1024;

export const MemorySize = {
    KB: kb,
    MB: mb,
    Size2KB: 2 * kb,
    Size4KB: 4 * kb,
    Size8KB: 8 * kb,
    Size16KB: 16 * kb,
    Size32KB: 32 * kb,
    Size64KB: 64 * kb,
    Size128KB: 128 * kb,
    Size256KB: 256 * kb,
    Size512KB: 512 * kb,
    Size1MB: 1 * mb,
    Size2MB: 2 * mb,
    Size4MB: 4 * mb,
    Size8MB: 8 * mb,
    Size1_1MB: 1.1 * mb,
    Size1_2MB: 1.2 * mb,
    Size1_5MB: 1.5 * mb
} as const;
