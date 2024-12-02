import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import CpuState, { CpuStatus, RegisterFlag } from '../../src/emulator/cpu-state';
import Cpu from '../../src/emulator/cpu';
import { assert } from 'console';

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

const testFiles = readdirSync(testDataDirectory)
    .filter(file => path.extname(file) === '.json')
    .map(file => ({
        opcode: path.basename(file, '.json'),
        tests: JSON.parse(readFileSync(path.join(testDataDirectory, file), 'utf-8')) as CpuTest[]
    }));

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
    const testName = test.name;

    // Not using expect() because it's too slow for this many test cases

    // Check registers
    if (cpu.state.a !== data.a) throw new Error(`A is incorrect: ${testName} (expected ${data.a}, got ${cpu.state.a})`);
    if (cpu.state.b !== data.b) throw new Error(`B is incorrect: ${testName} (expected ${data.b}, got ${cpu.state.b})`);
    if (cpu.state.c !== data.c) throw new Error(`C is incorrect: ${testName} (expected ${data.c}, got ${cpu.state.c})`);
    if (cpu.state.d !== data.d) throw new Error(`D is incorrect: ${testName} (expected ${data.d}, got ${cpu.state.d})`);
    if (cpu.state.e !== data.e) throw new Error(`E is incorrect: ${testName} (expected ${data.e}, got ${cpu.state.e})`);
    if (cpu.state.f !== data.f) throw new Error(`F is incorrect: ${testName} (expected ${data.f}, got ${cpu.state.f})`);
    if (cpu.state.h !== data.h) throw new Error(`H is incorrect: ${testName} (expected ${data.h}, got ${cpu.state.h})`);
    if (cpu.state.l !== data.l) throw new Error(`L is incorrect: ${testName} (expected ${data.l}, got ${cpu.state.l})`);
    if (cpu.state.pc !== data.pc) throw new Error(`PC is incorrect: ${testName} (expected ${data.pc}, got ${cpu.state.pc})`);
    if (cpu.state.sp !== data.sp) throw new Error(`SP is incorrect: ${testName} (expected ${data.sp}, got ${cpu.state.sp})`);

    // Check RAM values
    for (const [address, expectedValue] of data.ram) {
        const actual = cpu.mmu.read(address);
        if (actual !== expectedValue) {
            throw new Error(
                `Memory at 0x${address.toString(16)} is incorrect: ${testName} (expected ${expectedValue}, got ${actual})`
            );
        }
    }

    // Check cycles
    const expectedCycles = test.cycles.length * 4;
    if (cycles !== expectedCycles) {
        throw new Error(
            `Cycles is incorrect: ${testName} (expected ${expectedCycles}, got ${cycles})`
        );
    }
}

testFiles.forEach(({ opcode, tests }) => {
    describe.concurrent(`0x${opcode}`, () => {
        const cpu = new Cpu();
        
        it(`executes ${tests.length} test cases`, () => {
            tests.forEach((test, index) => {
                try {
                    setupInitialValues(cpu, test.initial);
                    const cycles = cpu.step();
                    assertCpuState(cpu, cycles, test);
                } catch (error) {
                    throw new Error(`Failed at test case ${index + 1}: ${test.name}\n${error.message}`);
                }
            });
        });
    });
});
