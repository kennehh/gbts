import Mmu from "./memory";
import CpuState from "./cpu-state";

interface CachedBlock {
    address: number;
    data: Uint8Array;
}

export default class Cpu {
    // private cache: Map<number, CachedBlock>;
    private registers: CpuState;
    private mmu: Mmu;

    constructor() {
        this.registers = new CpuState();
        this.mmu = new Mmu();
    }

    reset() {
        this.registers.reset();
        this.mmu.reset();
    }

    step() {
        const opcode = this.fetch();
        this.execute(opcode);
    }

    private fetch() {
        const pc = this.registers.pc;
        this.registers.pc++;
        return this.mmu.read(pc);
    }

    private decode(opcode: number): Instruction {
        return {
            opcode: 0x00,
            cycles: 0,
            execute: (cpu: Cpu) => {}
        };
    }

    private execute(opcode: number) {
        const instruction = this.decode(opcode);
        instruction.execute(this);
    }
}