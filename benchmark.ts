import { readFileSync } from "fs";
import { createMockGameBoy } from "./src/mocks/gameboy";
import { CpuStatus } from "./src/core/cpu/types";

// Original Game Boy CPU speed in Hz
const GAMEBOY_CLOCK_SPEED = 4_194_304;

interface BenchmarkResult {
    executionTimeMs: number;
    totalCycles: number;
    instructionsExecuted: number;
    averageCyclesPerInstruction: number;
    cyclesPerSecond: number;
    speedupFactor: number;  // How many times faster than original Game Boy
}

async function benchmarkRom(romPath: string): Promise<BenchmarkResult> {
    const romBuffer = readFileSync(romPath);
    const gb = createMockGameBoy();
    await gb.loadRom(romBuffer);

    const startTime = process.hrtime.bigint();
    let totalCycles = 0n;
    let instructionsExecuted = 0;

    while (true) {
        const halted = gb.cpu.state.status === CpuStatus.Halted;
        const lastPC = gb.cpu.state.pc;
        
        const cycles = gb.stepInstruction();
        totalCycles += BigInt(cycles);
        instructionsExecuted++;

        if (lastPC === gb.cpu.state.pc && !halted) {
            break;
        }
    }

    const endTime = process.hrtime.bigint();
    const executionTimeNs = endTime - startTime;
    const executionTimeMs = Number(executionTimeNs) / 1_000_000;
    const cyclesPerSecond = Number(totalCycles) / (Number(executionTimeNs) / 1_000_000_000);

    return {
        executionTimeMs,
        totalCycles: Number(totalCycles),
        instructionsExecuted,
        averageCyclesPerInstruction: Number(totalCycles) / instructionsExecuted,
        cyclesPerSecond,
        speedupFactor: cyclesPerSecond / GAMEBOY_CLOCK_SPEED
    };
}

function formatSpeedup(factor: number): string {
    if (factor >= 1) {
        return `${factor.toFixed(1)}x faster`;
    } else {
        return `${(1 / factor).toFixed(1)}x slower`;
    }
}

function getEmulationTimeOnRealGameBoy(cycles: number): number {
    return (cycles / GAMEBOY_CLOCK_SPEED) * 1000; // Convert to milliseconds
}

async function runBenchmarks(romPath: string, iterations = 5) {
    console.log(`Running ${iterations} benchmarks for ${romPath}`);
    console.log('----------------------------------------');
    console.log(`Original Game Boy Clock Speed: ${(GAMEBOY_CLOCK_SPEED / 1_000_000).toFixed(2)} MHz`);
    console.log('----------------------------------------');

    const results: BenchmarkResult[] = [];

    for (let i = 0; i < iterations; i++) {
        const result = await benchmarkRom(romPath);
        results.push(result);
        
        const realGBTime = getEmulationTimeOnRealGameBoy(result.totalCycles);
        
        console.log(`\nIteration ${i + 1}:`);
        console.log(`Execution time: ${result.executionTimeMs.toFixed(2)}ms`);
        console.log(`Time on real Game Boy: ${realGBTime.toFixed(2)}ms`);
        console.log(`Relative speed: ${formatSpeedup(result.speedupFactor)}`);
        console.log(`Total cycles: ${result.totalCycles.toLocaleString()}`);
        console.log(`Instructions executed: ${result.instructionsExecuted.toLocaleString()}`);
        console.log(`Average cycles per instruction: ${result.averageCyclesPerInstruction.toFixed(2)}`);
        console.log(`Cycles per second: ${result.cyclesPerSecond.toLocaleString()}`);
    }

    // Calculate averages
    const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0) / results.length;
    const avgCycles = results.reduce((sum, r) => sum + r.totalCycles, 0) / results.length;
    const avgInstructions = results.reduce((sum, r) => sum + r.instructionsExecuted, 0) / results.length;
    const avgSpeedup = results.reduce((sum, r) => sum + r.speedupFactor, 0) / results.length;
    const avgRealGBTime = getEmulationTimeOnRealGameBoy(avgCycles);

    console.log('\nAverage Results:');
    console.log('----------------------------------------');
    console.log(`Execution time: ${avgExecutionTime.toFixed(2)}ms`);
    console.log(`Time on real Game Boy: ${avgRealGBTime.toFixed(2)}ms`);
    console.log(`Relative speed: ${formatSpeedup(avgSpeedup)}`);
    console.log(`Total cycles: ${avgCycles.toFixed(0)}`);
    console.log(`Instructions executed: ${avgInstructions.toFixed(0)}`);
    console.log(`Average cycles per instruction: ${(avgCycles / avgInstructions).toFixed(2)}`);
    console.log(`Average cycles per second: ${((avgCycles / avgExecutionTime) * 1000).toFixed(0)}`);
}

// Run the benchmark
const romPath = 'tests/__fixtures__/roms/blargg/cpu_instrs/individual/09-op r,r.gb';
void runBenchmarks(romPath);
