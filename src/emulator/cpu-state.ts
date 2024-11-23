export enum Register8Bit {
    A = 0,
    F = 1,
    B = 2,
    C = 3,
    D = 4,
    E = 5,
    H = 6,
    L = 7,
}

export enum Register16Bit {
    AF = 0,
    BC = 2,
    DE = 4,
    HL = 6,
    SP = 8,
    PC = 10,
}

export enum RegisterFlag {
    Zero = 1 << 7,
    Subtract = 1 << 6,
    HalfCarry = 1 << 5,
    Carry = 1 << 4,
}

export default class CpuState {
    private static readonly REGISTER_SIZE = 16;
    private registerBuffer: ArrayBuffer;
    private registerView: DataView;

    halted: boolean = false;
    stalled: boolean = false
    haltBugTriggered: boolean = false;

    constructor() {
        this.registerBuffer = new ArrayBuffer(CpuState.REGISTER_SIZE);
        this.registerView = new DataView(this.registerBuffer);
    }

    reset() {
        new Uint8Array(this.registerBuffer).fill(0);
        this.halted = false;
        this.stalled = false;
        this.haltBugTriggered = false;
    }

    readRegister8Bit(reg: Register8Bit) {
        return this.registerView.getUint8(reg);
    }

    writeRegister8Bit(reg: Register8Bit, value: number) {
        this.registerView.setUint8(reg, value);
    }

    readRegister16Bit(reg: Register16Bit) {
        return this.registerView.getUint16(reg, false);
    }

    writeRegister16Bit(reg: Register16Bit, value: number) {
        this.registerView.setUint16(reg, value, false);
    }

    get a() {
        return this.readRegister8Bit(Register8Bit.A);
    }

    set a(value: number) {
        this.writeRegister8Bit(Register8Bit.A, value);
    }

    get f() {
        return this.readRegister8Bit(Register8Bit.F);
    }

    set f(value: number) {
        this.writeRegister8Bit(Register8Bit.F, value);
    }

    get b() {
        return this.readRegister8Bit(Register8Bit.B);
    }

    set b(value: number) {
        this.writeRegister8Bit(Register8Bit.B, value);
    }

    get c() {
        return this.readRegister8Bit(Register8Bit.C);
    }

    set c(value: number) {
        this.writeRegister8Bit(Register8Bit.C, value);
    }

    get d() {
        return this.readRegister8Bit(Register8Bit.D);
    }

    set d(value: number) {
        this.writeRegister8Bit(Register8Bit.D, value);
    }

    get e() {
        return this.readRegister8Bit(Register8Bit.E);
    }

    set e(value: number) {
        this.writeRegister8Bit(Register8Bit.E, value);
    }

    get h() {
        return this.readRegister8Bit(Register8Bit.H);
    }

    set h(value: number) {
        this.writeRegister8Bit(Register8Bit.H, value);
    }

    get l() {
        return this.readRegister8Bit(Register8Bit.L);
    }

    set l(value: number) {
        this.writeRegister8Bit(Register8Bit.L, value);
    }

    get sp() {
        return this.readRegister16Bit(Register16Bit.SP);
    }

    set sp(value: number) {
        this.writeRegister16Bit(Register16Bit.SP, value);
    }

    get pc() {
        return this.readRegister16Bit(Register16Bit.PC);
    }

    set pc(value: number) {
        this.writeRegister16Bit(Register16Bit.PC, value);
    }

    get af() {
        return this.readRegister16Bit(Register16Bit.AF);
    }

    set af(value: number) {
        this.writeRegister16Bit(Register16Bit.AF, value);
    }

    get bc() {
        return this.readRegister16Bit(Register16Bit.BC);
    }

    set bc(value: number) {
        this.writeRegister16Bit(Register16Bit.BC, value);
    }

    get de() {
        return this.readRegister16Bit(Register16Bit.DE);
    }

    set de(value: number) {
        this.writeRegister16Bit(Register16Bit.DE, value);
    }

    get hl() {
        return this.readRegister16Bit(Register16Bit.HL);
    }

    set hl(value: number) {
        this.writeRegister16Bit(Register16Bit.HL, value);
    }

    setFlag(flag: RegisterFlag, value: boolean) {
        if (value) {
            this.f |= flag;
        } else {
            this.f &= ~flag;
        }
    }

    getFlag(flag: RegisterFlag) {
        return (this.f & flag) === flag;
    }

    serialize() {
        return new Uint8Array(this.registerBuffer);
    }

    deserialize(data: Uint8Array) {
        new Uint8Array(this.registerBuffer).set(data);
    }

    toString() {
        const flags = [
            this.getFlag(RegisterFlag.Zero) ? 'Z' : '-',
            this.getFlag(RegisterFlag.Subtract) ? 'N' : '-',
            this.getFlag(RegisterFlag.HalfCarry) ? 'H' : '-',
            this.getFlag(RegisterFlag.Carry) ? 'C' : '-'
        ].join('');

        const getRegString = (value: number) => value.toString(16).padStart(4, '0');

        return `AF=${getRegString(this.af)} ` +
               `BC=${getRegString(this.bc)} ` +
               `DE=${getRegString(this.de)} ` +
               `HL=${getRegString(this.hl)} ` +
               `SP=${getRegString(this.sp)} ` +
               `PC=${getRegString(this.pc)} ` +
               `FLAGS=${flags} ` + 
               `HALTED=${this.halted} ` +
               `STALLED=${this.stalled} ` +
               `HALT_BUG=${this.haltBugTriggered} `;
    }

    debugObject() {
        return {
            af: this.af,
            bc: this.bc,
            de: this.de,
            hl: this.hl,
            sp: this.sp,
            pc: this.pc,
            flags: {
                z: this.getFlag(RegisterFlag.Zero),
                n: this.getFlag(RegisterFlag.Subtract),
                h: this.getFlag(RegisterFlag.HalfCarry),
                c: this.getFlag(RegisterFlag.Carry),
            },
            halted: this.halted,
            stalled: this.stalled,
            haltBugTriggered: this.haltBugTriggered,
        };
    }
}
