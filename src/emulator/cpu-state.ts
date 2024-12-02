export enum RegisterFlag {
    Zero = 1 << 7,
    Subtract = 1 << 6,
    HalfCarry = 1 << 5,
    Carry = 1 << 4,
}

export enum InterruptFlag {
    None = 0,
    VBlank = 1 << 0,
    LCDStat = 1 << 1,
    Timer = 1 << 2,
    Serial = 1 << 3,
    Joypad = 1 << 4,
}

export enum CpuStatus {
    Running,
    Halted,
    Stopped,
}

export default class CpuState {
    private static readonly SERIALIZED_SIZE = 15;

    status: CpuStatus = CpuStatus.Running;
    haltBugTriggered: boolean = false;
    ime: boolean = false;

    currentInstructionCycles: number = 0;
    totalCycles: number = 0;

    #a: number = 0;
    #b: number = 0;
    #c: number = 0;
    #d: number = 0;
    #e: number = 0;
    #f: number = 0;
    #h: number = 0;
    #l: number = 0;

    #pc: number = 0;
    #sp: number = 0;

    #ie: InterruptFlag = InterruptFlag.None;
    #if: InterruptFlag = InterruptFlag.None;


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

    get a() { return this.#a; }
    set a(value: number) { this.#a = value & 0xFF; }
    get b() { return this.#b; }
    set b(value: number) { this.#b = value & 0xFF; }
    get c() { return this.#c; }
    set c(value: number) { this.#c = value & 0xFF; }
    get d() { return this.#d; }
    set d(value: number) { this.#d = value & 0xFF; }
    get e() { return this.#e; }
    set e(value: number) { this.#e = value & 0xFF; }
    get f() { return this.#f & 0xFF; }
    set f(value: number) { this.#f = value & 0xFF; }
    get h() { return this.#h; }
    set h(value: number) { this.#h = value & 0xFF; }
    get l() { return this.#l; }
    set l(value: number) { this.#l = value & 0xFF; }

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

    get sp() { return this.#sp; }
    set sp(value: number) { this.#sp = value & 0xFFFF; }
    get pc() { return this.#pc; }
    set pc(value: number) { this.#pc = value & 0xFFFF; }

    get currentInterrupt() {
        return (this.#ie & this.#if & 0x1f) as InterruptFlag;
    }

    get currentInterruptVector() {
        return 0x40 | (this.currentInterrupt as number) << 3;
    }

    get anyInterruptRequested() {
        return this.currentInterrupt !== InterruptFlag.None;
    }

    requestInterrupt(interrupt: InterruptFlag) {
        this.#if |= interrupt;
    }

    clearInterrupt(interrupt: InterruptFlag) {
        this.#if &= ~interrupt;
    }

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
