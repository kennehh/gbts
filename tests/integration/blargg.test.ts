import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { GameBoy } from "../../src/emulator/gameboy";
import { CpuStatus } from "../../src/emulator/cpu-state";
import { assert } from "console";

const romDirectory = 'tests/__fixtures__/roms/blargg';

function getRoms(relativePath: string) {
    const romDirPath = path.join(romDirectory, relativePath);
    return readdirSync(romDirPath)
        .filter(file => file.endsWith('.gb'))
        .map(file => ({
            name: path.basename(file),
            path: path.join(romDirPath, file)
        }));
}

function testRom(romPath: string) {
    const romBuffer = readFileSync(romPath);
    const gb = new GameBoy();
    gb.loadRom(romBuffer);
    let message = '';

    while (true) {
        const halted = gb.cpu.state.status === CpuStatus.Halted;
        const lastPC = gb.cpu.state.pc;

        gb.step();

        if (gb.mmu.read(0xff02) == 0x81) {
            message += String.fromCharCode(gb.mmu.read(0xff01));
            gb.mmu.write(0xff02, 0x01);
        }

        if (lastPC === gb.cpu.state.pc && !halted) {
            break;
        }
    }

    if (!message) {
        expect(gb.mmu.read(0xa001)).toBe(0xde);
        expect(gb.mmu.read(0xa002)).toBe(0xb0);
        expect(gb.mmu.read(0xa003)).toBe(0x61);

        let address = 0xa004;
        while (true) {
            const value = gb.mmu.read(address++);
            if (value === 0x00) {
                break;
            }
            message += String.fromCharCode(value);
        }
    }

    const passed = message.includes('Passed') && !message.includes('Failed');
    assert(passed, `Message: ${message}`);
}

describe('Blargg Test ROMs', () => {
    describe('cpu_instrs', () => {
        getRoms('cpu_instrs/individual').forEach(rom => {
            it(`should pass ${rom.name}`, () => testRom(rom.path));
        });
    });

    describe('instr_timing', () => {
        getRoms('instr_timing').forEach(rom => {
            it(`should pass ${rom.name}`, () => testRom(rom.path));
        });
    });

    describe('mem_timing', () => {
        getRoms('mem_timing/individual').forEach(rom => {
            it(`should pass ${rom.name}`, () => testRom(rom.path));
        });
    });
});