import { BitUtils } from "../common/bit-utils";
import CpuState, { Register16Bit, Register8Bit } from "./cpu-state";
import Mmu from "./memory";

export interface InstructionState {
    address: number;
    value: number;


    tCycles: number;
    mCycles: number;
}

export interface Instruction {
    opcode: number;
    mnemonic?: string;
    operations: InstructionOperation[];
}





export default class OpcodeTable {
    private static operations = {
        
        

    private static readonly opcodeTable: Instruction[] = [
        OpcodeTable.createInstruction(0x00, "NOP", []),
        OpcodeTable.createInstruction(0x01, "LD BC, nn", [...OpcodeTable.operations.read16Bit(Operand16Bit.Immediate), ...OpcodeTable.operations.write16Bit(Operand16Bit.BC)]),
        OpcodeTable.createInstruction(0x02, "LD (BC), A", [Operations.registerRead8Bit(Register8Bit.A), Operations.writeRegister8Bit(Register16Bit.BC)]),
        OpcodeTable.createInstruction(0x03, "INC BC", [Operations.registerRead16Bit(Register16Bit.BC), Operations.incrementRegister16Bit(Register16Bit.BC), Operations.registerWrite16Bit(Register16Bit.BC)]),
    ];

    private constructor() {}

    fetch(opcode: number): Instruction {
        return OpcodeTable.opcodeTable[opcode];
    }

    private static createInstruction(opcode: number, mnemonic: string, operations: InstructionOperation[]): Instruction {
        return {
            opcode,
            mnemonic,
            operations: [Operations.opcodeFetch, ...operations]
        };
    }

    private static operand8BitToRegister(operand: Operand8Bit): Register8Bit {
        switch (operand) {
            case Operand8Bit.A:
                return Register8Bit.A;
            case Operand8Bit.B:
                return Register8Bit.B;
            case Operand8Bit.C:
                return Register8Bit.C;
            case Operand8Bit.D:
                return Register8Bit.D;
            case Operand8Bit.E:
                return Register8Bit.E;
            case Operand8Bit.H:
                return Register8Bit.H;
            case Operand8Bit.L:
                return Register8Bit.L;
            default:
                throw new Error("Invalid operand");
        }
    }

    private static indirect16BitToRegister(operand: Operand8Bit): Register16Bit {
        switch (operand) {
            case Operand8Bit.IndirectBC:
                return Register16Bit.BC;
            case Operand8Bit.IndirectDE:
                return Register16Bit.DE;
            case Operand8Bit.IndirectHL:
                return Register16Bit.HL;
            default:
                throw new Error("Invalid operand");
        }
    }
    
    private static operand16BitToRegister(operand: Operand16Bit): Register16Bit {
        switch (operand) {
            case Operand16Bit.AF:
                return Register16Bit.AF;
            case Operand16Bit.BC:
                return Register16Bit.BC;
            case Operand16Bit.DE:
                return Register16Bit.DE;
            case Operand16Bit.HL:
                return Register16Bit.HL;
            case Operand16Bit.SP:
                return Register16Bit.SP;
            case Operand16Bit.PC:
                return Register16Bit.PC;
            default:
                throw new Error("Invalid operand");
        }
    }
    
    private static memoryCycle(instructionState: InstructionState) {
        instructionState.tCycles += 4;
        instructionState.mCycles += 1;
    }

}