import { CartridgeHeader, CartridgeMapperType } from '@/core/cartridge/header';
import { CartridgeCgbFlag, CartridgeDestinationCode } from '@/core/cartridge/header/types';
import { describe, it, expect } from 'vitest';

describe('CartridgeHeader', () => {
    // Helper to create a basic ROM array
    function createMockRom(overrides: Record<number, number> = {}, title = ''): Uint8Array {
        const rom = new Uint8Array(0x150).fill(0);
        // Set some default valid values
        rom[0x147] = 0x00; // NoMbc
        rom[0x148] = 0x00; // 32KB ROM
        rom[0x149] = 0x00; // No RAM

        for (let i = 0; i < title.length; i++) {
            rom[0x134 + i] = title.charCodeAt(i);
        }
        
        // Apply any overrides
        Object.entries(overrides).forEach(([addr, value]) => {
            rom[parseInt(addr)] = value;
        });
        
        return rom;
    }

    describe('title parsing', () => {
        it.each(['TEST', 'TEST TEST'])('should parse title correctly', async title => {
            const rom = createMockRom({}, title);
            
            const header = await CartridgeHeader.fromRom(rom);
            expect(header.title).toBe(title);
        });
    });

    describe('cartridge type parsing', () => {
        it('should parse MBC1 cartridge type correctly', async () => {
            const rom = createMockRom({ 0x147: 0x01 });
            const header = await CartridgeHeader.fromRom(rom);
            
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

        it('should parse MBC3+RAM+BATTERY cartridge type correctly', async () => {
            const rom = createMockRom({ 0x147: 0x13 });
            const header = await CartridgeHeader.fromRom(rom);
            
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

        it('should throw on unknown cartridge type', async () => {
            const rom = createMockRom({ 0x147: 0x7F });
            await expect(() => CartridgeHeader.fromRom(rom)).rejects.toThrow('Unknown cartridge type');
        });
    });

    describe('CGB flag parsing', () => {
        it('should parse CGB backward compatible flag', async () => {
            const rom = createMockRom({ 0x143: 0x80 });
            const header = await CartridgeHeader.fromRom(rom);
            expect(header.cgbFlag).toBe(CartridgeCgbFlag.CgbBackwardCompatible);
        });

        it('should parse CGB only flag', async () => {
            const rom = createMockRom({ 0x143: 0xC0 });
            const header = await CartridgeHeader.fromRom(rom);
            expect(header.cgbFlag).toBe(CartridgeCgbFlag.CgbOnly);
        });

        it('should default to NotCGB for unknown values', async () => {
            const rom = createMockRom({ 0x143: 0x42 });
            const header = await CartridgeHeader.fromRom(rom);
            expect(header.cgbFlag).toBe(CartridgeCgbFlag.NotCgb);
        });
    });

    describe('ROM/RAM size parsing', () => {
        it('should parse standard ROM sizes', async () => {
            const sizes = [
                { code: 0x00, size: 32 * 1024, banks: 2 },
                { code: 0x01, size: 64 * 1024, banks: 4 },
                { code: 0x02, size: 128 * 1024, banks: 8 },
            ];

            for (const { code, size, banks } of sizes) {
                const rom = createMockRom({ 0x148: code });
                const header = await CartridgeHeader.fromRom(rom);
                expect(header.rom.rawValue).toBe(code);
                expect(header.rom.size).toBe(size);
                expect(header.rom.banks).toBe(banks);
            }
        });

        it('should parse special ROM sizes', async () => {
            const rom = createMockRom({ 0x148: 0x52 });
            const header = await CartridgeHeader.fromRom(rom);
            expect(header.rom.size).toBe(1.1 * 1024 * 1024);
        });

        it('should parse RAM sizes', async () => {
            const sizes = [
                { code: 0x00, size: 0, banks: 0 },
                { code: 0x02, size: 8 * 1024, banks: 1 },
                { code: 0x03, size: 32 * 1024, banks: 4 },
            ];

            for (const { code, size, banks } of sizes) {
                const rom = createMockRom({ 0x149: code });
                const header = await CartridgeHeader.fromRom(rom);
                expect(header.ram.rawValue).toBe(code);
                expect(header.ram.size).toBe(size);
                expect(header.ram.banks).toBe(banks);
            }
        });

        it('should throw on invalid RAM size', async () => {
            const rom = createMockRom({ 0x149: 0x01 });
            await expect(() => CartridgeHeader.fromRom(rom)).rejects.toThrow('Unknown RAM size');
        });
    });

    describe('licensee code parsing', () => {
        it('should parse old licensee codes', async () => {
            const rom = createMockRom({ 0x14B: 0x01 });
            const header = await CartridgeHeader.fromRom(rom);
            const licensee = await header.getLicensee();
            expect(licensee.oldCode).toBe(0x01);
            expect(licensee.newCode).toBe(null);
            expect(licensee.name).toBe('Nintendo');

        });

        it('should use new licensee code when old code is 0x33', async () => {
            const rom = createMockRom({ 0x14B: 0x33 });
            rom[0x144] = '0'.charCodeAt(0);
            rom[0x145] = '1'.charCodeAt(0);
            
            const header = await CartridgeHeader.fromRom(rom);
            const licensee = await header.getLicensee();
            expect(licensee.oldCode).toBe(0x33);
            expect(licensee.newCode).toBe('01');
            expect(licensee.name).toBe('Nintendo Research & Development 1');
        });

        it('should handle unknown old licensee codes', async () => {
            const rom = createMockRom({ 0x14B: 0x02 });
            const header = await CartridgeHeader.fromRom(rom);
            const licensee = await header.getLicensee();
            expect(licensee.oldCode).toBe(0x02);
            expect(licensee.newCode).toBe(null);
            expect(licensee.name).toBe('Unknown');
        });
    });

    describe('destination code parsing', () => {
        it('should parse Japanese/Overseas code', async () => {
            const rom = createMockRom({ 0x14A: 0x00 });
            const header = await CartridgeHeader.fromRom(rom);
            expect(header.destinationCode).toBe(CartridgeDestinationCode.JapaneseOrOverseas);
        });

        it('should parse Overseas only code', async () => {
            const rom = createMockRom({ 0x14A: 0x01 });
            const header = await CartridgeHeader.fromRom(rom);
            expect(header.destinationCode).toBe(CartridgeDestinationCode.OverseasOnly);
        });

        it('should default to Japanese/Overseas for unknown codes', async () => {
            const rom = createMockRom({ 0x14A: 0x02 });
            const header = await CartridgeHeader.fromRom(rom);
            expect(header.destinationCode).toBe(CartridgeDestinationCode.JapaneseOrOverseas);
        });
    });

    describe('SGB flag parsing', () => {
        it('should detect SGB compatible ROMs', async () => {
            const rom = createMockRom({ 0x146: 0x03 });
            const header = await CartridgeHeader.fromRom(rom);
            expect(header.isSgb).toBe(true);
        });

        it('should detect non-SGB ROMs', async () => {
            const rom = createMockRom({ 0x146: 0x00 });
            const header = await CartridgeHeader.fromRom(rom);
            expect(header.isSgb).toBe(false);
        });
    });

    describe('mask ROM version', () => {
        it('should parse mask ROM version', async () => {
            const rom = createMockRom({ 0x14C: 0x42 });
            const header = await CartridgeHeader.fromRom(rom);
            expect(header.maskRomVersion).toBe(0x42);
        });
    });

    describe('headerChecksum', () => {
        it('should validate a correct header checksum', async () => {
            const rom = createMockRom();

            let checksum = 0;
            for (let i = 0x134; i <= 0x14C; i++) {
                checksum = (checksum - rom[i] - 1) & 0xFF;
            }
            rom[0x14D] = checksum;

            const header = await CartridgeHeader.fromRom(rom);
            expect(header.headerChecksum.value).toBe(checksum);
            expect(header.headerChecksum.valid).toBe(true);
        });

        it('should invalidate an incorrect header checksum', async () => {
            const rom = createMockRom({ 0x14D: 0x00 });
            const header = await CartridgeHeader.fromRom(rom);
            expect(header.headerChecksum.value).toBe(0x00);
            expect(header.headerChecksum.valid).toBe(false);
        });
    });

    describe('globalChecksum', () => {
        it('should validate a correct global checksum', async () => {
            const rom = createMockRom({}, 'test');

            let checksum = 0;
            for (let i = 0; i < rom.length; i++) {
                if (i === 0x14E || i === 0x14F) {
                    continue;
                }
                checksum = (checksum + rom[i]) & 0xFFFF;
            }
            rom[0x14E] = (checksum >> 8) & 0xFF;
            rom[0x14F] = checksum & 0xFF;

            const header = await CartridgeHeader.fromRom(rom);
            expect(header.globalChecksum.value).toBe(checksum);
            expect(header.globalChecksum.valid).toBe(true);
        });

        it('should invalidate an incorrect global checksum', async () => {
            const rom = createMockRom({ 0x14E: 0x00, 0x14F: 0x00 }, 'test');
            const header = await CartridgeHeader.fromRom(rom);
            expect(header.globalChecksum.value).toBe(0x0000);
            expect(header.globalChecksum.valid).toBe(false);
        });
    });
});
