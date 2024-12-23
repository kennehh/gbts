import { IMmu } from "../memory/mmu";
import { CpuState, CpuStatus, RegisterFlag } from "./cpu-state";
import { InterruptManager } from "./interrupt-manager";

const enum Operand8Bit {
    B = 0,
    C = 1,
    D = 2,
    E = 3,
    H = 4,
    L = 5,
    IndirectHL = 6,
    A = 7,
    IndirectBC = 8,
    IndirectDE = 9,
    Immediate = 10,
    IndirectImmediate8Bit = 11,
    IndirectImmediate16Bit = 12,
    IndirectC = 13
}

const enum Operand16Bit {
    SP = 0,
    AF = 1,
    PC = 2,
    HL = 3,
    BC = 4,
    DE = 5,
    Immediate = 6,
    IndirectImmediate = 7
}

export class Cpu {
    readonly state: CpuState = new CpuState();

    constructor(
        private interruptManager: InterruptManager,
        private mmu: IMmu
    ) {}

    step() {
        this.state.currentInstructionCycles = 0;

        if (this.state.status === CpuStatus.Running) {
            if (this.state.eiPending) {
                this.state.eiPending = false;
                this.interruptManager.ime = true
            }
            const opcode = this.readImmediate8Bit();
            this.execute(opcode);
        } else {
            this.tickMCycle();
        }

        this.checkInterrupts();

        return this.state.currentInstructionCycles;
    }

    reset() {
        this.state.reset(this.mmu.bootRomLoaded);
    }

