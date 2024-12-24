import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { GameBoy } from "../../src/core/gameboy";

const romDirectory = 'tests/__fixtures__/roms/mooneye-test-suite';

function getRoms(relativePath: string) {
    const romDirPath = path.join(romDirectory, relativePath);
    return readdirSync(romDirPath)
        .filter(file => file.endsWith('.gb'))
        .map(file => ({
            name: path.basename(file),
            path: path.join(romDirPath, file)
        }));
}

async function testRom(romPath: string) {
    const romBuffer = readFileSync(romPath);
    const gb = new GameBoy();
    await gb.loadRom(romBuffer);

    const start = Date.now();
    while (gb.mmu.read(gb.cpu.state.pc) !== 0x40) {
        gb.stepInstruction();
        if (Date.now() - start > 5000) {
            throw new Error('Test took too long to complete');
        }
    }

    // Test is successful when the registers are set to the fibonacci sequence
    expect(gb.cpu.state.b).toBe(3);
    expect(gb.cpu.state.c).toBe(5);
    expect(gb.cpu.state.d).toBe(8);
    expect(gb.cpu.state.e).toBe(13);
    expect(gb.cpu.state.h).toBe(21);
    expect(gb.cpu.state.l).toBe(34);
}

describe('Mooneye Test ROMs', () => {
    describe('acceptance', () => {
        describe('bits', () => {
            getRoms('acceptance/bits').forEach(rom => {
                it(`should pass ${rom.name}`, () => testRom(rom.path));
            });
        });

        describe('instr', () => {
            getRoms('acceptance/instr').forEach(rom => {
                it(`should pass ${rom.name}`, () => testRom(rom.path));
            });
        });

        describe('interrupts', () => {
            getRoms('acceptance/interrupts').forEach(rom => {
                it(`should pass ${rom.name}`, () => testRom(rom.path));
            });
        });

        describe('oam_dma', () => {
            getRoms('acceptance/oam_dma').forEach(rom => {
                it(`should pass ${rom.name}`, () => testRom(rom.path));
            });
        });

        describe('ppu', () => {
            getRoms('acceptance/ppu').forEach(rom => {
                it(`should pass ${rom.name}`, () => testRom(rom.path));
            });
        });

        describe('serial', () => {
            getRoms('acceptance/serial').forEach(rom => {
                it(`should pass ${rom.name}`, () => testRom(rom.path));
            });
        });

        describe('timer', () => {
            getRoms('acceptance/timer').forEach(rom => {
                it(`should pass ${rom.name}`, () => testRom(rom.path));
            });
        });

        getRoms('acceptance').forEach(rom => {
            it(`should pass ${rom.name}`, () => testRom(rom.path));
        });
    });
    
    describe('mappers', () => {
        describe('mbc1', () => {
            getRoms('emulator-only/mbc1').forEach(rom => {
                it(`should pass ${rom.name}`, () => testRom(rom.path));
            });
        });
    
        describe('mbc2', () => {
            getRoms('emulator-only/mbc2').forEach(rom => {
                it(`should pass ${rom.name}`, () => testRom(rom.path));
            });
        });
    
        describe('mbc5', () => {
            getRoms('emulator-only/mbc5').forEach(rom => {
                it(`should pass ${rom.name}`, () => testRom(rom.path));
            });
        });
    });
});
