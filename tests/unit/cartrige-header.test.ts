import { describe, it, expect } from 'vitest';
import { CartridgeHeader, CartridgeCgbFlag, CartridgeDestinationCode, CartridgeMapperType } from '../../src/emulator/cartridge-header';

describe('CartridgeHeader', () => {
    // Helper to create a basic ROM array
    function createMockRom(overrides: { [key: number]: number } = {}): Uint8Array {
        const rom = new Uint8Array(0x150).fill(0);
        // Set some default valid values
        rom[0x147] = 0x00; // NoMbc
        rom[0x148] = 0x00; // 32KB ROM
        rom[0x149] = 0x00; // No RAM
        
        // Apply any overrides
        Object.entries(overrides).forEach(([addr, value]) => {
            rom[parseInt(addr)] = value;
        });
        
        return rom;
    }

    describe('title parsing', () => {
        it('should parse basic title correctly', () => {
            const rom = createMockRom();
            const title = "TESTTITLE";
            for (let i = 0; i < title.length; i++) {
                rom[0x134 + i] = title.charCodeAt(i);
            }
            
            const header = new CartridgeHeader(rom);
            expect(header.title).toBe("TESTTITLE");
        });

        it('should handle null-terminated titles', () => {
            const rom = createMockRom();
            const title = "TEST";
            for (let i = 0; i < title.length; i++) {
                rom[0x134 + i] = title.charCodeAt(i);
            }
            rom[0x134 + title.length] = 0;
            
            const header = new CartridgeHeader(rom);
            expect(header.title).toBe("TEST");
        });
    });

    describe('cartridge type parsing', () => {
        it('should parse MBC1 cartridge type correctly', () => {
            const rom = createMockRom({ 0x147: 0x01 });
            const header = new CartridgeHeader(rom);
            
            expect(header.type).toEqual({
                rawValue: 0x01,
                mapper: CartridgeMapperType.Mbc1,
                hasRam: false,
                hasBattery: false,
                hasTimer: false,
                hasRumble: false,
                hasSensor: false
            });
        });

        it('should parse MBC3+RAM+BATTERY cartridge type correctly', () => {
            const rom = createMockRom({ 0x147: 0x13 });
            const header = new CartridgeHeader(rom);
            
            expect(header.type).toEqual({
                rawValue: 0x13,
                mapper: CartridgeMapperType.Mbc3,
                hasRam: true,
                hasBattery: true,
                hasTimer: false,
                hasRumble: false,
                hasSensor: false
            });
        });

        it('should throw on unknown cartridge type', () => {
            const rom = createMockRom({ 0x147: 0x7F });
            expect(() => new CartridgeHeader(rom)).toThrow('Unknown cartridge type');
        });
    });

    describe('CGB flag parsing', () => {
        it('should parse CGB backward compatible flag', () => {
            const rom = createMockRom({ 0x143: 0x80 });
            const header = new CartridgeHeader(rom);
            expect(header.cgbFlag).toBe(CartridgeCgbFlag.CgbBackwardCompatible);
        });

        it('should parse CGB only flag', () => {
            const rom = createMockRom({ 0x143: 0xC0 });
            const header = new CartridgeHeader(rom);
            expect(header.cgbFlag).toBe(CartridgeCgbFlag.CgbOnly);
        });

        it('should default to NotCGB for unknown values', () => {
            const rom = createMockRom({ 0x143: 0x42 });
            const header = new CartridgeHeader(rom);
            expect(header.cgbFlag).toBe(CartridgeCgbFlag.NotCgb);
        });
    });

    describe('ROM/RAM size parsing', () => {
        it('should parse standard ROM sizes', () => {
            const sizes = [
                { code: 0x00, size: 32 * 1024, banks: 2 },
                { code: 0x01, size: 64 * 1024, banks: 4 },
                { code: 0x02, size: 128 * 1024, banks: 8 },
            ];

            for (const { code, size, banks } of sizes) {
                const rom = createMockRom({ 0x148: code });
                const header = new CartridgeHeader(rom);
                expect(header.rom.rawValue).toBe(code);
                expect(header.rom.size).toBe(size);
                expect(header.rom.banks).toBe(banks);
            }
        });

        it('should parse special ROM sizes', () => {
            const rom = createMockRom({ 0x148: 0x52 });
            const header = new CartridgeHeader(rom);
            expect(header.rom.size).toBe(1152 * 1024);
        });

        it('should parse RAM sizes', () => {
            const sizes = [
                { code: 0x00, size: 0, banks: 0 },
                { code: 0x02, size: 8 * 1024, banks: 1 },
                { code: 0x03, size: 32 * 1024, banks: 4 },
            ];

            for (const { code, size, banks } of sizes) {
                const rom = createMockRom({ 0x149: code });
                const header = new CartridgeHeader(rom);
                expect(header.ram.rawValue).toBe(code);
                expect(header.ram.size).toBe(size);
                expect(header.ram.banks).toBe(banks);
            }
        });

        it('should throw on invalid RAM size', () => {
            const rom = createMockRom({ 0x149: 0x01 });
            expect(() => new CartridgeHeader(rom)).toThrow('Unknown RAM size');
        });
    });

    describe('licensee code parsing', () => {
        it('should parse old licensee codes', () => {
            const rom = createMockRom({ 0x14B: 0x01 });
            const header = new CartridgeHeader(rom);
            expect(header.licensee.oldCode).toBe(0x01);
            expect(header.licensee.newCode).toBe(null);
            expect(header.licensee.name).toBe('Nintendo');

        });

        it('should use new licensee code when old code is 0x33', () => {
            const rom = createMockRom({ 0x14B: 0x33 });
            rom[0x144] = '0'.charCodeAt(0);
            rom[0x145] = '1'.charCodeAt(0);
            
            const header = new CartridgeHeader(rom);
            expect(header.licensee.oldCode).toBe(0x33);
            expect(header.licensee.newCode).toBe('01');
            expect(header.licensee.name).toBe('Nintendo Research & Development 1');
        });

        it('should handle unknown old licensee codes', () => {
            const rom = createMockRom({ 0x14B: 0x02 });
            const header = new CartridgeHeader(rom);
            expect(header.licensee.oldCode).toBe(0x02);
            expect(header.licensee.newCode).toBe(null);
            expect(header.licensee.name).toBe('Unknown');
        });
    });

    describe('destination code parsing', () => {
        it('should parse Japanese/Overseas code', () => {
            const rom = createMockRom({ 0x14A: 0x00 });
            const header = new CartridgeHeader(rom);
            expect(header.destinationCode).toBe(CartridgeDestinationCode.JapaneseOrOverseas);
        });

        it('should parse Overseas only code', () => {
            const rom = createMockRom({ 0x14A: 0x01 });
            const header = new CartridgeHeader(rom);
            expect(header.destinationCode).toBe(CartridgeDestinationCode.OverseasOnly);
        });

        it('should default to Japanese/Overseas for unknown codes', () => {
            const rom = createMockRom({ 0x14A: 0x02 });
            const header = new CartridgeHeader(rom);
            expect(header.destinationCode).toBe(CartridgeDestinationCode.JapaneseOrOverseas);
        });
    });

    describe('SGB flag parsing', () => {
        it('should detect SGB compatible ROMs', () => {
            const rom = createMockRom({ 0x146: 0x03 });
            const header = new CartridgeHeader(rom);
            expect(header.isSgb).toBe(true);
        });

        it('should detect non-SGB ROMs', () => {
            const rom = createMockRom({ 0x146: 0x00 });
            const header = new CartridgeHeader(rom);
            expect(header.isSgb).toBe(false);
        });
    });

    describe('mask ROM version', () => {
        it('should parse mask ROM version', () => {
            const rom = createMockRom({ 0x14C: 0x42 });
            const header = new CartridgeHeader(rom);
            expect(header.maskRomVersion).toBe(0x42);
        });
    });

    describe('header checksum', () => {
        it('should parse header checksum', () => {
            const rom = createMockRom({ 0x14D: 0x42 });
            const header = new CartridgeHeader(rom);
            expect(header.headerChecksum).toBe(0x42);
        });
    
        it('should validate header checksum', () => {
            // Add test with valid checksum calculation
        });
    });
    
    describe('global checksum', () => {
        it('should parse global checksum', () => {
            const rom = createMockRom({ 
                0x14E: 0x12,
                0x14F: 0x34 
            });
            const header = new CartridgeHeader(rom);
            expect(header.globalChecksum).toBe(0x1234);
        });
    });
});