    private execute(opcode: number) {
        switch (opcode) {
            case 0x00: break;

            case 0x01: this.ld_16_16(Operand16Bit.BC, Operand16Bit.Immediate); break;
            case 0x02: this.ld_8_8(Operand8Bit.IndirectBC, Operand8Bit.A); break;
            case 0x03: this.inc_16(Operand16Bit.BC); break;
            case 0x04: this.inc_8(Operand8Bit.B); break;
            case 0x05: this.dec_8(Operand8Bit.B); break;
            case 0x06: this.ld_8_8(Operand8Bit.B, Operand8Bit.Immediate); break;
            case 0x07: this.rlc_a(); break;
            case 0x08: this.ld_16_16(Operand16Bit.IndirectImmediate, Operand16Bit.SP); break;
            case 0x09: this.add_hl_r16(Operand16Bit.BC); break;
            case 0x0a: this.ld_8_8(Operand8Bit.A, Operand8Bit.IndirectBC); break;
            case 0x0b: this.dec_16(Operand16Bit.BC); break;
            case 0x0c: this.inc_8(Operand8Bit.C); break;
            case 0x0d: this.dec_8(Operand8Bit.C); break;
            case 0x0e: this.ld_8_8(Operand8Bit.C, Operand8Bit.Immediate); break;
            case 0x0f: this.rrc_a(); break;

            case 0x10: this.stop(); break;
            case 0x11: this.ld_16_16(Operand16Bit.DE, Operand16Bit.Immediate); break;
            case 0x12: this.ld_8_8(Operand8Bit.IndirectDE, Operand8Bit.A); break;
            case 0x13: this.inc_16(Operand16Bit.DE); break;
            case 0x14: this.inc_8(Operand8Bit.D); break;
            case 0x15: this.dec_8(Operand8Bit.D); break;
            case 0x16: this.ld_8_8(Operand8Bit.D, Operand8Bit.Immediate); break;
            case 0x17: this.rl_a(); break;
            case 0x18: this.jr_i8(); break;
            case 0x19: this.add_hl_r16(Operand16Bit.DE); break;
            case 0x1a: this.ld_8_8(Operand8Bit.A, Operand8Bit.IndirectDE); break;
            case 0x1b: this.dec_16(Operand16Bit.DE); break;
            case 0x1c: this.inc_8(Operand8Bit.E); break;
            case 0x1d: this.dec_8(Operand8Bit.E); break;
            case 0x1e: this.ld_8_8(Operand8Bit.E, Operand8Bit.Immediate); break;
            case 0x1f: this.rr_a(); break;

            case 0x20: this.jr_i8_cond(RegisterFlag.Zero, false); break;
            case 0x21: this.ld_16_16(Operand16Bit.HL, Operand16Bit.Immediate); break;
            case 0x22: this.ld_hl_a(1); break;
            case 0x23: this.inc_16(Operand16Bit.HL); break;
            case 0x24: this.inc_8(Operand8Bit.H); break;
            case 0x25: this.dec_8(Operand8Bit.H); break;
            case 0x26: this.ld_8_8(Operand8Bit.H, Operand8Bit.Immediate); break;
            case 0x27: this.daa(); break;
            case 0x28: this.jr_i8_cond(RegisterFlag.Zero, true); break;
            case 0x29: this.add_hl_r16(Operand16Bit.HL); break;
            case 0x2a: this.ld_a_hl(1); break;
            case 0x2b: this.dec_16(Operand16Bit.HL); break;
            case 0x2c: this.inc_8(Operand8Bit.L); break;
            case 0x2d: this.dec_8(Operand8Bit.L); break;
            case 0x2e: this.ld_8_8(Operand8Bit.L, Operand8Bit.Immediate); break;
            case 0x2f: this.cpl(); break;

            case 0x30: this.jr_i8_cond(RegisterFlag.Carry, false); break;
            case 0x31: this.ld_16_16(Operand16Bit.SP, Operand16Bit.Immediate); break;
            case 0x32: this.ld_hl_a(-1); break;
            case 0x33: this.inc_16(Operand16Bit.SP); break;
            case 0x34: this.inc_8(Operand8Bit.IndirectHL); break;
            case 0x35: this.dec_8(Operand8Bit.IndirectHL); break;
            case 0x36: this.ld_8_8(Operand8Bit.IndirectHL, Operand8Bit.Immediate); break;
            case 0x37: this.scf(); break;
            case 0x38: this.jr_i8_cond(RegisterFlag.Carry, true); break;
            case 0x39: this.add_hl_r16(Operand16Bit.SP); break;
            case 0x3a: this.ld_a_hl(-1); break;
            case 0x3b: this.dec_16(Operand16Bit.SP); break;
            case 0x3c: this.inc_8(Operand8Bit.A); break;
            case 0x3d: this.dec_8(Operand8Bit.A); break;
            case 0x3e: this.ld_8_8(Operand8Bit.A, Operand8Bit.Immediate); break;
            case 0x3f: this.ccf(); break;

            case 0x76: this.halt(); break;

            case 0x40: case 0x41: case 0x42: case 0x43: case 0x44: case 0x45: case 0x46: case 0x47: // ld b, r
            case 0x48: case 0x49: case 0x4A: case 0x4B: case 0x4C: case 0x4D: case 0x4E: case 0x4F: // ld c, r
            case 0x50: case 0x51: case 0x52: case 0x53: case 0x54: case 0x55: case 0x56: case 0x57: // ld d, r
            case 0x58: case 0x59: case 0x5A: case 0x5B: case 0x5C: case 0x5D: case 0x5E: case 0x5F: // ld e, r
            case 0x60: case 0x61: case 0x62: case 0x63: case 0x64: case 0x65: case 0x66: case 0x67: // ld h, r
            case 0x68: case 0x69: case 0x6A: case 0x6B: case 0x6C: case 0x6D: case 0x6E: case 0x6F: // ld l, r
            case 0x70: case 0x71: case 0x72: case 0x73: case 0x74: case 0x75: case 0x77:            // ld (hl), r
            case 0x78: case 0x79: case 0x7A: case 0x7B: case 0x7C: case 0x7D: case 0x7E: case 0x7F: // ld a, r
                this.ld_8_8(opcode >> 3 & 0x07, opcode & 0x07);
                break;

            case 0x80: case 0x81: case 0x82: case 0x83: case 0x84: case 0x85: case 0x86: case 0x87: // add a, r
                this.add_a(opcode & 0x07);
                break;

            case 0x88: case 0x89: case 0x8A: case 0x8B: case 0x8C: case 0x8D: case 0x8E: case 0x8F: // adc a, r
                this.adc_a(opcode & 0x07);
                break;

            case 0x90: case 0x91: case 0x92: case 0x93: case 0x94: case 0x95: case 0x96: case 0x97: // sub a, r
                this.sub_a(opcode & 0x07);
                break;
        
                // SBC A instructions (0x98-0x9F)
            case 0x98: case 0x99: case 0x9A: case 0x9B: case 0x9C: case 0x9D: case 0x9E: case 0x9F: // sbc a, r
                this.sbc_a(opcode & 0x07);
                break;
        
                // AND A instructions (0xA0-0xA7)
            case 0xA0: case 0xA1: case 0xA2: case 0xA3: case 0xA4: case 0xA5: case 0xA6: case 0xA7: // and a, r
                this.and_a(opcode & 0x07);
                break;
        
                // XOR A instructions (0xA8-0xAF)
            case 0xA8: case 0xA9: case 0xAA: case 0xAB: case 0xAC: case 0xAD: case 0xAE: case 0xAF: // xor a, r
                this.xor_a(opcode & 0x07);
                break;
        
                // OR A instructions (0xB0-0xB7)
            case 0xB0: case 0xB1: case 0xB2: case 0xB3: case 0xB4: case 0xB5: case 0xB6: case 0xB7: // or a, r
                this.or_a(opcode & 0x07);
                break;
        
                // CP A instructions (0xB8-0xBF)
            case 0xB8: case 0xB9: case 0xBA: case 0xBB: case 0xBC: case 0xBD: case 0xBE: case 0xBF: // cp a, r
                this.cp_a(opcode & 0x07);
                break;

            case 0xc0: this.ret_cond(RegisterFlag.Zero, false); break;
            case 0xc1: this.pop(Operand16Bit.BC); break;
            case 0xc2: this.jp_i16_cond(RegisterFlag.Zero, false); break;
            case 0xc3: this.jp_i16(); break;
            case 0xc4: this.call_i16_cond(RegisterFlag.Zero, false); break;
            case 0xc5: this.push(Operand16Bit.BC); break;
            case 0xc6: this.add_a(Operand8Bit.Immediate); break;
            case 0xc7: this.rst(0x00); break;
            case 0xc8: this.ret_cond(RegisterFlag.Zero, true); break;
            case 0xc9: this.ret(); break;
            case 0xca: this.jp_i16_cond(RegisterFlag.Zero, true); break;
            case 0xcb: this.executeCBInstruction(this.readImmediate8Bit()); break;
            case 0xcc: this.call_i16_cond(RegisterFlag.Zero, true); break;
            case 0xcd: this.call_i16(); break;
            case 0xce: this.adc_a(Operand8Bit.Immediate); break;
            case 0xcf: this.rst(0x08); break;

            case 0xd0: this.ret_cond(RegisterFlag.Carry, false); break;
            case 0xd1: this.pop(Operand16Bit.DE); break;
            case 0xd2: this.jp_i16_cond(RegisterFlag.Carry, false); break;
            // no 0xd3
            case 0xd4: this.call_i16_cond(RegisterFlag.Carry, false); break;
            case 0xd5: this.push(Operand16Bit.DE); break;
            case 0xd6: this.sub_a(Operand8Bit.Immediate); break;
            case 0xd7: this.rst(0x10); break;
            case 0xd8: this.ret_cond(RegisterFlag.Carry, true); break;
            case 0xd9: this.reti(); break;
            case 0xda: this.jp_i16_cond(RegisterFlag.Carry, true); break;
            // no 0xdb
            case 0xdc: this.call_i16_cond(RegisterFlag.Carry, true); break;
            // no 0xdd
            case 0xde: this.sbc_a(Operand8Bit.Immediate); break;
            case 0xdf: this.rst(0x18); break;

            case 0xe0: this.ld_8_8(Operand8Bit.IndirectImmediate8Bit, Operand8Bit.A); break;
            case 0xe1: this.pop(Operand16Bit.HL); break;
            case 0xe2: this.ld_8_8(Operand8Bit.IndirectC, Operand8Bit.A); break;
            // no 0xe3
            // no 0xe4
            case 0xe5: this.push(Operand16Bit.HL); break;
            case 0xe6: this.and_a(Operand8Bit.Immediate); break;
            case 0xe7: this.rst(0x20); break;
            case 0xe8: this.add_sp_i8(); break;
            case 0xe9: this.jp_hl(); break;
            case 0xea: this.ld_8_8(Operand8Bit.IndirectImmediate16Bit, Operand8Bit.A); break;
            // no 0xeb
            // no 0xec
            // no 0xed
            case 0xee: this.xor_a(Operand8Bit.Immediate); break;
            case 0xef: this.rst(0x28); break;

            case 0xf0: this.ld_8_8(Operand8Bit.A, Operand8Bit.IndirectImmediate8Bit); break;
            case 0xf1: this.pop_af(); break;
            case 0xf2: this.ld_8_8(Operand8Bit.A, Operand8Bit.IndirectC); break;
            case 0xf3: this.di(); break;
            // no 0xf4
            case 0xf5: this.push(Operand16Bit.AF); break;
            case 0xf6: this.or_a(Operand8Bit.Immediate); break;
            case 0xf7: this.rst(0x30); break;
            case 0xf8: this.ld_hl_spi8(); break;
            case 0xf9: this.ld_sp_hl(); break;
            case 0xfa: this.ld_8_8(Operand8Bit.A, Operand8Bit.IndirectImmediate16Bit); break;
            case 0xfb: this.ei(); break;
            // no 0xfc
            // no 0xfd
            case 0xfe: this.cp_a(Operand8Bit.Immediate); break;
            case 0xff: this.rst(0x38); break;

            default:
                console.warn(`Undefined opcode: 0x${opcode.toString(16)}`);
                break;
        }

    }

