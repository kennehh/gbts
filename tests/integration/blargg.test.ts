import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { GameBoy } from "../../src/emulator/gameboy";
import { CpuStatus } from "../../src/emulator/cpu-state";
import { assert } from "console";

const romDirectory = 'tests/__fixtures__/roms/blargg';


describe('Blargg Test ROMs', () => {
    const cpuInstrRoms = readdirSync(path.join(romDirectory, 'cpu_instrs/individual'))
        .map(file => ({
            name: path.basename(file, '.gb'),
            path: path.join(romDirectory, 'cpu_instrs/individual', file)
        }));

    cpuInstrRoms.forEach(rom => {
        it(`should pass ${rom.name}`, () => {
            const romBuffer = readFileSync(rom.path);
            const gb = new GameBoy();
            gb.loadRom(romBuffer);

            let lastPC = -1;
            let message = '';

            while (true) {
                lastPC = gb.cpu.state.pc;

                gb.step();

                if (gb.mmu.read(0xff02) == 0x81) {
                    message += String.fromCharCode(gb.mmu.read(0xff01));
                    gb.mmu.write(0xff02, 0x01);
                }

                if (message.includes('Passed') || message.includes('Failed')) {
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
        });
    });
});