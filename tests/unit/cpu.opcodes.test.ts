import { describe, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { CpuStatus, RegisterFlag } from '../../src/emulator/cpu-state';
import Cpu from '../../src/emulator/cpu';
import { Mmu } from '../../src/emulator/memory';

const testDataDirectory = 'tests/__fixtures__/opcodeTestData';

interface CpuTestData {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
    h: number;
    l: number;
    pc: number;
    sp: number;
    ime: number;
    ram: [number, number][];
}

interface CpuTest {
    name: string;
    initial: CpuTestData;
    final: CpuTestData;
    cycles: [];
}

class MmuMock implements Mmu {
    private buffer: ArrayBuffer;
    private view: DataView;

    private static readonly MEMORY_SIZE = 0x10000;

    constructor() {
        this.buffer = new ArrayBuffer(MmuMock.MEMORY_SIZE);
        this.view = new DataView(this.buffer);
    }

    loadBootRom(rom: Uint8Array): void {
        throw new Error("Method not implemented.");
    }
    loadCartridge(rom: Uint8Array): void {
        throw new Error("Method not implemented.");
    }

    reset() {
        new Uint8Array(this.buffer).fill(0);
    }

    read(address: number) {
        return this.view.getUint8(address);
    }

    write(address: number, value: number) {
        this.view.setUint8(address, value);
    }
}


function getDebugState(cpu: Cpu, test: CpuTest): string {
    const initial = test.initial;
    const final = test.final;
    const current = cpu.state;
    
    return `Initial State:
  A: 0x${initial.a.toString(16).padStart(2, '0')}  F: 0x${initial.f.toString(16).padStart(2, '0')}  AF: 0x${((initial.a << 8) | initial.f).toString(16).padStart(4, '0')}
  B: 0x${initial.b.toString(16).padStart(2, '0')}  C: 0x${initial.c.toString(16).padStart(2, '0')}  BC: 0x${((initial.b << 8) | initial.c).toString(16).padStart(4, '0')}
  D: 0x${initial.d.toString(16).padStart(2, '0')}  E: 0x${initial.e.toString(16).padStart(2, '0')}  DE: 0x${((initial.d << 8) | initial.e).toString(16).padStart(4, '0')}
  H: 0x${initial.h.toString(16).padStart(2, '0')}  L: 0x${initial.l.toString(16).padStart(2, '0')}  HL: 0x${((initial.h << 8) | initial.l).toString(16).padStart(4, '0')}
  PC: 0x${initial.pc.toString(16).padStart(4, '0')}  SP: 0x${initial.sp.toString(16).padStart(4, '0')}

Expected Final State:
  A: 0x${final.a.toString(16).padStart(2, '0')}  F: 0x${final.f.toString(16).padStart(2, '0')}  AF: 0x${((final.a << 8) | final.f).toString(16).padStart(4, '0')}
  B: 0x${final.b.toString(16).padStart(2, '0')}  C: 0x${final.c.toString(16).padStart(2, '0')}  BC: 0x${((final.b << 8) | final.c).toString(16).padStart(4, '0')}
  D: 0x${final.d.toString(16).padStart(2, '0')}  E: 0x${final.e.toString(16).padStart(2, '0')}  DE: 0x${((final.d << 8) | final.e).toString(16).padStart(4, '0')}
  H: 0x${final.h.toString(16).padStart(2, '0')}  L: 0x${final.l.toString(16).padStart(2, '0')}  HL: 0x${((final.h << 8) | final.h).toString(16).padStart(4, '0')}
  PC: 0x${final.pc.toString(16).padStart(4, '0')}  SP: 0x${final.sp.toString(16).padStart(4, '0')}

Actual Final State:
  A: 0x${current.a.toString(16).padStart(2, '0')}  F: 0x${current.f.toString(16).padStart(2, '0')}  AF: 0x${((current.a << 8) | current.f).toString(16).padStart(4, '0')}
  B: 0x${current.b.toString(16).padStart(2, '0')}  C: 0x${current.c.toString(16).padStart(2, '0')}  BC: 0x${((current.b << 8) | current.c).toString(16).padStart(4, '0')}
  D: 0x${current.d.toString(16).padStart(2, '0')}  E: 0x${current.e.toString(16).padStart(2, '0')}  DE: 0x${((current.d << 8) | current.e).toString(16).padStart(4, '0')}
  H: 0x${current.h.toString(16).padStart(2, '0')}  L: 0x${current.l.toString(16).padStart(2, '0')}  HL: 0x${((current.h << 8) | current.l).toString(16).padStart(4, '0')}
  PC: 0x${current.pc.toString(16).padStart(4, '0')}  SP: 0x${current.sp.toString(16).padStart(4, '0')}

Memory Changes:
${test.initial.ram.map(([addr, val]) => `  [0x${addr.toString(16).padStart(4, '0')}] Initial: 0x${val.toString(16).padStart(2, '0')} Final: 0x${cpu.mmu.read(addr).toString(16).padStart(2, '0')}`).join('\n')}
`;
}

function getFlagState(value: number): string {
    return Object.keys(RegisterFlag).filter(x => isNaN(parseInt(x))).map(flag => {
        const flagValue = RegisterFlag[flag];
        const flagState = (value & flagValue) === flagValue ? '1' : '0';
        return `${flag}:${flagState}`;
    }).join(' ');
}

function setupInitialValues(cpu: Cpu, data: CpuTestData): void {
    cpu.state.a = data.a;
    cpu.state.b = data.b;
    cpu.state.c = data.c;
    cpu.state.d = data.d;
    cpu.state.e = data.e;
    cpu.state.f = data.f;
    cpu.state.h = data.h;
    cpu.state.l = data.l;
    cpu.state.pc = data.pc;
    cpu.state.sp = data.sp;
    cpu.state.ime = data.ime === 1;
    cpu.state.status = CpuStatus.Running;
    
    for (const [address, value] of data.ram) {
        cpu.mmu.write(address, value);
    }
}

function assertCpuState(cpu: Cpu, cycles: number, test: CpuTest): void {
    const data = test.final;
    let errorMsg = '';

    if (cpu.state.a !== data.a) errorMsg += `A mismatch (expected: 0x${data.a.toString(16)}, got: 0x${cpu.state.a.toString(16)})\n`;
    if (cpu.state.b !== data.b) errorMsg += `B mismatch (expected: 0x${data.b.toString(16)}, got: 0x${cpu.state.b.toString(16)})\n`;
    if (cpu.state.c !== data.c) errorMsg += `C mismatch (expected: 0x${data.c.toString(16)}, got: 0x${cpu.state.c.toString(16)})\n`;
    if (cpu.state.d !== data.d) errorMsg += `D mismatch (expected: 0x${data.d.toString(16)}, got: 0x${cpu.state.d.toString(16)})\n`;
    if (cpu.state.e !== data.e) errorMsg += `E mismatch (expected: 0x${data.e.toString(16)}, got: 0x${cpu.state.e.toString(16)})\n`;
    if (cpu.state.f !== data.f) errorMsg += `F mismatch (expected: 0x${data.f.toString(16)} [${getFlagState(data.f)}], got: 0x${cpu.state.f.toString(16)} [${getFlagState(cpu.state.f)}])\n`;
    if (cpu.state.h !== data.h) errorMsg += `H mismatch (expected: 0x${data.h.toString(16)}, got: 0x${cpu.state.h.toString(16)})\n`;
    if (cpu.state.l !== data.l) errorMsg += `L mismatch (expected: 0x${data.l.toString(16)}, got: 0x${cpu.state.l.toString(16)})\n`;
    if (cpu.state.pc !== data.pc) errorMsg += `PC mismatch (expected: 0x${data.pc.toString(16)}, got: 0x${cpu.state.pc.toString(16)})\n`;
    if (cpu.state.sp !== data.sp) errorMsg += `SP mismatch (expected: 0x${data.sp.toString(16)}, got: 0x${cpu.state.sp.toString(16)})\n`;

    // Check RAM values
    for (const [address, expectedValue] of data.ram) {
        const actual = cpu.mmu.read(address);
        if (actual !== expectedValue) {
            errorMsg += `Memory at 0x${address.toString(16)} mismatch (expected: 0x${expectedValue.toString(16)}, got: 0x${actual.toString(16)})\n`;
        }
    }

    // Check cycles
    if (cycles !== test.cycles.length * 4) {
        errorMsg += `Cycles mismatch (expected: ${test.cycles.length * 4}, got: ${cycles})\n`;
    }

    if (errorMsg) {
        throw new Error(`${errorMsg}\n${getDebugState(cpu, test)}`);
    }
}

// Pre-load all test da
const testFiles = readdirSync(testDataDirectory)
    .filter(file => path.extname(file) === '.json')
    .map(file => ({
        opcode: path.basename(file, '.json'),
        tests: JSON.parse(readFileSync(path.join(testDataDirectory, file), 'utf-8')) as CpuTest[]
    }));

testFiles.forEach(({ opcode, tests }) => {
    describe.concurrent(`0x${opcode}`, () => {
        it(`executes all test cases (${tests.length} cases)`, () => {
            const cpu = new Cpu(new MmuMock());
            
            tests.forEach((test, index) => {
                try {
                    setupInitialValues(cpu, test.initial);
                    const cycles = cpu.step();
                    assertCpuState(cpu, cycles, test);
                } catch (error) {
                    throw new Error(`Failed at test case ${test.name} (${index + 1}):\n\n${error.message}`);
                }
            });
        });
    });
});