    private executeCBInstruction(cbOpcode: number): void {
        const operand = (cbOpcode & 0x07) as Operand8Bit;
    
        switch (cbOpcode) {
          case 0x00: case 0x01: case 0x02: case 0x03: case 0x04: case 0x05: case 0x06: case 0x07: // rlc r
            this.rlc(operand);
            break;
    
          // RRC instructions (0x08-0x0F)
          case 0x08: case 0x09: case 0x0A: case 0x0B: case 0x0C: case 0x0D: case 0x0E: case 0x0F: // rrc r
            this.rrc(operand);
            break;
    
          // RL instructions (0x10-0x17)
          case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16: case 0x17: // rl r
            this.rl(operand);
            break;
    
          // RR instructions (0x18-0x1F)
          case 0x18: case 0x19: case 0x1A: case 0x1B: case 0x1C: case 0x1D: case 0x1E: case 0x1F: // rr r
            this.rr(operand);
            break;
    
          case 0x20: case 0x21: case 0x22: case 0x23: case 0x24: case 0x25: case 0x26: case 0x27: // sla r
            this.sla(operand);
            break;
    
          case 0x28: case 0x29: case 0x2A: case 0x2B: case 0x2C: case 0x2D: case 0x2E: case 0x2F: // sra r
            this.sra(operand);
            break;
    
          case 0x30: case 0x31: case 0x32: case 0x33: case 0x34: case 0x35: case 0x36: case 0x37: // swap r
            this.swap(operand);
            break;
    
          case 0x38: case 0x39: case 0x3A: case 0x3B: case 0x3C: case 0x3D: case 0x3E: case 0x3F: // srl r
            this.srl(operand);
            break;
    
          case 0x40: case 0x41: case 0x42: case 0x43: case 0x44: case 0x45: case 0x46: case 0x47: // bit 0, r
          case 0x48: case 0x49: case 0x4A: case 0x4B: case 0x4C: case 0x4D: case 0x4E: case 0x4F: // bit 1, r
          case 0x50: case 0x51: case 0x52: case 0x53: case 0x54: case 0x55: case 0x56: case 0x57: // bit 2, r
          case 0x58: case 0x59: case 0x5A: case 0x5B: case 0x5C: case 0x5D: case 0x5E: case 0x5F: // bit 3, r
          case 0x60: case 0x61: case 0x62: case 0x63: case 0x64: case 0x65: case 0x66: case 0x67: // bit 4, r
          case 0x68: case 0x69: case 0x6A: case 0x6B: case 0x6C: case 0x6D: case 0x6E: case 0x6F: // bit 5, r
          case 0x70: case 0x71: case 0x72: case 0x73: case 0x74: case 0x75: case 0x76: case 0x77: // bit 6, r
          case 0x78: case 0x79: case 0x7A: case 0x7B: case 0x7C: case 0x7D: case 0x7E: case 0x7F: // bit 7, r
            this.bit(operand, (cbOpcode >> 3) & 0x07);
            break;
    
          case 0x80: case 0x81: case 0x82: case 0x83: case 0x84: case 0x85: case 0x86: case 0x87: // res 0, r
          case 0x88: case 0x89: case 0x8A: case 0x8B: case 0x8C: case 0x8D: case 0x8E: case 0x8F: // res 1, r
          case 0x90: case 0x91: case 0x92: case 0x93: case 0x94: case 0x95: case 0x96: case 0x97: // res 2, r
          case 0x98: case 0x99: case 0x9A: case 0x9B: case 0x9C: case 0x9D: case 0x9E: case 0x9F: // res 3, r
          case 0xA0: case 0xA1: case 0xA2: case 0xA3: case 0xA4: case 0xA5: case 0xA6: case 0xA7: // res 4, r
          case 0xA8: case 0xA9: case 0xAA: case 0xAB: case 0xAC: case 0xAD: case 0xAE: case 0xAF: // res 5, r
          case 0xB0: case 0xB1: case 0xB2: case 0xB3: case 0xB4: case 0xB5: case 0xB6: case 0xB7: // res 6, r
          case 0xB8: case 0xB9: case 0xBA: case 0xBB: case 0xBC: case 0xBD: case 0xBE: case 0xBF: // res 7, r
            this.res(operand, (cbOpcode >> 3) & 0x07);
            break;
    
          case 0xC0: case 0xC1: case 0xC2: case 0xC3: case 0xC4: case 0xC5: case 0xC6: case 0xC7: // set 0, r
          case 0xC8: case 0xC9: case 0xCA: case 0xCB: case 0xCC: case 0xCD: case 0xCE: case 0xCF: // set 1, r
          case 0xD0: case 0xD1: case 0xD2: case 0xD3: case 0xD4: case 0xD5: case 0xD6: case 0xD7: // set 2, r
          case 0xD8: case 0xD9: case 0xDA: case 0xDB: case 0xDC: case 0xDD: case 0xDE: case 0xDF: // set 3, r
          case 0xE0: case 0xE1: case 0xE2: case 0xE3: case 0xE4: case 0xE5: case 0xE6: case 0xE7: // set 4, r
          case 0xE8: case 0xE9: case 0xEA: case 0xEB: case 0xEC: case 0xED: case 0xEE: case 0xEF: // set 5, r
          case 0xF0: case 0xF1: case 0xF2: case 0xF3: case 0xF4: case 0xF5: case 0xF6: case 0xF7: // set 6, r
          case 0xF8: case 0xF9: case 0xFA: case 0xFB: case 0xFC: case 0xFD: case 0xFE: case 0xFF: // set 7, r
            this.set(operand, (cbOpcode >> 3) & 0x07);
            break;
    
          default:
            console.warn(`Undefined CB opcode: 0x${cbOpcode.toString(16)}`);
            break;
        }
    }

