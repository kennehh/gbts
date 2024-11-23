export enum OperationType {
    MemoryRead,
    MemoryWrite,
    Internal
}

export interface InstructionOperation {
    type: OperationType;
    execute?: (instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) => void;
}

export enum Operand8Bit {
    A,
    B,
    C,
    D,
    E,
    H,
    L,
    Immediate,
    IndirectBC,
    IndirectDE,
    IndirectHL,
    IndirectImmediate8Bit,
    IndirectImmediate16Bit,
    IndirectC,
}

export enum Operand16Bit {
    AF,
    BC,
    DE,
    HL,
    SP,
    PC,
    Immediate,
    IndirectImmediate
}

export namespace InstructionOperations {
    const opcodeFetch: InstructionOperation = {
        type: OperationType.MemoryRead,
        execute: (instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) => {
            // Opcode already has been fetched in decode step
            instructionState.address = cpuState.pc++;
            OpcodeTable.memoryCycle(instructionState);
        }
    };
    
    function read8Bit(operand: Operand8Bit): InstructionOperation[] {
        switch (operand) {
            case Operand8Bit.A:
            case Operand8Bit.B:
            case Operand8Bit.C:
            case Operand8Bit.D:
            case Operand8Bit.E:
            case Operand8Bit.H:
            case Operand8Bit.L:
                const register8Bit = OpcodeTable.operand8BitToRegister(operand);
                return [{
                    type: OperationType.Internal,
                    execute(instructionState: InstructionState, cpuState: CpuState, _mmu: Mmu) {
                        instructionState.value = cpuState.readRegister8Bit(register8Bit);
                    }
                }];
            case Operand8Bit.Immediate:
                return [{
                    type: OperationType.MemoryRead,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        instructionState.address = cpuState.pc++;
                        instructionState.value = mmu.read(instructionState.address);
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }];
            case Operand8Bit.IndirectBC:
            case Operand8Bit.IndirectDE:
            case Operand8Bit.IndirectHL:
                const register16Bit = OpcodeTable.indirect16BitToRegister(operand);
                return [{
                    type: OperationType.MemoryRead,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        instructionState.address = cpuState.readRegister16Bit(register16Bit);
                        instructionState.value = mmu.read(instructionState.address);
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }];
            case Operand8Bit.IndirectImmediate8Bit:
                return [{
                    type: OperationType.MemoryRead,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        instructionState.address = mmu.read(cpuState.pc++);
                        instructionState.value = mmu.read(instructionState.address);
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }];
            case Operand8Bit.IndirectImmediate16Bit:
                return [{
                    type: OperationType.MemoryRead,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        const address = mmu.read(cpuState.pc++);
                        instructionState.address = mmu.read(address);
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }, {
                    type: OperationType.MemoryRead,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        const address = mmu.read(cpuState.pc++);
                        instructionState.address |= mmu.read(address) << 8;
                        instructionState.value = mmu.read(instructionState.address);
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }];
            case Operand8Bit.IndirectC:
                return [{
                    type: OperationType.Internal,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        instructionState.address = 0xFF00 + cpuState.c;
                        instructionState.value = mmu.read(instructionState.address);
                    }
                }];
            default:
                throw new Error("Invalid operand");
        }
    },
    function read16Bit(operand: Operand16Bit): InstructionOperation[] {
        switch (operand) {
            case Operand16Bit.AF:
            case Operand16Bit.BC:
            case Operand16Bit.DE:
            case Operand16Bit.HL:
            case Operand16Bit.SP:
            case Operand16Bit.PC:
                const register16Bit = OpcodeTable.operand16BitToRegister(operand);
                return [{
                    type: OperationType.Internal,
                    execute(instructionState: InstructionState, cpuState: CpuState, _mmu: Mmu) {
                        instructionState.value = cpuState.readRegister16Bit(register16Bit);
                    }
                }];
            case Operand16Bit.Immediate:
                return [{
                    type: OperationType.MemoryRead,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        instructionState.value = cpuState.pc++;
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }, {
                    type: OperationType.MemoryRead,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        instructionState.value |= cpuState.pc++ << 8;
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }];
            case Operand16Bit.IndirectImmediate:
                return [{
                    type: OperationType.MemoryRead,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        const address = mmu.read(cpuState.pc++);
                        instructionState.address = mmu.read(address);
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }, {
                    type: OperationType.MemoryRead,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        const address = mmu.read(cpuState.pc++);
                        instructionState.address |= mmu.read(address) << 8;
                        instructionState.value = mmu.read(instructionState.address);
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }];
        }
    },
    function write8Bit(operand: Operand8Bit): InstructionOperation[] {
        switch (operand) {
            case Operand8Bit.A:
            case Operand8Bit.B:
            case Operand8Bit.C:
            case Operand8Bit.D:
            case Operand8Bit.E:
            case Operand8Bit.H:
            case Operand8Bit.L:
                const register8Bit = OpcodeTable.operand8BitToRegister(operand);
                return [{
                    type: OperationType.Internal,
                    execute(instructionState: InstructionState, cpuState: CpuState, _mmu: Mmu) {
                        cpuState.writeRegister8Bit(register8Bit, instructionState.value);
                    }
                }];
            case Operand8Bit.IndirectBC:
            case Operand8Bit.IndirectDE:
            case Operand8Bit.IndirectHL:
                const register16Bit = OpcodeTable.indirect16BitToRegister(operand);
                return [{
                    type: OperationType.MemoryWrite,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        mmu.write(cpuState.readRegister16Bit(register16Bit), instructionState.value);
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }];
            case Operand8Bit.IndirectImmediate8Bit:
                return [{
                    type: OperationType.MemoryRead,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        instructionState.address = mmu.read(cpuState.pc++);
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }, {
                    type: OperationType.MemoryWrite,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        mmu.write(instructionState.address, instructionState.value);
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }];
            case Operand8Bit.IndirectImmediate16Bit:
                return [{
                    type: OperationType.MemoryRead,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        instructionState.address = mmu.read(cpuState.pc++);
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }, {
                    type: OperationType.MemoryRead,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        instructionState.address |= mmu.read(cpuState.pc++) << 8;
                        instructionState.value = mmu.read(instructionState.address);
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }];
            case Operand8Bit.IndirectC:
                return [{
                    type: OperationType.MemoryWrite,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        mmu.write(0xFF00 + cpuState.c, instructionState.value);
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }];
            default:
                throw new Error("Invalid operand");
        }
    },
    function write16Bit(operand: Operand16Bit): InstructionOperation[] {
        switch (operand) {
            case Operand16Bit.AF:
            case Operand16Bit.BC:
            case Operand16Bit.DE:
            case Operand16Bit.HL:
            case Operand16Bit.SP:
            case Operand16Bit.PC:
                const register16Bit = OpcodeTable.operand16BitToRegister(operand);
                return [{
                    type: OperationType.Internal,
                    execute(instructionState: InstructionState, cpuState: CpuState, _mmu: Mmu) {
                        cpuState.writeRegister16Bit(register16Bit, instructionState.value);
                    }
                }];
            case Operand16Bit.IndirectImmediate:
                return [{
                    type: OperationType.MemoryRead,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        const address = mmu.read(cpuState.pc++);
                        instructionState.address = mmu.read(address);
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }, {
                    type: OperationType.MemoryRead,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        const address = mmu.read(cpuState.pc++);
                        instructionState.address |= mmu.read(address) << 8;
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }, {
                    type: OperationType.MemoryWrite,
                    execute(instructionState: InstructionState, cpuState: CpuState, mmu: Mmu) {
                        mmu.write(instructionState.address, instructionState.value);
                        OpcodeTable.memoryCycle(instructionState);
                    }
                }];
            default:
                throw new Error("Invalid operand");
        }
    }
}