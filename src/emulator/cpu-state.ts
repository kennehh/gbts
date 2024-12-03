export enum RegisterFlag {
    Zero = 1 << 7,
    Subtract = 1 << 6,
    HalfCarry = 1 << 5,
    Carry = 1 << 4,
}

export enum CpuStatus {
    Running,
    Halted,
    Stopped,
}

export class CpuState {
    private static readonly SERIALIZED_SIZE = 15;

    status: CpuStatus = CpuStatus.Running;
    haltBugTriggered: boolean = false;

    currentInstructionCycles: number = 0;
    totalCycles: number = 0;

    private _a: number = 0;
    private _b: number = 0;
    private _c: number = 0;
    private _d: number = 0;
    private _e: number = 0;
    private _f: number = 0;
    private _h: number = 0;
    private _l: number = 0;

    private _pc: number = 0;
    private _sp: number = 0;

    reset() {
        this.a = 0;
        this.b = 0;
        this.c = 0;
        this.d = 0;
        this.e = 0;
        this.f = 0;
        this.h = 0;
        this.l = 0;

        this.sp = 0;
        this.pc = 0;

        this.status = CpuStatus.Running;
        this.haltBugTriggered = false;
    }

    get a() { return this._a; }
    set a(value: number) { this._a = value & 0xFF; }
    get b() { return this._b; }
    set b(value: number) { this._b = value & 0xFF; }
    get c() { return this._c; }
    set c(value: number) { this._c = value & 0xFF; }
    get d() { return this._d; }
    set d(value: number) { this._d = value & 0xFF; }
    get e() { return this._e; }
    set e(value: number) { this._e = value & 0xFF; }
    get f() { return this._f & 0xFF; }
    set f(value: number) { this._f = value & 0xFF; }
    get h() { return this._h; }
    set h(value: number) { this._h = value & 0xFF; }
    get l() { return this._l; }
    set l(value: number) { this._l = value & 0xFF; }

    get af() { return (this.a << 8) | this.f; }
    set af(value: number) {
        this.a = value >> 8;
        this.f = value & 0xFF;
    }

    get bc() { return (this.b << 8) | this.c; }
    set bc(value: number) {
        this.b = value >> 8;
        this.c = value & 0xFF;
    }

    get de() { return (this.d << 8) | this.e; }
    set de(value: number) {
        this.d = value >> 8;
        this.e = value & 0xFF;
    }

    get hl() { return (this.h << 8) | this.l; }
    set hl(value: number) {
        this.h = value >> 8;
        this.l = value & 0xFF;
    }

    get sp() { return this._sp; }
    set sp(value: number) { this._sp = value & 0xFFFF; }
    get pc() { return this._pc; }
    set pc(value: number) { this._pc = value & 0xFFFF; }

    updateFlag(flag: RegisterFlag, value: boolean) {
        if (value) {
            this.f |= flag;
        } else {
            this.f &= ~flag;
        }
    }

    setFlag(flag: RegisterFlag) {
        this.f |= flag;
    }

    clearFlag(flag: RegisterFlag) {
        this.f &= ~flag;
    }

    toggleFlag(flag: RegisterFlag) {
        this.f ^= flag;
    }

    hasFlag(flag: RegisterFlag) {
        return (this.f & flag) === flag;
    }

    serialize(): Uint8Array {
        const buffer = new Uint8Array(CpuState.SERIALIZED_SIZE);
        const view = new DataView(buffer.buffer);

        view.setUint8(0, this.a);
        view.setUint8(1, this.b);
        view.setUint8(2, this.c);
        view.setUint8(3, this.d);
        view.setUint8(4, this.e);
        view.setUint8(5, this.f);
        view.setUint8(6, this.h);
        view.setUint8(7, this.l);

        view.setUint16(8, this.sp, true);
        view.setUint16(10, this.pc, true);
        
        // view.setUint8(12, this.halted ? 1 : 0);
        // view.setUint8(13, this.stopped ? 1 : 0);
        view.setUint8(14, this.haltBugTriggered ? 1 : 0);

        return buffer;
    }

    deserialize(data: Uint8Array) {
        if (data.length !== CpuState.SERIALIZED_SIZE) {
            throw new Error(`Invalid data size: ${data.length}`);
        }

        const view = new DataView(data.buffer);

        this.a = view.getUint8(0);
        this.b = view.getUint8(1);
        this.c = view.getUint8(2);
        this.d = view.getUint8(3);
        this.e = view.getUint8(4);
        this.f = view.getUint8(5);
        this.h = view.getUint8(6);
        this.l = view.getUint8(7);

        this.sp = view.getUint16(8, true);
        this.pc = view.getUint16(10, true);
        
        // this.halted = view.getUint8(12) === 1;
        // this.stopped = view.getUint8(13) === 1;
        this.haltBugTriggered = view.getUint8(14) === 1;
    }

    toString() {
        const flags = [
            this.hasFlag(RegisterFlag.Zero) ? 'Z' : '-',
            this.hasFlag(RegisterFlag.Subtract) ? 'N' : '-',
            this.hasFlag(RegisterFlag.HalfCarry) ? 'H' : '-',
            this.hasFlag(RegisterFlag.Carry) ? 'C' : '-'
        ].join('');

        const getRegString = (value: number) => value.toString(16).padStart(4, '0');

        return `AF=${getRegString(this.af)} ` +
               `BC=${getRegString(this.bc)} ` +
               `DE=${getRegString(this.de)} ` +
               `HL=${getRegString(this.hl)} ` +
               `SP=${getRegString(this.sp)} ` +
               `PC=${getRegString(this.pc)} ` +
               `FLAGS=${flags} ` + 
            //    `HALTED=${this.halted} ` +
            //    `STALLED=${this.stopped} ` +
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
                z: this.hasFlag(RegisterFlag.Zero),
                n: this.hasFlag(RegisterFlag.Subtract),
                h: this.hasFlag(RegisterFlag.HalfCarry),
                c: this.hasFlag(RegisterFlag.Carry),
            },
            // halted: this.halted,
            // stalled: this.stopped,
            haltBugTriggered: this.haltBugTriggered,
        };
    }
}