    private tickTCycle() {
        this.state.currentInstructionCycles++;
        this.state.totalCycles++;
        this.mmu.tickTCycle();
    }

    private tickMCycle() {
        this.tickTCycle();
        this.tickTCycle();
        this.tickTCycle();
        this.tickTCycle();
        this.mmu.tickMCycle();
    }

    private readValue8Bit(operand: Operand8Bit) {
        switch (operand) {
            case Operand8Bit.A: return this.state.a;
            case Operand8Bit.B: return this.state.b;
            case Operand8Bit.C: return this.state.c;
            case Operand8Bit.D: return this.state.d;
            case Operand8Bit.E: return this.state.e;
            case Operand8Bit.H: return this.state.h;
            case Operand8Bit.L: return this.state.l;
            case Operand8Bit.IndirectHL: return this.readMemory8Bit(this.state.hl);
            case Operand8Bit.IndirectBC: return this.readMemory8Bit(this.state.bc);
            case Operand8Bit.IndirectDE: return this.readMemory8Bit(this.state.de);
            case Operand8Bit.IndirectC: return this.readMemory8Bit(0xFF00 + this.state.c);
            case Operand8Bit.Immediate: return this.readImmediate8Bit();
            case Operand8Bit.IndirectImmediate8Bit: return this.readMemory8Bit(0xFF00 + this.readImmediate8Bit());
            case Operand8Bit.IndirectImmediate16Bit: return this.readMemory8Bit(this.readImmediate16Bit());
            default: throw new Error(`Invalid operand when reading 8 bit value: ${operand}`);
        }
    }

    private writeValue8Bit(operand: Operand8Bit, value: number) {
        switch (operand) {
            case Operand8Bit.A: this.state.a = value; break;
            case Operand8Bit.B: this.state.b = value; break;
            case Operand8Bit.C: this.state.c = value; break;
            case Operand8Bit.D: this.state.d = value; break;
            case Operand8Bit.E: this.state.e = value; break;
            case Operand8Bit.H: this.state.h = value; break;
            case Operand8Bit.L: this.state.l = value; break;
            case Operand8Bit.IndirectHL: this.writeMemory8Bit(this.state.hl, value); break;
            case Operand8Bit.IndirectBC: this.writeMemory8Bit(this.state.bc, value); break;
            case Operand8Bit.IndirectDE: this.writeMemory8Bit(this.state.de, value); break;
            case Operand8Bit.IndirectC: this.writeMemory8Bit(0xFF00 + this.state.c, value); break;
            case Operand8Bit.IndirectImmediate8Bit: this.writeMemory8Bit(0xFF00 + this.readImmediate8Bit(), value); break;
            case Operand8Bit.IndirectImmediate16Bit: this.writeMemory8Bit(this.readImmediate16Bit(), value); break;
            default: throw new Error(`Invalid operand when writing 8 bit value: ${operand}`);            
        }
    }

    private readValue16Bit(operand: Operand16Bit) {
        switch (operand) {
            case Operand16Bit.AF: return this.state.af;
            case Operand16Bit.BC: return this.state.bc;
            case Operand16Bit.DE: return this.state.de;
            case Operand16Bit.HL: return this.state.hl;
            case Operand16Bit.PC: return this.state.pc;
            case Operand16Bit.SP: return this.state.sp;
            case Operand16Bit.Immediate: return this.readImmediate16Bit();
            case Operand16Bit.IndirectImmediate: return this.readMemory16Bit(this.readImmediate16Bit());
            default: throw new Error(`Invalid operand when reading 16 bit value: ${operand}`);
        }
    }

    private writeValue16Bit(operand: Operand16Bit, value: number) {
        switch (operand) {
            case Operand16Bit.AF: this.state.af = value; break;
            case Operand16Bit.BC: this.state.bc = value; break;
            case Operand16Bit.DE: this.state.de = value; break;
            case Operand16Bit.HL: this.state.hl = value; break;
            case Operand16Bit.PC: this.state.pc = value; break;
            case Operand16Bit.SP: this.state.sp = value; break;
            case Operand16Bit.IndirectImmediate: this.writeMemory16Bit(this.readImmediate16Bit(), value); break;
            default: throw new Error(`Invalid operand when writing 16 bit value: ${operand}`);
        }
    }
    
    private checkInterrupts() {
        if (this.interruptManager.anyInterruptRequested) {
            this.state.status = CpuStatus.Running;
            this.tickMCycle();

            if (this.interruptManager.ime) {
                let interruptVector = this.interruptManager.currentInterruptWithVector;
                if (interruptVector !== null) {
                    this.interruptManager.ime = false;
                    this.tickMCycle();

                    this.push_byte(this.state.pc >> 8);

                    // Check if IE has been changed during the push
                    interruptVector = this.interruptManager.currentInterruptWithVector;
                    if (interruptVector === null) {
                        // IE was overwritten during PCH push
                        this.state.pc = 0;
                        return;
                    }

                    this.push_byte(this.state.pc & 0xFF);
                    this.tickMCycle();
                    
                    this.state.pc = interruptVector.vector;
                    this.interruptManager.clearInterrupt(interruptVector.interrupt);
                }
            }
        }
    }

    private readImmediate8Bit() {
        const val = this.readMemory8Bit(this.state.pc);
        if (this.state.haltBugTriggered) {
            this.state.haltBugTriggered = false;
        } else {
            this.state.pc++;
        }
        return val;
    }

    private readImmediate8BitSigned() {
        return this.readImmediate8Bit() << 24 >> 24;
    }

    private readImmediate16Bit() {
        const val = this.readMemory16Bit(this.state.pc);
        this.state.pc += 2;
        return val;
    }

    private readMemory8Bit(address: number) {
        const val = this.mmu.read(address);
        this.tickMCycle();
        return val;
    }

    private writeMemory8Bit(address: number, value: number) {
        this.mmu.write(address, value);
        this.tickMCycle();
    }

    private readMemory16Bit(address: number) {
        const low = this.readMemory8Bit(address);
        const high = this.readMemory8Bit(address + 1);
        return (high << 8) | low;
    }

    private writeMemory16Bit(address: number, value: number) {
        this.writeMemory8Bit(address, value & 0xFF);
        this.writeMemory8Bit(address + 1, value >> 8);
    }

    // Instructions

    private halt() {
        if (!this.interruptManager.ime && this.interruptManager.anyInterruptRequested) {
            this.state.haltBugTriggered = true;
        } else {
            this.state.status = CpuStatus.Halted;
        }
        this.tickMCycle();
        this.tickMCycle();
    }
    
    private stop() {
        this.state.status = CpuStatus.Stopped;
        this.tickMCycle();
        this.tickMCycle();
    }

    private di() {
        this.interruptManager.ime = false;
    }

    private ei() {
        this.state.eiPending = true;
    }

    private reti() {
        this.state
        this.interruptManager.ime = true;
        this.ret();
    }

    // Arithmetic/Logic Instructions

    private add_hl_r16(operand: Operand16Bit) {
        // https://stackoverflow.com/questions/57958631/game-boy-half-carry-flag-and-16-bit-instructions-especially-opcode-0xe8
        // ADD HL,rr - "Based on my testing, H is set if carry occurs from bit 11 to bit 12."

        const value = this.readValue16Bit(operand);
        const result = this.state.hl + value;
        const halfCarryResult = (this.state.hl & 0x0FFF) + (value & 0x0FFF);

        this.state.f = (this.state.f & RegisterFlag.Zero) |
                       (halfCarryResult > 0x0FFF ? RegisterFlag.HalfCarry : 0) |
                       (result > 0xFFFF ? RegisterFlag.Carry : 0);
        this.state.hl = result & 0xFFFF;

        this.tickMCycle();
    }

    private add_a(operand: Operand8Bit) {
        const a = this.state.a;
        const b = this.readValue8Bit(operand);
        const result = this.add(a, b, false);
        this.state.a = result;
    }

    private add_sp_i8() {
        this.state.sp = this.sp_i8();
        this.tickMCycle();
    }

    private adc_a(operand: Operand8Bit) {
        const a = this.state.a;
        const b = this.readValue8Bit(operand);
        const result = this.add(a, b, true);
        this.state.a = result;
    }

    private sub_a(operand: Operand8Bit) {
        const a = this.state.a;
        const b = this.readValue8Bit(operand);
        const result = this.sub(a, b, false);
        this.state.a = result;
    }

    private sbc_a(operand: Operand8Bit) {
        const a = this.state.a;
        const b = this.readValue8Bit(operand);
        const result = this.sub(a, b, true);
        this.state.a = result;
    }

    private and_a(operand: Operand8Bit) {
        const a = this.state.a;
        const b = this.readValue8Bit(operand);
        const result = this.and(a, b);
        this.state.a = result;
    }

    private or_a(operand: Operand8Bit) {
        const a = this.state.a;
        const b = this.readValue8Bit(operand);
        const result = this.or(a, b);
        this.state.a = result;
    }

    private xor_a(operand: Operand8Bit) {
        const a = this.state.a;
        const b = this.readValue8Bit(operand);
        const result = this.xor(a, b);
        this.state.a = result;
    }

    private cp_a(operand: Operand8Bit) {
        const a = this.state.a;
        const b = this.readValue8Bit(operand);
        this.cp(a, b);
    } 

    private or(a: number, b: number) {
        const result = a | b;
        const byteResult = result & 0xFF;
        this.state.f = (byteResult === 0 ? RegisterFlag.Zero : 0);
        return byteResult;
    }

    private xor(a: number, b: number) {
        const result = a ^ b;
        const byteResult = result & 0xFF;
        this.state.f = (byteResult === 0 ? RegisterFlag.Zero : 0);
        return byteResult;
    }

    private and(a: number, b: number) {
        const result = a & b;
        const byteResult = result & 0xFF;
        this.state.f = (byteResult === 0 ? RegisterFlag.Zero : 0) | RegisterFlag.HalfCarry;
        return byteResult;
    }

    private add(a: number, b: number, carry: boolean) {
        const cy = carry && this.state.hasFlag(RegisterFlag.Carry) ? 1 : 0;
        const result = a + b + cy;
        const halfCarryResult = (a & 0x0F) + (b & 0x0F) + cy;
        const byteResult = result & 0xFF;

        this.state.f = (byteResult === 0 ? RegisterFlag.Zero : 0) |
                       (halfCarryResult > 0x0F ? RegisterFlag.HalfCarry : 0) |
                       (result > 0xFF ? RegisterFlag.Carry : 0);

        return byteResult;
    }

    private sub(a: number, b: number, carry: boolean) {
        const cy = carry && this.state.hasFlag(RegisterFlag.Carry) ? 1 : 0;
        const result = a - b - cy;
        const halfCarryResult = (a & 0x0F) - (b & 0x0F) - cy;
        const byteResult = result & 0xFF;

        this.state.f = RegisterFlag.Subtract |
                       (byteResult === 0 ? RegisterFlag.Zero : 0) |
                       (halfCarryResult < 0 ? RegisterFlag.HalfCarry : 0) |
                       (result < 0 ? RegisterFlag.Carry : 0);

        return byteResult;
    }

    private cp(a: number, b: number) {
        const result = a - b;
        const halfCarryResult = (a & 0x0F) - (b & 0x0F);
        const byteResult = result & 0xFF;

        this.state.f = RegisterFlag.Subtract |
                       (byteResult === 0 ? RegisterFlag.Zero : 0) |
                       (halfCarryResult < 0 ? RegisterFlag.HalfCarry : 0) |
                       (result < 0 ? RegisterFlag.Carry : 0)
    }

    private rl_a() {
        this.state.a = this.rl_base(this.state.a, true);
    }

    private rl(operand: Operand8Bit) {
        const result = this.rl_base(this.readValue8Bit(operand), false);
        this.writeValue8Bit(operand, result);
    }

    private rl_base(value: number, clearZero: boolean) {
        const cy = this.state.hasFlag(RegisterFlag.Carry) ? 1 : 0;
        const result = ((value << 1) | cy) & 0xFF;
        this.state.f = ((value & 0x80) !== 0 ? RegisterFlag.Carry : 0) | (!clearZero && result === 0 ? RegisterFlag.Zero : 0);
        return result;
    }

    private rlc_a() {
        this.state.a = this.rlc_base(this.state.a, true);
    }

    private rlc(operand: Operand8Bit) {
        const result = this.rlc_base(this.readValue8Bit(operand), false);
        this.writeValue8Bit(operand, result);
    }

    private rlc_base(value: number, clearZero: boolean) {
        const bit7 = value >> 7;
        const result = ((value << 1) | bit7) & 0xff;
        this.state.f = (bit7 !== 0 ? RegisterFlag.Carry : 0) | (!clearZero && result === 0 ? RegisterFlag.Zero : 0);
        return result;
    }

    private rr_a() {
        this.state.a = this.rr_base(this.state.a, true);
    }

    private rr(operand: Operand8Bit) {
        const result = this.rr_base(this.readValue8Bit(operand), false);
        this.writeValue8Bit(operand, result);
    }

    private rr_base(value: number, clearZero: boolean) {
        const cy = this.state.hasFlag(RegisterFlag.Carry) ? 0x80 : 0;
        const result = ((value >> 1) | cy) & 0xff;
        this.state.f = ((value & 0x01) !== 0 ? RegisterFlag.Carry : 0) | (!clearZero && result === 0 ? RegisterFlag.Zero : 0);
        return result;
    }

    private rrc_a() {
        this.state.a = this.rrc_base(this.state.a, true);
    }

    private rrc(operand: Operand8Bit) {
        const result = this.rrc_base(this.readValue8Bit(operand), false);
        this.writeValue8Bit(operand, result);
    }

    private rrc_base(value: number, clearZero: boolean) {
        const bit0 = value & 0x01;
        const result = ((value >> 1) | (bit0 << 7)) & 0xff;
        this.state.f = (bit0 !== 0 ? RegisterFlag.Carry : 0) | (!clearZero && result === 0 ? RegisterFlag.Zero : 0);
        return result;
    }

    private inc_8(operand: Operand8Bit) {
        const value = this.readValue8Bit(operand);
        const result = value + 1;
        const halfCarryResult = (value & 0x0F) + 1;
        const byteResult = result & 0xFF;

        this.state.f = (this.state.f & RegisterFlag.Carry) |
                       (byteResult === 0 ? RegisterFlag.Zero : 0) |
                       (halfCarryResult > 0x0F ? RegisterFlag.HalfCarry : 0);

        this.writeValue8Bit(operand, byteResult);
    }

    private dec_8(operand: Operand8Bit) {
        const value = this.readValue8Bit(operand);
        const result = value - 1;
        const halfCarryResult = (value & 0x0F) - 1;
        const byteResult = result & 0xFF;

        this.state.f = (this.state.f & RegisterFlag.Carry) | RegisterFlag.Subtract |
                       (byteResult === 0 ? RegisterFlag.Zero : 0) |
                       (halfCarryResult < 0 ? RegisterFlag.HalfCarry : 0);

        this.writeValue8Bit(operand, result);
    }

    private inc_16(operand: Operand16Bit) {
        this.writeValue16Bit(operand, this.readValue16Bit(operand) + 1);
        this.tickMCycle();
    }

    private dec_16(operand: Operand16Bit) {
        this.writeValue16Bit(operand, this.readValue16Bit(operand) - 1);
        this.tickMCycle();
    }

    private daa() {
        const carryFlag = this.state.hasFlag(RegisterFlag.Carry);
        const halfCarryFlag = this.state.hasFlag(RegisterFlag.HalfCarry);
        let setCarry = false;
        
        if (!this.state.hasFlag(RegisterFlag.Subtract)) {
            if (carryFlag || this.state.a > 0x99) {
                this.state.a += 0x60;
                setCarry = true;
            }
            if (halfCarryFlag || (this.state.a & 0x0F) > 0x09) {
                this.state.a += 0x06;
            }
        } else {
            if (carryFlag) {
                this.state.a -= 0x60;
                setCarry = true;
            }
            if (halfCarryFlag) {
                this.state.a -= 0x06;
            }
        }
       
        this.state.f = (this.state.f & RegisterFlag.Subtract) |
                       (setCarry ? RegisterFlag.Carry : 0) |
                       (this.state.a === 0 ? RegisterFlag.Zero : 0);
    }

    private ccf() {
        this.state.f = (this.state.f & ~(RegisterFlag.Subtract | RegisterFlag.HalfCarry)) ^ RegisterFlag.Carry;
    }

    private scf() {
        this.state.f = (this.state.f & RegisterFlag.Zero) | RegisterFlag.Carry;
    }

    private cpl() {
        this.state.a = ~this.state.a;
        this.state.f |= RegisterFlag.HalfCarry | RegisterFlag.Subtract;
    }

    private swap(operand: Operand8Bit) {
        const value = this.readValue8Bit(operand);
        const result = ((value & 0x0F) << 4) | ((value & 0xF0) >> 4);
        this.state.f = result === 0 ? RegisterFlag.Zero : 0;
        this.writeValue8Bit(operand, result);
    }

    private sla(operand: Operand8Bit) {
        const value = this.readValue8Bit(operand);
        const result = (value << 1) & 0xFF;
        this.state.f = (result === 0 ? RegisterFlag.Zero : 0) | ((value & 0x80) !== 0 ? RegisterFlag.Carry : 0);
        this.writeValue8Bit(operand, result);
    }

    private sra(operand: Operand8Bit) {
        const value = this.readValue8Bit(operand);
        const result = ((value >> 1) | (value & 0x80)) & 0xFF;
        this.state.f = (result === 0 ? RegisterFlag.Zero : 0) | ((value & 0x01) !== 0 ? RegisterFlag.Carry : 0);
        this.writeValue8Bit(operand, result);
    }

    private srl(operand: Operand8Bit) {
        const value = this.readValue8Bit(operand);
        const result = (value >> 1) & 0xFF;
        this.state.f = (result === 0 ? RegisterFlag.Zero : 0) | ((value & 0x01) !== 0 ? RegisterFlag.Carry : 0);
        this.writeValue8Bit(operand, result);
    }

    private bit(operand: Operand8Bit, bit: number) {
        const value = this.readValue8Bit(operand);
        const result = value & (1 << bit);
        this.state.f = (this.state.f & RegisterFlag.Carry) | (result === 0 ? RegisterFlag.Zero : 0) | RegisterFlag.HalfCarry;
    }

    private res(operand: Operand8Bit, bit: number) {
        const value = this.readValue8Bit(operand);
        const result = value & ~(1 << bit);
        this.writeValue8Bit(operand, result);
    }

    private set(operand: Operand8Bit, bit: number) {
        const value = this.readValue8Bit(operand);
        const result = value | (1 << bit);
        this.writeValue8Bit(operand, result);
    }

    // Load Instructions

    private ld_8_8(dest: Operand8Bit, source: Operand8Bit) {
        this.writeValue8Bit(dest, this.readValue8Bit(source));
    }

    private ld_16_16(dest: Operand16Bit, source: Operand16Bit) {
        this.writeValue16Bit(dest, this.readValue16Bit(source));
    }

    private ld_a_hl(inc: number) {
        this.state.a = this.readMemory8Bit(this.state.hl);
        this.state.hl += inc;
    }

    private ld_hl_a(inc: number) {
        this.writeMemory8Bit(this.state.hl, this.state.a);
        this.state.hl += inc;
    }

    private ld_hl_spi8() {
        this.state.hl = this.sp_i8();
    }

    private ld_sp_hl() {
        this.state.sp = this.state.hl;
        this.tickMCycle();
    }

    // Jump Instructions

    private jr_i8() {
        const increment = this.readImmediate8BitSigned();
        this.state.pc = this.readValue16Bit(Operand16Bit.PC) + increment;
        this.tickMCycle();
    }

    private jr_i8_cond(flag: RegisterFlag, condition: boolean) {
        if (this.state.hasFlag(flag) === condition) {
            this.jr_i8();
        } else {
            // simulate an immediate read
            this.state.pc++;
            this.tickMCycle();
        }
    }

    private jp_i16() {
        this.state.pc = this.readImmediate16Bit();
        this.tickMCycle();
    }

    private jp_i16_cond(flag: RegisterFlag, condition: boolean) {
        if (this.state.hasFlag(flag) === condition) {
            this.jp_i16();
        } else {
            // simulate an immediate read
            this.state.pc += 2;
            this.tickMCycle();
            this.tickMCycle();
        }
    }

    private jp_hl() {
        this.state.pc = this.state.hl;
    }

    private call_i16() {
        const pc = this.readImmediate16Bit();
        this.push_val(this.state.pc);
        this.state.pc = pc;
    }

    private call_i16_cond(flag: RegisterFlag, condition: boolean) {
        if (this.state.hasFlag(flag) === condition) {
            this.call_i16();
        } else {
            // simulate an immediate read
            this.state.pc += 2;
            this.tickMCycle();
            this.tickMCycle();
        }
    }

    private ret() {
        this.state.pc = this.pop_val();
        this.tickMCycle();
    }

    private ret_cond(flag: RegisterFlag, condition: boolean) {
        this.tickMCycle();
        if (this.state.hasFlag(flag) === condition) {
            this.ret();
        }
    }

    private rst(address: number) {
        this.push_val(this.state.pc);
        this.state.pc = address;
    }

    // Stack Instructions

    private push(operand: Operand16Bit) {
        this.push_val(this.readValue16Bit(operand));
    }

    private push_byte(value: number) {
        this.state.sp -= 1;
        this.writeMemory8Bit(this.state.sp, value);
    }

    private push_val(value: number) {
        this.state.sp -= 2;
        this.writeMemory16Bit(this.state.sp, value);
        this.tickMCycle();
    }

    private pop(operand: Operand16Bit) {
        this.writeValue16Bit(operand, this.pop_val());
    }

    private pop_af() {
        this.state.af = this.pop_val() & 0xFFF0; // Lower 4 bits of F are always zero
    }

    private pop_val() {
        const value = this.readMemory16Bit(this.state.sp);
        this.state.sp += 2;
        return value;
    }
    
    private sp_i8() {
        // https://stackoverflow.com/questions/57958631/game-boy-half-carry-flag-and-16-bit-instructions-especially-opcode-0xe8
        // TL; DR: For ADD SP,n, the H-flag is set when carry occurs from bit 3 to bit 4.

        const value = this.readImmediate8BitSigned();
        const result = this.state.sp + value;
        const carryResult = (this.state.sp & 0xFF) + (value & 0xFF);
        const halfCarryResult = (this.state.sp & 0x0F) + (value & 0x0F);
        this.state.f = (halfCarryResult > 0x0F ? RegisterFlag.HalfCarry : 0) | (carryResult > 0xFF ? RegisterFlag.Carry : 0);

        this.tickMCycle();
        return result & 0xFFFF;
    }
}
